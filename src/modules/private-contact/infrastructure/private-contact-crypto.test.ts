import { randomBytes, randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { PrivateContactCipher, PrivateContactCryptoError, privateContactCipherFromEnvironment } from "./private-contact-crypto";

const contact = { phone: "+56912345678", deliveryMethod: "MEETING_POINT" as const, location: "Biblioteca del barrio", instructions: "Preguntar en recepción" };

describe("cifrado de contacto privado", () => {
  it("usa nonces únicos y autentica publicación, campo y versión", () => {
    const key = randomBytes(32);
    const cipher = new PrivateContactCipher(new Map([[1, key]]), 1);
    const listingId = randomUUID();
    const first = cipher.encrypt(listingId, contact, "test-v1");
    const second = cipher.encrypt(listingId, contact, "test-v1");
    expect(Buffer.from(first.phone.nonce).equals(Buffer.from(second.phone.nonce))).toBe(false);
    expect(cipher.decryptValue(listingId, "phone", first.phone, 1)).toBe(contact.phone);
    expect(() => cipher.decryptValue(randomUUID(), "phone", first.phone, 1)).toThrow("cryptographic operation failed");
  });

  it("no descifra con otra clave", () => {
    const encrypted = new PrivateContactCipher(new Map([[1, randomBytes(32)]]), 1).encrypt(randomUUID(), contact, "test-v1");
    const wrong = new PrivateContactCipher(new Map([[1, randomBytes(32)]]), 1);
    expect(() => wrong.decryptValue(randomUUID(), "phone", encrypted.phone, 1)).toThrow();
  });

  it("carga una clave desde un archivo secreto sin exponer su contenido en la configuración", () => {
    const key = randomBytes(32);
    const cipher = privateContactCipherFromEnvironment({
      PRIVATE_CONTACT_ACTIVE_KEY_VERSION: "1",
      PRIVATE_CONTACT_KEY_V1_FILE: "/run/secrets/private-contact-key-v1"
    }, (path) => {
      expect(path).toBe("/run/secrets/private-contact-key-v1");
      return key.toString("base64");
    });
    const listingId = randomUUID();
    const encrypted = cipher.encrypt(listingId, contact, "test-v1");
    expect(cipher.decryptValue(listingId, "phone", encrypted.phone, 1)).toBe(contact.phone);
  });

  it("clasifica una clave ausente, ambigua o inválida como error de configuración", () => {
    const cases = [
      { PRIVATE_CONTACT_ACTIVE_KEY_VERSION: "1" },
      { PRIVATE_CONTACT_ACTIVE_KEY_VERSION: "1", PRIVATE_CONTACT_KEY_V1: "invalid" },
      {
        PRIVATE_CONTACT_ACTIVE_KEY_VERSION: "1",
        PRIVATE_CONTACT_KEY_V1: randomBytes(32).toString("base64"),
        PRIVATE_CONTACT_KEY_V1_FILE: "/run/secrets/private-contact-key-v1"
      }
    ];
    for (const environment of cases) {
      try {
        privateContactCipherFromEnvironment(environment, () => randomBytes(32).toString("base64"));
        throw new Error("Se esperaba un error de configuración");
      } catch (error) {
        expect(error).toBeInstanceOf(PrivateContactCryptoError);
        expect((error as PrivateContactCryptoError).kind).toBe("CONFIGURATION");
      }
    }
  });
});
