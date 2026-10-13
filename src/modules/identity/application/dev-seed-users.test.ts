import { describe, expect, it } from "vitest";
import { DEV_SEED_USERS, assertDevSeedEnvironment, credentialsFilePath, generateSeedPassword, safeCompletionMessage } from "../../../../scripts/dev-seed-users";

const validEnvironment = {
  APP_ENV: "development",
  NODE_ENV: "development",
  DATABASE_URL: "postgresql://local:local@127.0.0.1:5432/ems",
  BETTER_AUTH_SECRET: "local-secret-with-more-than-32-characters",
  BETTER_AUTH_URL: "http://localhost:3000"
};

describe("política del generador de usuarios de prueba", () => {
  it("rechaza producción y bases remotas", () => {
    expect(() => assertDevSeedEnvironment({ ...validEnvironment, NODE_ENV: "production" })).toThrow(/solo puede ejecutarse/);
    expect(() => assertDevSeedEnvironment({ ...validEnvironment, DATABASE_URL: "postgresql://user:secret@db.example.com/ems" })).toThrow(/loopback/);
    expect(() => assertDevSeedEnvironment({ ...validEnvironment, BETTER_AUTH_URL: "https://app.example.com" })).toThrow(/entorno local/);
  });

  it("acepta exclusivamente configuración local de desarrollo", () => {
    expect(() => assertDevSeedEnvironment(validEnvironment)).not.toThrow();
  });

  it("genera contraseñas robustas y distintas", () => {
    const passwords = Array.from({ length: 12 }, generateSeedPassword);
    expect(new Set(passwords)).toHaveLength(passwords.length);
    for (const password of passwords) {
      expect(password.length).toBeGreaterThanOrEqual(36);
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/[0-9]/);
      expect(password).toMatch(/[^A-Za-z0-9]/);
    }
  });

  it("usa correos sintéticos reservados y una salida ignorada sin secretos", () => {
    expect(DEV_SEED_USERS.every((user) => user.email.endsWith(".test"))).toBe(true);
    const path = credentialsFilePath("C:/workspace");
    expect(path.replaceAll("\\", "/")).toContain("/.data/dev-seed-users.json");
    const password = generateSeedPassword();
    const credential = { ...DEV_SEED_USERS[0], password, result: "created" as const };
    const output = safeCompletionMessage(path, [credential]);
    expect(output).not.toContain(password);
    expect(output).not.toMatch(/token|secret/i);
    expect(output).toContain("No se imprimieron contraseñas");
  });
});
