import { describe, expect, it } from "vitest";
import { containsPrivateContact, containsSaleIntent, validateListingFields } from "./listing-validation";

describe("validación de publicaciones", () => {
  const complete = {
    title: "Escritorio de madera",
    description: "Escritorio firme y funcional para retirar coordinando en la comuna.",
    categorySlug: "hogar",
    condition: "GOOD",
    regionCode: "CL-RM",
    communeCode: "13120"
  };

  it("exige todos los datos y una foto al publicar", () => {
    expect(validateListingFields(complete, { publish: true, photoCount: 1 }).errors).toEqual([]);
    expect(validateListingFields({ title: "Mesa" }, { publish: true, photoCount: 0 }).errors.length).toBeGreaterThan(0);
  });

  it("permite un borrador solo con título", () => {
    expect(validateListingFields({ title: "Mesa futura" }, { publish: false, photoCount: 0 }).errors).toEqual([]);
  });

  it("bloquea contacto, dirección exacta e intención de venta", () => {
    expect(containsPrivateContact("Escríbeme a persona@example.cl")).toBe(true);
    expect(containsPrivateContact("Retiro en Avenida Siempre Viva 742")).toBe(true);
    expect(containsSaleIntent("Precio $20.000 conversable")).toBe(true);
  });
});
