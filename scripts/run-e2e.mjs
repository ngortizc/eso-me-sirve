import { spawn, spawnSync } from "node:child_process";
import process from "node:process";

const port = 3100;
const isWindows = process.platform === "win32";
const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", String(port)],
  {
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: "1",
      BETTER_AUTH_URL: `http://127.0.0.1:${port}`,
      APP_ENV: "development",
      EMAIL_DELIVERY_MODE: "database"
    },
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
