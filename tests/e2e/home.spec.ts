import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { registerVerifiedUser } from "./auth-helpers";

const pngBuffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
const photoFile = (index: number) => ({ name: `foto-${index}.png`, mimeType: "image/png", buffer: pngBuffer });
const demoPhotoPaths = ["sillon-verde.png", "sillon-verde-lateral.png", "sillon-verde-detalle.png"].map((name) => join(process.cwd(), "public", "demo", "articles", name));

test("presenta la propuesta y navega hacia el catálogo", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Eso Me Sirve/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Dale una nueva vida");
  await expect(page.getByRole("link", { name: /Explorar todos/i }).first()).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "es-CL");
  await page.getByRole("link", { name: /Explorar todos/i }).first().click();
  await expect(page).toHaveURL(/\/explorar/);
});

test("filtra el catálogo localmente y ofrece un estado vacío", async ({ page }) => {
  await page.goto("/explorar?q=termino-que-no-existe-ems");
  await expect(page.getByTestId("catalog-search")).toHaveValue("termino-que-no-existe-ems");
  await expect(page.getByTestId("empty-state")).toBeVisible();
  await page.getByRole("link", { name: "Limpiar" }).click();
  await expect(page).toHaveURL(/\/explorar$/);
});

test("explica el detalle sin revelar contacto", async ({ page }) => {
  await registerVerifiedUser(page, "detalle");
  await page.goto("/articulos/sillon-verde");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sillón verde de un cuerpo");
  await expect(page.getByText(/La dirección y los datos de contacto nunca son públicos/i)).toBeVisible();
  await page.getByRole("button", { name: "Solicitar artículo" }).click();
  await expect(page.getByText(/no se envió ninguna solicitud/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Ver proceso de conexión/ })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/\+56\s?9/);
  await expect(page.locator("body")).not.toContainText(/dirección exacta:/i);
});

test("navega la galería con teclado y ampliación accesible", async ({ page }) => {
  await page.goto("/articulos/sillon-verde");
  const gallery = page.getByTestId("article-gallery");
  await gallery.focus();
  await page.keyboard.press("ArrowRight");
  await expect(gallery).toHaveAttribute("data-selected-index", "1");
  await page.getByRole("button", { name: /Ampliar fotografía 2 de 4/ }).click();
  const dialog = page.getByRole("dialog", { name: /Vista ampliada/ });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Fotografía siguiente" }).click();
  await expect(gallery).toHaveAttribute("data-selected-index", "2");
  await dialog.getByRole("button", { name: "Cerrar vista ampliada" }).click();
  await expect(dialog).toBeHidden();
});

test("administra hasta ocho fotografías en memoria", async ({ page }) => {
  await registerVerifiedUser(page, "fotos");
  await page.goto("/publicar");
  const input = page.getByTestId("gallery-photo-input");
  await input.setInputFiles([photoFile(1), photoFile(2), photoFile(3)]);
  let photos = page.getByTestId("selected-photo");
  await expect(photos).toHaveCount(3);
  await photos.nth(1).getByRole("button", { name: "Principal", exact: true }).click();
  await expect(photos.nth(1)).toHaveAttribute("data-primary", "true");
  await photos.nth(0).getByRole("button", { name: /Eliminar foto-1.png/ }).click();
  photos = page.getByTestId("selected-photo");
  await expect(photos).toHaveCount(2);
  await expect(photos.nth(0)).toHaveAttribute("data-primary", "true");
  await input.setInputFiles(Array.from({ length: 7 }, (_, index) => photoFile(index + 4)));
  await expect(photos).toHaveCount(8);
  await expect(page.getByRole("region", { name: "Fotografías" }).getByRole("alert")).toContainText("puedes agregar hasta 8 fotografías");
});

test("hidrata publicar sin atributos inyectados ni divergencias React", async ({ page }) => {
  await registerVerifiedUser(page, "hidratacion");
  const hydrationMessages: string[] = [];
  page.on("console", (message) => {
    if (/hydration|server rendered html didn't match/i.test(message.text())) hydrationMessages.push(message.text());
  });
  await page.goto("/publicar");
  await page.locator("body").waitFor();
  expect(await page.locator("[data-kantu], [data-xt-extension-active]").count()).toBe(0);
  expect(hydrationMessages).toEqual([]);
});

test("el formulario real no permite establecer precio", async ({ page }) => {
  await registerVerifiedUser(page, "formulario");
  await page.goto("/publicar");
  await expect(page.getByLabel(/precio/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Publicar artículo" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Guardar borrador" })).toBeVisible();
});

test("distingue artículo gratis, tarifa referencial y pago deshabilitado", async ({ page }) => {
  await page.goto("/conexion");
  await expect(page.getByText("$1.000 CLP").first()).toBeVisible();
  await expect(page.getByText("Tarifa referencial del piloto")).toBeVisible();
  await expect(page.getByLabel("Teléfono protegido")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pago no habilitado" })).toBeDisabled();
  await expect(page.getByText(/no representa una transacción/)).toBeVisible();
});

test("muestra la navegación apropiada al viewport", async ({ page }, testInfo) => {
  await page.goto("/");
  const mobileNavigation = page.getByRole("navigation", { name: "Navegación móvil" });
  if (testInfo.project.name.includes("mobile")) {
    await expect(mobileNavigation).toBeVisible();
    await expect(mobileNavigation.getByRole("link", { name: "Publicar" })).toBeVisible();
  } else {
    await expect(mobileNavigation).toBeHidden();
    await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeVisible();
  }
  const dimensions = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
  await expect(page.getByRole("article").first()).toBeVisible();
  await expect(page.getByText("Buen estado").first()).toBeVisible();
});

test("publica salud y un manifiesto PWA sin detalles sensibles", async ({ request }) => {
  const live = await request.get("/api/health/live");
  expect(live.status()).toBe(200);
  expect(await live.json()).toEqual({ status: "ok" });
  const ready = await request.get("/api/health/ready");
  expect(ready.status()).toBe(200);
  expect(await ready.json()).toEqual({ status: "ready", checks: { database: "up" } });
  expect(ready.headers()["cache-control"]).toContain("no-store");
  const response = await request.get("/manifest.webmanifest");
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ name: "Eso Me Sirve", display: "standalone", lang: "es-CL", theme_color: "#126b5a" });
});

test("captura evidencias reales de las pantallas mejoradas", async ({ page }, testInfo) => {
  await registerVerifiedUser(page, "evidencias");
  const evidenceDirectory = join(process.cwd(), "evidencias", "EMS-001.1");
  await mkdir(evidenceDirectory, { recursive: true });
  const routes = [
    ["inicio", "/"],
    ["detalle", "/articulos/sillon-verde"],
    ["publicar", "/publicar"],
    ["explorar", "/explorar"]
  ] as const;
  for (const [name, route] of routes) {
    await page.goto(route);
    if (name === "publicar") await page.getByTestId("gallery-photo-input").setInputFiles(demoPhotoPaths);
    await page.locator("body").waitFor();
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(evidenceDirectory, `${testInfo.project.name}-${name}.png`), fullPage: true, caret: "initial" });
  }
});
