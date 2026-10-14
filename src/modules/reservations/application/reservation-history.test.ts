import { describe, expect, it } from "vitest";
import { reservationEventDescription } from "./reservation-history";

describe("historial comprensible de reservas", () => {
  it.each([
    ["REQUEST_CREATED", "REQUEST", "Solicitud enviada"],
    ["REQUEST_ACCEPTED", "REQUEST", "Solicitud aceptada por el publicador"],
    ["RESERVATION_CREATED", "RESERVATION", "Reserva creada; esperando pago del receptor"],
    ["PAYMENT_WINDOW_EXPIRED", "RESERVATION", "El plazo de pago venció"],
    ["PRIVATE_CONTACT_UPDATED", "LISTING", "Datos privados de entrega actualizados"]
  ] as const)("traduce %s sin exponer el código técnico", (action, entityType, expected) => {
    const description = reservationEventDescription({ action, entityType });
    expect(description).toBe(expected);
    expect(description).not.toContain(action);
    expect(description).not.toContain("PENDING_PAYMENT");
  });

  it("usa una descripción segura para eventos futuros", () => {
    expect(reservationEventDescription({ action: "FUTURE_INTERNAL_CODE", entityType: "RESERVATION" }))
      .toBe("Cambio registrado en la reserva");
  });
});
