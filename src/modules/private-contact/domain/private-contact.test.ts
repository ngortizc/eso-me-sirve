import { describe, expect, it } from "vitest";
import { normalizeChileanPhone, validatePrivateContact } from "./private-contact";

describe("datos privados de contacto", () => {
  it("normaliza teléfonos chilenos y rechaza valores inválidos", () => {
    expect(normalizeChileanPhone("+56 9 1234 5678")).toBe("+56912345678");
    expect(normalizeChileanPhone("2 2345 6789")).toBe("+56223456789");
    expect(normalizeChileanPhone("123")).toBeNull();
  });

  it("permite omitir contacto en borrador y exige consentimiento para publicar", () => {
    expect(validatePrivateContact({}, { required: false })).toMatchObject({ value: null, errors: [] });
    const result = validatePrivateContact({
      contactPhone: "+56 9 1234 5678", deliveryMethod: "MEETING_POINT",
      deliveryLocation: "Acceso principal del centro comunitario"
    }, { required: true });
    expect(result.errors).toContainEqual(expect.objectContaining({ field: "contactConsent" }));
  });
});
