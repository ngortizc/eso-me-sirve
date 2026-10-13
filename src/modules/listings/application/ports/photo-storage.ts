export const listingPhotoMediaTypes = ["image/jpeg", "image/png", "image/webp"] as const;
export type ListingPhotoMediaType = typeof listingPhotoMediaTypes[number];
export type ListingPhotoVariant = "catalog" | "detail";

export type StoreListingPhotoInput = {
  bytes: Uint8Array;
  declaredMediaType: string;
  originalFileName: string;
};

export type StoredPhotoVariant = { width: number; height: number; byteSize: number };

export type StoredListingPhoto = {
  storageKey: string;
  mediaType: "image/webp";
  sourceMediaType: ListingPhotoMediaType;
  sourceWidth: number;
  sourceHeight: number;
  sourceSha256: string;
  processingVersion: number;
  catalog: StoredPhotoVariant;
  detail: StoredPhotoVariant;
};

export interface ListingPhotoStorage {
  store(input: StoreListingPhotoInput): Promise<StoredListingPhoto>;
  read(storageKey: string, variant: ListingPhotoVariant): Promise<Uint8Array>;
  delete(storageKey: string): Promise<void>;
}

export class ListingPhotoProcessingError extends Error {
  constructor(public readonly code: "INVALID_IMAGE" | "TOO_LARGE" | "DIMENSIONS" | "UNSUPPORTED_FORMAT", message: string) {
    super(message);
    this.name = "ListingPhotoProcessingError";
  }
}
