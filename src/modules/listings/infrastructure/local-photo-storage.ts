import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { isAbsolute, join, resolve, sep } from "node:path";
import sharp, { type Metadata } from "sharp";
import {
  ListingPhotoProcessingError,
  type ListingPhotoMediaType,
  type ListingPhotoStorage,
  type ListingPhotoVariant,
  type StoredListingPhoto
} from "@/modules/listings/application/ports/photo-storage";
import { MAX_LISTING_PHOTO_BYTES } from "@/modules/listings/domain/listing-validation";

const storageKeyPattern = /^[a-f0-9]{64}$/;
const maxInputPixels = 40_000_000;
const maxDimension = 8_000;
const processingVersion = 1;

function mediaTypeForFormat(format: string | undefined): ListingPhotoMediaType | null {
  if (format === "jpeg") return "image/jpeg";
  if (format === "png") return "image/png";
  if (format === "webp") return "image/webp";
  return null;
}

export class LocalListingPhotoStorage implements ListingPhotoStorage {
  private readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  private objectDirectory(storageKey: string): string {
    if (!storageKeyPattern.test(storageKey)) throw new Error("Invalid storage key");
    const target = resolve(this.root, storageKey.slice(0, 2), storageKey);
    if (!target.startsWith(`${this.root}${sep}`)) throw new Error("Storage path escaped its root");
    return target;
  }

  private variantPath(storageKey: string, variant: ListingPhotoVariant): string {
    if (variant !== "catalog" && variant !== "detail") throw new Error("Invalid photo variant");
    return join(this.objectDirectory(storageKey), `${variant}.webp`);
  }

  async store(input: Parameters<ListingPhotoStorage["store"]>[0]): Promise<StoredListingPhoto> {
    if (input.bytes.byteLength === 0) throw new ListingPhotoProcessingError("INVALID_IMAGE", "La fotografía está vacía.");
    if (input.bytes.byteLength > MAX_LISTING_PHOTO_BYTES) throw new ListingPhotoProcessingError("TOO_LARGE", "La fotografía supera 10 MB.");

    const source = Buffer.from(input.bytes);
    let metadata: Metadata;
    try {
      metadata = await sharp(source, { failOn: "error", limitInputPixels: maxInputPixels, animated: false }).metadata();
    } catch {
      throw new ListingPhotoProcessingError("INVALID_IMAGE", "El archivo no contiene una imagen válida.");
    }

    const sourceMediaType = mediaTypeForFormat(metadata.format);
    if (!sourceMediaType) throw new ListingPhotoProcessingError("UNSUPPORTED_FORMAT", "Usa una imagen JPG, PNG o WebP.");
    if (input.declaredMediaType !== sourceMediaType) throw new ListingPhotoProcessingError("INVALID_IMAGE", "El contenido no coincide con el tipo de archivo declarado.");
    if (!metadata.width || !metadata.height || metadata.width > maxDimension || metadata.height > maxDimension || metadata.width * metadata.height > maxInputPixels) {
      throw new ListingPhotoProcessingError("DIMENSIONS", "La imagen supera las dimensiones permitidas.");
    }
    if ((metadata.pages ?? 1) > 1) throw new ListingPhotoProcessingError("UNSUPPORTED_FORMAT", "No se aceptan imágenes animadas.");

    const createVariant = async (maximum: number, quality: number) => {
      try {
        return await sharp(source, { failOn: "error", limitInputPixels: maxInputPixels, animated: false })
          .rotate()
          .resize({ width: maximum, height: maximum, fit: "inside", withoutEnlargement: true })
          .webp({ quality, effort: 4 })
          .toBuffer({ resolveWithObject: true });
      } catch {
        throw new ListingPhotoProcessingError("INVALID_IMAGE", "No fue posible procesar la fotografía.");
      }
    };

    const [catalog, detail] = await Promise.all([createVariant(640, 78), createVariant(1600, 84)]);
    const storageKey = randomBytes(32).toString("hex");
    const finalDirectory = this.objectDirectory(storageKey);
    const parentDirectory = resolve(finalDirectory, "..");
    const temporaryDirectory = `${finalDirectory}.tmp-${randomBytes(8).toString("hex")}`;
    await mkdir(parentDirectory, { recursive: true });
    await mkdir(temporaryDirectory, { recursive: false });
    try {
      await Promise.all([
        writeFile(join(temporaryDirectory, "catalog.webp"), catalog.data, { flag: "wx" }),
        writeFile(join(temporaryDirectory, "detail.webp"), detail.data, { flag: "wx" })
      ]);
      await rename(temporaryDirectory, finalDirectory);
    } catch (error) {
      await rm(temporaryDirectory, { recursive: true, force: true });
      throw error;
    }

    return {
      storageKey,
      mediaType: "image/webp",
      sourceMediaType,
      sourceWidth: metadata.width,
      sourceHeight: metadata.height,
      sourceSha256: createHash("sha256").update(source).digest("hex"),
      processingVersion,
      catalog: { width: catalog.info.width, height: catalog.info.height, byteSize: catalog.info.size },
      detail: { width: detail.info.width, height: detail.info.height, byteSize: detail.info.size }
    };
  }

  async read(storageKey: string, variant: ListingPhotoVariant): Promise<Uint8Array> {
    return readFile(this.variantPath(storageKey, variant));
  }

  async delete(storageKey: string): Promise<void> {
    await rm(this.objectDirectory(storageKey), { recursive: true, force: true });
  }
}

declare global {
  var emsListingPhotoStorage: LocalListingPhotoStorage | undefined;
}

export function getListingPhotoStorage(): LocalListingPhotoStorage {
  if (!globalThis.emsListingPhotoStorage) {
    const configuredRoot = process.env.PHOTO_STORAGE_ROOT;
    if (!configuredRoot && process.env.APP_ENV === "production") throw new Error("PHOTO_STORAGE_ROOT is required in production");
    const root = configuredRoot ?? join(process.cwd(), ".data", "listing-photos");
    if (!isAbsolute(root) && root.includes("..")) throw new Error("PHOTO_STORAGE_ROOT cannot traverse parent directories");
    globalThis.emsListingPhotoStorage = new LocalListingPhotoStorage(root);
  }
  return globalThis.emsListingPhotoStorage;
}
