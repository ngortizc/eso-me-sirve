import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { ListingPhotoProcessingError } from "@/modules/listings/application/ports/photo-storage";
import { LocalListingPhotoStorage } from "./local-photo-storage";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("LocalListingPhotoStorage", () => {
  it("decodifica, re-encodea y elimina metadata del original", async () => {
    const root = await mkdtemp(join(tmpdir(), "ems-photo-"));
    roots.push(root);
    const source = await sharp({ create: { width: 1200, height: 900, channels: 3, background: "#126b5a" } })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
    expect((await sharp(source).metadata()).orientation).toBe(6);

    const storage = new LocalListingPhotoStorage(root);
    const stored = await storage.store({ bytes: source, declaredMediaType: "image/jpeg", originalFileName: "foto.jpg" });
    const publicBytes = await storage.read(stored.storageKey, "detail");
    const metadata = await sharp(publicBytes).metadata();

    expect(stored.storageKey).toMatch(/^[a-f0-9]{64}$/);
    expect(metadata.format).toBe("webp");
    expect(metadata.exif).toBeUndefined();
    expect(metadata.orientation).toBeUndefined();
    expect(metadata.width).toBeLessThanOrEqual(1600);
  });

  it("rechaza contenido que no coincide con el MIME declarado", async () => {
    const root = await mkdtemp(join(tmpdir(), "ems-photo-"));
    roots.push(root);
    const png = await sharp({ create: { width: 20, height: 20, channels: 3, background: "white" } }).png().toBuffer();
    const storage = new LocalListingPhotoStorage(root);
    await expect(storage.store({ bytes: png, declaredMediaType: "image/jpeg", originalFileName: "falsa.jpg" }))
      .rejects.toBeInstanceOf(ListingPhotoProcessingError);
  });

  it("impide claves con traversal", async () => {
    const root = await mkdtemp(join(tmpdir(), "ems-photo-"));
    roots.push(root);
    const storage = new LocalListingPhotoStorage(root);
    await expect(storage.read("../secreto", "detail")).rejects.toThrow("Invalid storage key");
  });
});
