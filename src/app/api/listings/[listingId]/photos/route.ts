import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/identity/application/session";
import { ListingPhotoProcessingError } from "@/modules/listings/application/ports/photo-storage";
import { MAX_LISTING_PHOTO_BYTES } from "@/modules/listings/domain/listing-validation";
import { getListingPhotoStorage } from "@/modules/listings/infrastructure/local-photo-storage";
import { getListingRepository, isListingAccessError, ListingAccessError } from "@/modules/listings/infrastructure/postgres-listing-repository";

type Context = { params: Promise<{ listingId: string }> };

export async function POST(request: Request, { params }: Context) {
  const actor = await getCurrentUser(request.headers);
  if (!actor) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  if (!actor.emailVerified) return NextResponse.json({ error: "Verifica tu correo antes de cargar fotografías." }, { status: 403 });
  const { listingId } = await params;
  const repository = getListingRepository();
  try {
    await repository.assertOwner(actor.id, listingId);
    const current = await repository.getOwnerListing(actor.id, listingId);
    if (!current) throw new ListingAccessError("NOT_FOUND");
    const formData = await request.formData();
    const values = formData.getAll("photos");
    if (values.length < 1 || values.length + current.photos.length > 8 || values.some((value) => !(value instanceof File))) {
      return NextResponse.json({ error: "Selecciona entre 1 y 8 fotografías en total." }, { status: 400 });
    }
    const files = values as File[];
    if (files.some((file) => file.size > MAX_LISTING_PHOTO_BYTES)) return NextResponse.json({ error: "Cada fotografía puede pesar como máximo 10 MB." }, { status: 400 });
    if (!(await repository.consumeUploadQuota(actor.id))) return NextResponse.json({ error: "Espera antes de intentar otra carga." }, { status: 429 });
    const makePrimary = formData.get("makePrimary") === "true";
    const storage = getListingPhotoStorage();
    const stored = [];
    try {
      for (const file of files) {
        stored.push(await storage.store({ bytes: new Uint8Array(await file.arrayBuffer()), declaredMediaType: file.type, originalFileName: file.name }));
      }
      await repository.addOwnerPhotos(actor.id, listingId, stored.map((photo, index) => ({
        ...photo, id: randomUUID(), position: current.photos.length + index, isPrimary: false
      })), makePrimary ? 0 : null);
      return NextResponse.json({ ok: true }, { status: 201 });
    } catch (error) {
      for (const photo of stored) {
        try { await storage.delete(photo.storageKey); }
        catch { await repository.enqueueStorageCleanup(photo.storageKey, "add-photo-failed").catch(() => undefined); }
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof ListingPhotoProcessingError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (isListingAccessError(error)) {
      return NextResponse.json({ error: error.reason === "FORBIDDEN" ? "No tienes permiso para modificar esta publicación." : "Publicación no encontrada." }, { status: error.reason === "FORBIDDEN" ? 403 : 404 });
    }
    return NextResponse.json({ error: "No fue posible agregar las fotografías." }, { status: 500 });
  }
}
