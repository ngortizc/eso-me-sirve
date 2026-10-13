import { describe, expect, it } from "vitest";
import { publicAlias } from "./public-alias";

describe("identidad pública mínima", () => {
  it("conserva nombres y alias públicos legibles", () => {
    expect(publicAlias("Receptor B", "user-b")).toBe("Receptor B");
    expect(publicAlias("  María Paz  ", "user-c")).toBe("María Paz");
  });

  it.each([
    "persona@example.test",
    "+56 9 1234 5678",
    "Calle Falsa 123",
    "https://example.test/perfil",
    "eyJhbGciOiJIUzI1NiJ9token"
  ])("sustituye datos con forma sensible por un seudónimo estable", (unsafeName) => {
    const first = publicAlias(unsafeName, "stable-user-id");
    expect(first).toMatch(/^Persona interesada [A-Z0-9]{6}$/);
    expect(publicAlias(unsafeName, "stable-user-id")).toBe(first);
    expect(first).not.toContain(unsafeName);
  });
});
