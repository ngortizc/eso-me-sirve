import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/identity/application/session";
import { getReservationRepository, isReservationAccessError, type ReservationAccessReason } from "@/modules/reservations/infrastructure/postgres-reservation-repository";
import { logger } from "@/shared/logging/logger";

type Context = { params: Promise<{ requestId: string }> };

function accessResponse(reason: ReservationAccessReason) {
  if (reason === "FORBIDDEN") return NextResponse.json({ error: "No tienes permiso para administrar esta solicitud." }, { status: 403 });
  if (reason === "NOT_FOUND") return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
  if (reason === "CONFLICT") return NextResponse.json({ error: "Otra solicitud ya reservó este artículo." }, { status: 409 });
  if (reason === "CONTACT_REQUIRED") return NextResponse.json({ error: "Completa los datos privados de contacto y entrega antes de aceptar una solicitud." }, { status: 409 });
  return NextResponse.json({ error: "La operación no es válida para el estado actual." }, { status: 409 });
}

function optionalReason(value: unknown): string | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length >= 3 && normalized.length <= 300 ? normalized : undefined;
}

export async function PATCH(request: Request, { params }: Context) {
  const actor = await getCurrentUser(request.headers);
  if (!actor) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  if (!actor.emailVerified) return NextResponse.json({ error: "Debes verificar tu correo." }, { status: 403 });
  const { requestId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "La solicitud no contiene JSON válido." }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  const raw = body as Record<string, unknown>;
  if (["actorId", "userId", "ownerId", "requesterId", "status", "paid", "payment"].some((key) => key in raw)) {
    return NextResponse.json({ error: "La solicitud contiene campos que no están permitidos." }, { status: 400 });
  }
  const action = raw.action;
  if (action !== "cancel" && action !== "reject" && action !== "accept") return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  const reason = optionalReason(raw.reason);
  if (reason === undefined) return NextResponse.json({ error: "El motivo debe tener entre 3 y 300 caracteres." }, { status: 400 });
  try {
    const repository = getReservationRepository();
    if (action === "cancel") await repository.cancelRequest({ actorId: actor.id, requestId, reason, correlationId: randomUUID() });
    if (action === "reject") await repository.rejectRequest({ actorId: actor.id, requestId, reason, correlationId: randomUUID() });
    if (action === "accept") {
      const reservation = await repository.acceptRequest({ actorId: actor.id, requestId, reservationId: randomUUID(), correlationId: randomUUID() });
      logger.info("Solicitud aceptada", { status: reservation.status });
      return NextResponse.json({ reservation });
    }
    logger.info("Solicitud actualizada", { action });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isReservationAccessError(error)) return accessResponse(error.reason);
    logger.error("No fue posible actualizar la solicitud", { reason: "internal" });
    return NextResponse.json({ error: "No fue posible actualizar la solicitud." }, { status: 500 });
  }
}
