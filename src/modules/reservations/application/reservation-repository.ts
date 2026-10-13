import type { RequestSelectionAvailability, RequestStatus, ReservationStatus } from "../domain/reservation";

export type SentRequestView = Readonly<{
  id: string;
  listingTitle: string;
  listingSlug: string;
  primaryPhotoUrl: string | null;
  status: RequestStatus;
  createdAt: string;
  acceptedAt: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  selectionAvailability: RequestSelectionAvailability | null;
}>;

export type ReceivedRequestView = SentRequestView & Readonly<{
  interestedLabel: string;
}>;

export type ReservationView = Readonly<{
  id: string;
  requestId: string;
  listingTitle: string;
  listingSlug: string;
  primaryPhotoUrl: string | null;
  status: ReservationStatus;
  acceptedAt: string;
  paymentExpiresAt: string;
  expiredAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  serviceFeeClp: number;
  perspective: "RECIPIENT" | "PUBLISHER";
  recipientPublicLabel: string | null;
}>;

export type ReservationEventView = Readonly<{
  id: string;
  entityType: "REQUEST" | "RESERVATION" | "LISTING";
  entityId: string;
  action: string;
  previousState: string | null;
  newState: string;
  actorKind: "USER" | "SYSTEM";
  occurredAt: string;
  correlationId: string;
}>;

export type ReservationOverview = Readonly<{
  sent: SentRequestView[];
  received: ReceivedRequestView[];
  recipientReservations: ReservationView[];
  publisherReservations: ReservationView[];
  events: ReservationEventView[];
  serverNow: string;
}>;

export interface ReservationRepository {
  createRequest(input: { requesterId: string; listingSlug: string; requestId: string; correlationId: string }): Promise<SentRequestView>;
  cancelRequest(input: { actorId: string; requestId: string; reason: string | null; correlationId: string }): Promise<void>;
  rejectRequest(input: { actorId: string; requestId: string; reason: string | null; correlationId: string }): Promise<void>;
  acceptRequest(input: { actorId: string; requestId: string; reservationId: string; correlationId: string }): Promise<ReservationView>;
  cancelReservation(input: { actorId: string; reservationId: string; reason: string | null; correlationId: string }): Promise<void>;
  expireDue(input: { limit: number; correlationId: string }): Promise<number>;
  getOverview(actorId: string): Promise<ReservationOverview>;
  getReservation(actorId: string, reservationId: string): Promise<{ reservation: ReservationView; events: ReservationEventView[]; serverNow: string } | null>;
}
