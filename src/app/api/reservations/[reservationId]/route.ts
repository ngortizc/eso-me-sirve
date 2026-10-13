import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/identity/application/session";
import { getReservationRepository, isReservationAccessError } from "@/modules/reservations/infrastructure/postgres-reservation-repository";

type Context = { params: Promise<{ reservationId: string }> };

export async function GET(request: Request, { params }: Context) {
  const actor = await getCurrentUser(request.headers);
  if (!actor) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  const { reservationId } = await params;
  const result = await getReservationRepository().getReservation(actor.id, reservationId);
  return result ? NextResponse.json(result) : NextResponse.json({ error: "Reserva no encontrada." }, { status: 404 });
}

export async function PATCH(request: Request, { params }: Context) {
  const actor = await getCurrentUser(request.headers);
  if (!actor) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "La solicitud no contiene JSON válido." }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  const raw = body as Record<string, unknown>;
  if (raw.action !== "cancel" || ["status", "paid", "payment", "actorId", "userId"].some((key) => key in raw)) {
    return NextResponse.json({ error: "Solo se permite cancelar una reserva pendiente de pago." }, { status: 400 });
  }
  const reason = raw.reason === undefined || raw.reason === null || raw.reason === "" ? null : typeof raw.reason === "string" ? raw.reason.trim() : "";
  if (reason !== null && (reason.length < 3 || reason.length > 300)) return NextResponse.json({ error: "El motivo debe tener entre 3 y 300 caracteres." }, { status: 400 });
  const { reservationId } = await params;
  try {
    await getReservationRepository().cancelReservation({ actorId: actor.id, reservationId, reason, correlationId: randomUUID() });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isReservationAccessError(error)) {
      const status = error.reason === "FORBIDDEN" ? 403 : error.reason === "NOT_FOUND" ? 404 : 409;
      return NextResponse.json({ error: error.reason === "EXPIRED" ? "La reserva ya venció y no puede reactivarse." : "No puedes modificar esta reserva." }, { status });
    }
    return NextResponse.json({ error: "No fue posible cancelar la reserva." }, { status: 500 });
  }
}
