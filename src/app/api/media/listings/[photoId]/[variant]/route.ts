import { getCurrentUser } from "@/modules/identity/application/session";
import type { ListingPhotoVariant } from "@/modules/listings/application/ports/photo-storage";
import { getListingPhotoStorage } from "@/modules/listings/infrastructure/local-photo-storage";
import { getListingRepository } from "@/modules/listings/infrastructure/postgres-listing-repository";

type Context = { params: Promise<{ photoId: string; variant: string }> };

export async function GET(request: Request, { params }: Context) {
  const { photoId, variant: rawVariant } = await params;
  if (rawVariant !== "catalog" && rawVariant !== "detail") return new Response(null, { status: 404 });
  const actor = await getCurrentUser(request.headers);
  const access = await getListingRepository().photoAccess(photoId, actor?.id ?? null);
  if (!access) return new Response(null, { status: 404 });
  try {
    const bytes = await getListingPhotoStorage().read(access.storageKey, rawVariant as ListingPhotoVariant);
    const body = new Uint8Array(bytes.byteLength);
    body.set(bytes);
    return new Response(body.buffer, {
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": access.isPublic ? "public, max-age=86400, immutable" : "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline"
      }
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
