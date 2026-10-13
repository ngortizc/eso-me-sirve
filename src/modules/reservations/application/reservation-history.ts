import type { ReservationEventView } from "./reservation-repository";

const eventDescriptions: Readonly<Record<string, string>> = {
  REQUEST_CREATED: "Solicitud enviada",
  REQUEST_CANCELLED: "Solicitud cancelada por el receptor",
  REQUEST_REJECTED: "Solicitud rechazada por el publicador",
  REQUEST_ACCEPTED: "Solicitud aceptada por el publicador",
  RESERVATION_CREATED: "Reserva creada; esperando pago del receptor",
  RESERVATION_CANCELLED: "Reserva cancelada y artículo liberado",
  PAYMENT_WINDOW_EXPIRED: "El plazo de pago venció",
  AVAILABILITY_RESERVED: "Artículo reservado para el receptor seleccionado",
  AVAILABILITY_RELEASED: "Artículo disponible nuevamente",
  OWNER_STATUS_CHANGED: "Disponibilidad de la publicación actualizada",
  OWNER_REMOVED_LISTING: "Publicación retirada definitivamente"
};

const fallbackDescriptions: Readonly<Record<ReservationEventView["entityType"], string>> = {
  REQUEST: "Cambio registrado en la solicitud",
  RESERVATION: "Cambio registrado en la reserva",
  LISTING: "Cambio registrado en la publicación"
};

export function reservationEventDescription(event: Pick<ReservationEventView, "action" | "entityType">): string {
  return eventDescriptions[event.action] ?? fallbackDescriptions[event.entityType];
}
