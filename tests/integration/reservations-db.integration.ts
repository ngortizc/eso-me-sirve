import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CreateListingRecord } from "@/modules/listings/application/listing-repository";
import { PostgresListingRepository } from "@/modules/listings/infrastructure/postgres-listing-repository";
import { PostgresReservationRepository } from "@/modules/reservations/infrastructure/postgres-reservation-repository";
import { PAYMENT_WINDOW_MS } from "@/modules/reservations/domain/reservation";
import { getPostgresPool } from "@/shared/database/postgres";

const ownerId = `reservation-owner-${randomUUID()}`;
const requesterA = `reservation-a-${randomUUID()}`;
const requesterB = `reservation-b-${randomUUID()}`;
const outsiderId = `reservation-outsider-${randomUUID()}`;
const userIds = [ownerId, requesterA, requesterB, outsiderId];
const listingIds = Array.from({ length: 4 }, () => randomUUID());
const slugs = listingIds.map((_, index) => `reserva-integracion-${index}-${randomBytes(6).toString("hex")}`);
const repository = new PostgresReservationRepository();

async function removePriorFixtures() {
  const prior = await getPostgresPool().query<{ id: string }>("select id from listing where public_slug like 'reserva-integracion-%'");
  const ids = prior.rows.map((row) => row.id);
  const client = await getPostgresPool().connect();
  try {
    await client.query("begin");
    if (ids.length > 0) {
      await client.query(
        `delete from reservation_event where entity_id=any($1::uuid[])
         or entity_id in (select id from article_request where listing_id=any($1::uuid[]))
         or entity_id in (select id from reservation where listing_id=any($1::uuid[]))`, [ids]
      );
      await client.query("delete from reservation where listing_id=any($1::uuid[])", [ids]);
      await client.query("delete from article_request where listing_id=any($1::uuid[])", [ids]);
      await client.query("delete from listing where id=any($1::uuid[])", [ids]);
    }
    await client.query(
      `delete from identity_user where id like any(array['reservation-owner-%','reservation-a-%','reservation-b-%','reservation-outsider-%'])`
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback"); throw error;
  } finally { client.release(); }
}

function record(index: number): CreateListingRecord {
  return {
    id: listingIds[index]!, publicSlug: slugs[index]!, ownerId, status: "PUBLISHED",
    fields: {
      title: `Artículo de reserva ${index}`,
      description: "Artículo gratuito utilizado para validar solicitudes y reservas persistentes en PostgreSQL.",
      categorySlug: "hogar", condition: "GOOD", regionCode: "CL-RM", communeCode: "13120"
    },
    photos: [{
      id: randomUUID(), storageKey: randomBytes(32).toString("hex"), position: 0, isPrimary: true, mediaType: "image/webp",
      sourceMediaType: "image/png", sourceWidth: 10, sourceHeight: 10, sourceSha256: randomBytes(32).toString("hex"), processingVersion: 1,
      catalog: { width: 10, height: 10, byteSize: 10 }, detail: { width: 10, height: 10, byteSize: 10 }
    }]
  };
}

beforeAll(async () => {
  await removePriorFixtures();
  for (const [index, id] of userIds.entries()) {
    const names = ["Publicador A", "Receptor B", "Receptor C", "Persona externa"];
    await getPostgresPool().query(
      `insert into identity_user (id, name, email, "emailVerified", "createdAt", "updatedAt", role)
       values ($1, $2, $3, true, now(), now(), 'USER')`,
      [id, names[index], `reservation-${index}-${randomUUID()}@example.test`]
    );
  }
  for (let index = 0; index < listingIds.length; index += 1) await new PostgresListingRepository().create(record(index));
});

afterAll(async () => {
  const client = await getPostgresPool().connect();
  try {
    await client.query("begin");
    await client.query(
      `delete from reservation_event where actor_id=any($1::text[]) or entity_id=any($2::uuid[])
       or entity_id in (select id from article_request where listing_id=any($2::uuid[]))
       or entity_id in (select id from reservation where listing_id=any($2::uuid[]))`,
      [userIds, listingIds]
    );
    await client.query("delete from reservation where listing_id=any($1::uuid[])", [listingIds]);
    await client.query("delete from article_request where listing_id=any($1::uuid[])", [listingIds]);
    await client.query("delete from listing where id=any($1::uuid[])", [listingIds]);
    await client.query("delete from identity_user where id=any($1::text[])", [userIds]);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback"); throw error;
  } finally { client.release(); }
});

describe("solicitudes y reservas persistentes", () => {
  it("crea una solicitud, evita auto-solicitud y duplicados activos", async () => {
    const created = await repository.createRequest({ requesterId: requesterA, listingSlug: slugs[0]!, requestId: randomUUID(), correlationId: randomUUID() });
    expect(created).toMatchObject({ status: "PENDING", listingSlug: slugs[0] });
    await expect(repository.createRequest({ requesterId: requesterA, listingSlug: slugs[0]!, requestId: randomUUID(), correlationId: randomUUID() })).rejects.toMatchObject({ reason: "DUPLICATE" });
    await expect(repository.createRequest({ requesterId: ownerId, listingSlug: slugs[0]!, requestId: randomUUID(), correlationId: randomUUID() })).rejects.toMatchObject({ reason: "OWN_LISTING" });
  });

  it("cancela solo la solicitud propia y permite una solicitud nueva", async () => {
    const overview = await repository.getOverview(requesterA);
    const pending = overview.sent.find((item) => item.listingSlug === slugs[0]);
    expect(pending).toBeDefined();
    await expect(repository.cancelRequest({ actorId: outsiderId, requestId: pending!.id, reason: null, correlationId: randomUUID() })).rejects.toMatchObject({ reason: "FORBIDDEN" });
    await repository.cancelRequest({ actorId: requesterA, requestId: pending!.id, reason: "Ya no lo necesito", correlationId: randomUUID() });
    const replacement = await repository.createRequest({ requesterId: requesterA, listingSlug: slugs[0]!, requestId: randomUUID(), correlationId: randomUUID() });
    expect(replacement.status).toBe("PENDING");
  });

  it("permite al propietario rechazar y oculta datos personales", async () => {
    await getPostgresPool().query("update identity_user set name='secret-contact@example.test' where id=$1", [requesterB]);
    const created = await repository.createRequest({ requesterId: requesterB, listingSlug: slugs[0]!, requestId: randomUUID(), correlationId: randomUUID() });
    await repository.rejectRequest({ actorId: ownerId, requestId: created.id, reason: "No coincide con la entrega", correlationId: randomUUID() });
    const received = await repository.getOverview(ownerId);
    const serialized = JSON.stringify(received.received);
    expect(serialized).toMatch(/Persona interesada [A-Z0-9]{6}/);
    expect(serialized).not.toContain("secret-contact@example.test");
    expect(serialized).not.toContain(requesterA);
    expect(serialized).not.toContain(requesterB);
    expect(serialized).not.toMatch(/@example\.test|email|phone|address|telefono|direcci[oó]n/i);
  });

  it("acepta exactamente una solicitud concurrente y crea 24 horas exactas", async () => {
    const first = await repository.createRequest({ requesterId: requesterA, listingSlug: slugs[1]!, requestId: randomUUID(), correlationId: randomUUID() });
    const second = await repository.createRequest({ requesterId: requesterB, listingSlug: slugs[1]!, requestId: randomUUID(), correlationId: randomUUID() });
    const attempts = await Promise.allSettled([
      repository.acceptRequest({ actorId: ownerId, requestId: first.id, reservationId: randomUUID(), correlationId: randomUUID() }),
      repository.acceptRequest({ actorId: ownerId, requestId: second.id, reservationId: randomUUID(), correlationId: randomUUID() })
    ]);
    const fulfilled = attempts.filter((item) => item.status === "fulfilled");
    expect(fulfilled).toHaveLength(1);
    const active = await getPostgresPool().query<{ accepted_at: Date; payment_expires_at: Date }>(
      "select accepted_at, payment_expires_at from reservation where listing_id=$1 and status='PENDING_PAYMENT'", [listingIds[1]]
    );
    expect(active.rows).toHaveLength(1);
    expect(active.rows[0]!.payment_expires_at.getTime() - active.rows[0]!.accepted_at.getTime()).toBe(PAYMENT_WINDOW_MS);
    const listing = await getPostgresPool().query<{ status: string }>("select status from listing where id=$1", [listingIds[1]]);
    expect(listing.rows[0]!.status).toBe("RESERVED");
    const ownerOverview = await repository.getOverview(ownerId);
    const selected = ownerOverview.received.find((item) => item.listingSlug === slugs[1] && item.status === "ACCEPTED");
    const waiting = ownerOverview.received.find((item) => item.listingSlug === slugs[1] && item.status === "PENDING");
    expect(selected).toBeDefined();
    expect(waiting?.selectionAvailability).toBe("WAITING_RESERVATION");
    await expect(repository.acceptRequest({ actorId: ownerId, requestId: waiting!.id, reservationId: randomUUID(), correlationId: randomUUID() })).rejects.toMatchObject({ reason: "INVALID_STATE" });
  });

  it("autoriza la reserva solo a participantes y persiste tras crear otro repositorio", async () => {
    const overview = await new PostgresReservationRepository().getOverview(requesterA);
    const reservation = overview.recipientReservations.find((item) => item.listingSlug === slugs[1]);
    if (reservation) {
      expect(await repository.getReservation(outsiderId, reservation.id)).toBeNull();
      const recipientView = await new PostgresReservationRepository().getReservation(requesterA, reservation.id);
      const publisherView = await repository.getReservation(ownerId, reservation.id);
      expect(recipientView?.reservation).toMatchObject({ perspective: "RECIPIENT", recipientPublicLabel: null });
      expect(publisherView?.reservation.perspective).toBe("PUBLISHER");
      expect(publisherView?.reservation.recipientPublicLabel).toBe("Receptor B");
    } else {
      const other = (await repository.getOverview(requesterB)).recipientReservations.find((item) => item.listingSlug === slugs[1]);
      expect(other).toBeDefined();
      expect(await repository.getReservation(outsiderId, other!.id)).toBeNull();
      const recipientView = await new PostgresReservationRepository().getReservation(requesterB, other!.id);
      const publisherView = await repository.getReservation(ownerId, other!.id);
      expect(recipientView?.reservation).toMatchObject({ perspective: "RECIPIENT", recipientPublicLabel: null });
      expect(publisherView?.reservation.perspective).toBe("PUBLISHER");
      expect(publisherView?.reservation.recipientPublicLabel).toMatch(/^Persona interesada [A-Z0-9]{6}$/);
    }
  });

  it("cancela una reserva vigente, rechaza terceros y libera la publicación", async () => {
    const ownerOverview = await repository.getOverview(ownerId);
    const reservation = ownerOverview.publisherReservations.find((item) => item.listingSlug === slugs[1]);
    expect(reservation).toBeDefined();
    const lockedListing = await new PostgresListingRepository().getOwnerListing(ownerId, listingIds[1]!);
    expect(lockedListing?.status).toBe("RESERVED");
    await expect(new PostgresListingRepository().retireOwnerListing(
      ownerId, listingIds[1]!, lockedListing!.version
    )).rejects.toMatchObject({ reason: "INVALID_STATE" });
    await expect(new PostgresListingRepository().updateOwnerListing(
      ownerId, listingIds[1]!, record(1).fields, "RESERVED", lockedListing!.version
    )).rejects.toMatchObject({ reason: "INVALID_STATE" });
    await expect(repository.cancelReservation({ actorId: outsiderId, reservationId: reservation!.id, reason: null, correlationId: randomUUID() })).rejects.toMatchObject({ reason: "FORBIDDEN" });
    const participant = reservation!.perspective === "PUBLISHER" ? ownerId : requesterA;
    await repository.cancelReservation({ actorId: participant, reservationId: reservation!.id, reason: "Cambio de coordinación", correlationId: randomUUID() });
    const state = await getPostgresPool().query<{ reservation_status: string; listing_status: string }>(
      `select r.status as reservation_status, l.status as listing_status from reservation r join listing l on l.id=r.listing_id where r.id=$1`,
      [reservation!.id]
    );
    expect(state.rows[0]).toMatchObject({ reservation_status: "CANCELLED", listing_status: "PUBLISHED" });
    const waiting = (await repository.getOverview(ownerId)).received.find((item) => item.listingSlug === slugs[1] && item.status === "PENDING");
    expect(waiting?.selectionAvailability).toBe("ACTIONABLE");
  });

  it("vence en el límite, libera el artículo una vez y no permite reactivar", async () => {
    const request = await repository.createRequest({ requesterId: requesterA, listingSlug: slugs[2]!, requestId: randomUUID(), correlationId: randomUUID() });
    const waitingRequest = await repository.createRequest({ requesterId: requesterB, listingSlug: slugs[2]!, requestId: randomUUID(), correlationId: randomUUID() });
    const reservationId = randomUUID();
    const client = await getPostgresPool().connect();
    try {
      await client.query("begin");
      const clock = await client.query<{ accepted_at: Date; payment_expires_at: Date }>(
        "select CURRENT_TIMESTAMP - interval '24 hours' as accepted_at, CURRENT_TIMESTAMP as payment_expires_at"
      );
      await client.query("update article_request set status='ACCEPTED', accepted_at=$2 where id=$1", [request.id, clock.rows[0]!.accepted_at]);
      await client.query(
        `insert into reservation (id,request_id,listing_id,recipient_id,accepted_at,payment_expires_at)
         values ($1,$2,$3,$4,$5,$6)`,
        [reservationId, request.id, listingIds[2], requesterA, clock.rows[0]!.accepted_at, clock.rows[0]!.payment_expires_at]
      );
      await client.query("update listing set status='RESERVED' where id=$1", [listingIds[2]]);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback"); throw error;
    } finally { client.release(); }

    expect(await repository.expireDue({ limit: 100, correlationId: randomUUID() })).toBe(1);
    expect(await repository.expireDue({ limit: 100, correlationId: randomUUID() })).toBe(0);
    const state = await getPostgresPool().query<{ reservation_status: string; listing_status: string; event_count: string }>(
      `select r.status as reservation_status, l.status as listing_status,
        (select count(*) from reservation_event where entity_id=r.id and action='PAYMENT_WINDOW_EXPIRED') as event_count
       from reservation r join listing l on l.id=r.listing_id where r.id=$1`, [reservationId]
    );
    expect(state.rows[0]).toMatchObject({ reservation_status: "EXPIRED", listing_status: "PUBLISHED", event_count: "1" });
    await expect(getPostgresPool().query("update reservation set status='PENDING_PAYMENT' where id=$1", [reservationId])).rejects.toThrow();
    const eligible = (await repository.getOverview(ownerId)).received.find((item) => item.id === waitingRequest.id);
    expect(eligible?.selectionAvailability).toBe("ACTIONABLE");
    const nextReservation = await repository.acceptRequest({ actorId: ownerId, requestId: waitingRequest.id, reservationId: randomUUID(), correlationId: randomUUID() });
    expect(nextReservation.status).toBe("PENDING_PAYMENT");
    const activeCount = await getPostgresPool().query<{ count: string }>("select count(*) from reservation where listing_id=$1 and status='PENDING_PAYMENT'", [listingIds[2]]);
    expect(activeCount.rows[0]?.count).toBe("1");
  });

  it("bloquea aceptar publicaciones pausadas o retiradas", async () => {
    const request = await repository.createRequest({ requesterId: requesterA, listingSlug: slugs[3]!, requestId: randomUUID(), correlationId: randomUUID() });
    await getPostgresPool().query("update listing set status='PAUSED' where id=$1", [listingIds[3]]);
    await expect(repository.acceptRequest({ actorId: ownerId, requestId: request.id, reservationId: randomUUID(), correlationId: randomUUID() })).rejects.toMatchObject({ reason: "INVALID_STATE" });
    await getPostgresPool().query("update listing set status='REMOVED' where id=$1", [listingIds[3]]);
    await expect(repository.acceptRequest({ actorId: ownerId, requestId: request.id, reservationId: randomUUID(), correlationId: randomUUID() })).rejects.toMatchObject({ reason: "INVALID_STATE" });
  });
});
