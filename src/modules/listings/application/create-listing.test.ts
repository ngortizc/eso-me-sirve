import { describe, expect, it, vi } from "vitest";
import { CreateListing } from "./create-listing";
import type { ListingRepository } from "./listing-repository";
import type { ListingPhotoStorage, StoredListingPhoto } from "./ports/photo-storage";

const fields = {
  title: "Mesa auxiliar de madera",
  description: "Mesa firme y limpia para retirar coordinando dentro de la comuna.",
  categorySlug: "hogar",
  condition: "GOOD",
  regionCode: "CL-RM",
  communeCode: "13120"
};

const stored: StoredListingPhoto = {
  storageKey: "a".repeat(64), mediaType: "image/webp", sourceMediaType: "image/jpeg",
  sourceWidth: 100, sourceHeight: 100, sourceSha256: "b".repeat(64), processingVersion: 1,
  catalog: { width: 100, height: 100, byteSize: 20 }, detail: { width: 100, height: 100, byteSize: 30 }
};

const privateContact = {
  deliveryMethod: "MEETING_POINT" as const,
  phone: { ciphertext: new Uint8Array([1]), nonce: new Uint8Array(12), authTag: new Uint8Array(16) },
  location: { ciphertext: new Uint8Array([2]), nonce: new Uint8Array(12), authTag: new Uint8Array(16) },
  instructions: null,
  keyVersion: 1,
  consentVersion: "test-v1"
};

function dependencies() {
  const repository: ListingRepository = {
    consumeUploadQuota: vi.fn().mockResolvedValue(true),
    getTaxonomy: vi.fn().mockResolvedValue({ categories: [], regions: [], communes: [] }),
    taxonomyIsValid: vi.fn().mockResolvedValue(true),
    create: vi.fn().mockResolvedValue({ id: "id", slug: "mesa-aaaaaaaaaaaa", status: "PUBLISHED" }),
    enqueueStorageCleanup: vi.fn().mockResolvedValue(undefined)
  };
  const storage: ListingPhotoStorage = {
    store: vi.fn().mockResolvedValue(stored),
    read: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined)
  };
  return { repository, storage };
}

describe("CreateListing", () => {
  it("obtiene el propietario del caso de uso y crea una publicación completa", async () => {
    const { repository, storage } = dependencies();
    await new CreateListing(repository, storage).execute({
      ownerId: "session-user", intent: "publish", fields,
      photos: [{ bytes: new Uint8Array([1]), declaredMediaType: "image/jpeg", originalFileName: "foto.jpg" }], primaryPhotoIndex: 0, privateContact
    });
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ ownerId: "session-user", status: "PUBLISHED" }));
  });

  it("no crea una publicación si falla el almacenamiento", async () => {
    const { repository, storage } = dependencies();
    vi.mocked(storage.store).mockRejectedValue(new Error("storage unavailable"));
    await expect(new CreateListing(repository, storage).execute({
      ownerId: "session-user", intent: "publish", fields,
      photos: [{ bytes: new Uint8Array([1]), declaredMediaType: "image/jpeg", originalFileName: "foto.jpg" }], primaryPhotoIndex: 0, privateContact
    })).rejects.toThrow("storage unavailable");
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("compensa objetos ya guardados cuando falla la base", async () => {
    const { repository, storage } = dependencies();
    vi.mocked(repository.create).mockRejectedValue(new Error("db failed"));
    await expect(new CreateListing(repository, storage).execute({
      ownerId: "session-user", intent: "publish", fields,
      photos: [{ bytes: new Uint8Array([1]), declaredMediaType: "image/jpeg", originalFileName: "foto.jpg" }], primaryPhotoIndex: 0, privateContact
    })).rejects.toThrow("db failed");
    expect(storage.delete).toHaveBeenCalledWith(stored.storageKey);
  });

  it("permite borrador sin contacto y bloquea publicación sin contacto", async () => {
    const { repository, storage } = dependencies();
    await new CreateListing(repository, storage).execute({ ownerId: "session-user", intent: "draft", fields, photos: [], primaryPhotoIndex: 0 });
    await expect(new CreateListing(repository, storage).execute({
      ownerId: "session-user", intent: "publish", fields,
      photos: [{ bytes: new Uint8Array([1]), declaredMediaType: "image/jpeg", originalFileName: "foto.jpg" }], primaryPhotoIndex: 0
    })).rejects.toMatchObject({ errors: expect.arrayContaining([expect.objectContaining({ field: "privateContact" })]) });
  });
});
