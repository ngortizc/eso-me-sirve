-- Up Migration
create table "listing_private_contact" (
  "id" uuid primary key,
  "listing_id" uuid not null unique references "listing" ("id") on delete restrict,
  "delivery_method" text not null,
  "phone_ciphertext" bytea not null,
  "phone_nonce" bytea not null,
  "phone_auth_tag" bytea not null,
  "location_ciphertext" bytea not null,
  "location_nonce" bytea not null,
  "location_auth_tag" bytea not null,
  "instructions_ciphertext" bytea,
  "instructions_nonce" bytea,
  "instructions_auth_tag" bytea,
  "key_version" integer not null check ("key_version" > 0),
  "consent_version" text not null,
  "consented_at" timestamptz not null default CURRENT_TIMESTAMP,
  "created_at" timestamptz not null default CURRENT_TIMESTAMP,
  "updated_at" timestamptz not null default CURRENT_TIMESTAMP,
  "version" integer not null default 1 check ("version" > 0),
  constraint "listing_private_contact_delivery_method_check"
    check ("delivery_method" in ('HOME_ADDRESS', 'MEETING_POINT')),
  constraint "listing_private_contact_crypto_shape_check" check (
    octet_length("phone_ciphertext") > 0 and octet_length("phone_nonce") = 12 and octet_length("phone_auth_tag") = 16 and
    octet_length("location_ciphertext") > 0 and octet_length("location_nonce") = 12 and octet_length("location_auth_tag") = 16 and
    (("instructions_ciphertext" is null and "instructions_nonce" is null and "instructions_auth_tag" is null) or
     (octet_length("instructions_ciphertext") > 0 and octet_length("instructions_nonce") = 12 and octet_length("instructions_auth_tag") = 16))
  ),
  constraint "listing_private_contact_consent_version_check"
    check (char_length(btrim("consent_version")) between 1 and 40)
);

create index "listing_private_contact_key_version_idx" on "listing_private_contact" ("key_version", "listing_id");

create or replace function "listing_private_contact_apply_update"() returns trigger language plpgsql as $$
begin
  if new."listing_id" <> old."listing_id" or new."id" <> old."id" then
    raise exception 'private contact identity cannot change';
  end if;
  new."version" := old."version" + 1;
  new."updated_at" := CURRENT_TIMESTAMP;
  return new;
end;
$$;

create trigger "listing_private_contact_update_trigger"
before update on "listing_private_contact"
for each row execute function "listing_private_contact_apply_update"();

create or replace function "listing_assert_private_contact_ready"() returns trigger language plpgsql as $$
begin
  if (
    (TG_OP = 'INSERT' and new."status" = 'PUBLISHED') or
    (TG_OP = 'UPDATE' and old."status" in ('DRAFT', 'PAUSED') and new."status" = 'PUBLISHED') or
    (TG_OP = 'UPDATE' and old."status" = 'PUBLISHED' and new."status" = 'RESERVED')
  ) and not exists (
    select 1 from "listing_private_contact" c where c."listing_id" = new."id"
  ) then
    raise exception 'a listing requires complete private contact before publishing or accepting a request';
  end if;
  return null;
end;
$$;

create constraint trigger "listing_private_contact_ready_trigger"
after insert or update on "listing" deferrable initially deferred
for each row execute function "listing_assert_private_contact_ready"();

comment on table "listing_private_contact" is
  'Contacto privado cifrado por publicación. Solo el propietario puede leerlo en EMS-005A; no forma parte de DTO públicos.';
comment on column "listing_private_contact"."delivery_method" is
  'Metadato no identificador restringido; teléfono, ubicación e indicaciones permanecen cifrados.';
comment on column "listing_private_contact"."key_version" is
  'Identificador de la clave externa a PostgreSQL; la clave nunca se almacena en esta tabla.';

-- Down Migration
drop trigger if exists "listing_private_contact_ready_trigger" on "listing";
drop function if exists "listing_assert_private_contact_ready"();
drop trigger if exists "listing_private_contact_update_trigger" on "listing_private_contact";
drop function if exists "listing_private_contact_apply_update"();
drop table if exists "listing_private_contact";
