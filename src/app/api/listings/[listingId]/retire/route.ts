import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/identity/application/session";
import { getListingRepository, isListingAccessError } from "@/modules/listings/infrastructure/postgres-listing-repository";
import { logger } from "@/shared/logging/logger";

type Context = { params: Promise<{ listingId: string }> };

export async function POST(request: Request, { params }: Context) {
  const actor = await getCurrentUser(request.headers);
  if (!actor) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  if (!actor.emailVerified) return NextResponse.json({ error: "Verifica tu correo antes de retirar una publicación." }, { status: 403 });
  const { listingId } = await params;
  let version: number;
  try {
    const body: unknown = await request.json();
    const rawVersion = body && typeof body === "object" && !Array.isArray(body) && "version" in body ? body.version : undefined;
    version = typeof rawVersion === "number" ? rawVersion : Number(rawVersion);
    if (!Number.isInteger(version) || version < 1) throw new Error("invalid version");
  } catch {
    return NextResponse.json({ error: "Versión de publicación inválida." }, { status: 400 });
  }

  try {
    const listing = await getListingRepository().retireOwnerListing(actor.id, listingId, version);
    logger.info("Publicación retirada", { status: listing.status });
    return NextResponse.json({ listing });
  } catch (error) {
    if (isListingAccessError(error)) {
      if (error.reason === "FORBIDDEN") return NextResponse.json({ error: "No tienes permiso para retirar esta publicación." }, { status: 403 });
      if (error.reason === "NOT_FOUND") return NextResponse.json({ error: "Publicación no encontrada." }, { status: 404 });
      return NextResponse.json({ error: "No se puede retirar una publicación con una reserva activa o una versión desactualizada." }, { status: 409 });
    }
    logger.error("No fue posible retirar la publicación", { reason: "internal" });
    return NextResponse.json({ error: "No fue posible retirar la publicación." }, { status: 500 });
  }
}
