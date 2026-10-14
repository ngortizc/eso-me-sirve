import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/identity/application/session";
import { PRIVATE_CONTACT_CONSENT_VERSION, validatePrivateContact } from "@/modules/private-contact/domain/private-contact";
import { privateContactCryptoPublicMessage } from "@/modules/private-contact/application/private-contact-errors";
import { getPrivateContactCipher, PrivateContactCryptoError } from "@/modules/private-contact/infrastructure/private-contact-crypto";
import {
  getPrivateContactRepository,
  isPrivateContactAccessError,
  type PrivateContactAccessReason
} from "@/modules/private-contact/infrastructure/postgres-private-contact-repository";
import { logger } from "@/shared/logging/logger";

type Context = { params: Promise<{ listingId: string }> };

function privateHeaders() {
  return { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" };
}

function accessResponse(reason: PrivateContactAccessReason) {
  if (reason === "CONFLICT") return NextResponse.json({ error: "Los datos cambiaron en otra sesión. Recarga antes de volver a guardar." }, { status: 409, headers: privateHeaders() });
  if (reason === "INVALID_STATE") return NextResponse.json({ error: "Los datos de una publicación retirada no pueden modificarse." }, { status: 409, headers: privateHeaders() });
  if (reason === "ACTIVE_RESERVATION") return NextResponse.json({ error: "Los datos privados no pueden modificarse mientras exista una reserva pendiente de pago." }, { status: 409, headers: privateHeaders() });
  return NextResponse.json({ error: "Datos privados no encontrados." }, { status: 404, headers: privateHeaders() });
}

function cryptoFailure(error: PrivateContactCryptoError) {
  logger.error("Contacto privado no disponible", { reason: error.kind.toLowerCase() });
  return NextResponse.json({ error: privateContactCryptoPublicMessage(error.kind) }, { status: 503, headers: privateHeaders() });
}

function technicalFailure(operation: "read" | "write") {
  logger.error("Operación de contacto privado fallida", { reason: "internal", operation });
  return NextResponse.json({ error: "No fue posible completar la operación de datos privados." }, { status: 500, headers: privateHeaders() });
}

export async function GET(request: Request, { params }: Context) {
  const actor = await getCurrentUser(request.headers);
  if (!actor) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401, headers: privateHeaders() });
  const { listingId } = await params;
  try {
    const contact = await getPrivateContactRepository().getForOwner(actor.id, listingId);
    return NextResponse.json({ contact }, { headers: privateHeaders() });
  } catch (error) {
    if (isPrivateContactAccessError(error)) return accessResponse(error.reason);
    if (error instanceof PrivateContactCryptoError) return cryptoFailure(error);
    return technicalFailure("read");
  }
}

export async function PUT(request: Request, { params }: Context) {
  const actor = await getCurrentUser(request.headers);
  if (!actor) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401, headers: privateHeaders() });
  if (!actor.emailVerified) return NextResponse.json({ error: "Debes verificar tu correo." }, { status: 403, headers: privateHeaders() });
  const { listingId } = await params;
  let raw: Record<string, unknown>;
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid");
    raw = body as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "La solicitud no contiene JSON válido." }, { status: 400, headers: privateHeaders() });
  }
  if (["actorId", "ownerId", "userId", "reservationId", "paid", "payment", "contactGrant"].some((key) => key in raw)) {
    return NextResponse.json({ error: "La solicitud contiene campos que no están permitidos." }, { status: 400, headers: privateHeaders() });
  }
  const expectedVersion = Number(raw.version ?? 0);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
    return NextResponse.json({ error: "Versión de contacto inválida." }, { status: 400, headers: privateHeaders() });
  }
  const validation = validatePrivateContact(raw, { required: true });
  if (validation.errors.length > 0 || !validation.value) {
    return NextResponse.json({ error: "Revisa los datos privados de entrega.", errors: validation.errors }, { status: 400, headers: privateHeaders() });
  }
  try {
    const encrypted = getPrivateContactCipher().encrypt(listingId, validation.value, PRIVATE_CONTACT_CONSENT_VERSION);
    const contact = await getPrivateContactRepository().upsertForOwner({
      actorId: actor.id,
      listingId,
      expectedVersion,
      encrypted,
      correlationId: randomUUID()
    });
    logger.info("Contacto privado de publicación actualizado", { listingStatus: "protected" });
    return NextResponse.json({ contact }, { headers: privateHeaders() });
  } catch (error) {
    if (isPrivateContactAccessError(error)) return accessResponse(error.reason);
    if (error instanceof PrivateContactCryptoError) return cryptoFailure(error);
    return technicalFailure("write");
  }
}
