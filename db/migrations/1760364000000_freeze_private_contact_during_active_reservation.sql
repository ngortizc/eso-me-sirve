-- Up Migration
create or replace function "listing_private_contact_reject_active_reservation_write"() returns trigger language plpgsql as $$
begin
  if exists (
    select 1
    from "reservation" r
    where r."listing_id" = new."listing_id"
      and r."status" = 'PENDING_PAYMENT'
  ) then
    raise exception using
      errcode = '23514',
      message = 'private contact cannot change while a reservation is pending payment';
  end if;
  return new;
end;
$$;

create trigger "listing_private_contact_active_reservation_write_trigger"
before insert or update on "listing_private_contact"
for each row execute function "listing_private_contact_reject_active_reservation_write"();

comment on function "listing_private_contact_reject_active_reservation_write"() is
  'Impide crear o modificar contacto privado durante una reserva PENDING_PAYMENT. La lectura del propietario sigue permitida.';

-- Down Migration
drop trigger if exists "listing_private_contact_active_reservation_write_trigger" on "listing_private_contact";
drop function if exists "listing_private_contact_reject_active_reservation_write"();
