import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { registerVerifiedUser, signIn, testPassword, uniqueEmail } from "./auth-helpers";

const demoPhotos = ["sillon-verde.png", "sillon-verde-lateral.png", "sillon-verde-detalle.png"].map((name) => join(process.cwd(), "public", "demo", "articles", name));
const tinyPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

function uniqueTitle(prefix: string) { return `${prefix} ${crypto.randomUUID().slice(0, 6)}`; }

async function publishFromUi(page: Page, title: string, photoPaths = [demoPhotos[0]!]) {
  await page.goto("/publicar");
  await page.getByTestId("gallery-photo-input").setInputFiles(photoPaths);
  await page.getByLabel("Título").fill(title);
  await page.getByLabel("Descripción").fill("Artículo gratuito en buen estado para retirar coordinando dentro de la comuna seleccionada.");
  await page.getByLabel("Categoría").selectOption("hogar");
  await page.getByLabel("Condición").selectOption("GOOD");
  await page.getByLabel("Región").selectOption("CL-RM");
  await page.getByLabel("Comuna").selectOption("13120");
  await page.getByLabel("Teléfono chileno").fill("+56 9 1234 5678");
  await page.getByLabel("Modalidad de entrega").selectOption("MEETING_POINT");
  await page.getByLabel("Dirección o punto de retiro").fill("Entrada principal del centro comunitario de prueba");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Publicar artículo" }).click();
  await expect(page).toHaveURL(/\/articulos\/[^?]+\?created=1$/);
  return new URL(page.url()).pathname.split("/").pop()!;
}

async function publishFromApi(page: Page, title: string) {
  const response = await page.request.post("/api/listings", {
    multipart: {
      intent: "publish", title,
      description: "Artículo gratuito en buen estado para validar autorización del propietario en el servidor.",
      categorySlug: "hogar", condition: "GOOD", regionCode: "CL-RM", communeCode: "13120", primaryPhotoIndex: "0",
      contactPhone: "+56 9 1234 5678", deliveryMethod: "MEETING_POINT", deliveryLocation: "Punto ficticio de entrega", contactConsent: "true",
      photos: { name: "foto.png", mimeType: "image/png", buffer: tinyPng }
    }
  });
  expect(response.status()).toBe(201);
  return (await response.json() as { listing: { id: string; slug: string } }).listing;
}

test("publica, persiste tras cerrar sesión, filtra y oculta al pausar", async ({ page }) => {
  const account = await registerVerifiedUser(page, "listing-flow");
  const title = uniqueTitle("Lámpara persistente");
  const slug = await publishFromUi(page, title);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);

  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await page.request.post("/api/auth/sign-out");
  await page.context().clearCookies();
  await page.goto(`/articulos/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);

  await page.goto(`/explorar?q=${encodeURIComponent(title)}&category=hogar&region=CL-RM&commune=13120`);
  await expect(page.getByTestId("catalog-grid").getByRole("article")).toHaveCount(1);
  await expect(page.getByText(title)).toBeVisible();

  await signIn(page, account.email, testPassword);
  await page.goto("/mis-cosas");
  const card = page.getByTestId("owner-listing").filter({ hasText: title });
  await expect(card.getByRole("link", { name: "Editar", exact: true })).toBeVisible();
  await expect(card.getByRole("button", { name: "Marcar como entregado · Próximamente" })).toBeDisabled();
  await card.getByRole("button", { name: "Pausar publicación", exact: true }).click();
  await expect(card.getByText("Pausado")).toBeVisible();
  await expect(card.getByRole("link", { name: "Editar", exact: true })).toBeVisible();
  await expect(card.getByRole("button", { name: "Reactivar publicación", exact: true })).toBeVisible();
  await page.goto(`/articulos/${slug}`);
  await expect(page.getByRole("heading", { name: "Esta página no está disponible." })).toBeVisible();
  await page.goto(`/explorar?q=${encodeURIComponent(title)}`);
  await expect(page.getByTestId("empty-state")).toBeVisible();
});

test("deniega la edición de una publicación ajena", async ({ page }) => {
  await registerVerifiedUser(page, "listing-owner");
  const title = uniqueTitle("Silla protegida");
  const listing = await publishFromApi(page, title);
  await page.request.post("/api/auth/sign-out");
  await page.context().clearCookies();
  await registerVerifiedUser(page, "listing-intruder");
  const response = await page.request.patch(`/api/listings/${listing.id}`, {
    data: { title, description: "Descripción completa que un usuario ajeno no debe poder modificar nunca.", categorySlug: "hogar", condition: "GOOD", regionCode: "CL-RM", communeCode: "13120", status: "PAUSED", version: 1, ownerId: "forged" }
  });
  expect(response.status()).toBe(400);
  const withoutForgedOwner = await page.request.patch(`/api/listings/${listing.id}`, {
    data: { title, description: "Descripción completa que un usuario ajeno no debe poder modificar nunca.", categorySlug: "hogar", condition: "GOOD", regionCode: "CL-RM", communeCode: "13120", status: "PAUSED", version: 1 }
  });
  expect(withoutForgedOwner.status()).toBe(403);
});

test("rechaza fotografías inválidas y limita la selección a ocho", async ({ page }) => {
  await registerVerifiedUser(page, "listing-invalid-photo");
  const response = await page.request.post("/api/listings", {
    multipart: {
      intent: "publish", title: uniqueTitle("Archivo inválido"),
      description: "Descripción completa para probar que el contenido binario se valida en el servidor.",
      categorySlug: "hogar", condition: "GOOD", regionCode: "CL-RM", communeCode: "13120", primaryPhotoIndex: "0",
      photos: { name: "falsa.png", mimeType: "image/png", buffer: Buffer.from("esto no es una imagen") }
    }
  });
  expect(response.status()).toBe(400);
  await page.goto("/publicar");
  await page.getByTestId("gallery-photo-input").setInputFiles(Array.from({ length: 9 }, (_, index) => ({ name: `foto-${index}.png`, mimeType: "image/png", buffer: tinyPng })));
  await expect(page.getByTestId("selected-photo")).toHaveCount(8);
  await expect(page.getByRole("region", { name: "Fotografías" }).getByRole("alert")).toContainText("hasta 8 fotografías");
});

test("cambia principal, elimina fotografías y entrega variantes sin EXIF", async ({ page }) => {
  await registerVerifiedUser(page, "listing-photo-admin");
  const title = uniqueTitle("Mueble con galería");
  const slug = await publishFromUi(page, title, demoPhotos.slice(0, 2));
  await page.goto("/mis-cosas");
  await page.getByTestId("owner-listing").filter({ hasText: title }).getByRole("link", { name: "Editar" }).click();
  const makePrimary = page.getByRole("button", { name: "Hacer principal" });
  await expect(makePrimary).toHaveCount(2);
  await makePrimary.nth(1).click();
  await expect(page.getByText("Fotografía principal actualizada correctamente.")).toBeVisible();
  await page.getByRole("button", { name: "Eliminar" }).first().click();
  await expect(page.getByRole("button", { name: "Eliminar" })).toHaveCount(1);

  const catalogResponse = await page.request.get(`/api/listings?q=${encodeURIComponent(title)}`);
  const catalog = await catalogResponse.json() as { items: Array<{ primaryPhotoUrl: string; slug: string }> };
  expect(catalog.items[0]?.slug).toBe(slug);
  const imageResponse = await page.request.get(catalog.items[0]!.primaryPhotoUrl.replace("/catalog", "/detail"));
  expect(imageResponse.status()).toBe(200);
  const metadata = await sharp(await imageResponse.body()).metadata();
  expect(metadata.format).toBe("webp");
  expect(metadata.exif).toBeUndefined();
  expect(metadata.orientation).toBeUndefined();
});

test("un usuario no verificado no puede publicar", async ({ page }) => {
  const email = uniqueEmail("listing-unverified");
  const testClientIp = `192.0.2.${Math.floor(Math.random() * 250) + 1}`;
  const signup = await page.request.post("/api/auth/sign-up/email", { headers: { "x-ems-test-client-ip": testClientIp }, data: { name: "Sin verificar", email, password: testPassword, callbackURL: "/perfil" } });
  expect(signup.status()).toBe(200);
  const response = await page.request.post("/api/listings", {
    multipart: { intent: "draft", title: "Borrador no autorizado", primaryPhotoIndex: "0" }
  });
  expect([401, 403]).toContain(response.status());
});

test("las respuestas públicas omiten propietario, contacto y claves físicas", async ({ page }) => {
  const account = await registerVerifiedUser(page, "listing-privacy");
  const title = uniqueTitle("Objeto sin datos privados");
  await publishFromApi(page, title);
  const response = await page.request.get(`/api/listings?q=${encodeURIComponent(title)}`);
  const text = await response.text();
  expect(text).not.toContain(account.userId);
  expect(text).not.toContain(account.email);
  expect(text).not.toMatch(/storageKey|ownerId|phone|address|password|token/i);
});

test("protege, permite rectificar y no publica los datos privados", async ({ page }, testInfo) => {
  const account = await registerVerifiedUser(page, `private-contact-${testInfo.project.name}`);
  const title = uniqueTitle("Biblioteca con retiro privado");
  const listing = await publishFromApi(page, title);
  const ownerResponse = await page.request.get(`/api/listings/${listing.id}/private-contact`);
  expect(ownerResponse.status()).toBe(200);
  await expect(ownerResponse.json()).resolves.toMatchObject({ contact: { phone: "+56912345678", deliveryMethod: "MEETING_POINT", location: "Punto ficticio de entrega", version: 1 } });

  await page.goto(`/mis-publicaciones/${listing.id}/editar`);
  await expect(page.getByRole("heading", { name: "2. Datos privados para coordinar el retiro" })).toBeVisible();
  await expect(page.getByLabel("Teléfono chileno")).toHaveValue("+56912345678");
  const consent = page.getByRole("checkbox", { name: /Acepto que estos datos/ });
  await expect(consent).not.toBeChecked();
  await page.getByLabel("Dirección o descripción del punto de retiro").fill("Nuevo punto ficticio junto a la biblioteca");
  await consent.check();
  await page.getByRole("button", { name: "Actualizar datos privados" }).click();
  await expect(page.getByText("Datos privados guardados correctamente.")).toBeVisible();
  const evidenceDirectory = join(process.cwd(), "evidencias", "EMS-005A");
  await mkdir(evidenceDirectory, { recursive: true });
  await page.screenshot({ path: join(evidenceDirectory, `${testInfo.project.name}-contacto-privado-propietario.png`), fullPage: true, caret: "initial" });

  const publicJson = await (await page.request.get(`/api/listings?q=${encodeURIComponent(title)}`)).text();
  expect(publicJson).not.toContain("+56912345678");
  expect(publicJson).not.toContain("Nuevo punto ficticio");
  await page.request.post("/api/auth/sign-out");
  await page.context().clearCookies();
  await page.goto(`/articulos/${listing.slug}`);
  const publicHtml = await page.content();
  expect(publicHtml).not.toContain(account.email);
  expect(publicHtml).not.toContain("+56912345678");
  expect(publicHtml).not.toContain("Nuevo punto ficticio");
  expect((await page.request.get(`/api/listings/${listing.id}/private-contact`)).status()).toBe(401);
});

test("edita, administra fotografías y retira sin bloquear el formulario", async ({ page }, testInfo) => {
  await registerVerifiedUser(page, `listing-editing-${testInfo.project.name}`);
  const originalTitle = uniqueTitle("Estante ficticio editable");
  const slug = await publishFromUi(page, originalTitle, demoPhotos.slice(0, 2));
  await page.goto("/mis-cosas");
  await page.getByTestId("owner-listing").filter({ hasText: originalTitle }).getByRole("link", { name: "Editar" }).click();

  const changedTitle = uniqueTitle("Estante ficticio corregido");
  const changedDescription = "Descripción actualizada y persistente para validar que el formulario se libera después de guardar.";
  await page.getByLabel("Título").fill(changedTitle);
  await page.locator('textarea[name="description"]').fill(changedDescription);
  await page.route("**/api/listings/*", async (route) => route.fulfill({ status: 500, contentType: "text/plain", body: "fallo simulado" }), { times: 1 });
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("El servidor respondió 500 sin un mensaje válido.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeEnabled();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Cambios guardados correctamente.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeEnabled();
  await page.reload();
  await expect(page.getByLabel("Título")).toHaveValue(changedTitle);
  await expect(page.locator('textarea[name="description"]')).toHaveValue(changedDescription);

  await page.getByRole("button", { name: "Hacer principal" }).nth(1).click();
  await expect(page.getByText("Fotografía principal actualizada correctamente.")).toBeVisible();

  await page.getByLabel("Nuevas fotografías").setInputFiles(demoPhotos[2]!);
  await page.getByRole("button", { name: "Agregar fotografías" }).click();
  await expect(page.getByText("Fotografías agregadas correctamente.")).toBeVisible();
  await expect(page.getByTestId("managed-photo")).toHaveCount(3);

  await page.getByRole("button", { name: "Mover fotografía 3 a la izquierda" }).click();
  await expect(page.getByText("Orden de fotografías guardado correctamente.")).toBeVisible();

  const firstPhoto = page.getByTestId("managed-photo").first();
  const oldPhotoUrl = await firstPhoto.getByRole("img").getAttribute("src");
  expect(oldPhotoUrl).toBeTruthy();
  await page.getByLabel("Reemplazar fotografía 1").setInputFiles(demoPhotos[2]!);
  await expect(page.getByText("Fotografía reemplazada correctamente.")).toBeVisible();
  await expect(firstPhoto.getByRole("img")).not.toHaveAttribute("src", oldPhotoUrl!);
  expect((await page.request.get(oldPhotoUrl!)).status()).toBe(404);

  await page.getByTestId("managed-photo").last().getByRole("button", { name: "Eliminar" }).click();
  await expect(page.getByText("Fotografía eliminada correctamente.")).toBeVisible();
  await expect(page.getByTestId("managed-photo")).toHaveCount(2);
  const evidenceDirectory = join(process.cwd(), "evidencias", "EMS-004.1");
  await mkdir(evidenceDirectory, { recursive: true });
  await page.screenshot({ path: join(evidenceDirectory, `${testInfo.project.name}-gestion-fotografias.png`), fullPage: true, caret: "initial" });

  await page.getByRole("button", { name: "Retirar definitivamente", exact: true }).click();
  await expect(page.getByText("Confirma el retiro definitivo")).toBeVisible();
  await expect(page.getByText("Esta acción es irreversible.")).toBeVisible();
  await page.getByRole("button", { name: "Sí, retirar definitivamente" }).click();
  await expect(page.getByText("Publicación retirada correctamente.")).toBeVisible();
  await expect(page.getByText("Esta publicación fue retirada definitivamente y no puede modificarse")).toBeVisible();
  await expect(page.getByRole("button", { name: "Guardar cambios" })).toHaveCount(0);
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(page.getByRole("combobox")).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Detalle de publicación retirada" })).toBeVisible();
  await expect(page.getByText("Esta publicación fue retirada definitivamente y no puede modificarse")).toBeVisible();
  await expect(page.getByRole("button", { name: /Reactivar|Guardar|Retirar/ })).toHaveCount(0);
  await page.screenshot({ path: join(evidenceDirectory, `${testInfo.project.name}-publicacion-retirada.png`), fullPage: true, caret: "initial" });

  await page.goto("/mis-cosas");
  const removedCard = page.getByTestId("owner-listing").filter({ hasText: changedTitle });
  await expect(removedCard.getByRole("link", { name: "Editar", exact: true })).toHaveCount(0);
  await expect(removedCard.getByRole("link", { name: "Ver detalle", exact: true })).toBeVisible();
  await expect(removedCard.getByRole("button", { name: /Reactivar|Retirar|Pausar/ })).toHaveCount(0);
  await removedCard.getByRole("link", { name: "Ver detalle", exact: true }).click();
  await expect(page.getByText("Esta publicación fue retirada definitivamente y no puede modificarse")).toBeVisible();

  await page.goto(`/articulos/${slug}`);
  await expect(page.getByRole("heading", { name: "Esta página no está disponible." })).toBeVisible();
  await page.goto(`/explorar?q=${encodeURIComponent(changedTitle)}`);
  await expect(page.getByTestId("empty-state")).toBeVisible();
});

test("rechaza publicar un borrador sin fotografías", async ({ page }) => {
  await registerVerifiedUser(page, "listing-without-photo");
  const title = uniqueTitle("Borrador sin fotografía");
  const draft = await page.request.post("/api/listings", {
    multipart: { intent: "draft", title, description: "Borrador ficticio completo que deliberadamente no contiene ninguna fotografía.", categorySlug: "hogar", condition: "GOOD", regionCode: "CL-RM", communeCode: "13120", primaryPhotoIndex: "0" }
  });
  expect(draft.status()).toBe(201);
  const listing = (await draft.json() as { listing: { id: string } }).listing;
  const publish = await page.request.patch(`/api/listings/${listing.id}`, {
    data: { title, description: "Borrador ficticio completo que deliberadamente no contiene ninguna fotografía.", categorySlug: "hogar", condition: "GOOD", regionCode: "CL-RM", communeCode: "13120", status: "PUBLISHED", version: 1 }
  });
  expect(publish.status()).toBe(400);
  await expect(publish.json()).resolves.toMatchObject({ error: "Revisa los datos ingresados." });
});

test("permite borrador sin contacto e impide publicar sin datos privados", async ({ page }) => {
  await registerVerifiedUser(page, "listing-private-contact-required");
  const title = uniqueTitle("Borrador sin contacto privado");
  const draft = await page.request.post("/api/listings", { multipart: { intent: "draft", title, primaryPhotoIndex: "0" } });
  expect(draft.status()).toBe(201);
  const publish = await page.request.post("/api/listings", {
    multipart: {
      intent: "publish", title,
      description: "Artículo ficticio completo para comprobar que publicar requiere datos privados protegidos.",
      categorySlug: "hogar", condition: "GOOD", regionCode: "CL-RM", communeCode: "13120", primaryPhotoIndex: "0",
      photos: { name: "foto.png", mimeType: "image/png", buffer: tinyPng }
    }
  });
  expect(publish.status()).toBe(400);
  await expect(publish.json()).resolves.toMatchObject({ error: "Revisa los datos privados de entrega." });
});

test("captura publicación y catálogo reales", async ({ page }, testInfo) => {
  await registerVerifiedUser(page, `listing-evidence-${testInfo.project.name}`);
  const title = uniqueTitle("Escritorio comunitario");
  const slug = await publishFromUi(page, title, demoPhotos.slice(0, 3));
  const directory = join(process.cwd(), "evidencias", "EMS-003");
  await mkdir(directory, { recursive: true });
  for (const [name, route] of [["detalle", `/articulos/${slug}`], ["catalogo", `/explorar?q=${encodeURIComponent(title)}`], ["mis-publicaciones", "/mis-cosas"]] as const) {
    await page.goto(route);
    await page.locator("body").waitFor();
    await page.screenshot({ path: join(directory, `${testInfo.project.name}-${name}.png`), fullPage: true, caret: "initial" });
  }
});
