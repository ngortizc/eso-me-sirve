-- Up Migration
-- Generada con auth@1.7.7 y revisada para node-pg-migrate.
create table "identity_user" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" boolean not null, "image" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null, "role" text not null, "commune" text, constraint "identity_user_role_check" check ("role" in ('USER', 'ADMIN')), constraint "identity_user_email_normalized_check" check ("email" = lower(btrim("email"))));

create table "identity_session" ("id" text not null primary key, "expiresAt" timestamptz not null, "token" text not null unique, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null, "ipAddress" text, "userAgent" text, "userId" text not null references "identity_user" ("id") on delete cascade);

create table "identity_account" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "identity_user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, "scope" text, "password" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null);

create table "identity_verification" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" timestamptz not null, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);

create table "identity_rate_limit" ("id" text not null primary key, "key" text not null unique, "count" integer not null, "lastRequest" bigint not null);

create index "identity_session_userId_idx" on "identity_session" ("userId");

create index "identity_account_userId_idx" on "identity_account" ("userId");

create index "identity_verification_identifier_idx" on "identity_verification" ("identifier");

create unique index "identity_account_provider_account_idx" on "identity_account" ("providerId", "accountId");

create table "identity_test_email" (
  "id" bigint generated always as identity primary key,
  "recipient" text not null,
  "kind" text not null constraint "identity_test_email_kind_check" check ("kind" in ('EMAIL_VERIFICATION', 'PASSWORD_RESET')),
  "action_url" text not null,
  "expires_at" timestamptz not null,
  "created_at" timestamptz default CURRENT_TIMESTAMP not null
);

comment on table "identity_test_email" is 'Buzón de desarrollo local; contiene enlaces sensibles y nunca se usa en producción.';
create index "identity_test_email_recipient_kind_idx" on "identity_test_email" ("recipient", "kind", "created_at" desc);

-- Down Migration
drop table if exists "identity_test_email";
drop table if exists "identity_rate_limit";
drop table if exists "identity_verification";
drop table if exists "identity_account";
drop table if exists "identity_session";
drop table if exists "identity_user";
