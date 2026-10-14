import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { platform } from "node:os";
import { resolve } from "node:path";

const relativePath = ".data/secrets/private-contact-key-v1";
const secretPath = resolve(relativePath);

function isValidKeyFile(path) {
  try {
    const encoded = readFileSync(path, "utf8").trim();
    const decoded = Buffer.from(encoded, "base64");
    return decoded.byteLength === 32 && decoded.toString("base64").replace(/=+$/, "") === encoded.replace(/=+$/, "");
  } catch {
    return false;
  }
}

if (process.env.NODE_ENV === "production" || process.env.APP_ENV !== "development") {
  throw new Error("dev:init-contact-key solo puede ejecutarse con APP_ENV=development y fuera de producción.");
}

mkdirSync(resolve(".data", "secrets"), { recursive: true, mode: 0o700 });
if (existsSync(secretPath)) {
  if (!isValidKeyFile(secretPath)) throw new Error(`El archivo ${relativePath} existe pero no contiene una clave Base64 válida de 32 bytes. No fue sobrescrito.`);
} else {
  writeFileSync(secretPath, `${randomBytes(32).toString("base64")}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
}
chmodSync(secretPath, 0o600);
if (platform() === "win32") {
  const principal = execFileSync("whoami.exe", { encoding: "utf8", windowsHide: true }).trim();
  if (!principal) throw new Error("No fue posible determinar el usuario local para proteger el archivo de clave.");
  execFileSync("icacls.exe", [secretPath, "/inheritance:r", "/grant:r", `${principal}:(F)`], { stdio: "ignore", windowsHide: true });
}

process.stdout.write(`Clave local de contacto lista en ${relativePath}. El valor no fue mostrado ni reemplazado.\n`);
