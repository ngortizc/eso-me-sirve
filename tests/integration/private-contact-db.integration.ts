import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CreateListingRecord } from "@/modules/listings/application/listing-repository";
import { PostgresListingRepository } from "@/modules/listings/infrastructure/postgres-listing-repository";
import { PRIVATE_CONTACT_CONSENT_VERSION } from "@/modules/private-contact/domain/private-contact";
import { PrivateContactCipher } from "@/modules/private-contact/infrastructure/private-contact-crypto";
import { PostgresPrivateContactRepository } from "@/modules/private-contact/infrastructure/postgres-private-contact-repository";
import { PostgresReservationRepository } from "@/modules/reservations/infrastructure/postgres-reservation-repository";
import { getPostgresPool } from "@/shared/database/postgres";

const key = randomBytes(32);
process.env.PRIVATE_CONTACT_ACTIVE_KEY_VERSION = "1";
process.env.PRIVATE_CONTACT_KEY_V1 = key.toString("base64");
delete process.env.PRIVATE_CONTACT_KEY_V1_FILE;
const cipher = new PrivateContactCipher(new Map([[1, key]]), 1);
const ownerId = `contact-owner-${randomUUID()}`;
const recipientId = `contact-recipient-${randomUUID()}`;
const outsiderId = `contact-outsider-${randomUUID()}`;
const listingIds: string[] = [];

const fields = {
  title: "Artículo con contacto protegido",
  description: "Artículo ficticio aislado para verificar cifrado y autorización de datos privados.",
  categorySlug: "hogar", condition: "GOOD" as const, regionCode: "CL-RM", communeCode: "13120"
};
const plaintext = { phone: "+56945678901", deliveryMethod: "MEETING_POINT" as const, location: "Acceso norte del centro de pruebas", instructions: "Avisar en recepción" };

function record(status: "DRAFT" | "PUBLISHED", withContact: boolean): CreateListingRecord {
  const id = randomUUID();
  listingIds.push(id);
  return {
    id, publicSlug: `contacto-seguro-${randomBytes(6).toString("hex")}`, ownerId, status, fields,
    privateContact: withContact ? cipher.encrypt(id, plaintext, PRIVATE_CONTACT_CONSENT_VERSION) : undefined,
    photos: status === "PUBLISHED" ? [{
      id: randomUUID(), storageKey: randomBytes(32).toString("hex"), position: 0, isPrimary: true, mediaType: "image/webp",
      sourceMediaType: "image/png", sourceWidth: 10, sourceHeight: 10, sourceSha256: randomBytes(32).toString("hex"), processingVersion: 1,
      catalog: { width: 10, height: 10, byteSize: 10 }, detail: { width: 10, height: 10, byteSize: 10 }
    }] : []
  };
}

beforeAll(async () => {
  for (const [id, name] of [[ownerId, "Publicador privado"], [recipientId, "Receptor privado"], [outsiderId, "Tercero privado"]]) {
    await getPostgresPool().query(
      `insert into identity_user (id,name,email,"emailVerified","createdAt","updatedAt",role)
       values ($1,$2,$3,true,now(),now(),'USER')`, [id, name, `${id}@example.test`]
    );
  }
});

afterAll(async () => {
  const client = await getPostgresPool().connect();
  try {
    await client.query("begin");
    await client.query("set constraints all deferred");
    await client.query(
      `delete from reservation_event where actor_id=any($1::text[]) or entity_id=any($2::uuid[])
        or entity_id in (select id from article_request where listing_id=any($2::uuid[]))
        or entity_id in (select id from reservation where listing_id=any($2::uuid[]))`,
      [[ownerId, recipientId, outsiderId], listingIds]
    );
    await client.query("delete from reservation where listing_id=any($1::uuid[])", [listingIds]);
    await client.query("delete from article_request where listing_id=any($1::uuid[])", [listingIds]);
    await client.query("delete from listing_private_contact where listing_id=any($1::uuid[])", [listingIds]);
    await client.query("delete from listing where id=any($1::uuid[])", [listingIds]);
    await client.query("delete from identity_user where id=any($1::text[])", [[ownerId, recipientId, outsiderId]]);
    await client.query("commit");
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
});

describe("contacto privado persistente", () => {
  it("permite borrador sin contacto y cifra una publicación completa", async () => {
    const draft = record("DRAFT", false);
    await new PostgresListingRepository().create(draft);
    expect((await new PostgresListingRepository().getOwnerListing(ownerId, draft.id))?.privateContactComplete).toBe(false);

    const published = record("PUBLISHED", true);
    await new PostgresListingRepository().create(published);
    const raw = await getPostgresPool().query<{ phone: string; location: string; instructions: string }>(
      `select encode(phone_ciphertext,'escape') phone, encode(location_ciphertext,'escape') location,
              encode(instructions_ciphertext,'escape') instructions
       from listing_private_contact where listing_id=$1`, [published.id]
    );
    expect(JSON.stringify(raw.rows[0])).not.toContain(plaintext.phone);
    expect(JSON.stringify(raw.rows[0])).not.toContain(plaintext.location);
    expect(JSON.stringify(await new PostgresListingRepository().getPublicBySlug(published.publicSlug))).not.toMatch(/45678901|Acceso norte|Avisar/);
  });

  it("solo permite consultar y actualizar al propietario con control optimista", async () => {
    const listing = record("PUBLISHED", true);
    await new PostgresListingRepository().create(listing);
    const repository = new PostgresPrivateContactRepository();
    await expect(repository.getForOwner(ownerId, listing.id)).resolves.toMatchObject(plaintext);
    await expect(repository.getForOwner(outsiderId, listing.id)).rejects.toMatchObject({ reason: "FORBIDDEN" });
    await expect(repository.getForOwner(ownerId, randomUUID())).rejects.toMatchObject({ reason: "NOT_FOUND" });

    const changed = { ...plaintext, location: "Nuevo punto ficticio autorizado" };
    const updated = await repository.upsertForOwner({ actorId: ownerId, listingId: listing.id, expectedVersion: 1, encrypted: cipher.encrypt(listing.id, changed, PRIVATE_CONTACT_CONSENT_VERSION), correlationId: randomUUID() });
    expect(updated).toMatchObject({ location: changed.location, version: 2 });
    await expect(repository.upsertForOwner({ actorId: ownerId, listingId: listing.id, expectedVersion: 1, encrypted: cipher.encrypt(listing.id, changed, PRIVATE_CONTACT_CONSENT_VERSION), correlationId: randomUUID() })).rejects.toMatchObject({ reason: "CONFLICT" });
  });

  it("deniega solicitante y receptor aceptado, y exige contacto en publicaciones antiguas", async () => {
    const listing = record("PUBLISHED", true);
    await new PostgresListingRepository().create(listing);
    await getPostgresPool().query("delete from listing_private_contact where listing_id=$1", [listing.id]);
    const reservations = new PostgresReservationRepository();
    const request = await reservations.createRequest({ requesterId: recipientId, listingSlug: listing.publicSlug, requestId: randomUUID(), correlationId: randomUUID() });
    await expect(new PostgresPrivateContactRepository().getForOwner(recipientId, listing.id)).rejects.toMatchObject({ reason: "FORBIDDEN" });
    await expect(reservations.acceptRequest({ actorId: ownerId, requestId: request.id, reservationId: randomUUID(), correlationId: randomUUID() })).rejects.toMatchObject({ reason: "CONTACT_REQUIRED" });

    const contactRepository = new PostgresPrivateContactRepository();
    await contactRepository.upsertForOwner({ actorId: ownerId, listingId: listing.id, expectedVersion: 0, encrypted: cipher.encrypt(listing.id, plaintext, PRIVATE_CONTACT_CONSENT_VERSION), correlationId: randomUUID() });
    const reservation = await reservations.acceptRequest({ actorId: ownerId, requestId: request.id, reservationId: randomUUID(), correlationId: randomUUID() });
    await expect(contactRepository.getForOwner(recipientId, listing.id)).rejects.toMatchObject({ reason: "FORBIDDEN" });
    await expect(contactRepository.getForOwner(ownerId, listing.id)).resolves.toMatchObject(plaintext);

    const changedDuringReservation = { ...plaintext, phone: "+56955555555", location: "Punto que no debe reemplazar la coordinación vigente" };
    await expect(contactRepository.upsertForOwner({
      actorId: ownerId,
      listingId: listing.id,
      expectedVersion: 1,
      encrypted: cipher.encrypt(listing.id, changedDuringReservation, PRIVATE_CONTACT_CONSENT_VERSION),
      correlationId: randomUUID()
    })).rejects.toMatchObject({ reason: "ACTIVE_RESERVATION" });
    await expect(getPostgresPool().query(
      "update listing_private_contact set consent_version=consent_version where listing_id=$1",
      [listing.id]
    )).rejects.toMatchObject({ code: "23514" });

    await reservations.cancelReservation({ actorId: recipientId, reservationId: reservation.id, reason: "Prueba de liberación", correlationId: randomUUID() });
    const updated = await contactRepository.upsertForOwner({
      actorId: ownerId,
      listingId: listing.id,
      expectedVersion: 1,
      encrypted: cipher.encrypt(listing.id, changedDuringReservation, PRIVATE_CONTACT_CONSENT_VERSION),
      correlationId: randomUUID()
    });
    expect(updated).toMatchObject({ phone: changedDuringReservation.phone, location: changedDuringReservation.location, version: 2 });
  });

  it("falla de forma segura si la clave no permite autenticar el dato", async () => {
    const listing = record("PUBLISHED", true);
    await new PostgresListingRepository().create(listing);
    const original = process.env.PRIVATE_CONTACT_KEY_V1;
    process.env.PRIVATE_CONTACT_KEY_V1 = randomBytes(32).toString("base64");
    try {
      await expect(new PostgresPrivateContactRepository().getForOwner(ownerId, listing.id)).rejects.toThrow("cryptographic operation failed");
    } finally { process.env.PRIVATE_CONTACT_KEY_V1 = original; }
  });
});
