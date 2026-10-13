-- Up Migration
alter table "listing" drop constraint "listing_status_check";
alter table "listing" add constraint "listing_status_check"
  check ("status" in ('DRAFT', 'PUBLISHED', 'PAUSED', 'RESERVED', 'REMOVED'));

create or replace function "listing_apply_state_transition"() returns trigger language plpgsql as $$
begin
  if TG_OP = 'UPDATE' then
    if new."status" <> old."status" and not (
      (old."status" = 'DRAFT' and new."status" in ('PUBLISHED', 'REMOVED')) or
      (old."status" = 'PUBLISHED' and new."status" in ('PAUSED', 'RESERVED', 'REMOVED')) or
      (old."status" = 'PAUSED' and new."status" in ('PUBLISHED', 'REMOVED')) or
      (old."status" = 'RESERVED' and new."status" in ('PUBLISHED', 'REMOVED'))
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

create table "article_request" (
  "id" uuid primary key,
  "listing_id" uuid not null references "listing" ("id") on delete restrict,
  "requester_id" text not null references "identity_user" ("id") on delete restrict,
  "status" text not null default 'PENDING',
  "rejection_reason" text,
  "cancellation_reason" text,
  "created_at" timestamptz not null default CURRENT_TIMESTAMP,
  "updated_at" timestamptz not null default CURRENT_TIMESTAMP,
  "accepted_at" timestamptz,
  "rejected_at" timestamptz,
  "cancelled_at" timestamptz,
  "version" integer not null default 1 check ("version" > 0),
  constraint "article_request_status_check" check ("status" in ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED')),
  constraint "article_request_rejection_reason_check" check ("rejection_reason" is null or char_length(btrim("rejection_reason")) between 3 and 300),
  constraint "article_request_cancellation_reason_check" check ("cancellation_reason" is null or char_length(btrim("cancellation_reason")) between 3 and 300)
);

create table "reservation" (
  "id" uuid primary key,
  "request_id" uuid not null unique references "article_request" ("id") on delete restrict,
  "listing_id" uuid not null references "listing" ("id") on delete restrict,
  "recipient_id" text not null references "identity_user" ("id") on delete restrict,
  "status" text not null default 'PENDING_PAYMENT',
  "accepted_at" timestamptz not null,
  "payment_expires_at" timestamptz not null,
  "expired_at" timestamptz,
  "cancelled_at" timestamptz,
  "cancellation_reason" text,
  "created_at" timestamptz not null default CURRENT_TIMESTAMP,
  "updated_at" timestamptz not null default CURRENT_TIMESTAMP,
  "version" integer not null default 1 check ("version" > 0),
  constraint "reservation_status_check" check ("status" in ('PENDING_PAYMENT', 'EXPIRED', 'CANCELLED')),
  constraint "reservation_exact_payment_window_check" check ("payment_expires_at" = "accepted_at" + interval '24 hours'),
  constraint "reservation_expired_at_check" check (("status" = 'EXPIRED') = ("expired_at" is not null)),
  constraint "reservation_cancelled_at_check" check (("status" = 'CANCELLED') = ("cancelled_at" is not null)),
  constraint "reservation_cancellation_reason_check" check ("cancellation_reason" is null or char_length(btrim("cancellation_reason")) between 3 and 300)
);

create table "reservation_event" (
  "id" bigint generated always as identity primary key,
  "entity_type" text not null,
  "entity_id" uuid not null,
  "action" text not null,
  "previous_state" text,
  "new_state" text not null,
  "actor_kind" text not null,
  "actor_id" text references "identity_user" ("id") on delete restrict,
  "occurred_at" timestamptz not null default CURRENT_TIMESTAMP,
  "correlation_id" uuid not null,
  "details" jsonb not null default '{}'::jsonb,
  constraint "reservation_event_entity_type_check" check ("entity_type" in ('REQUEST', 'RESERVATION', 'LISTING')),
  constraint "reservation_event_action_check" check (char_length(btrim("action")) between 3 and 80),
  constraint "reservation_event_actor_check" check (
    ("actor_kind" = 'USER' and "actor_id" is not null) or
    ("actor_kind" = 'SYSTEM' and "actor_id" is null)
  ),
  constraint "reservation_event_details_object_check" check (jsonb_typeof("details") = 'object')
);

create unique index "article_request_one_pending_per_user_idx"
  on "article_request" ("listing_id", "requester_id") where "status" = 'PENDING';
create index "article_request_requester_recent_idx" on "article_request" ("requester_id", "created_at" desc);
create index "article_request_listing_status_idx" on "article_request" ("listing_id", "status", "created_at");
create unique index "reservation_one_active_per_listing_idx"
  on "reservation" ("listing_id") where "status" = 'PENDING_PAYMENT';
create index "reservation_recipient_recent_idx" on "reservation" ("recipient_id", "created_at" desc);
create index "reservation_expiration_idx" on "reservation" ("payment_expires_at", "id") where "status" = 'PENDING_PAYMENT';
create index "reservation_event_entity_idx" on "reservation_event" ("entity_type", "entity_id", "occurred_at", "id");
create index "reservation_event_correlation_idx" on "reservation_event" ("correlation_id", "id");

create or replace function "article_request_apply_state_transition"() returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' and new."status" <> 'PENDING' then
    raise exception 'a request must start in PENDING';
  end if;
  if TG_OP = 'UPDATE' then
    if new."listing_id" <> old."listing_id" or new."requester_id" <> old."requester_id" then
      raise exception 'request participants cannot change';
    end if;
    if new."status" <> old."status" and not (old."status" = 'PENDING' and new."status" in ('ACCEPTED', 'REJECTED', 'CANCELLED')) then
      raise exception 'invalid request state transition: % -> %', old."status", new."status";
    end if;
    new."version" := old."version" + 1;
    new."updated_at" := CURRENT_TIMESTAMP;
  end if;
  if new."status" = 'ACCEPTED' then new."accepted_at" := coalesce(new."accepted_at", CURRENT_TIMESTAMP); end if;
  if new."status" = 'REJECTED' then new."rejected_at" := coalesce(new."rejected_at", CURRENT_TIMESTAMP); end if;
  if new."status" = 'CANCELLED' then new."cancelled_at" := coalesce(new."cancelled_at", CURRENT_TIMESTAMP); end if;
  return new;
end;
$$;

create trigger "article_request_state_transition_trigger"
before insert or update on "article_request"
for each row execute function "article_request_apply_state_transition"();

create or replace function "reservation_apply_state_transition"() returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' and new."status" <> 'PENDING_PAYMENT' then
    raise exception 'a reservation must start in PENDING_PAYMENT';
  end if;
  if TG_OP = 'UPDATE' then
    if new."request_id" <> old."request_id" or new."listing_id" <> old."listing_id" or new."recipient_id" <> old."recipient_id" or
       new."accepted_at" <> old."accepted_at" or new."payment_expires_at" <> old."payment_expires_at" then
      raise exception 'reservation identity and payment window cannot change';
    end if;
    if new."status" <> old."status" and not (old."status" = 'PENDING_PAYMENT' and new."status" in ('EXPIRED', 'CANCELLED')) then
      raise exception 'invalid reservation state transition: % -> %', old."status", new."status";
    end if;
    new."version" := old."version" + 1;
    new."updated_at" := CURRENT_TIMESTAMP;
  end if;
  if new."status" = 'EXPIRED' then new."expired_at" := coalesce(new."expired_at", CURRENT_TIMESTAMP); end if;
  if new."status" = 'CANCELLED' then new."cancelled_at" := coalesce(new."cancelled_at", CURRENT_TIMESTAMP); end if;
  return new;
end;
$$;

create trigger "reservation_state_transition_trigger"
before insert or update on "reservation"
for each row execute function "reservation_apply_state_transition"();

create or replace function "reservation_assert_consistency_for_request"(target_request_id uuid) returns void language plpgsql as $$
declare
  current_request "article_request"%rowtype;
  matching_count integer;
begin
  select * into current_request from "article_request" where "id" = target_request_id;
  if not found then return; end if;
  select count(*) into matching_count from "reservation"
    where "request_id" = target_request_id
      and "listing_id" = current_request."listing_id"
      and "recipient_id" = current_request."requester_id";
  if (current_request."status" = 'ACCEPTED' and matching_count <> 1) or
     (current_request."status" <> 'ACCEPTED' and matching_count <> 0) then
    raise exception 'accepted request and reservation must match exactly';
  end if;
end;
$$;

create or replace function "reservation_assert_request_consistency"() returns trigger language plpgsql as $$
begin
  perform "reservation_assert_consistency_for_request"(case when TG_OP = 'DELETE' then old."request_id" else new."request_id" end);
  return null;
end;
$$;

create or replace function "article_request_assert_reservation_consistency"() returns trigger language plpgsql as $$
begin
  perform "reservation_assert_consistency_for_request"(new."id");
  return null;
end;
$$;

create constraint trigger "article_request_reservation_consistency_trigger"
after insert or update on "article_request" deferrable initially deferred
for each row execute function "article_request_assert_reservation_consistency"();

create constraint trigger "reservation_request_consistency_trigger"
after insert or update or delete on "reservation" deferrable initially deferred
for each row execute function "reservation_assert_request_consistency"();

create or replace function "reservation_expire_due"(max_rows integer, event_correlation_id uuid)
returns integer language plpgsql as $$
declare
  due_reservation record;
  expired_count integer := 0;
begin
  if max_rows < 1 or max_rows > 1000 then raise exception 'max_rows must be between 1 and 1000'; end if;
  for due_reservation in
    select r."id", r."listing_id" from "reservation" r
    where r."status" = 'PENDING_PAYMENT' and r."payment_expires_at" <= CURRENT_TIMESTAMP
    order by r."payment_expires_at", r."id"
    for update skip locked limit max_rows
  loop
    update "reservation" set "status" = 'EXPIRED' where "id" = due_reservation."id" and "status" = 'PENDING_PAYMENT';
    if found then
      insert into "reservation_event" ("entity_type", "entity_id", "action", "previous_state", "new_state", "actor_kind", "correlation_id")
        values ('RESERVATION', due_reservation."id", 'PAYMENT_WINDOW_EXPIRED', 'PENDING_PAYMENT', 'EXPIRED', 'SYSTEM', event_correlation_id);
      update "listing" set "status" = 'PUBLISHED' where "id" = due_reservation."listing_id" and "status" = 'RESERVED';
      if found then
        insert into "reservation_event" ("entity_type", "entity_id", "action", "previous_state", "new_state", "actor_kind", "correlation_id")
          values ('LISTING', due_reservation."listing_id", 'AVAILABILITY_RELEASED', 'RESERVED', 'PUBLISHED', 'SYSTEM', event_correlation_id);
      end if;
      expired_count := expired_count + 1;
    end if;
  end loop;
  return expired_count;
end;
$$;

comment on table "article_request" is 'Solicitudes persistentes; no contiene contacto ni dirección de participantes.';
comment on table "reservation" is 'Reserva aceptada con ventana exacta de 24 horas; EMS-004 no admite estado PAID.';
comment on table "reservation_event" is 'Auditoría minimizada de solicitudes, reservas y disponibilidad, sin datos personales.';
comment on function "reservation_expire_due"(integer, uuid) is 'Worker idempotente que usa hora PostgreSQL, bloqueo SKIP LOCKED y libera publicaciones vencidas.';

-- Down Migration
drop function if exists "reservation_expire_due"(integer, uuid);
drop trigger if exists "reservation_request_consistency_trigger" on "reservation";
drop trigger if exists "article_request_reservation_consistency_trigger" on "article_request";
drop function if exists "article_request_assert_reservation_consistency"();
drop function if exists "reservation_assert_request_consistency"();
drop function if exists "reservation_assert_consistency_for_request"(uuid);
drop trigger if exists "reservation_state_transition_trigger" on "reservation";
drop function if exists "reservation_apply_state_transition"();
drop trigger if exists "article_request_state_transition_trigger" on "article_request";
drop function if exists "article_request_apply_state_transition"();
drop table if exists "reservation_event";
drop table if exists "reservation";
drop table if exists "article_request";
alter table "listing" drop constraint "listing_status_check";
alter table "listing" add constraint "listing_status_check"
  check ("status" in ('DRAFT', 'PUBLISHED', 'PAUSED', 'REMOVED'));
create or replace function "listing_apply_state_transition"() returns trigger language plpgsql as $$
begin
  if TG_OP = 'UPDATE' then
    if new."status" <> old."status" and not (
      (old."status" = 'DRAFT' and new."status" in ('PUBLISHED', 'REMOVED')) or
      (old."status" = 'PUBLISHED' and new."status" in ('PAUSED', 'REMOVED')) or
      (old."status" = 'PAUSED' and new."status" in ('PUBLISHED', 'REMOVED'))
    ) then raise exception 'invalid listing state transition: % -> %', old."status", new."status"; end if;
    new."version" := old."version" + 1; new."updated_at" := CURRENT_TIMESTAMP;
  end if;
  if new."status" = 'PUBLISHED' then new."published_at" := coalesce(new."published_at", CURRENT_TIMESTAMP); new."paused_at" := null;
  elsif new."status" = 'PAUSED' then new."paused_at" := CURRENT_TIMESTAMP;
  elsif new."status" = 'REMOVED' then new."removed_at" := coalesce(new."removed_at", CURRENT_TIMESTAMP); end if;
  return new;
end;
$$;
