import type { PoolClient, QueryResultRow } from "pg";
import { listingConditionLabels, canTransitionListing, type ListingCondition, type ListingStatus } from "@/modules/listings/domain/listing";
import type {
  CreateListingRecord,
  ListingPhotoView,
  ListingRepository,
  ListingTaxonomy,
  OwnerListing,
  PublicListingDetail,
  PublicListingFilters,
  PublicListingSummary
} from "@/modules/listings/application/listing-repository";
import type { ListingFields } from "@/modules/listings/domain/listing-validation";
import { getPostgresPool } from "@/shared/database/postgres";

type PublicRow = QueryResultRow & {
  slug: string; title: string; condition: ListingCondition; category_slug: string; category_name: string;
  region_code: string; region_name: string; commune_code: string; commune_name: string;
  published_at: Date; primary_photo_id: string; total_count?: string;
};

type OwnerRow = QueryResultRow & {
  id: string; slug: string; title: string; description: string | null; status: ListingStatus;
  condition: ListingCondition | null; category_slug: string | null; region_code: string | null;
  commune_code: string | null; updated_at: Date; version: number;
};

type PhotoRow = QueryResultRow & {
  id: string; position: number; is_primary: boolean; detail_width: number; detail_height: number;
};

export class ListingAccessError extends Error {
  constructor(public readonly reason: "NOT_FOUND" | "FORBIDDEN" | "INVALID_STATE" | "LAST_PHOTO") {
    super(reason);
    this.name = "ListingAccessError";
  }
}

const listingAccessReasons = new Set(["NOT_FOUND", "FORBIDDEN", "INVALID_STATE", "LAST_PHOTO"]);

export function isListingAccessError(error: unknown): error is ListingAccessError {
  if (!error || typeof error !== "object" || !("reason" in error)) return false;
  return typeof error.reason === "string" && listingAccessReasons.has(error.reason);
}

function photoView(row: PhotoRow): ListingPhotoView {
  return {
    id: row.id,
    position: row.position,
    isPrimary: row.is_primary,
    catalogUrl: `/api/media/listings/${row.id}/catalog`,
    detailUrl: `/api/media/listings/${row.id}/detail`,
    width: row.detail_width,
    height: row.detail_height
  };
}

function publicSummary(row: PublicRow): PublicListingSummary {
  return {
    slug: row.slug,
    title: row.title,
    condition: row.condition,
    conditionLabel: listingConditionLabels[row.condition],
    categorySlug: row.category_slug,
    categoryName: row.category_name,
    regionCode: row.region_code,
    regionName: row.region_name,
    communeCode: row.commune_code,
    communeName: row.commune_name,
    publishedAt: row.published_at.toISOString(),
    primaryPhotoUrl: `/api/media/listings/${row.primary_photo_id}/catalog`
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
  } finally {
    client.release();
  }
}

export class PostgresListingRepository implements ListingRepository {
  async consumeUploadQuota(ownerId: string): Promise<boolean> {
    const result = await getPostgresPool().query(
      `with current_window as (
         select date_trunc('hour', now()) + floor(extract(minute from now()) / 10) * interval '10 minutes' as started_at
       )
       insert into listing_upload_rate_limit (user_id, window_started_at, request_count)
       select $1, started_at, 1 from current_window
       on conflict (user_id, window_started_at) do update
         set request_count = listing_upload_rate_limit.request_count + 1
         where listing_upload_rate_limit.request_count < 5
       returning request_count`,
      [ownerId]
    );
    return (result.rowCount ?? 0) === 1;
  }

  async getTaxonomy(): Promise<ListingTaxonomy> {
    const [categories, regions, communes] = await Promise.all([
      getPostgresPool().query<{ slug: string; name: string }>("select slug, name from listing_category where is_active order by display_order"),
      getPostgresPool().query<{ code: string; name: string }>("select code, name from listing_public_region order by name"),
      getPostgresPool().query<{ code: string; region_code: string; name: string }>("select code, region_code, name from listing_public_commune order by name")
    ]);
    return {
      categories: categories.rows,
      regions: regions.rows,
      communes: communes.rows.map((row) => ({ code: row.code, regionCode: row.region_code, name: row.name }))
    };
  }

  async taxonomyIsValid(fields: ListingFields): Promise<boolean> {
    const result = await getPostgresPool().query<{ category_ok: boolean; location_ok: boolean }>(
      `select
        ($1::text is null or exists(select 1 from listing_category where slug = $1 and is_active)) as category_ok,
        (($2::text is null and $3::text is null) or exists(
          select 1 from listing_public_commune where region_code = $2 and code = $3
        )) as location_ok`,
      [fields.categorySlug, fields.regionCode, fields.communeCode]
    );
    return Boolean(result.rows[0]?.category_ok && result.rows[0]?.location_ok);
  }

  async create(input: CreateListingRecord) {
    return withTransaction(async (client) => {
      await client.query(
        `insert into listing (id, public_slug, owner_id, title, description, category_id, condition, status)
         values ($1, $2, $3, $4, $5, (select id from listing_category where slug = $6 and is_active), $7, $8)`,
        [input.id, input.publicSlug, input.ownerId, input.fields.title, input.fields.description,
          input.fields.categorySlug, input.fields.condition, input.status]
      );
      if (input.fields.regionCode && input.fields.communeCode) {
        await client.query(
          "insert into listing_public_location (listing_id, region_code, commune_code) values ($1, $2, $3)",
          [input.id, input.fields.regionCode, input.fields.communeCode]
        );
      }
      for (const photo of input.photos) {
        await client.query(
          `insert into listing_photo (
            id, listing_id, storage_key, position, is_primary, media_type,
            catalog_width, catalog_height, catalog_byte_size, detail_width, detail_height, detail_byte_size,
            source_width, source_height, source_media_type, source_sha256, processing_version
          ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
          [photo.id, input.id, photo.storageKey, photo.position, photo.isPrimary, photo.mediaType,
            photo.catalog.width, photo.catalog.height, photo.catalog.byteSize,
            photo.detail.width, photo.detail.height, photo.detail.byteSize,
            photo.sourceWidth, photo.sourceHeight, photo.sourceMediaType, photo.sourceSha256, photo.processingVersion]
        );
      }
      return { id: input.id, slug: input.publicSlug, status: input.status };
    });
  }

  async enqueueStorageCleanup(storageKey: string, reason: string): Promise<void> {
    await getPostgresPool().query(
      `insert into listing_storage_cleanup (storage_key, reason) values ($1, $2)
       on conflict (storage_key) do update set completed_at = null, reason = excluded.reason`,
      [storageKey, reason.slice(0, 120)]
    );
  }

  async listPublic(filters: PublicListingFilters): Promise<{ items: PublicListingSummary[]; total: number; page: number; pageSize: number }> {
    const offset = (filters.page - 1) * filters.pageSize;
    const result = await getPostgresPool().query<PublicRow>(
      `select l.public_slug as slug, l.title, l.condition, c.slug as category_slug, c.name as category_name,
              loc.region_code, r.name as region_name, loc.commune_code, co.name as commune_name,
              l.published_at, photo.id as primary_photo_id, count(*) over() as total_count
       from listing l
       join listing_category c on c.id = l.category_id
       join listing_public_location loc on loc.listing_id = l.id
       join listing_public_region r on r.code = loc.region_code
       join listing_public_commune co on co.code = loc.commune_code and co.region_code = loc.region_code
       join listing_photo photo on photo.listing_id = l.id and photo.is_primary
       where l.status = 'PUBLISHED'
         and ($1::text is null or l.search_vector @@ websearch_to_tsquery('spanish', $1))
         and ($2::text is null or c.slug = $2)
         and ($3::text is null or loc.region_code = $3)
         and ($4::text is null or loc.commune_code = $4)
       order by l.published_at desc, l.id desc
       limit $5 offset $6`,
      [filters.query || null, filters.category || null, filters.region || null, filters.commune || null, filters.pageSize, offset]
    );
    return {
      items: result.rows.map(publicSummary),
      total: Number(result.rows[0]?.total_count ?? 0),
      page: filters.page,
      pageSize: filters.pageSize
    };
  }

  async getPublicBySlug(slug: string): Promise<PublicListingDetail | null> {
    const result = await getPostgresPool().query<PublicRow & { description: string }>(
      `select l.public_slug as slug, l.title, l.description, l.condition, c.slug as category_slug, c.name as category_name,
              loc.region_code, r.name as region_name, loc.commune_code, co.name as commune_name,
              l.published_at, primary_photo.id as primary_photo_id
       from listing l
       join listing_category c on c.id = l.category_id
       join listing_public_location loc on loc.listing_id = l.id
       join listing_public_region r on r.code = loc.region_code
       join listing_public_commune co on co.code = loc.commune_code and co.region_code = loc.region_code
       join listing_photo primary_photo on primary_photo.listing_id = l.id and primary_photo.is_primary
       where l.public_slug = $1 and l.status = 'PUBLISHED'`,
      [slug]
    );
    const row = result.rows[0];
    if (!row) return null;
    const photos = await getPostgresPool().query<PhotoRow>(
      "select id, position, is_primary, detail_width, detail_height from listing_photo where listing_id = (select id from listing where public_slug = $1) order by position",
      [slug]
    );
    return { ...publicSummary(row), description: row.description, photos: photos.rows.map(photoView) };
  }

  async getOwnerListings(ownerId: string): Promise<OwnerListing[]> {
    const listings = await getPostgresPool().query<OwnerRow>(
      `select l.id, l.public_slug as slug, l.title, l.description, l.status, l.condition,
              c.slug as category_slug, loc.region_code, loc.commune_code, l.updated_at, l.version
       from listing l left join listing_category c on c.id = l.category_id
       left join listing_public_location loc on loc.listing_id = l.id
       where l.owner_id = $1 order by l.updated_at desc`,
      [ownerId]
    );
    if (listings.rows.length === 0) return [];
    const photos = await getPostgresPool().query<PhotoRow & { listing_id: string }>(
      "select id, listing_id, position, is_primary, detail_width, detail_height from listing_photo where listing_id = any($1::uuid[]) order by listing_id, position",
      [listings.rows.map((row) => row.id)]
    );
    return listings.rows.map((row) => ({
      id: row.id, slug: row.slug, title: row.title, description: row.description, status: row.status,
      condition: row.condition, categorySlug: row.category_slug, regionCode: row.region_code,
      communeCode: row.commune_code, updatedAt: row.updated_at.toISOString(), version: row.version,
      photos: photos.rows.filter((photo) => photo.listing_id === row.id).map(photoView)
    }));
  }

  async getOwnerListing(ownerId: string, listingId: string): Promise<OwnerListing | null> {
    const items = await this.getOwnerListings(ownerId);
    return items.find((item) => item.id === listingId) ?? null;
  }

  async updateOwnerListing(ownerId: string, listingId: string, fields: ListingFields, nextStatus: ListingStatus, expectedVersion: number): Promise<OwnerListing> {
    await withTransaction(async (client) => {
      const locked = await client.query<{ owner_id: string; status: ListingStatus }>(
        "select owner_id, status from listing where id = $1 for update", [listingId]
      );
      const current = locked.rows[0];
      if (!current) throw new ListingAccessError("NOT_FOUND");
      if (current.owner_id !== ownerId) throw new ListingAccessError("FORBIDDEN");
      if (!canTransitionListing(current.status, nextStatus)) throw new ListingAccessError("INVALID_STATE");
      const updated = await client.query(
        `update listing set title=$3, description=$4,
           category_id=(select id from listing_category where slug=$5 and is_active), condition=$6, status=$7
         where id=$1 and owner_id=$2 and version=$8`,
        [listingId, ownerId, fields.title, fields.description, fields.categorySlug, fields.condition, nextStatus, expectedVersion]
      );
      if (updated.rowCount !== 1) throw new ListingAccessError("INVALID_STATE");
      if (fields.regionCode && fields.communeCode) {
        await client.query(
          `insert into listing_public_location (listing_id, region_code, commune_code) values ($1,$2,$3)
           on conflict (listing_id) do update set region_code=excluded.region_code, commune_code=excluded.commune_code`,
          [listingId, fields.regionCode, fields.communeCode]
        );
      } else {
        await client.query("delete from listing_public_location where listing_id=$1", [listingId]);
      }
    });
    const updated = await this.getOwnerListing(ownerId, listingId);
    if (!updated) throw new ListingAccessError("NOT_FOUND");
    return updated;
  }

  async assertOwner(ownerId: string, listingId: string): Promise<{ status: ListingStatus }> {
    const result = await getPostgresPool().query<{ owner_id: string; status: ListingStatus }>("select owner_id, status from listing where id=$1", [listingId]);
    const row = result.rows[0];
    if (!row) throw new ListingAccessError("NOT_FOUND");
    if (row.owner_id !== ownerId) throw new ListingAccessError("FORBIDDEN");
    return { status: row.status };
  }

  async deleteOwnerPhoto(ownerId: string, listingId: string, photoId: string): Promise<string> {
    return withTransaction(async (client) => {
      await client.query("set constraints listing_photo_position_unique deferred");
      const listingResult = await client.query<{ owner_id: string; status: ListingStatus }>("select owner_id, status from listing where id=$1 for update", [listingId]);
      const listing = listingResult.rows[0];
      if (!listing) throw new ListingAccessError("NOT_FOUND");
      if (listing.owner_id !== ownerId) throw new ListingAccessError("FORBIDDEN");
      const photos = await client.query<{ id: string; storage_key: string; position: number; is_primary: boolean }>(
        "select id, storage_key, position, is_primary from listing_photo where listing_id=$1 order by position for update", [listingId]
      );
      const selected = photos.rows.find((photo) => photo.id === photoId);
      if (!selected) throw new ListingAccessError("NOT_FOUND");
      if (listing.status === "PUBLISHED" && photos.rows.length === 1) throw new ListingAccessError("LAST_PHOTO");
      await client.query("delete from listing_photo where id=$1", [photoId]);
      await client.query("update listing_photo set position = position - 1 where listing_id=$1 and position > $2", [listingId, selected.position]);
      if (selected.is_primary && photos.rows.length > 1) {
        await client.query("update listing_photo set is_primary = (position = (select min(position) from listing_photo where listing_id=$1)) where listing_id=$1", [listingId]);
      }
      await client.query(
        "insert into listing_storage_cleanup (storage_key, reason) values ($1, 'photo-removed') on conflict (storage_key) do update set completed_at=null",
        [selected.storage_key]
      );
      return selected.storage_key;
    });
  }

  async setOwnerPrimaryPhoto(ownerId: string, listingId: string, photoId: string): Promise<void> {
    await withTransaction(async (client) => {
      const listing = await client.query<{ owner_id: string }>("select owner_id from listing where id=$1 for update", [listingId]);
      if (!listing.rows[0]) throw new ListingAccessError("NOT_FOUND");
      if (listing.rows[0].owner_id !== ownerId) throw new ListingAccessError("FORBIDDEN");
      const updated = await client.query("update listing_photo set is_primary=(id=$2) where listing_id=$1", [listingId, photoId]);
      if ((updated.rowCount ?? 0) === 0) throw new ListingAccessError("NOT_FOUND");
      const exists = await client.query("select 1 from listing_photo where listing_id=$1 and id=$2", [listingId, photoId]);
      if (!exists.rows[0]) throw new ListingAccessError("NOT_FOUND");
    });
  }

  async addOwnerPhotos(
    ownerId: string,
    listingId: string,
    photos: CreateListingRecord["photos"],
    makePrimaryIndex: number | null
  ): Promise<void> {
    await withTransaction(async (client) => {
      const listing = await client.query<{ owner_id: string }>("select owner_id from listing where id=$1 for update", [listingId]);
      if (!listing.rows[0]) throw new ListingAccessError("NOT_FOUND");
      if (listing.rows[0].owner_id !== ownerId) throw new ListingAccessError("FORBIDDEN");
      const count = await client.query<{ total: string }>("select count(*) as total from listing_photo where listing_id=$1", [listingId]);
      const currentCount = Number(count.rows[0]?.total ?? 0);
      if (currentCount + photos.length > 8) throw new ListingAccessError("INVALID_STATE");
      if (makePrimaryIndex !== null) await client.query("update listing_photo set is_primary=false where listing_id=$1", [listingId]);
      for (const [index, photo] of photos.entries()) {
        await client.query(
          `insert into listing_photo (
            id, listing_id, storage_key, position, is_primary, media_type,
            catalog_width, catalog_height, catalog_byte_size, detail_width, detail_height, detail_byte_size,
            source_width, source_height, source_media_type, source_sha256, processing_version
          ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
          [photo.id, listingId, photo.storageKey, currentCount + index,
            makePrimaryIndex === index || (currentCount === 0 && index === 0), photo.mediaType,
            photo.catalog.width, photo.catalog.height, photo.catalog.byteSize,
            photo.detail.width, photo.detail.height, photo.detail.byteSize,
            photo.sourceWidth, photo.sourceHeight, photo.sourceMediaType, photo.sourceSha256, photo.processingVersion]
        );
      }
    });
  }

  async photoAccess(photoId: string, requesterId: string | null): Promise<{ storageKey: string; isPublic: boolean } | null> {
    const result = await getPostgresPool().query<{ storage_key: string; status: ListingStatus; owner_id: string }>(
      `select p.storage_key, l.status, l.owner_id from listing_photo p join listing l on l.id=p.listing_id where p.id=$1`, [photoId]
    );
    const row = result.rows[0];
    if (!row) return null;
    const isPublic = row.status === "PUBLISHED";
    if (!isPublic && requesterId !== row.owner_id) return null;
    return { storageKey: row.storage_key, isPublic };
  }

  async completeStorageCleanup(storageKey: string): Promise<void> {
    await getPostgresPool().query("update listing_storage_cleanup set completed_at=now(), attempts=attempts+1, last_error=null where storage_key=$1", [storageKey]);
  }

  async failStorageCleanup(storageKey: string): Promise<void> {
    await getPostgresPool().query("update listing_storage_cleanup set attempts=attempts+1, last_error='local delete failed' where storage_key=$1", [storageKey]);
  }
}

declare global {
  var emsListingRepository: PostgresListingRepository | undefined;
}

export function getListingRepository(): PostgresListingRepository {
  globalThis.emsListingRepository ??= new PostgresListingRepository();
  return globalThis.emsListingRepository;
}
