import { describe, expect, it } from "vitest";
import { privateContactCryptoPublicMessage } from "./private-contact-errors";

describe("errores públicos de contacto privado", () => {
  it("distingue configuración ausente sin revelar nombres de variables, rutas ni claves", () => {
    const message = privateContactCryptoPublicMessage("CONFIGURATION");
    expect(message).toBe("La configuración segura del contacto no está disponible. Intenta nuevamente más tarde.");
    expect(message).not.toMatch(/PRIVATE_CONTACT|\/run\/secrets|base64|AES|key|clave.*V1/i);
  });

  it("no entrega detalles criptográficos cuando falla la integridad", () => {
    const message = privateContactCryptoPublicMessage("INTEGRITY");
    expect(message).toBe("No fue posible verificar de forma segura los datos privados.");
    expect(message).not.toMatch(/cipher|nonce|tag|AES|key/i);
  });
});
