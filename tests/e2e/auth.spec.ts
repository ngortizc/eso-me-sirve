import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { expireSessionsFor, latestEmail, registerVerifiedUser, signIn, testPassword, uniqueEmail, userIdFor } from "./auth-helpers";

test.describe.configure({ mode: "serial" });

test("registra, normaliza y verifica un correo con enlace de uso único", async ({ page }) => {
  const email = uniqueEmail("registro-ui");
  await page.goto("/registro?returnTo=/perfil");
  await page.getByLabel("Nombre").fill("Persona Registro");
  await page.getByLabel("Correo electrónico").fill(`  ${email.toUpperCase()}  `);
  await page.locator('input[name="password"]').fill(testPassword);
  await page.getByLabel("Repite la contraseña").fill(testPassword);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page).toHaveURL(/\/verificar-correo/);
  await expect.poll(async () => Boolean(await latestEmail(email, "EMAIL_VERIFICATION"))).toBe(true);
  const message = await latestEmail(email, "EMAIL_VERIFICATION");
  if (!message) throw new Error("Falta correo de verificación de prueba.");

  await page.goto(message.action_url);
  await expect(page).toHaveURL(/\/perfil$/);
  await expect(page.getByText(email)).toBeVisible();
  await expect(page.getByText("Verificado")).toBeVisible();

  await page.goto(message.action_url);
  await expect(page).toHaveURL(/error=invalid_token/i);
});

test("inicia y cierra sesión, recupera contraseña e invalida el enlace usado", async ({ page }) => {
  const account = await registerVerifiedUser(page, "recuperacion");
  await page.getByRole("button", { name: "Cerrar sesión actual" }).click();
  await expect(page).toHaveURL(/\/$/);
  await signIn(page, account.email);

  await page.goto("/recuperar");
  await page.getByLabel("Correo electrónico").fill(account.email);
  await page.getByRole("button", { name: "Enviar instrucciones" }).click();
  await expect(page.getByRole("status")).toContainText("Si existe una cuenta");
  await expect.poll(async () => Boolean(await latestEmail(account.email, "PASSWORD_RESET"))).toBe(true);
  const reset = await latestEmail(account.email, "PASSWORD_RESET");
  if (!reset) throw new Error("Falta correo de recuperación de prueba.");

  await page.goto(reset.action_url);
  const newPassword = "Nueva-clave-segura-2026!";
  await page.getByLabel("Nueva contraseña").fill(newPassword);
  await page.getByLabel("Repite la contraseña").fill(newPassword);
  await page.getByRole("button", { name: "Guardar nueva contraseña" }).click();
  await expect(page).toHaveURL(/passwordReset=1/);
  const expiredSession = await page.request.get("/api/auth/get-session");
  expect(await expiredSession.json()).toBeNull();
  await signIn(page, account.email, newPassword);

  await page.goto(reset.action_url);
  await page.getByLabel("Nueva contraseña").fill("Otra-clave-segura-2026!");
  await page.getByLabel("Repite la contraseña").fill("Otra-clave-segura-2026!");
  await page.getByRole("button", { name: "Guardar nueva contraseña" }).click();
  await expect(page.getByText(/El enlace no es válido, venció o ya fue utilizado/)).toBeVisible();

  await page.goto("/recuperar");
  await page.getByLabel("Correo electrónico").fill(uniqueEmail("no-existe"));
  await page.getByRole("button", { name: "Enviar instrucciones" }).click();
  await expect(page.getByRole("status")).toContainText("Si existe una cuenta");
});

test("rechaza una sesión vencida", async ({ page }) => {
  const account = await registerVerifiedUser(page, "sesion-vencida");
  await expireSessionsFor(account.email);
  await page.goto("/perfil");
  await expect(page).toHaveURL(/\/ingresar\?returnTo=%2Fperfil/);
});

test("protege rutas y conserva un destino de retorno interno", async ({ page }) => {
  await page.goto("/publicar");
  await expect(page).toHaveURL(/\/ingresar\?returnTo=%2Fpublicar/);

  await page.goto("/articulos/sillon-verde");
  await page.getByRole("button", { name: "Solicitar artículo" }).click();
  await expect(page).toHaveURL(/\/ingresar\?returnTo=%2Farticulos%2Fsillon-verde/);

  await page.goto("/explorar");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("deniega recursos ajenos y no expone campos sensibles", async ({ page }) => {
  const first = await registerVerifiedUser(page, "propietario-a");
  await page.getByRole("button", { name: "Cerrar sesión actual" }).click();
  await expect(page).toHaveURL(/\/$/);
  const second = await registerVerifiedUser(page, "propietario-b");
  await page.getByRole("button", { name: "Cerrar sesión actual" }).click();
  await expect(page).toHaveURL(/\/$/);
  await signIn(page, first.email);

  const forbidden = await page.request.get(`/api/users/${second.userId}/profile`);
  expect(forbidden.status()).toBe(403);
  const own = await page.request.get(`/api/users/${await userIdFor(first.email)}/profile`);
  expect(own.status()).toBe(200);
  const text = await own.text();
  expect(text).not.toContain(first.email);
  expect(text).not.toMatch(/password|hash|token|phone|address/i);
  const sessionPayload = await (await page.request.get("/api/auth/get-session")).text();
  const sessionListPayload = await (await page.request.get("/api/auth/list-sessions")).text();
  expect(sessionPayload).not.toMatch(/"(?:token|password|hash|accessToken|refreshToken|idToken)"/i);
  expect(sessionListPayload).not.toMatch(/"(?:token|password|hash|accessToken|refreshToken|idToken)"/i);

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/acceso-denegado/);
});

test("limita intentos repetidos de inicio de sesión", async ({ request }, testInfo) => {
  const sourceIp = testInfo.project.name.includes("mobile") ? "198.51.100.20" : "198.51.100.10";
  const statuses: number[] = [];
  for (let attempt = 0; attempt < 7; attempt += 1) {
    const response = await request.post("/api/auth/sign-in/email", {
      headers: { "x-ems-test-client-ip": sourceIp },
      data: { email: "cuenta-inexistente@example.test", password: testPassword }
    });
    statuses.push(response.status());
  }
  expect(statuses).toContain(429);
});

test("captura la experiencia de identidad en móvil y escritorio", async ({ page }, testInfo) => {
  const evidenceDirectory = join(process.cwd(), "evidencias", "EMS-002");
  await mkdir(evidenceDirectory, { recursive: true });
  await page.goto("/ingresar");
  await page.screenshot({ path: join(evidenceDirectory, `${testInfo.project.name}-ingresar.png`), fullPage: true, caret: "initial" });
  await page.goto("/registro");
  await page.screenshot({ path: join(evidenceDirectory, `${testInfo.project.name}-registro.png`), fullPage: true, caret: "initial" });
  await registerVerifiedUser(page, "captura-perfil");
  await page.screenshot({ path: join(evidenceDirectory, `${testInfo.project.name}-perfil.png`), fullPage: true, caret: "initial" });
});
