-- Up Migration
create table "identity_consumed_token" (
  "digest" text primary key,
  "kind" text not null constraint "identity_consumed_token_kind_check" check ("kind" in ('EMAIL_VERIFICATION')),
  "consumed_at" timestamptz default CURRENT_TIMESTAMP not null
);

comment on table "identity_consumed_token" is 'Digest irreversible para imponer uso único sin persistir el token original.';

-- Down Migration
drop table if exists "identity_consumed_token";
