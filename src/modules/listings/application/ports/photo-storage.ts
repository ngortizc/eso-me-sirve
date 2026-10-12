export const listingPhotoMediaTypes = ["image/jpeg", "image/png", "image/webp"] as const;
export type ListingPhotoMediaType = typeof listingPhotoMediaTypes[number];

export type StoreListingPhotoInput = {
  listingId: string;
  bytes: Uint8Array;
  mediaType: ListingPhotoMediaType;
  originalFileName: string;
};

export type StoredListingPhoto = {
  storageKey: string;
  byteSize: number;
  width: number;
  height: number;
};

/**
 * Puerto futuro del módulo de publicaciones. No tiene implementación en EMS-001.1.
 * La infraestructura deberá validar, sanear y optimizar antes de confirmar el almacenamiento.
 */
export interface ListingPhotoStorage {
  store(input: StoreListingPhotoInput): Promise<StoredListingPhoto>;
  createAuthorizedReadUrl(storageKey: string, expiresInSeconds: number): Promise<string>;
  delete(storageKey: string): Promise<void>;
}
