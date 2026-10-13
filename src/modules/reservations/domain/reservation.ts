export const requestStatuses = ["PENDING", "ACCEPTED", "REJECTED", "CANCELLED"] as const;
export type RequestStatus = (typeof requestStatuses)[number];

export const requestSelectionAvailabilities = ["ACTIONABLE", "WAITING_RESERVATION", "LISTING_UNAVAILABLE"] as const;
export type RequestSelectionAvailability = (typeof requestSelectionAvailabilities)[number];

export const reservationStatuses = ["PENDING_PAYMENT", "EXPIRED", "CANCELLED"] as const;
export type ReservationStatus = (typeof reservationStatuses)[number];

export const PAYMENT_WINDOW_HOURS = 24;
export const PAYMENT_WINDOW_MS = PAYMENT_WINDOW_HOURS * 60 * 60 * 1000;
export const CONNECTION_SERVICE_FEE_CLP = 1_000;

const requestTransitions: Record<RequestStatus, readonly RequestStatus[]> = {
  PENDING: ["ACCEPTED", "REJECTED", "CANCELLED"],
  ACCEPTED: [],
  REJECTED: [],
  CANCELLED: []
};

const reservationTransitions: Record<ReservationStatus, readonly ReservationStatus[]> = {
  PENDING_PAYMENT: ["EXPIRED", "CANCELLED"],
  EXPIRED: [],
  CANCELLED: []
};

export function canTransitionRequest(from: RequestStatus, to: RequestStatus): boolean {
  return requestTransitions[from].includes(to);
}

export function canTransitionReservation(from: ReservationStatus, to: ReservationStatus): boolean {
  return reservationTransitions[from].includes(to);
}

export function isRequestStatus(value: unknown): value is RequestStatus {
  return typeof value === "string" && requestStatuses.includes(value as RequestStatus);
}

export function isReservationStatus(value: unknown): value is ReservationStatus {
  return typeof value === "string" && reservationStatuses.includes(value as ReservationStatus);
}

export function requestSelectionAvailability(
  requestStatus: RequestStatus,
  listingStatus: "DRAFT" | "PUBLISHED" | "PAUSED" | "RESERVED" | "REMOVED"
): RequestSelectionAvailability | null {
  if (requestStatus !== "PENDING") return null;
  if (listingStatus === "PUBLISHED") return "ACTIONABLE";
  if (listingStatus === "RESERVED") return "WAITING_RESERVATION";
  return "LISTING_UNAVAILABLE";
}

export function paymentExpiresAt(acceptedAt: Date): Date {
  return new Date(acceptedAt.getTime() + PAYMENT_WINDOW_MS);
}

export function isPaymentWindowExpired(paymentExpires: Date, now: Date): boolean {
  return now.getTime() >= paymentExpires.getTime();
}

export const requestStatusLabels: Record<RequestStatus, string> = {
  PENDING: "Pendiente",
  ACCEPTED: "Aceptada",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada"
};

export const reservationStatusLabels: Record<ReservationStatus, string> = {
  PENDING_PAYMENT: "Pendiente de pago",
  EXPIRED: "Vencida",
  CANCELLED: "Cancelada"
};
