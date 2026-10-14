import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import process from "node:process";

const port = 3100;
const isWindows = process.platform === "win32";
const e2eKeyPath = process.env.CI ? ".data/e2e-private-contact-key" : ".data/secrets/private-contact-key-v1";
mkdirSync(dirname(e2eKeyPath), { recursive: true, mode: 0o700 });
if (!existsSync(e2eKeyPath)) {
  if (!process.env.CI) throw new Error("Falta la clave local compartida. Ejecuta npm run dev:init-contact-key antes de las pruebas E2E.");
  writeFileSync(e2eKeyPath, randomBytes(32).toString("base64"), { encoding: "utf8", mode: 0o600 });
}
try { chmodSync(e2eKeyPath, 0o600); } catch { /* Windows aplica ACL del usuario al directorio local. */ }
const e2ePrivateContactKey = readFileSync(e2eKeyPath, "utf8").trim();
const runtimeEnvironment = {
  ...process.env,
  NEXT_TELEMETRY_DISABLED: "1",
  BETTER_AUTH_URL: `http://127.0.0.1:${port}`,
  APP_ENV: "development",
  EMAIL_DELIVERY_MODE: "database",
  E2E_BUILD: "1",
  PHOTO_STORAGE_ROOT: ".data/listing-photos",
  PRIVATE_CONTACT_ACTIVE_KEY_VERSION: "1",
  PRIVATE_CONTACT_KEY_V1: e2ePrivateContactKey
};
delete runtimeEnvironment.PRIVATE_CONTACT_KEY_V1_FILE;

const build = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], {
  env: runtimeEnvironment,
  stdio: "inherit",
  windowsHide: true
});
if (build.status !== 0) process.exit(build.status ?? 1);

const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)],
  {
    env: runtimeEnvironment,
    stdio: "inherit",
    windowsHide: true,
    detached: !isWindows
  }
);

async function waitForServer() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Next.js terminó antes de iniciar (código ${server.exitCode}).`);
    }

    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health/live`, {
        signal: AbortSignal.timeout(2_000)
      });
      if (response.ok) {
        return;
      }
    } catch {
      // El servidor aún está iniciando.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error("Next.js no estuvo disponible antes del timeout.");
}

function stopServer() {
  if (!server.pid || server.exitCode !== null) {
    return;
  }

  if (isWindows) {
    spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true
    });
    return;
  }

  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    server.kill("SIGKILL");
  }
}

let exitCode = 1;
try {
  await waitForServer();
  const playwright = spawn(
    process.execPath,
    ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)],
    { env: process.env, stdio: "inherit", windowsHide: true }
  );

  exitCode = await new Promise((resolve, reject) => {
    playwright.once("error", reject);
    playwright.once("exit", (code) => resolve(code ?? 1));
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
} finally {
  stopServer();
}

process.exit(exitCode);
