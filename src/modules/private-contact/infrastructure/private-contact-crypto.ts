import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import type { EncryptedPrivateContact, EncryptedValue } from "../application/private-contact-repository";
import type { PrivateContact } from "../domain/private-contact";

export class PrivateContactCryptoError extends Error {
  constructor(public readonly kind: "CONFIGURATION" | "INTEGRITY" | "OPERATION" = "OPERATION") {
    super("Private contact cryptographic operation failed");
    this.name = "PrivateContactCryptoError";
  }
}

function aad(listingId: string, field: string, keyVersion: number): Buffer {
  return Buffer.from(`ems:listing-private-contact:${listingId}:${field}:v${keyVersion}`, "utf8");
}

export class PrivateContactCipher {
  constructor(private readonly keys: ReadonlyMap<number, Uint8Array>, readonly activeKeyVersion: number) {
    const key = keys.get(activeKeyVersion);
    if (!key || key.byteLength !== 32) throw new PrivateContactCryptoError("CONFIGURATION");
  }

  private encryptValue(listingId: string, field: string, value: string): EncryptedValue {
    const key = this.keys.get(this.activeKeyVersion);
    if (!key) throw new PrivateContactCryptoError("CONFIGURATION");
    const nonce = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, nonce);
    cipher.setAAD(aad(listingId, field, this.activeKeyVersion));
    const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    return { ciphertext, nonce, authTag: cipher.getAuthTag() };
  }

  encrypt(listingId: string, contact: PrivateContact, consentVersion: string): EncryptedPrivateContact {
    return {
      phone: this.encryptValue(listingId, "phone", contact.phone),
      deliveryMethod: contact.deliveryMethod,
      location: this.encryptValue(listingId, "location", contact.location),
      instructions: contact.instructions ? this.encryptValue(listingId, "instructions", contact.instructions) : null,
      keyVersion: this.activeKeyVersion,
      consentVersion
    };
  }

  decryptValue(listingId: string, field: string, value: EncryptedValue, keyVersion: number): string {
    const key = this.keys.get(keyVersion);
    if (!key || key.byteLength !== 32) throw new PrivateContactCryptoError("CONFIGURATION");
    try {
      const decipher = createDecipheriv("aes-256-gcm", key, value.nonce);
      decipher.setAAD(aad(listingId, field, keyVersion));
      decipher.setAuthTag(value.authTag);
      return Buffer.concat([decipher.update(value.ciphertext), decipher.final()]).toString("utf8");
    } catch {
      throw new PrivateContactCryptoError("INTEGRITY");
    }
  }
}

type CryptoEnvironment = Readonly<Record<string, string | undefined>>;

function decodeKey(encoded: string): Buffer {
  let key: Buffer;
  try { key = Buffer.from(encoded.trim(), "base64"); }
  catch { throw new PrivateContactCryptoError("CONFIGURATION"); }
  if (key.byteLength !== 32 || key.toString("base64").replace(/=+$/, "") !== encoded.trim().replace(/=+$/, "")) {
    throw new PrivateContactCryptoError("CONFIGURATION");
  }
  return key;
}

export function privateContactCipherFromEnvironment(
  environment: CryptoEnvironment,
  readSecret: (path: string) => string = (path) => readFileSync(path, "utf8")
): PrivateContactCipher {
  const rawVersion = environment.PRIVATE_CONTACT_ACTIVE_KEY_VERSION;
  const activeVersion = Number(rawVersion);
  if (!Number.isInteger(activeVersion) || activeVersion < 1) throw new PrivateContactCryptoError("CONFIGURATION");
  const keys = new Map<number, Uint8Array>();
  const versions = new Set<number>();
  for (const name of Object.keys(environment)) {
    const match = /^PRIVATE_CONTACT_KEY_V([1-9][0-9]*)(?:_FILE)?$/.exec(name);
    if (match) versions.add(Number(match[1]));
  }
  for (const version of versions) {
    const inline = environment[`PRIVATE_CONTACT_KEY_V${version}`]?.trim();
    const secretPath = environment[`PRIVATE_CONTACT_KEY_V${version}_FILE`]?.trim();
    if (inline && secretPath) throw new PrivateContactCryptoError("CONFIGURATION");
    if (!inline && !secretPath) continue;
    let encoded = inline;
    if (secretPath) {
      try { encoded = readSecret(secretPath).trim(); }
      catch { throw new PrivateContactCryptoError("CONFIGURATION"); }
    }
    if (encoded) keys.set(version, decodeKey(encoded));
  }
  return new PrivateContactCipher(keys, activeVersion);
}

export function getPrivateContactCipher(): PrivateContactCipher {
  return privateContactCipherFromEnvironment(process.env);
}
