import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/identity/application/session";
import { getListingPhotoStorage } from "@/modules/listings/infrastructure/local-photo-storage";
import { getListingRepository, isListingAccessError, ListingAccessError } from "@/modules/listings/infrastructure/postgres-listing-repository";
import { logger } from "@/shared/logging/logger";

type Context = { params: Promise<{ listingId: string; photoId: string }> };

function denied(error: ListingAccessError) {
  if (error.reason === "FORBIDDEN") return NextResponse.json({ error: "No tienes permiso para modificar esta fotografía." }, { status: 403 });
  if (error.reason === "LAST_PHOTO") return NextResponse.json({ error: "Una publicación visible necesita al menos una fotografía." }, { status: 409 });
  return NextResponse.json({ error: "Fotografía no encontrada." }, { status: 404 });
}

export async function PATCH(request: Request, { params }: Context) {
  const actor = await getCurrentUser(request.headers);
  if (!actor) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  const { listingId, photoId } = await params;
  try {
    await getListingRepository().setOwnerPrimaryPhoto(actor.id, listingId, photoId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isListingAccessError(error)) return denied(error);
    throw error;
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const actor = await getCurrentUser(request.headers);
  if (!actor) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  const { listingId, photoId } = await params;
  const repository = getListingRepository();
  try {
    const storageKey = await repository.deleteOwnerPhoto(actor.id, listingId, photoId);
    try {
      await getListingPhotoStorage().delete(storageKey);
      await repository.completeStorageCleanup(storageKey);
    } catch {
      await repository.failStorageCleanup(storageKey);
      logger.warn("Eliminación física de fotografía pendiente", { reason: "storage" });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isListingAccessError(error)) return denied(error);
    throw error;
  }
}
