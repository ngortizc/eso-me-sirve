import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CreateListingRecord } from "@/modules/listings/application/listing-repository";
import { PostgresListingRepository } from "@/modules/listings/infrastructure/postgres-listing-repository";
import { getPostgresPool } from "@/shared/database/postgres";

const ownerId = `integration-owner-${randomUUID()}`;
const otherId = `integration-other-${randomUUID()}`;
const listingId = randomUUID();
const slug = `mesa-integracion-${randomBytes(6).toString("hex")}`;
const storageKey = randomBytes(32).toString("hex");

const fields = {
  title: "Mesa persistente de integración",
  description: "Mesa firme utilizada para comprobar persistencia y autorización en PostgreSQL.",
  categorySlug: "hogar",
  condition: "GOOD" as const,
  regionCode: "CL-RM",
  communeCode: "13120"
};

beforeAll(async () => {
  for (const [id, email] of [[ownerId, `${ownerId}@example.cl`], [otherId, `${otherId}@example.cl`]]) {
    await getPostgresPool().query(
      `insert into identity_user (id, name, email, "emailVerified", "createdAt", "updatedAt", role)
       values ($1, 'Integración', $2, true, now(), now(), 'USER')`, [id, email]
    );
  }
});

afterAll(async () => {
  await getPostgresPool().query("delete from listing where id=$1", [listingId]);
  await getPostgresPool().query("delete from identity_user where id=any($1::text[])", [[ownerId, otherId]]);
});

describe("persistencia y autorización de publicaciones", () => {
  it("persiste una publicación y la recupera con una nueva instancia de repositorio", async () => {
    const record: CreateListingRecord = {
      id: listingId, publicSlug: slug, ownerId, status: "PUBLISHED", fields,
      photos: [{
        id: randomUUID(), storageKey, position: 0, isPrimary: true, mediaType: "image/webp",
        sourceMediaType: "image/jpeg", sourceWidth: 1200, sourceHeight: 900,
        sourceSha256: randomBytes(32).toString("hex"), processingVersion: 1,
        catalog: { width: 640, height: 480, byteSize: 100 }, detail: { width: 1200, height: 900, byteSize: 200 }
      }]
    };
    await new PostgresListingRepository().create(record);
    const afterRestart = await new PostgresListingRepository().getPublicBySlug(slug);
    expect(afterRestart).toMatchObject({ slug, title: fields.title, communeName: "Ñuñoa" });
    const serialized = JSON.stringify(afterRestart);
    expect(serialized).not.toContain(ownerId);
    expect(serialized).not.toContain(storageKey);
    expect(serialized).not.toMatch(/phone|address|email/i);
  });

  it("deniega al usuario ajeno y oculta una publicación pausada", async () => {
    const repository = new PostgresListingRepository();
    await expect(repository.assertOwner(otherId, listingId)).rejects.toMatchObject({ reason: "FORBIDDEN" });
    const current = await repository.getOwnerListing(ownerId, listingId);
    expect(current).not.toBeNull();
    await repository.updateOwnerListing(ownerId, listingId, fields, "PAUSED", current!.version);
    expect(await repository.getPublicBySlug(slug)).toBeNull();
    expect((await repository.listPublic({ query: "Mesa persistente", category: "hogar", region: "CL-RM", commune: "13120", page: 1, pageSize: 12 })).items).toHaveLength(0);
  });
});
