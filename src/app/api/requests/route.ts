import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/identity/application/session";
import { getReservationRepository, isReservationAccessError } from "@/modules/reservations/infrastructure/postgres-reservation-repository";
import { logger } from "@/shared/logging/logger";

function accessResponse(reason: string) {
  if (reason === "OWN_LISTING") return NextResponse.json({ error: "No puedes solicitar tu propia publicación." }, { status: 409 });
  if (reason === "DUPLICATE") return NextResponse.json({ error: "Ya tienes una solicitud pendiente para este artículo." }, { status: 409 });
  if (reason === "NOT_FOUND") return NextResponse.json({ error: "Publicación no encontrada." }, { status: 404 });
  return NextResponse.json({ error: "El artículo ya no está disponible para nuevas solicitudes." }, { status: 409 });
}

export async function POST(request: Request) {
  const actor = await getCurrentUser(request.headers);
  if (!actor) return NextResponse.json({ error: "Debes iniciar sesión para solicitar un artículo." }, { status: 401 });
  if (!actor.emailVerified) return NextResponse.json({ error: "Verifica tu correo antes de solicitar un artículo." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "La solicitud no contiene JSON válido." }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  const raw = body as Record<string, unknown>;
  if (["requesterId", "userId", "ownerId", "status", "payment", "paid"].some((key) => key in raw)) {
    return NextResponse.json({ error: "La solicitud contiene campos que no están permitidos." }, { status: 400 });
  }
  if (typeof raw.listingSlug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*-[a-f0-9]{12}$/.test(raw.listingSlug)) {
    return NextResponse.json({ error: "Publicación inválida." }, { status: 400 });
  }
  try {
    const created = await getReservationRepository().createRequest({ requesterId: actor.id, listingSlug: raw.listingSlug, requestId: randomUUID(), correlationId: randomUUID() });
    logger.info("Solicitud de artículo creada", { status: created.status });
    return NextResponse.json({ request: created }, { status: 201 });
  } catch (error) {
    if (isReservationAccessError(error)) return accessResponse(error.reason);
    logger.error("No fue posible crear la solicitud", { reason: "internal" });
    return NextResponse.json({ error: "No fue posible crear la solicitud." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const actor = await getCurrentUser(request.headers);
  if (!actor) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  const scope = new URL(request.url).searchParams.get("scope") ?? "sent";
  if (scope !== "sent" && scope !== "received") return NextResponse.json({ error: "Ámbito inválido." }, { status: 400 });
  const overview = await getReservationRepository().getOverview(actor.id);
  return NextResponse.json({ requests: scope === "sent" ? overview.sent : overview.received, serverNow: overview.serverNow });
}
