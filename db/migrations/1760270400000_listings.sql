-- Up Migration
create table "listing_category" (
  "id" uuid primary key,
  "slug" text not null unique,
  "name" text not null unique,
  "display_order" smallint not null unique check ("display_order" > 0),
  "is_active" boolean not null default true,
  "created_at" timestamptz not null default CURRENT_TIMESTAMP,
  constraint "listing_category_slug_check" check ("slug" ~ '^[a-z0-9-]{2,40}$'),
  constraint "listing_category_name_check" check (char_length(btrim("name")) between 2 and 60)
);

insert into "listing_category" ("id", "slug", "name", "display_order") values
  ('10000000-0000-4000-8000-000000000001', 'hogar', 'Hogar', 1),
  ('10000000-0000-4000-8000-000000000002', 'infantil', 'Infantil', 2),
  ('10000000-0000-4000-8000-000000000003', 'tecnologia', 'Tecnología', 3),
  ('10000000-0000-4000-8000-000000000004', 'libros', 'Libros', 4),
  ('10000000-0000-4000-8000-000000000005', 'ropa', 'Ropa y accesorios', 5),
  ('10000000-0000-4000-8000-000000000006', 'otros', 'Otros', 6);

create table "listing_public_region" (
  "code" text primary key,
  "name" text not null unique,
  constraint "listing_public_region_code_check" check ("code" ~ '^CL-[A-Z]{2,3}$')
);

insert into "listing_public_region" ("code", "name") values
  ('CL-AP', 'Arica y Parinacota'), ('CL-TA', 'Tarapacá'), ('CL-AN', 'Antofagasta'),
  ('CL-AT', 'Atacama'), ('CL-CO', 'Coquimbo'), ('CL-VS', 'Valparaíso'),
  ('CL-RM', 'Metropolitana de Santiago'), ('CL-LI', 'O’Higgins'), ('CL-ML', 'Maule'),
  ('CL-NB', 'Ñuble'), ('CL-BI', 'Biobío'), ('CL-AR', 'La Araucanía'),
  ('CL-LR', 'Los Ríos'), ('CL-LL', 'Los Lagos'), ('CL-AI', 'Aysén'),
  ('CL-MA', 'Magallanes y de la Antártica Chilena');

create table "listing_public_commune" (
  "code" text primary key,
  "region_code" text not null references "listing_public_region" ("code") on update cascade on delete restrict,
  "name" text not null,
  unique ("region_code", "code"),
  unique ("region_code", "name"),
  constraint "listing_public_commune_code_check" check ("code" ~ '^[0-9]{5}$')
);

-- Catálogo inicial controlado. Se amplía mediante migraciones revisadas, no por texto libre.
insert into "listing_public_commune" ("code", "region_code", "name") values
  ('15101', 'CL-AP', 'Arica'), ('01101', 'CL-TA', 'Iquique'),
  ('02101', 'CL-AN', 'Antofagasta'), ('03101', 'CL-AT', 'Copiapó'),
  ('04101', 'CL-CO', 'La Serena'), ('05101', 'CL-VS', 'Valparaíso'),
  ('05109', 'CL-VS', 'Viña del Mar'), ('13101', 'CL-RM', 'Santiago'),
  ('13114', 'CL-RM', 'Las Condes'), ('13119', 'CL-RM', 'Maipú'),
  ('13120', 'CL-RM', 'Ñuñoa'), ('13123', 'CL-RM', 'Providencia'),
  ('13110', 'CL-RM', 'La Florida'), ('06101', 'CL-LI', 'Rancagua'),
  ('07101', 'CL-ML', 'Talca'), ('16101', 'CL-NB', 'Chillán'),
  ('08101', 'CL-BI', 'Concepción'), ('09101', 'CL-AR', 'Temuco'),
  ('14101', 'CL-LR', 'Valdivia'), ('10101', 'CL-LL', 'Puerto Montt'),
  ('11101', 'CL-AI', 'Coyhaique'), ('12101', 'CL-MA', 'Punta Arenas');

create table "listing" (
  "id" uuid primary key,
  "public_slug" text not null unique,
  "owner_id" text not null references "identity_user" ("id") on delete restrict,
  "title" text not null,
  "description" text,
  "category_id" uuid references "listing_category" ("id") on delete restrict,
  "condition" text,
  "status" text not null default 'DRAFT',
  "created_at" timestamptz not null default CURRENT_TIMESTAMP,
  "updated_at" timestamptz not null default CURRENT_TIMESTAMP,
  "published_at" timestamptz,
  "paused_at" timestamptz,
  "removed_at" timestamptz,
  "version" integer not null default 1 check ("version" > 0),
  "search_vector" tsvector generated always as
    (to_tsvector('spanish', coalesce("title", '') || ' ' || coalesce("description", ''))) stored,
  constraint "listing_slug_check" check ("public_slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*-[a-f0-9]{12}$'),
  constraint "listing_title_check" check (char_length(btrim("title")) between 3 and 80),
  constraint "listing_description_check" check ("description" is null or char_length(btrim("description")) between 30 and 2000),
  constraint "listing_condition_check" check ("condition" is null or "condition" in ('LIKE_NEW', 'GOOD', 'USED_FUNCTIONAL', 'NEEDS_REPAIR')),
  constraint "listing_status_check" check ("status" in ('DRAFT', 'PUBLISHED', 'PAUSED', 'REMOVED'))
);

create table "listing_public_location" (
  "listing_id" uuid primary key references "listing" ("id") on delete cascade,
  "region_code" text not null,
  "commune_code" text not null,
  "created_at" timestamptz not null default CURRENT_TIMESTAMP,
  foreign key ("region_code", "commune_code") references "listing_public_commune" ("region_code", "code") on update cascade on delete restrict
);

create table "listing_photo" (
  "id" uuid primary key,
  "listing_id" uuid not null references "listing" ("id") on delete cascade,
  "storage_key" text not null unique,
  "position" smallint not null check ("position" between 0 and 7),
  "is_primary" boolean not null default false,
  "media_type" text not null default 'image/webp' check ("media_type" = 'image/webp'),
  "catalog_width" integer not null check ("catalog_width" between 1 and 640),
  "catalog_height" integer not null check ("catalog_height" between 1 and 640),
  "catalog_byte_size" integer not null check ("catalog_byte_size" > 0),
  "detail_width" integer not null check ("detail_width" between 1 and 1600),
  "detail_height" integer not null check ("detail_height" between 1 and 1600),
  "detail_byte_size" integer not null check ("detail_byte_size" > 0),
  "source_width" integer not null check ("source_width" between 1 and 8000),
  "source_height" integer not null check ("source_height" between 1 and 8000),
  "source_media_type" text not null check ("source_media_type" in ('image/jpeg', 'image/png', 'image/webp')),
  "source_sha256" text not null check ("source_sha256" ~ '^[a-f0-9]{64}$'),
  "processing_version" smallint not null default 1 check ("processing_version" > 0),
  "created_at" timestamptz not null default CURRENT_TIMESTAMP,
  constraint "listing_photo_position_unique" unique ("listing_id", "position") deferrable initially immediate,
  constraint "listing_photo_storage_key_check" check ("storage_key" ~ '^[a-f0-9]{64}$')
);

create unique index "listing_photo_one_primary_idx" on "listing_photo" ("listing_id") where "is_primary";
create index "listing_owner_updated_idx" on "listing" ("owner_id", "updated_at" desc);
create index "listing_public_recent_idx" on "listing" ("published_at" desc, "id") where "status" = 'PUBLISHED';
create index "listing_category_public_idx" on "listing" ("category_id", "published_at" desc) where "status" = 'PUBLISHED';
create index "listing_search_idx" on "listing" using gin ("search_vector");
create index "listing_location_filter_idx" on "listing_public_location" ("region_code", "commune_code", "listing_id");
create index "listing_photo_listing_idx" on "listing_photo" ("listing_id", "position");

create table "listing_storage_cleanup" (
  "id" bigint generated always as identity primary key,
  "storage_key" text not null unique,
  "reason" text not null,
  "attempts" integer not null default 0 check ("attempts" >= 0),
  "last_error" text,
  "created_at" timestamptz not null default CURRENT_TIMESTAMP,
  "completed_at" timestamptz,
  constraint "listing_storage_cleanup_key_check" check ("storage_key" ~ '^[a-f0-9]{64}$')
);

create table "listing_upload_rate_limit" (
  "user_id" text not null references "identity_user" ("id") on delete cascade,
  "window_started_at" timestamptz not null,
  "request_count" smallint not null check ("request_count" between 1 and 100),
  primary key ("user_id", "window_started_at")
);

create or replace function "listing_apply_state_transition"() returns trigger language plpgsql as $$
begin
  if TG_OP = 'UPDATE' then
    if new."status" <> old."status" and not (
      (old."status" = 'DRAFT' and new."status" in ('PUBLISHED', 'REMOVED')) or
      (old."status" = 'PUBLISHED' and new."status" in ('PAUSED', 'REMOVED')) or
      (old."status" = 'PAUSED' and new."status" in ('PUBLISHED', 'REMOVED'))
    ) then
      raise exception 'invalid listing state transition: % -> %', old."status", new."status";
    end if;
    new."version" := old."version" + 1;
    new."updated_at" := CURRENT_TIMESTAMP;
  end if;

  if new."status" = 'PUBLISHED' then
    new."published_at" := coalesce(new."published_at", CURRENT_TIMESTAMP);
    new."paused_at" := null;
  elsif new."status" = 'PAUSED' then
    new."paused_at" := CURRENT_TIMESTAMP;
  elsif new."status" = 'REMOVED' then
    new."removed_at" := coalesce(new."removed_at", CURRENT_TIMESTAMP);
  end if;
  return new;
end;
$$;

create trigger "listing_state_transition_trigger"
before insert or update on "listing"
for each row execute function "listing_apply_state_transition"();

create or replace function "listing_assert_consistency_for_id"(target_id uuid) returns void language plpgsql as $$
declare
  current_listing "listing"%rowtype;
  photo_count integer;
  primary_count integer;
  location_count integer;
begin
  select * into current_listing from "listing" where "id" = target_id;
  if not found then return; end if;

  select count(*), count(*) filter (where "is_primary")
    into photo_count, primary_count from "listing_photo" where "listing_id" = target_id;
  if photo_count > 8 then raise exception 'a listing cannot contain more than 8 photos'; end if;
  if photo_count > 0 and primary_count <> 1 then raise exception 'a listing with photos requires exactly one primary photo'; end if;

  if current_listing."status" = 'PUBLISHED' then
    select count(*) into location_count from "listing_public_location" where "listing_id" = target_id;
    if current_listing."description" is null or current_listing."category_id" is null or current_listing."condition" is null then
      raise exception 'a published listing requires description, category and condition';
    end if;
    if location_count <> 1 then raise exception 'a published listing requires one public location'; end if;
    if photo_count < 1 then raise exception 'a published listing requires at least one photo'; end if;
  end if;
end;
$$;

create or replace function "listing_assert_consistency"() returns trigger language plpgsql as $$
begin
  perform "listing_assert_consistency_for_id"(case when TG_OP = 'DELETE' then old."listing_id" else new."listing_id" end);
  return null;
end;
$$;

create or replace function "listing_assert_row_consistency"() returns trigger language plpgsql as $$
begin
  perform "listing_assert_consistency_for_id"(new."id");
  return null;
end;
$$;

create constraint trigger "listing_consistency_listing_trigger"
after insert or update on "listing" deferrable initially deferred
for each row execute function "listing_assert_row_consistency"();

create constraint trigger "listing_consistency_photo_trigger"
after insert or update or delete on "listing_photo" deferrable initially deferred
for each row execute function "listing_assert_consistency"();

create constraint trigger "listing_consistency_location_trigger"
after insert or update or delete on "listing_public_location" deferrable initially deferred
for each row execute function "listing_assert_consistency"();

comment on table "listing" is 'Publicaciones gratuitas; no existe columna de precio por diseño.';
comment on table "listing_photo" is 'Solo referencias y metadata de variantes procesadas; nunca binarios ni originales.';
comment on table "listing_storage_cleanup" is 'Cola durable para reintentar eliminación de objetos sin referencia.';

-- Down Migration
drop table if exists "listing_upload_rate_limit";
drop table if exists "listing_storage_cleanup";
drop trigger if exists "listing_consistency_location_trigger" on "listing_public_location";
drop trigger if exists "listing_consistency_photo_trigger" on "listing_photo";
drop trigger if exists "listing_consistency_listing_trigger" on "listing";
drop function if exists "listing_assert_consistency"();
drop function if exists "listing_assert_row_consistency"();
drop function if exists "listing_assert_consistency_for_id"(uuid);
drop trigger if exists "listing_state_transition_trigger" on "listing";
drop function if exists "listing_apply_state_transition"();
drop table if exists "listing_photo";
drop table if exists "listing_public_location";
drop table if exists "listing";
drop table if exists "listing_public_commune";
drop table if exists "listing_public_region";
drop table if exists "listing_category";
