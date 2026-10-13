import { randomBytes, randomUUID } from "node:crypto";
import type { ListingRepository } from "./listing-repository";
import type { ListingPhotoStorage, StoredListingPhoto } from "./ports/photo-storage";
import { MAX_LISTING_PHOTO_BYTES, MAX_LISTING_PHOTOS, validateListingFields, type ListingValidationError } from "../domain/listing-validation";

export type CreateListingInput = {
  ownerId: string;
  intent: "draft" | "publish";
  fields: Record<string, unknown>;
  photos: Array<{ bytes: Uint8Array; declaredMediaType: string; originalFileName: string }>;
  primaryPhotoIndex: number;
};

export class ListingInputError extends Error {
  constructor(public readonly errors: ListingValidationError[]) {
    super("Invalid listing input");
    this.name = "ListingInputError";
  }
}

export class ListingRateLimitError extends Error {
  constructor() {
    super("Listing upload rate limit exceeded");
    this.name = "ListingRateLimitError";
  }
}

function slugify(title: string): string {
  const base = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 54) || "articulo";
  return `${base}-${randomBytes(6).toString("hex")}`;
}

export class CreateListing {
  constructor(private readonly repository: ListingRepository, private readonly storage: ListingPhotoStorage) {}

  async execute(input: CreateListingInput) {
    if (input.photos.length > MAX_LISTING_PHOTOS) {
      throw new ListingInputError([{ field: "photos", message: "Puedes adjuntar como máximo 8 fotografías." }]);
    }
    if (input.photos.some((photo) => photo.bytes.byteLength > MAX_LISTING_PHOTO_BYTES)) {
      throw new ListingInputError([{ field: "photos", message: "Cada fotografía puede pesar como máximo 10 MB." }]);
    }
    if (input.photos.length > 0 && (!Number.isInteger(input.primaryPhotoIndex) || input.primaryPhotoIndex < 0 || input.primaryPhotoIndex >= input.photos.length)) {
      throw new ListingInputError([{ field: "photos", message: "Selecciona una fotografía principal válida." }]);
    }

    const publish = input.intent === "publish";
    const validation = validateListingFields(input.fields, { publish, photoCount: input.photos.length });
    if (validation.errors.length > 0) throw new ListingInputError(validation.errors);
    if (!(await this.repository.taxonomyIsValid(validation.value))) {
      throw new ListingInputError([{ field: "taxonomy", message: "La categoría o ubicación seleccionada no es válida." }]);
    }
    if (!(await this.repository.consumeUploadQuota(input.ownerId))) throw new ListingRateLimitError();

    const stored: StoredListingPhoto[] = [];
    try {
      for (const photo of input.photos) stored.push(await this.storage.store(photo));
      return await this.repository.create({
        id: randomUUID(),
        publicSlug: slugify(validation.value.title),
        ownerId: input.ownerId,
        status: publish ? "PUBLISHED" : "DRAFT",
        fields: validation.value,
        photos: stored.map((photo, position) => ({
          ...photo,
          id: randomUUID(),
          position,
          isPrimary: position === input.primaryPhotoIndex
        }))
      });
    } catch (error) {
      for (const photo of stored) {
        try {
          await this.storage.delete(photo.storageKey);
        } catch {
          await this.repository.enqueueStorageCleanup(photo.storageKey, "create-failed").catch(() => undefined);
        }
      }
      throw error;
    }
  }
}
