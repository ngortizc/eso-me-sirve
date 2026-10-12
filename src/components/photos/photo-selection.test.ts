import { describe, expect, it } from "vitest";
import { MAX_PHOTO_SIZE_BYTES, moveSelectedPhoto, removeSelectedPhoto, selectPrimaryPhoto, validatePhotoCandidates } from "@/components/photos/photo-selection";

const candidate = (name: string, overrides: Partial<{ size: number; type: string }> = {}) => ({ name, size: 1200, type: "image/jpeg", ...overrides });

describe("selección local de fotografías", () => {
  it("acepta como máximo ocho fotografías", () => {
    const result = validatePhotoCandidates(Array.from({ length: 9 }, (_, index) => candidate(`${index}.jpg`)), 0);
    expect(result.accepted).toHaveLength(8);
    expect(result.errors).toEqual([expect.objectContaining({ code: "limit-exceeded", fileName: "8.jpg" })]);
  });

  it("rechaza formatos desconocidos y archivos mayores a 10 MB", () => {
    const result = validatePhotoCandidates([
      candidate("documento.pdf", { type: "application/pdf" }),
      candidate("enorme.png", { type: "image/png", size: MAX_PHOTO_SIZE_BYTES + 1 })
    ], 0);
    expect(result.accepted).toHaveLength(0);
    expect(result.errors.map(({ code }) => code)).toEqual(["invalid-type", "too-large"]);
  });

  it("cambia la fotografía principal sin duplicarla", () => {
    const photos = [{ id: "a", isPrimary: true }, { id: "b", isPrimary: false }];
    expect(selectPrimaryPhoto(photos, "b")).toEqual([{ id: "a", isPrimary: false }, { id: "b", isPrimary: true }]);
  });

  it("elimina fotografías y asigna una nueva principal cuando corresponde", () => {
    const photos = [{ id: "a", isPrimary: true }, { id: "b", isPrimary: false }];
    expect(removeSelectedPhoto(photos, "a")).toEqual([{ id: "b", isPrimary: true }]);
  });

  it("reordena fotografías sin alterar la selección principal", () => {
    const photos = [{ id: "a", isPrimary: true }, { id: "b", isPrimary: false }];
    expect(moveSelectedPhoto(photos, "b", -1)).toEqual([{ id: "b", isPrimary: false }, { id: "a", isPrimary: true }]);
  });
});
