import { expect, test } from "@playwright/test";

test("muestra una portada honesta y accesible", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Eso Me Sirve/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("a alguien le sirve");
  await expect(page.getByText("Plataforma en preparación")).toBeVisible();
  await expect(page.getByText("Aún no se reciben publicaciones ni reservas.")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "es-CL");
});

test("publica liveness y readiness sin detalles sensibles", async ({ request }) => {
  const live = await request.get("/api/health/live");
  expect(live.status()).toBe(200);
  expect(await live.json()).toEqual({ status: "ok" });

  const ready = await request.get("/api/health/ready");
  expect(ready.status()).toBe(200);
  expect(await ready.json()).toEqual({
    status: "ready",
    checks: { database: "up" }
  });
  expect(ready.headers()["cache-control"]).toContain("no-store");
});

test("expone un manifiesto PWA válido", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.status()).toBe(200);

  const manifest = await response.json();
  expect(manifest).toMatchObject({
    name: "Eso Me Sirve",
    short_name: "EMS",
    display: "standalone",
    lang: "es-CL",
    start_url: "/"
  });
  expect(manifest.icons).toContainEqual(
    expect.objectContaining({ src: "/icon.svg", type: "image/svg+xml" })
  );
});
