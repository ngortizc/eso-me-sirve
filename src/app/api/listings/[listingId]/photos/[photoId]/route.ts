import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/identity/application/session";
import { ListingPhotoProcessingError } from "@/modules/listings/application/ports/photo-storage";
import { MAX_LISTING_PHOTO_BYTES } from "@/modules/listings/domain/listing-validation";
import { getListingPhotoStorage } from "@/modules/listings/infrastructure/local-photo-storage";
import { getListingRepository, isListingAccessError, ListingAccessError } from "@/modules/listings/infrastructure/postgres-listing-repository";
import { logger } from "@/shared/logging/logger";

type Context = { params: Promise<{ listingId: string; photoId: string }> };

function denied(error: ListingAccessError) {
  if (error.reason === "FORBIDDEN") return NextResponse.json({ error: "No tienes permiso para modificar esta fotografía." }, { status: 403 });
  if (error.reason === "LAST_PHOTO") return NextResponse.json({ error: "Una publicación visible necesita al menos una fotografía." }, { status: 409 });
  if (error.reason === "INVALID_STATE") return NextResponse.json({ error: "Las fotografías no se pueden modificar en el estado actual." }, { status: 409 });
  return NextResponse.json({ error: "Fotografía no encontrada." }, { status: 404 });
}

export async function PATCH(request: Request, { params }: Context) {
  const actor = await getCurrentUser(request.headers);
  if (!actor) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  if (!actor.emailVerified) return NextResponse.json({ error: "Verifica tu correo antes de modificar fotografías." }, { status: 403 });
  const { listingId, photoId } = await params;
  try {
    const repository = getListingRepository();
    await repository.setOwnerPrimaryPhoto(actor.id, listingId, photoId);
    return NextResponse.json({ listing: await repository.getOwnerListing(actor.id, listingId) });
  } catch (error) {
    if (isListingAccessError(error)) return denied(error);
    throw error;
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const actor = await getCurrentUser(request.headers);
  if (!actor) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  if (!actor.emailVerified) return NextResponse.json({ error: "Verifica tu correo antes de modificar fotografías." }, { status: 403 });
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
    return NextResponse.json({ listing: await repository.getOwnerListing(actor.id, listingId) });
  } catch (error) {
    if (isListingAccessError(error)) return denied(error);
    throw error;
  }
}

export async function PUT(request: Request, { params }: Context) {
  const actor = await getCurrentUser(request.headers);
  if (!actor) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  if (!actor.emailVerified) return NextResponse.json({ error: "Verifica tu correo antes de modificar fotografías." }, { status: 403 });
  const { listingId, photoId } = await params;
  const repository = getListingRepository();
  const storage = getListingPhotoStorage();
  let replacement: Awaited<ReturnType<typeof storage.store>> | null = null;
  try {
    const formData = await request.formData();
    const file = formData.get("photo");
    if (!(file instanceof File)) return NextResponse.json({ error: "Selecciona una fotografía para reemplazar." }, { status: 400 });
    if (file.size > MAX_LISTING_PHOTO_BYTES) return NextResponse.json({ error: "La fotografía puede pesar como máximo 10 MB." }, { status: 400 });
    if (!(await repository.consumeUploadQuota(actor.id))) return NextResponse.json({ error: "Espera antes de intentar otra carga." }, { status: 429 });
    replacement = await storage.store({ bytes: new Uint8Array(await file.arrayBuffer()), declaredMediaType: file.type, originalFileName: file.name });
    const oldStorageKey = await repository.replaceOwnerPhoto(actor.id, listingId, photoId, {
      ...replacement, id: randomUUID(), position: 0, isPrimary: false
    });
    try {
      await storage.delete(oldStorageKey);
      await repository.completeStorageCleanup(oldStorageKey);
    } catch {
      await repository.failStorageCleanup(oldStorageKey);
      logger.warn("Eliminación física de fotografía reemplazada pendiente", { reason: "storage" });
    }
    return NextResponse.json({ listing: await repository.getOwnerListing(actor.id, listingId) });
  } catch (error) {
    if (replacement) {
      try { await storage.delete(replacement.storageKey); }
      catch { await repository.enqueueStorageCleanup(replacement.storageKey, "replace-photo-failed").catch(() => undefined); }
    }
    if (error instanceof ListingPhotoProcessingError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (isListingAccessError(error)) return denied(error);
    return NextResponse.json({ error: "No fue posible reemplazar la fotografía." }, { status: 500 });
  }
}
