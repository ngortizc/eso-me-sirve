import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/identity/application/session";
import { isListingStatus } from "@/modules/listings/domain/listing";
import { validateListingFields } from "@/modules/listings/domain/listing-validation";
import { getListingRepository, isListingAccessError, ListingAccessError } from "@/modules/listings/infrastructure/postgres-listing-repository";
import { logger } from "@/shared/logging/logger";

type Context = { params: Promise<{ listingId: string }> };

function accessResponse(error: ListingAccessError) {
  if (error.reason === "FORBIDDEN") return NextResponse.json({ error: "No tienes permiso para administrar esta publicación." }, { status: 403 });
  if (error.reason === "NOT_FOUND") return NextResponse.json({ error: "Publicación no encontrada." }, { status: 404 });
  if (error.reason === "CONTACT_REQUIRED") return NextResponse.json({ error: "Completa los datos privados de contacto y entrega antes de publicar." }, { status: 409 });
  return NextResponse.json({ error: "La operación no es válida para el estado actual." }, { status: 409 });
}

export async function GET(request: Request, { params }: Context) {
  const actor = await getCurrentUser(request.headers);
  if (!actor) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  const { listingId } = await params;
  try {
    await getListingRepository().assertOwner(actor.id, listingId);
    const listing = await getListingRepository().getOwnerListing(actor.id, listingId);
    return listing ? NextResponse.json({ listing }) : NextResponse.json({ error: "Publicación no encontrada." }, { status: 404 });
  } catch (error) {
    if (isListingAccessError(error)) return accessResponse(error);
    throw error;
  }
}

export async function PATCH(request: Request, { params }: Context) {
  const actor = await getCurrentUser(request.headers);
  if (!actor) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  if (!actor.emailVerified) return NextResponse.json({ error: "Verifica tu correo antes de publicar." }, { status: 403 });
  const { listingId } = await params;

  let raw: Record<string, unknown>;
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid");
    raw = body as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "La solicitud no contiene JSON válido." }, { status: 400 });
  }
  if (["ownerId", "userId", "price", "salePrice", "amount"].some((key) => key in raw)) {
    return NextResponse.json({ error: "La solicitud contiene campos que no están permitidos." }, { status: 400 });
  }
  if (raw.status === "REMOVED") {
    return NextResponse.json({ error: "Usa la acción separada de retiro para retirar una publicación." }, { status: 400 });
  }

  try {
    const repository = getListingRepository();
    await repository.assertOwner(actor.id, listingId);
    const existing = await repository.getOwnerListing(actor.id, listingId);
    if (!existing) throw new ListingAccessError("NOT_FOUND");
    const nextStatus = isListingStatus(raw.status) ? raw.status : existing.status;
    const validation = validateListingFields(raw, { publish: nextStatus === "PUBLISHED", photoCount: existing.photos.length });
    if (validation.errors.length > 0) return NextResponse.json({ error: "Revisa los datos ingresados.", errors: validation.errors }, { status: 400 });
    if (!(await repository.taxonomyIsValid(validation.value))) return NextResponse.json({ error: "Categoría o ubicación inválida." }, { status: 400 });
    const version = typeof raw.version === "number" ? raw.version : Number(raw.version);
    if (!Number.isInteger(version) || version < 1) return NextResponse.json({ error: "Versión de publicación inválida." }, { status: 400 });
    const listing = await repository.updateOwnerListing(actor.id, listingId, validation.value, nextStatus, version);
    logger.info("Publicación actualizada", { status: listing.status });
    return NextResponse.json({ listing });
  } catch (error) {
    if (isListingAccessError(error)) return accessResponse(error);
    logger.error("No fue posible actualizar la publicación", { reason: "internal" });
    return NextResponse.json({ error: "No fue posible actualizar la publicación." }, { status: 500 });
  }
}
