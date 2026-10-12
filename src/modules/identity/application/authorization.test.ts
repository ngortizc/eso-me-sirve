import { describe, expect, it } from "vitest";
import { canAccessUserResource } from "@/modules/identity/application/authorization";

describe("autorización de recursos de usuario", () => {
  it("permite al propietario y al administrador", () => {
    expect(canAccessUserResource({ id: "user-1", role: "USER" }, "user-1")).toBe(true);
    expect(canAccessUserResource({ id: "admin-1", role: "ADMIN" }, "user-1")).toBe(true);
  });

  it("deniega a otro usuario", () => {
    expect(canAccessUserResource({ id: "user-2", role: "USER" }, "user-1")).toBe(false);
  });
});
