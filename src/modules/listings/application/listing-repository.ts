import type { StoredListingPhoto } from "./ports/photo-storage";
import type { ListingCondition, ListingStatus } from "../domain/listing";
import type { ListingFields } from "../domain/listing-validation";
import type { EncryptedPrivateContact } from "@/modules/private-contact/application/private-contact-repository";

export type ListingTaxonomy = {
  categories: { slug: string; name: string }[];
  regions: { code: string; name: string }[];
  communes: { code: string; regionCode: string; name: string }[];
};

export type CreateListingRecord = {
  id: string;
  publicSlug: string;
  ownerId: string;
  status: "DRAFT" | "PUBLISHED";
  fields: ListingFields;
  photos: Array<StoredListingPhoto & { id: string; position: number; isPrimary: boolean }>;
  privateContact?: EncryptedPrivateContact;
};

export type ListingPhotoView = {
  id: string;
  position: number;
  isPrimary: boolean;
  catalogUrl: string;
  detailUrl: string;
  width: number;
  height: number;
};

export type PublicListingSummary = {
  slug: string;
  title: string;
  condition: ListingCondition;
  conditionLabel: string;
  categorySlug: string;
  categoryName: string;
  regionCode: string;
  regionName: string;
  communeCode: string;
  communeName: string;
  publishedAt: string;
  primaryPhotoUrl: string;
};

export type PublicListingDetail = PublicListingSummary & {
  description: string;
  photos: ListingPhotoView[];
};

export type OwnerListing = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: ListingStatus;
  condition: ListingCondition | null;
  categorySlug: string | null;
  regionCode: string | null;
  communeCode: string | null;
  updatedAt: string;
  version: number;
  privateContactComplete: boolean;
  photos: ListingPhotoView[];
};

export type PublicListingFilters = {
  query?: string;
  category?: string;
  region?: string;
  commune?: string;
  page: number;
  pageSize: number;
};

export interface ListingRepository {
  consumeUploadQuota(ownerId: string): Promise<boolean>;
  getTaxonomy(): Promise<ListingTaxonomy>;
  taxonomyIsValid(fields: ListingFields): Promise<boolean>;
  create(input: CreateListingRecord): Promise<{ id: string; slug: string; status: ListingStatus }>;
  enqueueStorageCleanup(storageKey: string, reason: string): Promise<void>;
}
