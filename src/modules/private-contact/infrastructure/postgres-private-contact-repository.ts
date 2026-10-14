import { randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";
import type {
  EncryptedPrivateContact,
  EncryptedValue,
  OwnerPrivateContactView,
  PrivateContactRepository
} from "../application/private-contact-repository";
import type { DeliveryMethod } from "../domain/private-contact";
import { getPrivateContactCipher, PrivateContactCryptoError } from "./private-contact-crypto";
import { getPostgresPool } from "@/shared/database/postgres";

type ContactRow = QueryResultRow & {
  listing_id: string;
  delivery_method: DeliveryMethod;
  phone_ciphertext: Buffer; phone_nonce: Buffer; phone_auth_tag: Buffer;
  location_ciphertext: Buffer; location_nonce: Buffer; location_auth_tag: Buffer;
  instructions_ciphertext: Buffer | null; instructions_nonce: Buffer | null; instructions_auth_tag: Buffer | null;
  key_version: number; consent_version: string; consented_at: Date; updated_at: Date; version: number;
};

export type PrivateContactAccessReason = "NOT_FOUND" | "FORBIDDEN" | "INVALID_STATE" | "ACTIVE_RESERVATION" | "CONFLICT";

export class PrivateContactAccessError extends Error {
  constructor(public readonly reason: PrivateContactAccessReason) {
    super(reason);
    this.name = "PrivateContactAccessError";
  }
}

export function isPrivateContactAccessError(error: unknown): error is PrivateContactAccessError {
  return Boolean(error && typeof error === "object" && "reason" in error &&
    ["NOT_FOUND", "FORBIDDEN", "INVALID_STATE", "ACTIVE_RESERVATION", "CONFLICT"].includes(String((error as { reason: unknown }).reason)));
}

function encryptedValue(ciphertext: Buffer, nonce: Buffer, authTag: Buffer): EncryptedValue {
  return { ciphertext, nonce, authTag };
}

function decryptRow(row: ContactRow): OwnerPrivateContactView {
  const cipher = getPrivateContactCipher();
  const instructions = row.instructions_ciphertext && row.instructions_nonce && row.instructions_auth_tag
    ? cipher.decryptValue(row.listing_id, "instructions", encryptedValue(row.instructions_ciphertext, row.instructions_nonce, row.instructions_auth_tag), row.key_version)
    : null;
  return {
    phone: cipher.decryptValue(row.listing_id, "phone", encryptedValue(row.phone_ciphertext, row.phone_nonce, row.phone_auth_tag), row.key_version),
    deliveryMethod: row.delivery_method,
    location: cipher.decryptValue(row.listing_id, "location", encryptedValue(row.location_ciphertext, row.location_nonce, row.location_auth_tag), row.key_version),
    instructions,
    version: row.version,
    consentVersion: row.consent_version,
    consentedAt: row.consented_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

async function withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPostgresPool().connect();
  try {
    await client.query("begin");
    const result = await work(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally { client.release(); }
}

const contactColumns = `c.listing_id, c.delivery_method,
  c.phone_ciphertext, c.phone_nonce, c.phone_auth_tag,
  c.location_ciphertext, c.location_nonce, c.location_auth_tag,
  c.instructions_ciphertext, c.instructions_nonce, c.instructions_auth_tag,
  c.key_version, c.consent_version, c.consented_at, c.updated_at, c.version`;

function encryptedParameters(contact: EncryptedPrivateContact): unknown[] {
  return [
    contact.deliveryMethod,
    contact.phone.ciphertext, contact.phone.nonce, contact.phone.authTag,
    contact.location.ciphertext, contact.location.nonce, contact.location.authTag,
    contact.instructions?.ciphertext ?? null, contact.instructions?.nonce ?? null, contact.instructions?.authTag ?? null,
    contact.keyVersion, contact.consentVersion
  ];
}

export class PostgresPrivateContactRepository implements PrivateContactRepository {
  async getForOwner(actorId: string, listingId: string): Promise<OwnerPrivateContactView | null> {
    const listing = await getPostgresPool().query<{ owner_id: string }>("select owner_id from listing where id=$1", [listingId]);
    if (!listing.rows[0]) throw new PrivateContactAccessError("NOT_FOUND");
    if (listing.rows[0].owner_id !== actorId) throw new PrivateContactAccessError("FORBIDDEN");
    const result = await getPostgresPool().query<ContactRow>(
      `select ${contactColumns} from listing_private_contact c where c.listing_id=$1`, [listingId]
    );
    return result.rows[0] ? decryptRow(result.rows[0]) : null;
  }

  async upsertForOwner(input: {
    actorId: string; listingId: string; expectedVersion: number;
    encrypted: EncryptedPrivateContact; correlationId: string;
  }): Promise<OwnerPrivateContactView> {
    await withTransaction(async (client) => {
      const listingResult = await client.query<{ owner_id: string; status: string }>(
        "select owner_id, status from listing where id=$1 for update", [input.listingId]
      );
      const listing = listingResult.rows[0];
      if (!listing) throw new PrivateContactAccessError("NOT_FOUND");
      if (listing.owner_id !== input.actorId) throw new PrivateContactAccessError("FORBIDDEN");
      if (listing.status === "REMOVED") throw new PrivateContactAccessError("INVALID_STATE");
      const activeReservation = await client.query(
        "select 1 from reservation where listing_id=$1 and status='PENDING_PAYMENT' limit 1",
        [input.listingId]
      );
      if (activeReservation.rowCount) throw new PrivateContactAccessError("ACTIVE_RESERVATION");

      const current = await client.query<{ version: number }>(
        "select version from listing_private_contact where listing_id=$1 for update", [input.listingId]
      );
      const values = encryptedParameters(input.encrypted);
      if (!current.rows[0]) {
        if (input.expectedVersion !== 0) throw new PrivateContactAccessError("CONFLICT");
        await client.query(
          `insert into listing_private_contact (
            id, listing_id, delivery_method,
            phone_ciphertext, phone_nonce, phone_auth_tag,
            location_ciphertext, location_nonce, location_auth_tag,
            instructions_ciphertext, instructions_nonce, instructions_auth_tag,
            key_version, consent_version
          ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [randomUUID(), input.listingId, ...values]
        );
      } else {
        if (current.rows[0].version !== input.expectedVersion) throw new PrivateContactAccessError("CONFLICT");
        const updated = await client.query(
          `update listing_private_contact set
            delivery_method=$2,
            phone_ciphertext=$3, phone_nonce=$4, phone_auth_tag=$5,
            location_ciphertext=$6, location_nonce=$7, location_auth_tag=$8,
            instructions_ciphertext=$9, instructions_nonce=$10, instructions_auth_tag=$11,
            key_version=$12, consent_version=$13, consented_at=CURRENT_TIMESTAMP
           where listing_id=$1 and version=$14`,
          [input.listingId, ...values, input.expectedVersion]
        );
        if (updated.rowCount !== 1) throw new PrivateContactAccessError("CONFLICT");
      }
      await client.query(
        `insert into reservation_event (entity_type,entity_id,action,previous_state,new_state,actor_kind,actor_id,correlation_id)
         values ('LISTING',$1,$2,$3,'COMPLETE','USER',$4,$5)`,
        [input.listingId, current.rows[0] ? "PRIVATE_CONTACT_UPDATED" : "PRIVATE_CONTACT_CREATED",
          current.rows[0] ? "COMPLETE" : "MISSING", input.actorId, input.correlationId]
      );
    });
    const saved = await this.getForOwner(input.actorId, input.listingId);
    if (!saved) throw new PrivateContactCryptoError();
    return saved;
  }
}

declare global { var emsPrivateContactRepository: PostgresPrivateContactRepository | undefined; }

export function getPrivateContactRepository(): PostgresPrivateContactRepository {
  globalThis.emsPrivateContactRepository ??= new PostgresPrivateContactRepository();
  return globalThis.emsPrivateContactRepository;
}
