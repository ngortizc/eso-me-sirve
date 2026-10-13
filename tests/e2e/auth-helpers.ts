import { expect, type Page } from "@playwright/test";
import { Pool } from "pg";

export const testPassword = "Prueba-segura-2026!";

async function queryOne<T>(text: string, values: unknown[]): Promise<T | null> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    const result = await pool.query<T & Record<string, unknown>>(text, values);
    return result.rows[0] ?? null;
  } finally {
    await pool.end();
  }
}

export function uniqueEmail(label: string): string {
  return `${label}-${Date.now()}-${crypto.randomUUID()}@example.test`.toLowerCase();
}

export async function latestEmail(recipient: string, kind: "EMAIL_VERIFICATION" | "PASSWORD_RESET") {
  return queryOne<{ action_url: string }>(
    `SELECT action_url FROM identity_test_email
      WHERE recipient = $1 AND kind = $2 ORDER BY created_at DESC LIMIT 1`,
    [recipient.toLowerCase(), kind]
  );
}

export async function userIdFor(email: string): Promise<string> {
  const row = await queryOne<{ id: string }>(`SELECT id FROM identity_user WHERE email = $1`, [email.toLowerCase()]);
  if (!row) throw new Error(`Usuario de prueba no encontrado: ${email}`);
  return row.id;
}

export async function expireSessionsFor(email: string): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    await pool.query(
      `UPDATE identity_session SET "expiresAt" = CURRENT_TIMESTAMP - interval '1 minute'
        WHERE "userId" = (SELECT id FROM identity_user WHERE email = $1)`,
      [email.toLowerCase()]
    );
  } finally {
    await pool.end();
  }
}

export async function registerVerifiedUser(page: Page, label: string) {
  const email = uniqueEmail(label);
  const testClientIp = `192.0.2.${Math.floor(Math.random() * 250) + 1}`;
  await page.setExtraHTTPHeaders({ "x-ems-test-client-ip": testClientIp });
  const signup = await page.request.post("/api/auth/sign-up/email", {
    headers: { "x-ems-test-client-ip": testClientIp },
    data: { name: "Persona de prueba", email, password: testPassword, callbackURL: "/perfil" }
  });
  expect(signup.status()).toBe(200);
  await expect.poll(async () => Boolean(await latestEmail(email, "EMAIL_VERIFICATION"))).toBe(true);
  const message = await latestEmail(email, "EMAIL_VERIFICATION");
  if (!message) throw new Error("No se creó el correo de verificación local.");
  await page.goto(message.action_url);
  await expect(page).toHaveURL(/\/perfil$/);
  return { email, password: testPassword, verificationUrl: message.action_url, userId: await userIdFor(email) };
}

export async function signIn(page: Page, email: string, password = testPassword) {
  await page.goto("/ingresar");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/perfil$/);
}
