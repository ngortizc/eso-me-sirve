import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { Pool } from "pg";

const baseURL = "http://127.0.0.1:3000";
const credentialsPath = join(process.cwd(), ".data", "dev-seed-users.json");
const privatePhone = "+56961112222";
const privateLocation = `Punto ficticio Docker ${crypto.randomUUID().slice(0, 8)}`;
const title = `Borrador privado Docker ${crypto.randomUUID().slice(0, 8)}`;

function runDocker(args) {
  const result = spawnSync("docker", args, { cwd: process.cwd(), encoding: "utf8", windowsHide: true });
  if (result.status !== 0) throw new Error("Docker no pudo completar la verificación local solicitada.");
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

async function waitForApplication() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseURL}/api/health/ready`, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return;
    } catch { /* El contenedor aún está iniciando. */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("La aplicación Docker no volvió a estar disponible dentro del plazo esperado.");
}

async function signIn(page, credential) {
  await page.goto("/ingresar");
  await page.getByLabel("Correo electrónico").fill(credential.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(credential.password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await page.waitForURL(/\/perfil$/);
}

const parsed = JSON.parse(await readFile(credentialsPath, "utf8"));
const publisher = parsed.users?.find((user) => user.name === "Publicador A");
const outsider = parsed.users?.find((user) => user.name === "Receptor B");
assert(publisher?.email && publisher?.password && outsider?.email && outsider?.password, "Ejecuta npm run dev:seed-users antes de esta verificación.");
assert(process.env.DATABASE_URL, "DATABASE_URL local es obligatoria.");

const browser = await chromium.launch();
let listingId = "";
try {
  const ownerContext = await browser.newContext({ baseURL });
  const ownerPage = await ownerContext.newPage();
  await signIn(ownerPage, publisher);
  const draftResponse = await ownerPage.request.post("/api/listings", {
    multipart: { intent: "draft", title, primaryPhotoIndex: "0" }
  });
  assert.equal(draftResponse.status(), 201);
  listingId = (await draftResponse.json()).listing.id;

  await ownerPage.goto(`/mis-publicaciones/${listingId}/editar`);
  await ownerPage.getByLabel("Teléfono chileno").fill(privatePhone);
  await ownerPage.getByLabel("Modalidad de entrega").selectOption("MEETING_POINT");
  await ownerPage.getByLabel("Dirección o descripción del punto de retiro").fill(privateLocation);
  await ownerPage.getByRole("checkbox", { name: /Acepto que estos datos/ }).check();
  await ownerPage.getByRole("button", { name: "Guardar datos privados" }).click();
  await ownerPage.getByText("Datos privados guardados correctamente.").waitFor();
  await ownerPage.reload();
  await ownerPage.getByLabel("Teléfono chileno").waitFor();
  assert.equal(await ownerPage.getByLabel("Teléfono chileno").inputValue(), privatePhone);
  assert.equal(await ownerPage.getByLabel("Dirección o descripción del punto de retiro").inputValue(), privateLocation);

  const evidenceDirectory = join(process.cwd(), "evidencias", "EMS-005A.1");
  await mkdir(evidenceDirectory, { recursive: true });
  await ownerPage.screenshot({ path: join(evidenceDirectory, "docker-contacto-privado-escritorio.png"), fullPage: true, caret: "initial" });

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    const result = await pool.query(
      `select phone_ciphertext, location_ciphertext, phone_nonce, location_nonce, phone_auth_tag, location_auth_tag, key_version
       from listing_private_contact where listing_id=$1`,
      [listingId]
    );
    assert.equal(result.rowCount, 1);
    const serialized = JSON.stringify(result.rows[0]);
    assert(!serialized.includes(privatePhone));
    assert(!serialized.includes(privateLocation));
    assert.equal(result.rows[0].phone_nonce.length, 12);
    assert.equal(result.rows[0].location_nonce.length, 12);
    assert.equal(result.rows[0].phone_auth_tag.length, 16);
    assert.equal(result.rows[0].location_auth_tag.length, 16);
    assert.equal(result.rows[0].key_version, 1);
  } finally {
    await pool.end();
  }

  runDocker(["compose", "restart", "app"]);
  await waitForApplication();
  await ownerPage.reload();
  await ownerPage.getByLabel("Teléfono chileno").waitFor();
  assert.equal(await ownerPage.getByLabel("Teléfono chileno").inputValue(), privatePhone);
  assert.equal(await ownerPage.getByLabel("Dirección o descripción del punto de retiro").inputValue(), privateLocation);

  const outsiderContext = await browser.newContext({ baseURL });
  try {
    const outsiderPage = await outsiderContext.newPage();
    await signIn(outsiderPage, outsider);
    const forbidden = await outsiderPage.request.get(`/api/listings/${listingId}/private-contact`);
    assert.equal(forbidden.status(), 404);
    assert(!((await forbidden.text()).includes(privatePhone)));
  } finally {
    await outsiderContext.close();
  }

  const publicResponse = await ownerPage.request.get(`/api/listings?q=${encodeURIComponent(title)}`);
  const publicPayload = await publicResponse.text();
  assert(!publicPayload.includes(privatePhone));
  assert(!publicPayload.includes(privateLocation));
  const logs = runDocker(["logs", "--tail", "250", "eso-me-sirve-app-1"]);
  assert(!logs.includes(privatePhone));
  assert(!logs.includes(privateLocation));
  await ownerContext.close();
} finally {
  await browser.close();
}

process.stdout.write(`Verificación Docker de contacto privado correcta para la publicación ficticia ${listingId}. No se imprimieron credenciales ni datos privados.\n`);
