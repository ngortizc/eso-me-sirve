import { describe, expect, it } from "vitest";
import { sanitizeAuthResponse } from "@/modules/identity/application/sanitize-auth-response";

describe("sanitización de respuestas de identidad", () => {
  it("elimina secretos incluso en objetos y arreglos anidados", () => {
    expect(sanitizeAuthResponse({ token: "secret", user: { id: "1", password: "hash" }, sessions: [{ accessToken: "x", id: "s" }] }))
      .toEqual({ user: { id: "1" }, sessions: [{ id: "s" }] });
  });
});
