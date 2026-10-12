import { describe, expect, it } from "vitest";
import { isValidEmail, normalizeEmail } from "@/modules/identity/domain/email";

describe("correo de identidad", () => {
  it("normaliza espacios y mayúsculas", () => {
    expect(normalizeEmail("  Persona@Ejemplo.CL ")).toBe("persona@ejemplo.cl");
  });

  it("rechaza direcciones evidentemente inválidas", () => {
    expect(isValidEmail("sin-arroba.example")).toBe(false);
    expect(isValidEmail("persona@example.cl")).toBe(true);
  });
});
