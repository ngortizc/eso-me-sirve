import { describe, expect, it } from "vitest";
import { safeReturnTo } from "@/modules/identity/application/safe-return-to";

describe("safeReturnTo", () => {
  it("conserva destinos internos", () => {
    expect(safeReturnTo("/publicar?paso=fotos")).toBe("/publicar?paso=fotos");
  });

  it.each(["https://attacker.invalid", "//attacker.invalid", "/\\attacker.invalid", "javascript:alert(1)"])(
    "rechaza el destino externo %s",
    (value) => expect(safeReturnTo(value)).toBe("/perfil")
  );
});
