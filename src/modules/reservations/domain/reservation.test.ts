import { describe, expect, it } from "vitest";
import {
  canTransitionRequest,
  canTransitionReservation,
  isPaymentWindowExpired,
  paymentExpiresAt,
  PAYMENT_WINDOW_MS,
  requestSelectionAvailability
} from "./reservation";

describe("máquina de estados de solicitudes y reservas", () => {
  it("solo permite transiciones de solicitudes desde PENDING", () => {
    expect(canTransitionRequest("PENDING", "ACCEPTED")).toBe(true);
    expect(canTransitionRequest("PENDING", "REJECTED")).toBe(true);
    expect(canTransitionRequest("PENDING", "CANCELLED")).toBe(true);
    expect(canTransitionRequest("REJECTED", "PENDING")).toBe(false);
    expect(canTransitionRequest("ACCEPTED", "CANCELLED")).toBe(false);
  });

  it("no permite PAID ni reactivar reservas terminales", () => {
    expect(canTransitionReservation("PENDING_PAYMENT", "EXPIRED")).toBe(true);
    expect(canTransitionReservation("PENDING_PAYMENT", "CANCELLED")).toBe(true);
    expect(canTransitionReservation("EXPIRED", "PENDING_PAYMENT")).toBe(false);
  });

  it("calcula 24 horas exactas y vence exactamente en el límite con reloj controlado", () => {
    const accepted = new Date("2026-10-13T12:00:00.000Z");
    const expires = paymentExpiresAt(accepted);
    expect(expires.getTime() - accepted.getTime()).toBe(PAYMENT_WINDOW_MS);
    expect(expires.toISOString()).toBe("2026-10-14T12:00:00.000Z");
    expect(isPaymentWindowExpired(expires, new Date(expires.getTime() - 1))).toBe(false);
    expect(isPaymentWindowExpired(expires, expires)).toBe(true);
  });

  it("mantiene una solicitud pendiente en espera mientras existe otra reserva", () => {
    expect(requestSelectionAvailability("PENDING", "PUBLISHED")).toBe("ACTIONABLE");
    expect(requestSelectionAvailability("PENDING", "RESERVED")).toBe("WAITING_RESERVATION");
    expect(requestSelectionAvailability("PENDING", "PAUSED")).toBe("LISTING_UNAVAILABLE");
    expect(requestSelectionAvailability("REJECTED", "PUBLISHED")).toBeNull();
    expect(requestSelectionAvailability("CANCELLED", "PUBLISHED")).toBeNull();
  });
});
