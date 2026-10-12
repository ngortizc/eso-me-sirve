import { describe, expect, it } from "vitest";
import { protectIdentityActionUrl } from "@/modules/identity/infrastructure/protected-action-url";

describe("enlaces sensibles de identidad", () => {
  it("mueve el token al fragmento, que no se envía en la petición HTTP", () => {
    const result = protectIdentityActionUrl("https://ems.test/api/auth/verify-email?token=secreto&callbackURL=%2Fperfil", "EMAIL_VERIFICATION");
    expect(result).toBe("https://ems.test/verificar-correo/confirmar#token=secreto&returnTo=%2Fperfil");
    expect(new URL(result).search).toBe("");
  });

  it("extrae el token de recuperación desde la ruta generada por Better Auth", () => {
    expect(protectIdentityActionUrl("https://ems.test/api/auth/reset-password/secreto?callbackURL=%2Frestablecer", "PASSWORD_RESET"))
      .toBe("https://ems.test/restablecer#token=secreto&returnTo=%2Frestablecer");
  });
});
