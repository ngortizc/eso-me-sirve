import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { CreateListing, ListingInputError, ListingRateLimitError } from "@/modules/listings/application/create-listing";
import { ListingPhotoProcessingError } from "@/modules/listings/application/ports/photo-storage";
import { getCurrentUser } from "@/modules/identity/application/session";
import { getListingPhotoStorage } from "@/modules/listings/infrastructure/local-photo-storage";
import { getListingRepository } from "@/modules/listings/infrastructure/postgres-listing-repository";
import { logger } from "@/shared/logging/logger";
import { PRIVATE_CONTACT_CONSENT_VERSION, validatePrivateContact } from "@/modules/private-contact/domain/private-contact";
import { privateContactCryptoPublicMessage } from "@/modules/private-contact/application/private-contact-errors";
import { getPrivateContactCipher, PrivateContactCryptoError } from "@/modules/private-contact/infrastructure/private-contact-crypto";

const maximumMultipartBytes = 8 * 10 * 1024 * 1024 + 1024 * 1024;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(24, Math.max(1, Number.parseInt(url.searchParams.get("pageSize") ?? "12", 10) || 12));
  const result = await getListingRepository().listPublic({
    query: url.searchParams.get("q")?.trim().slice(0, 100) || undefined,
    category: url.searchParams.get("category")?.trim() || undefined,
    region: url.searchParams.get("region")?.trim() || undefined,
    commune: url.searchParams.get("commune")?.trim() || undefined,
    page,
    pageSize
  });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const actor = await getCurrentUser(request.headers);
  if (!actor) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  if (!actor.emailVerified) return NextResponse.json({ error: "Verifica tu correo antes de publicar." }, { status: 403 });

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maximumMultipartBytes) return NextResponse.json({ error: "La carga completa supera el máximo permitido." }, { status: 413 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "No fue posible leer el formulario." }, { status: 400 });
  }

  if (["ownerId", "userId", "price", "salePrice", "amount"].some((key) => formData.has(key))) {
    return NextResponse.json({ error: "El formulario contiene campos que no están permitidos." }, { status: 400 });
  }

  const photoFiles = formData.getAll("photos");
  if (photoFiles.some((value) => !(value instanceof File))) return NextResponse.json({ error: "Las fotografías son inválidas." }, { status: 400 });

  const intent = formData.get("intent") === "draft" ? "draft" : "publish";
  const contactValidation = validatePrivateContact({
    contactPhone: formData.get("contactPhone"),
    deliveryMethod: formData.get("deliveryMethod"),
    deliveryLocation: formData.get("deliveryLocation"),
    deliveryInstructions: formData.get("deliveryInstructions"),
    contactConsent: formData.get("contactConsent")
  }, { required: intent === "publish" });
  if (contactValidation.errors.length > 0) {
    return NextResponse.json({ error: "Revisa los datos privados de entrega.", errors: contactValidation.errors }, { status: 400 });
  }
  const primaryPhotoIndex = Number.parseInt(String(formData.get("primaryPhotoIndex") ?? "0"), 10);
  const photos = await Promise.all((photoFiles as File[]).map(async (file) => ({
    bytes: new Uint8Array(await file.arrayBuffer()),
    declaredMediaType: file.type,
    originalFileName: file.name
  })));

  try {
    const listingId = randomUUID();
    const privateContact = contactValidation.value
      ? getPrivateContactCipher().encrypt(listingId, contactValidation.value, PRIVATE_CONTACT_CONSENT_VERSION)
      : undefined;
    const result = await new CreateListing(getListingRepository(), getListingPhotoStorage()).execute({
      id: listingId,
      ownerId: actor.id,
      intent,
      fields: {
        title: formData.get("title"), description: formData.get("description"),
        categorySlug: formData.get("categorySlug"), condition: formData.get("condition"),
        regionCode: formData.get("regionCode"), communeCode: formData.get("communeCode")
      },
      photos,
      primaryPhotoIndex,
      privateContact
    });
    logger.info("Publicación creada", { status: result.status });
    return NextResponse.json({ listing: result }, { status: 201 });
  } catch (error) {
    if (error instanceof ListingInputError) return NextResponse.json({ error: "Revisa los datos ingresados.", errors: error.errors }, { status: 400 });
    if (error instanceof ListingPhotoProcessingError) return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    if (error instanceof ListingRateLimitError) return NextResponse.json({ error: "Espera antes de intentar otra carga." }, { status: 429 });
    if (error instanceof PrivateContactCryptoError) {
      logger.error("Contacto privado no disponible al crear publicación", { reason: error.kind.toLowerCase() });
      return NextResponse.json({ error: privateContactCryptoPublicMessage(error.kind) }, { status: 503 });
    }
    logger.error("No fue posible crear la publicación", { reason: "internal" });
    return NextResponse.json({ error: "No fue posible guardar la publicación." }, { status: 500 });
  }
}
