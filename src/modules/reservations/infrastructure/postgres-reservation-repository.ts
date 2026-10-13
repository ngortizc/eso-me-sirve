import type { PoolClient, QueryResultRow } from "pg";
import type {
  ReceivedRequestView,
  ReservationEventView,
  ReservationOverview,
  ReservationRepository,
  ReservationView,
  SentRequestView
} from "../application/reservation-repository";
import type { RequestStatus, ReservationStatus } from "../domain/reservation";
import { CONNECTION_SERVICE_FEE_CLP, requestSelectionAvailability } from "../domain/reservation";
import { publicAlias } from "@/modules/identity/domain/public-alias";
import { getPostgresPool } from "@/shared/database/postgres";

export type ReservationAccessReason = "NOT_FOUND" | "FORBIDDEN" | "OWN_LISTING" | "DUPLICATE" | "INVALID_STATE" | "CONFLICT" | "EXPIRED";

export class ReservationAccessError extends Error {
  constructor(public readonly reason: ReservationAccessReason) {
    super(reason);
    this.name = "ReservationAccessError";
  }
}

const accessReasons = new Set<ReservationAccessReason>(["NOT_FOUND", "FORBIDDEN", "OWN_LISTING", "DUPLICATE", "INVALID_STATE", "CONFLICT", "EXPIRED"]);

export function isReservationAccessError(error: unknown): error is ReservationAccessError {
  return Boolean(error && typeof error === "object" && "reason" in error && accessReasons.has((error as { reason: ReservationAccessReason }).reason));
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "23505");
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

type RequestRow = QueryResultRow & {
  id: string; listing_title: string; listing_slug: string; primary_photo_url: string | null; status: RequestStatus; created_at: Date;
  accepted_at: Date | null; rejection_reason: string | null; cancellation_reason: string | null;
  listing_status: "DRAFT" | "PUBLISHED" | "PAUSED" | "RESERVED" | "REMOVED";
  requester_id: string;
  interested_label: string;
};

type ReservationRow = QueryResultRow & {
  id: string; request_id: string; listing_title: string; listing_slug: string; primary_photo_url: string | null; status: ReservationStatus;
  accepted_at: Date; payment_expires_at: Date; expired_at: Date | null; cancelled_at: Date | null;
  cancellation_reason: string | null; recipient_id: string; owner_id: string; recipient_label: string;
};

type EventRow = QueryResultRow & {
  id: string; entity_type: ReservationEventView["entityType"]; entity_id: string; action: string;
  previous_state: string | null; new_state: string; actor_kind: ReservationEventView["actorKind"];
  occurred_at: Date; correlation_id: string;
};

function requestView(row: RequestRow): SentRequestView {
  return {
    id: row.id,
    listingTitle: row.listing_title,
    listingSlug: row.listing_slug,
    primaryPhotoUrl: row.primary_photo_url,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    acceptedAt: row.accepted_at?.toISOString() ?? null,
    rejectionReason: row.rejection_reason,
    cancellationReason: row.cancellation_reason,
    selectionAvailability: requestSelectionAvailability(row.status, row.listing_status)
  };
}

function reservationView(row: ReservationRow, actorId: string): ReservationView {
  const perspective = row.recipient_id === actorId ? "RECIPIENT" : "PUBLISHER";
  return {
    id: row.id,
    requestId: row.request_id,
    listingTitle: row.listing_title,
    listingSlug: row.listing_slug,
    primaryPhotoUrl: row.primary_photo_url,
    status: row.status,
    acceptedAt: row.accepted_at.toISOString(),
    paymentExpiresAt: row.payment_expires_at.toISOString(),
    expiredAt: row.expired_at?.toISOString() ?? null,
    cancelledAt: row.cancelled_at?.toISOString() ?? null,
    cancellationReason: row.cancellation_reason,
    serviceFeeClp: CONNECTION_SERVICE_FEE_CLP,
    perspective,
    recipientPublicLabel: perspective === "PUBLISHER" ? publicAlias(row.recipient_label, row.recipient_id) : null
  };
}

function eventView(row: EventRow): ReservationEventView {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    previousState: row.previous_state,
    newState: row.new_state,
    actorKind: row.actor_kind,
    occurredAt: row.occurred_at.toISOString(),
    correlationId: row.correlation_id
  };
}

const requestSelect = `select q.id, l.title as listing_title, l.public_slug as listing_slug,
  (select '/api/media/listings/' || p.id || '/catalog' from listing_photo p where p.listing_id=l.id order by p.is_primary desc, p.position limit 1) as primary_photo_url,
  q.status, q.requester_id,
  q.created_at, q.accepted_at, q.rejection_reason, q.cancellation_reason, l.status as listing_status,
  coalesce(nullif(btrim((select u.name from identity_user u where u.id=q.requester_id)), ''), 'Persona interesada') as interested_label`;

const reservationSelect = `select r.id, r.request_id, l.title as listing_title, l.public_slug as listing_slug,
  (select '/api/media/listings/' || p.id || '/catalog' from listing_photo p where p.listing_id=l.id order by p.is_primary desc, p.position limit 1) as primary_photo_url,
  r.status, r.accepted_at, r.payment_expires_at, r.expired_at, r.cancelled_at, r.cancellation_reason,
  r.recipient_id, l.owner_id,
  coalesce(nullif(btrim((select u.name from identity_user u where u.id=r.recipient_id)), ''), 'Persona interesada') as recipient_label`;

export class PostgresReservationRepository implements ReservationRepository {
  async createRequest(input: { requesterId: string; listingSlug: string; requestId: string; correlationId: string }): Promise<SentRequestView> {
    try {
      return await withTransaction(async (client) => {
        await client.query("select reservation_expire_due(100, $1)", [input.correlationId]);
        const listingResult = await client.query<{ id: string; owner_id: string; status: string }>(
          "select id, owner_id, status from listing where public_slug=$1 for update", [input.listingSlug]
        );
        const listing = listingResult.rows[0];
        if (!listing) throw new ReservationAccessError("NOT_FOUND");
        if (listing.owner_id === input.requesterId) throw new ReservationAccessError("OWN_LISTING");
        if (listing.status !== "PUBLISHED") throw new ReservationAccessError("INVALID_STATE");
        const inserted = await client.query<RequestRow>(
          `with q as (
             insert into article_request (id, listing_id, requester_id) values ($1,$2,$3)
             returning id, listing_id, requester_id, status, created_at, accepted_at, rejection_reason, cancellation_reason
           )
           ${requestSelect} from q join listing l on l.id=q.listing_id`,
          [input.requestId, listing.id, input.requesterId]
        );
        await client.query(
          `insert into reservation_event (entity_type, entity_id, action, previous_state, new_state, actor_kind, actor_id, correlation_id)
           values ('REQUEST',$1,'REQUEST_CREATED',null,'PENDING','USER',$2,$3)`,
          [input.requestId, input.requesterId, input.correlationId]
        );
        return requestView(inserted.rows[0]!);
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ReservationAccessError("DUPLICATE");
      throw error;
    }
  }

  async cancelRequest(input: { actorId: string; requestId: string; reason: string | null; correlationId: string }): Promise<void> {
    await withTransaction(async (client) => {
      const locked = await client.query<{ requester_id: string; status: RequestStatus }>(
        "select requester_id, status from article_request where id=$1 for update", [input.requestId]
      );
      const request = locked.rows[0];
      if (!request) throw new ReservationAccessError("NOT_FOUND");
      if (request.requester_id !== input.actorId) throw new ReservationAccessError("FORBIDDEN");
      if (request.status !== "PENDING") throw new ReservationAccessError("INVALID_STATE");
      await client.query("update article_request set status='CANCELLED', cancellation_reason=$2 where id=$1", [input.requestId, input.reason]);
      await client.query(
        `insert into reservation_event (entity_type, entity_id, action, previous_state, new_state, actor_kind, actor_id, correlation_id)
         values ('REQUEST',$1,'REQUEST_CANCELLED','PENDING','CANCELLED','USER',$2,$3)`,
        [input.requestId, input.actorId, input.correlationId]
      );
    });
  }

  async rejectRequest(input: { actorId: string; requestId: string; reason: string | null; correlationId: string }): Promise<void> {
    await withTransaction(async (client) => {
      const locked = await client.query<{ owner_id: string; status: RequestStatus }>(
        `select l.owner_id, q.status from article_request q join listing l on l.id=q.listing_id where q.id=$1 for update of q,l`,
        [input.requestId]
      );
      const request = locked.rows[0];
      if (!request) throw new ReservationAccessError("NOT_FOUND");
      if (request.owner_id !== input.actorId) throw new ReservationAccessError("FORBIDDEN");
      if (request.status !== "PENDING") throw new ReservationAccessError("INVALID_STATE");
      await client.query("update article_request set status='REJECTED', rejection_reason=$2 where id=$1", [input.requestId, input.reason]);
      await client.query(
        `insert into reservation_event (entity_type, entity_id, action, previous_state, new_state, actor_kind, actor_id, correlation_id)
         values ('REQUEST',$1,'REQUEST_REJECTED','PENDING','REJECTED','USER',$2,$3)`,
        [input.requestId, input.actorId, input.correlationId]
      );
    });
  }

  async acceptRequest(input: { actorId: string; requestId: string; reservationId: string; correlationId: string }): Promise<ReservationView> {
    try {
      return await withTransaction(async (client) => {
        await client.query("select reservation_expire_due(100, $1)", [input.correlationId]);
        const locked = await client.query<{ listing_id: string; requester_id: string; request_status: RequestStatus; owner_id: string; listing_status: string }>(
          `select q.listing_id, q.requester_id, q.status as request_status, l.owner_id, l.status as listing_status
           from article_request q join listing l on l.id=q.listing_id where q.id=$1 for update of q,l`, [input.requestId]
        );
        const request = locked.rows[0];
        if (!request) throw new ReservationAccessError("NOT_FOUND");
        if (request.owner_id !== input.actorId) throw new ReservationAccessError("FORBIDDEN");
        if (request.request_status !== "PENDING" || request.listing_status !== "PUBLISHED") throw new ReservationAccessError("INVALID_STATE");

        const nowResult = await client.query<{ accepted_at: Date; payment_expires_at: Date }>(
          "select CURRENT_TIMESTAMP as accepted_at, CURRENT_TIMESTAMP + interval '24 hours' as payment_expires_at"
        );
        const timing = nowResult.rows[0]!;
        await client.query("update article_request set status='ACCEPTED', accepted_at=$2 where id=$1", [input.requestId, timing.accepted_at]);
        await client.query(
          `insert into reservation (id, request_id, listing_id, recipient_id, accepted_at, payment_expires_at)
           values ($1,$2,$3,$4,$5,$6)`,
          [input.reservationId, input.requestId, request.listing_id, request.requester_id, timing.accepted_at, timing.payment_expires_at]
        );
        await client.query("update listing set status='RESERVED' where id=$1 and status='PUBLISHED'", [request.listing_id]);

        await client.query(
          `insert into reservation_event (entity_type,entity_id,action,previous_state,new_state,actor_kind,actor_id,correlation_id) values
           ('REQUEST',$1,'REQUEST_ACCEPTED','PENDING','ACCEPTED','USER',$3,$4),
           ('RESERVATION',$2,'RESERVATION_CREATED',null,'PENDING_PAYMENT','USER',$3,$4),
           ('LISTING',$5,'AVAILABILITY_RESERVED','PUBLISHED','RESERVED','USER',$3,$4)`,
          [input.requestId, input.reservationId, input.actorId, input.correlationId, request.listing_id]
        );
        const row = await client.query<ReservationRow>(
          `${reservationSelect} from reservation r join listing l on l.id=r.listing_id where r.id=$1`, [input.reservationId]
        );
        return reservationView(row.rows[0]!, input.actorId);
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ReservationAccessError("CONFLICT");
      throw error;
    }
  }

  async cancelReservation(input: { actorId: string; reservationId: string; reason: string | null; correlationId: string }): Promise<void> {
    await withTransaction(async (client) => {
      await client.query("select reservation_expire_due(100, $1)", [input.correlationId]);
      const locked = await client.query<{ listing_id: string; recipient_id: string; owner_id: string; status: ReservationStatus }>(
        `select r.listing_id, r.recipient_id, l.owner_id, r.status from reservation r join listing l on l.id=r.listing_id
         where r.id=$1 for update of r,l`, [input.reservationId]
      );
      const reservation = locked.rows[0];
      if (!reservation) throw new ReservationAccessError("NOT_FOUND");
      if (reservation.recipient_id !== input.actorId && reservation.owner_id !== input.actorId) throw new ReservationAccessError("FORBIDDEN");
      if (reservation.status === "EXPIRED") throw new ReservationAccessError("EXPIRED");
      if (reservation.status !== "PENDING_PAYMENT") throw new ReservationAccessError("INVALID_STATE");
      await client.query("update reservation set status='CANCELLED', cancellation_reason=$2 where id=$1", [input.reservationId, input.reason]);
      const released = await client.query("update listing set status='PUBLISHED' where id=$1 and status='RESERVED'", [reservation.listing_id]);
      await client.query(
        `insert into reservation_event (entity_type,entity_id,action,previous_state,new_state,actor_kind,actor_id,correlation_id) values
         ('RESERVATION',$1,'RESERVATION_CANCELLED','PENDING_PAYMENT','CANCELLED','USER',$2,$3)`,
        [input.reservationId, input.actorId, input.correlationId]
      );
      if (released.rowCount === 1) {
        await client.query(
          `insert into reservation_event (entity_type,entity_id,action,previous_state,new_state,actor_kind,actor_id,correlation_id)
           values ('LISTING',$1,'AVAILABILITY_RELEASED','RESERVED','PUBLISHED','USER',$2,$3)`,
          [reservation.listing_id, input.actorId, input.correlationId]
        );
      }
    });
  }

  async expireDue(input: { limit: number; correlationId: string }): Promise<number> {
    const result = await getPostgresPool().query<{ expired_count: number }>(
      "select reservation_expire_due($1,$2) as expired_count", [input.limit, input.correlationId]
    );
    return Number(result.rows[0]?.expired_count ?? 0);
  }

  async getOverview(actorId: string): Promise<ReservationOverview> {
    await this.expireDue({ limit: 100, correlationId: crypto.randomUUID() });
    const [sent, received, recipientReservations, publisherReservations, events, now] = await Promise.all([
      getPostgresPool().query<RequestRow>(`${requestSelect} from article_request q join listing l on l.id=q.listing_id where q.requester_id=$1 order by q.created_at desc`, [actorId]),
      getPostgresPool().query<RequestRow>(`${requestSelect} from article_request q join listing l on l.id=q.listing_id where l.owner_id=$1 order by q.created_at desc`, [actorId]),
      getPostgresPool().query<ReservationRow>(`${reservationSelect} from reservation r join listing l on l.id=r.listing_id where r.recipient_id=$1 order by r.created_at desc`, [actorId]),
      getPostgresPool().query<ReservationRow>(`${reservationSelect} from reservation r join listing l on l.id=r.listing_id where l.owner_id=$1 order by r.created_at desc`, [actorId]),
      getPostgresPool().query<EventRow>(
        `select distinct e.id, e.entity_type, e.entity_id, e.action, e.previous_state, e.new_state, e.actor_kind, e.occurred_at, e.correlation_id
         from reservation_event e
         left join article_request q on e.entity_type='REQUEST' and q.id=e.entity_id
         left join reservation r on e.entity_type='RESERVATION' and r.id=e.entity_id
         left join listing direct_listing on e.entity_type='LISTING' and direct_listing.id=e.entity_id
         left join listing request_listing on request_listing.id=q.listing_id
         left join listing reservation_listing on reservation_listing.id=r.listing_id
         where q.requester_id=$1 or request_listing.owner_id=$1 or r.recipient_id=$1 or reservation_listing.owner_id=$1 or direct_listing.owner_id=$1
         order by e.occurred_at desc, e.id desc limit 100`, [actorId]
      ),
      getPostgresPool().query<{ server_now: Date }>("select CURRENT_TIMESTAMP as server_now")
    ]);
    return {
      sent: sent.rows.map(requestView),
      received: received.rows.map((row): ReceivedRequestView => ({ ...requestView(row), interestedLabel: publicAlias(row.interested_label, row.requester_id) })),
      recipientReservations: recipientReservations.rows.map((row) => reservationView(row, actorId)),
      publisherReservations: publisherReservations.rows.map((row) => reservationView(row, actorId)),
      events: events.rows.map(eventView),
      serverNow: now.rows[0]!.server_now.toISOString()
    };
  }

  async getReservation(actorId: string, reservationId: string): Promise<{ reservation: ReservationView; events: ReservationEventView[]; serverNow: string } | null> {
    await this.expireDue({ limit: 100, correlationId: crypto.randomUUID() });
    const result = await getPostgresPool().query<ReservationRow>(
      `${reservationSelect} from reservation r join listing l on l.id=r.listing_id
       where r.id=$1 and (r.recipient_id=$2 or l.owner_id=$2)`, [reservationId, actorId]
    );
    const row = result.rows[0];
    if (!row) return null;
    const events = await getPostgresPool().query<EventRow>(
      `select id, entity_type, entity_id, action, previous_state, new_state, actor_kind, occurred_at, correlation_id
       from reservation_event where (entity_type='RESERVATION' and entity_id=$1) or (entity_type='REQUEST' and entity_id=$2)
       order by occurred_at, id`, [reservationId, row.request_id]
    );
    const now = await getPostgresPool().query<{ server_now: Date }>("select CURRENT_TIMESTAMP as server_now");
    return { reservation: reservationView(row, actorId), events: events.rows.map(eventView), serverNow: now.rows[0]!.server_now.toISOString() };
  }
}

declare global {
  var emsReservationRepository: PostgresReservationRepository | undefined;
}

export function getReservationRepository(): PostgresReservationRepository {
  globalThis.emsReservationRepository ??= new PostgresReservationRepository();
  return globalThis.emsReservationRepository;
}
