import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CreateListingRecord } from "@/modules/listings/application/listing-repository";
import { PostgresListingRepository } from "@/modules/listings/infrastructure/postgres-listing-repository";
import { getPostgresPool } from "@/shared/database/postgres";
import { PRIVATE_CONTACT_CONSENT_VERSION } from "@/modules/private-contact/domain/private-contact";
import { PrivateContactCipher } from "@/modules/private-contact/infrastructure/private-contact-crypto";

const privateContactKey = randomBytes(32);
process.env.PRIVATE_CONTACT_ACTIVE_KEY_VERSION = "1";
process.env.PRIVATE_CONTACT_KEY_V1 = privateContactKey.toString("base64");
delete process.env.PRIVATE_CONTACT_KEY_V1_FILE;
const contactCipher = new PrivateContactCipher(new Map([[1, privateContactKey]]), 1);

const ownerId = `editing-owner-${randomUUID()}`;
const otherId = `editing-other-${randomUUID()}`;
const listingIds: string[] = [];
const storageKeys: string[] = [];

const fields = {
  title: "Publicación ficticia para edición",
  description: "Artículo ficticio aislado para comprobar edición y fotografías sin tocar datos personales existentes.",
  categorySlug: "hogar",
  condition: "GOOD" as const,
  regionCode: "CL-RM",
  communeCode: "13120"
};

function photo(position: number, isPrimary = position === 0) {
  const storageKey = randomBytes(32).toString("hex");
  storageKeys.push(storageKey);
  return {
    id: randomUUID(), storageKey, position, isPrimary, mediaType: "image/webp" as const,
    sourceMediaType: "image/jpeg" as const, sourceWidth: 1200, sourceHeight: 900,
    sourceSha256: randomBytes(32).toString("hex"), processingVersion: 1,
    catalog: { width: 640, height: 480, byteSize: 100 }, detail: { width: 1200, height: 900, byteSize: 200 }
  };
}

async function createListing(status: "DRAFT" | "PUBLISHED" = "PUBLISHED", photoCount = 2) {
  const id = randomUUID();
  listingIds.push(id);
  const record: CreateListingRecord = {
    id, publicSlug: `edicion-ficticia-${randomBytes(6).toString("hex")}`, ownerId, status, fields,
    privateContact: contactCipher.encrypt(id, { phone: "+56922222222", deliveryMethod: "MEETING_POINT", location: "Lugar ficticio de integración", instructions: null }, PRIVATE_CONTACT_CONSENT_VERSION),
    photos: Array.from({ length: photoCount }, (_, index) => photo(index))
  };
  await new PostgresListingRepository().create(record);
  return { id, slug: record.publicSlug, photos: record.photos };
}

beforeAll(async () => {
  for (const [id, email] of [[ownerId, `${ownerId}@example.cl`], [otherId, `${otherId}@example.cl`]]) {
    await getPostgresPool().query(
      `insert into identity_user (id, name, email, "emailVerified", "createdAt", "updatedAt", role)
       values ($1, 'Prueba edición', $2, true, now(), now(), 'USER')`, [id, email]
    );
  }
});

afterAll(async () => {
  await getPostgresPool().query("delete from reservation_event where actor_id=any($1::text[])", [[ownerId, otherId]]);
  await getPostgresPool().query("delete from listing_private_contact where listing_id=any($1::uuid[])", [listingIds]);
  await getPostgresPool().query("delete from listing where id=any($1::uuid[])", [listingIds]);
  await getPostgresPool().query("delete from listing_storage_cleanup where storage_key=any($1::text[])", [storageKeys]);
  await getPostgresPool().query("delete from identity_user where id=any($1::text[])", [[ownerId, otherId]]);
});

describe("edición, fotografías y retiro persistentes", () => {
  it("edita título y descripción y conserva el cambio al crear otra instancia", async () => {
    const listing = await createListing();
    const repository = new PostgresListingRepository();
    const current = await repository.getOwnerListing(ownerId, listing.id);
    const changed = { ...fields, title: "Título corregido y persistente", description: "Descripción corregida que permanece después de simular el reinicio del repositorio." };
    await repository.updateOwnerListing(ownerId, listing.id, changed, "PUBLISHED", current!.version);
    await expect(new PostgresListingRepository().getOwnerListing(ownerId, listing.id)).resolves.toMatchObject(changed);
  });

  it("cambia principal, agrega, reordena, reemplaza y elimina sin dejar referencias antiguas", async () => {
    const listing = await createListing();
    const repository = new PostgresListingRepository();
    await repository.setOwnerPrimaryPhoto(ownerId, listing.id, listing.photos[1]!.id);
    expect((await repository.getOwnerListing(ownerId, listing.id))!.photos[1]!.isPrimary).toBe(true);

    const added = photo(2, false);
    await repository.addOwnerPhotos(ownerId, listing.id, [added], null);
    await repository.reorderOwnerPhotos(ownerId, listing.id, [added.id, listing.photos[1]!.id, listing.photos[0]!.id]);
    expect((await repository.getOwnerListing(ownerId, listing.id))!.photos.map((item) => item.id)).toEqual([added.id, listing.photos[1]!.id, listing.photos[0]!.id]);

    const replacement = photo(0, false);
    const oldStorageKey = await repository.replaceOwnerPhoto(ownerId, listing.id, listing.photos[1]!.id, replacement);
    expect(oldStorageKey).toBe(listing.photos[1]!.storageKey);
    expect(await repository.photoAccess(listing.photos[1]!.id, null)).toBeNull();
    expect((await repository.getOwnerListing(ownerId, listing.id))!.photos.some((item) => item.id === replacement.id)).toBe(true);

    await repository.deleteOwnerPhoto(ownerId, listing.id, replacement.id);
    expect((await repository.getOwnerListing(ownerId, listing.id))!.photos).toHaveLength(2);
  });

  it("impide eliminar la última fotografía de una publicación disponible", async () => {
    const listing = await createListing("PUBLISHED", 1);
    await expect(new PostgresListingRepository().deleteOwnerPhoto(ownerId, listing.id, listing.photos[0]!.id)).rejects.toMatchObject({ reason: "LAST_PHOTO" });
  });

  it("impide publicar sin fotografías", async () => {
    const listing = await createListing("DRAFT", 0);
    const repository = new PostgresListingRepository();
    const current = await repository.getOwnerListing(ownerId, listing.id);
    await expect(repository.updateOwnerListing(ownerId, listing.id, fields, "PUBLISHED", current!.version)).rejects.toThrow(/requires at least one photo/);
    expect((await repository.getOwnerListing(ownerId, listing.id))!.status).toBe("DRAFT");
  });

  it("retira, audita, persiste tras recarga y desaparece del catálogo público", async () => {
    const listing = await createListing();
    const repository = new PostgresListingRepository();
    const current = await repository.getOwnerListing(ownerId, listing.id);
    await repository.retireOwnerListing(ownerId, listing.id, current!.version);
    expect((await new PostgresListingRepository().getOwnerListing(ownerId, listing.id))!.status).toBe("REMOVED");
    expect(await repository.getPublicBySlug(listing.slug)).toBeNull();
    const audit = await getPostgresPool().query<{ action: string; previous_state: string; new_state: string }>(
      "select action, previous_state, new_state from reservation_event where entity_type='LISTING' and entity_id=$1 order by id desc limit 1", [listing.id]
    );
    expect(audit.rows[0]).toEqual({ action: "OWNER_REMOVED_LISTING", previous_state: "PUBLISHED", new_state: "REMOVED" });
  });

  it("deniega al usuario que no es propietario", async () => {
    const listing = await createListing();
    await expect(new PostgresListingRepository().retireOwnerListing(otherId, listing.id, 1)).rejects.toMatchObject({ reason: "FORBIDDEN" });
    await expect(new PostgresListingRepository().reorderOwnerPhotos(otherId, listing.id, listing.photos.map((item) => item.id))).rejects.toMatchObject({ reason: "FORBIDDEN" });
  });
});
