import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { registerVerifiedUser, testPassword, uniqueEmail } from "./auth-helpers";

const tinyPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

async function publish(page: import("@playwright/test").Page, title: string) {
  const response = await page.request.post("/api/listings", {
    multipart: {
      intent: "publish", title,
      description: "Artículo gratuito para validar el flujo real y seguro de solicitudes y reservas.",
      categorySlug: "hogar", condition: "GOOD", regionCode: "CL-RM", communeCode: "13120", primaryPhotoIndex: "0",
      photos: { name: "foto.png", mimeType: "image/png", buffer: tinyPng }
    }
  });
  expect(response.status()).toBe(201);
  return (await response.json() as { listing: { id: string; slug: string } }).listing;
}

test("solicita, acepta y muestra una reserva privada en escritorio y móvil", async ({ page }, testInfo) => {
  const owner = await registerVerifiedUser(page, `reservation-owner-${testInfo.project.name}`, "Publicador prueba");
  const title = `Mesa reservable ${crypto.randomUUID().slice(0, 6)}`;
  const listing = await publish(page, title);
  const ownerCookies = await page.context().cookies();

  await page.context().clearCookies();
  await page.goto(`/articulos/${listing.slug}`);
  await expect(page.getByText("El artículo es gratis. Si aceptan tu solicitud, tendrás 24 horas para pagar $1.000 por el servicio de conexión y obtener los datos de contacto")).toBeVisible();
  await page.getByRole("button", { name: "Solicitar artículo" }).click();
  await expect(page).toHaveURL(/\/ingresar\?returnTo=/);

  const unverifiedEmail = uniqueEmail(`reservation-unverified-${testInfo.project.name}`);
  const signup = await page.request.post("/api/auth/sign-up/email", {
    headers: { "x-ems-test-client-ip": `192.0.2.${Math.floor(Math.random() * 250) + 1}` },
    data: { name: "Sin verificar", email: unverifiedEmail, password: testPassword, callbackURL: "/perfil" }
  });
  expect(signup.status()).toBe(200);
  const unverifiedRequest = await page.request.post("/api/requests", { data: { listingSlug: listing.slug } });
  expect([401, 403]).toContain(unverifiedRequest.status());

  await page.context().clearCookies();
  const recipient = await registerVerifiedUser(page, `reservation-recipient-${testInfo.project.name}`, "Receptor prueba");
  await page.goto(`/articulos/${listing.slug}`);
  await page.getByRole("button", { name: "Solicitar artículo" }).click();
  await expect(page.getByText("Tu solicitud fue enviada. El publicador debe aceptarla antes de que corresponda pagar.")).toBeVisible();
  const duplicate = await page.request.post("/api/requests", { data: { listingSlug: listing.slug } });
  expect(duplicate.status()).toBe(409);
  const recipientCookies = await page.context().cookies();

  await page.context().clearCookies();
  await page.context().addCookies(ownerCookies);
  await page.goto("/mis-cosas?tab=recibidas");
  const receivedTab = page.getByRole("tab", { name: /Solicitudes recibidas/ });
  await expect(receivedTab).toHaveAttribute("aria-selected", "true");
  await receivedTab.press("Home");
  await expect(page.getByRole("tab", { name: /Publicaciones/ })).toBeFocused();
  await page.getByRole("tab", { name: /Solicitudes recibidas/ }).click();
  const received = page.getByTestId("pending-request-action").filter({ hasText: title });
  await expect(received).toBeVisible();
  const evidenceDir = join(process.cwd(), "evidencias", "EMS-004.2");
  await mkdir(evidenceDir, { recursive: true });
  await page.screenshot({ path: join(evidenceDir, `${testInfo.project.name}-pendiente-de-ti.png`), fullPage: true, caret: "initial" });
  await received.getByRole("button", { name: "Aceptar" }).click();
  await expect(page.getByText("Solicitud aceptada y reserva creada.")).toBeVisible();
  const publisherReservation = page.getByTestId("reservation-card").filter({ hasText: title });
  await expect(publisherReservation).toBeVisible();
  await expect(publisherReservation.getByText("Esperando pago del receptor")).toBeVisible();
  await expect(publisherReservation).toContainText("Receptor seleccionado: Receptor prueba");
  await expect(publisherReservation.getByText("Publicar y regalar siempre es gratis.")).toBeVisible();
  await expect(publisherReservation.getByTestId("payment-countdown")).toHaveCount(0);
  await expect(publisherReservation.getByText("$1.000 CLP")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Pagar/ })).toHaveCount(0);
  const retireReserved = await page.request.post(`/api/listings/${listing.id}/retire`, { data: { version: 2 } });
  expect(retireReserved.status()).toBe(409);
  const receivedResponse = await page.request.get("/api/requests?scope=received");
  const receivedText = await receivedResponse.text();
  expect(receivedText).not.toContain(recipient.email);
  expect(receivedText).not.toMatch(/phone|address|telefono|direcci[oó]n|password|token/i);
  const owned = await page.request.get("/api/reservations?scope=owned");
  const ownedBody = await owned.json() as { reservations: Array<{ id: string; status: string; paymentExpiresAt: string; acceptedAt: string; primaryPhotoUrl: string }> };
  expect(ownedBody.reservations[0]?.status).toBe("PENDING_PAYMENT");
  expect(new Date(ownedBody.reservations[0]!.paymentExpiresAt).getTime() - new Date(ownedBody.reservations[0]!.acceptedAt).getTime()).toBe(24 * 60 * 60 * 1000);
  const reservationId = ownedBody.reservations[0]!.id;

  await page.screenshot({ path: join(evidenceDir, `${testInfo.project.name}-solicitudes-recibidas.png`), fullPage: true, caret: "initial" });

  await page.goto(`/reservas/${reservationId}?perspective=RECIPIENT&role=RECIPIENT`);
  await expect(page.getByText("Esperando pago del receptor").first()).toBeVisible();
  await expect(page.getByText("Receptor seleccionado: Receptor prueba")).toBeVisible();
  await expect(page.getByText("Publicar y regalar siempre es gratis.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Pagar/ })).toHaveCount(0);
  await expect(page.getByText("$1.000 CLP")).toHaveCount(0);
  const publisherDeadline = await page.getByTestId("reservation-deadline").textContent();
  expect(publisherDeadline).toContain("exactamente el");
  const ems44EvidenceDir = join(process.cwd(), "evidencias", "EMS-004.4");
  await mkdir(ems44EvidenceDir, { recursive: true });
  await page.screenshot({ path: join(ems44EvidenceDir, `${testInfo.project.name}-vista-publicador.png`), fullPage: true, caret: "initial" });

  await page.context().clearCookies();
  await page.context().addCookies(recipientCookies);
  await page.goto("/mis-cosas?tab=enviadas");
  expect((await page.request.get(ownedBody.reservations[0]!.primaryPhotoUrl)).status()).toBe(200);
  const recipientReservation = page.getByTestId("pending-reservation-action").filter({ hasText: title });
  await expect(recipientReservation.getByText("Tu solicitud fue aceptada")).toBeVisible();
  await expect(recipientReservation.getByText("Artículo", { exact: true })).toBeVisible();
  await expect(recipientReservation.getByText("Gratis")).toBeVisible();
  await expect(recipientReservation.getByText("$1.000 CLP")).toBeVisible();
  await expect(recipientReservation.getByTestId("payment-countdown")).toBeVisible();
  await expect(recipientReservation.getByText(/Vence exactamente el/)).toBeVisible();
  await expect(recipientReservation.getByText(/el artículo volverá a estar disponible/)).toBeVisible();
  await expect(recipientReservation.getByText("El pago todavía no está habilitado en esta versión.")).toBeVisible();
  await recipientReservation.getByRole("link", { name: "Ver reserva" }).click();
  await expect(page).toHaveURL(new RegExp(`/reservas/${reservationId}$`));
  await expect(page.getByRole("heading", { name: "Tu solicitud fue aceptada" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pagar (todavía no habilitado)" })).toBeDisabled();
  await expect(page.getByText("En EMS-005, solo un pago confirmado por el servidor podrá habilitar los datos de contacto.", { exact: false })).toBeVisible();
  const recipientDeadline = await page.getByTestId("reservation-deadline").textContent();
  expect(recipientDeadline?.split("exactamente el ")[1]).toBe(publisherDeadline?.split("exactamente el ")[1]);
  await expect(page.getByText("Solicitud aceptada por el publicador")).toBeVisible();
  await expect(page.getByText("Reserva creada; esperando pago del receptor")).toBeVisible();
  await expect(page.getByText(/REQUEST_CREATED|REQUEST_ACCEPTED|PENDING_PAYMENT/)).toHaveCount(0);
  await page.screenshot({ path: join(ems44EvidenceDir, `${testInfo.project.name}-vista-receptor.png`), fullPage: true, caret: "initial" });
  await page.screenshot({ path: join(evidenceDir, `${testInfo.project.name}-reserva-pendiente.png`), fullPage: true, caret: "initial" });

  await page.context().clearCookies();
  await registerVerifiedUser(page, `reservation-outsider-${testInfo.project.name}`);
  const forbidden = await page.request.get(`/api/reservations/${reservationId}`);
  expect(forbidden.status()).toBe(404);
  expect(await forbidden.text()).not.toContain(title);
  expect((await page.request.get(ownedBody.reservations[0]!.primaryPhotoUrl)).status()).toBe(404);
  expect(owner.email).not.toBe(recipient.email);
});

test("aísla A, B y C, impide autosolicitud y conserva al no seleccionado en espera", async ({ browser }, testInfo) => {
  const contextOptions = { baseURL: "http://127.0.0.1:3100", viewport: testInfo.project.name.includes("mobile") ? { width: 412, height: 915 } : { width: 1365, height: 900 } };
  const [contextA, contextB, contextC] = await Promise.all([
    browser.newContext(contextOptions), browser.newContext(contextOptions), browser.newContext(contextOptions)
  ]);
  try {
    const [pageA, pageB, pageC] = await Promise.all([contextA.newPage(), contextB.newPage(), contextC.newPage()]);
    const [accountA, accountB, accountC] = await Promise.all([
      registerVerifiedUser(pageA, `session-a-${testInfo.project.name}`, "Publicador A"),
      registerVerifiedUser(pageB, `session-b-${testInfo.project.name}`, "Receptor B"),
      registerVerifiedUser(pageC, `session-c-${testInfo.project.name}`, "Receptor C")
    ]);
    const authCookieA = (await contextA.cookies()).find((cookie) => cookie.name.startsWith("ems.") && cookie.name.includes("session"));
    expect(authCookieA).toMatchObject({ httpOnly: true, sameSite: "Lax" });
    const title = `Aislamiento ${crypto.randomUUID().slice(0, 6)}`;
    const listing = await publish(pageA, title);

    await pageA.goto(`/articulos/${listing.slug}`);
    await expect(pageA.getByRole("link", { name: "Administrar mi publicación" })).toBeVisible();
    await expect(pageA.getByRole("button", { name: "Solicitar artículo" })).toHaveCount(0);
    const ownRequest = await pageA.request.post("/api/requests", { data: { listingSlug: listing.slug, requesterId: accountB.userId } });
    expect(ownRequest.status()).toBe(400);
    const ownRequestWithoutSpoofing = await pageA.request.post("/api/requests", { data: { listingSlug: listing.slug } });
    expect(ownRequestWithoutSpoofing.status()).toBe(409);

    await Promise.all([pageB.goto(`/articulos/${listing.slug}`), pageC.goto(`/articulos/${listing.slug}`)]);
    await Promise.all([
      pageB.getByRole("button", { name: "Solicitar artículo" }).click(),
      pageC.getByRole("button", { name: "Solicitar artículo" }).click()
    ]);
    await Promise.all([
      expect(pageB.getByText("Tu solicitud fue enviada. El publicador debe aceptarla antes de que corresponda pagar.")).toBeVisible(),
      expect(pageC.getByText("Tu solicitud fue enviada. El publicador debe aceptarla antes de que corresponda pagar.")).toBeVisible()
    ]);

    const privatePageResponse = await pageA.goto("/mis-cosas?tab=recibidas");
    expect(privatePageResponse?.headers()["cache-control"]).toMatch(/private|no-cache|no-store/);
    const requestB = pageA.getByTestId("pending-request-action").filter({ hasText: "Receptor B" });
    const requestC = pageA.getByTestId("pending-request-action").filter({ hasText: "Receptor C" });
    await expect(requestB).toBeVisible();
    await expect(requestC).toBeVisible();
    const receivedPayload = await (await pageA.request.get("/api/requests?scope=received")).text();
    expect(receivedPayload).toContain("Receptor B");
    expect(receivedPayload).toContain("Receptor C");
    expect(receivedPayload).not.toContain(accountB.email);
    expect(receivedPayload).not.toContain(accountC.email);
    expect(receivedPayload).not.toMatch(/phone|address|telefono|direcci[oó]n|password|token/i);

    await requestB.getByRole("button", { name: "Aceptar" }).click();
    await expect(pageA.getByText("Solicitud aceptada y reserva creada.")).toBeVisible();
    await pageA.getByRole("tab", { name: /Solicitudes recibidas/ }).click();
    const waitingC = pageA.getByTestId("received-request").filter({ hasText: "Receptor C" });
    await expect(waitingC.getByText("En espera.", { exact: false })).toBeVisible();
    await expect(waitingC.getByRole("button", { name: "Aceptar" })).toHaveCount(0);
    await expect(waitingC.getByRole("button", { name: "Rechazar" })).toBeVisible();

    const evidenceDir = join(process.cwd(), "evidencias", "EMS-004.3");
    await mkdir(evidenceDir, { recursive: true });
    await pageA.screenshot({ path: join(evidenceDir, `${testInfo.project.name}-interesados-en-espera.png`), fullPage: true, caret: "initial" });

    await pageB.goto("/perfil");
    await pageB.getByRole("button", { name: "Cerrar sesión actual" }).click();
    await expect(pageB).toHaveURL(/\/$/);
    expect(await (await pageB.request.get("/api/auth/get-session")).json()).toBeNull();

    const [sessionA, sessionC] = await Promise.all([
      pageA.request.get("/api/auth/get-session"), pageC.request.get("/api/auth/get-session")
    ]);
    expect((await sessionA.json() as { user: { name: string; email: string } }).user).toMatchObject({ name: "Publicador A", email: accountA.email });
    expect((await sessionC.json() as { user: { name: string; email: string } }).user).toMatchObject({ name: "Receptor C", email: accountC.email });
    await pageC.goto("/mis-cosas?tab=enviadas");
    const sentC = pageC.getByTestId("sent-request").filter({ hasText: title });
    await expect(sentC.getByText("En espera.", { exact: false })).toBeVisible();
    await expect(pageC.getByText("Receptor B")).toHaveCount(0);
    await expect(pageC.getByText(accountB.email)).toHaveCount(0);
    await pageC.screenshot({ path: join(evidenceDir, `${testInfo.project.name}-sesion-c-aislada.png`), fullPage: true, caret: "initial" });
  } finally {
    await Promise.all([contextA.close(), contextB.close(), contextC.close()]);
  }
});
