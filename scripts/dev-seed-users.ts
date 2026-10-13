import { randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import { platform } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { betterAuth } from "better-auth";
import { Pool } from "pg";

export const DEV_SEED_USERS = [
  { name: "Publicador A", email: "publicador-a@users.eso-me-sirve.test" },
  { name: "Receptor B", email: "receptor-b@users.eso-me-sirve.test" },
  { name: "Receptor C", email: "receptor-c@users.eso-me-sirve.test" }
] as const;

type SeedEnvironment = Record<string, string | undefined>;
type SeedCredential = { name: string; email: string; password: string; result: "created" | "rotated" };
const execFileAsync = promisify(execFile);

function isLoopback(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1";
}

export function assertDevSeedEnvironment(environment: SeedEnvironment): void {
  if (environment.NODE_ENV === "production" || environment.APP_ENV !== "development") throw new Error("dev:seed-users solo puede ejecutarse con APP_ENV=development y fuera de producción.");
  if (!environment.DATABASE_URL) throw new Error("DATABASE_URL es obligatoria.");
  const databaseUrl = new URL(environment.DATABASE_URL);
  if (!isLoopback(databaseUrl.hostname)) throw new Error("dev:seed-users exige una base PostgreSQL local en loopback.");
  if (!environment.BETTER_AUTH_SECRET || environment.BETTER_AUTH_SECRET.length < 32) throw new Error("BETTER_AUTH_SECRET local debe tener al menos 32 caracteres.");
  if (environment.BETTER_AUTH_URL && !isLoopback(new URL(environment.BETTER_AUTH_URL).hostname)) throw new Error("BETTER_AUTH_URL debe apuntar al entorno local.");
}

export function generateSeedPassword(): string {
  return `${randomBytes(24).toString("base64url")}Aa1!`;
}

export function credentialsFilePath(root: string): string {
  return resolve(root, ".data", "dev-seed-users.json");
}

export function safeCompletionMessage(path: string, credentials: readonly Pick<SeedCredential, "email" | "result">[]): string {
  const users = credentials.map((item) => `${item.email} (${item.result === "created" ? "creado" : "credencial regenerada"})`).join(", ");
  return `Usuarios de prueba listos: ${users}. Credenciales guardadas localmente en ${path}. No se imprimieron contraseñas.`;
}

async function writeCredentials(path: string, credentials: readonly SeedCredential[]) {
  await mkdir(resolve(path, ".."), { recursive: true, mode: 0o700 });
  await writeFile(path, `${JSON.stringify({ generatedAt: new Date().toISOString(), environment: "development-local", users: credentials }, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await chmod(path, 0o600);
  if (platform() === "win32") {
    const { stdout } = await execFileAsync("whoami.exe");
    const principal = stdout.trim();
    if (!principal) throw new Error("No fue posible determinar el usuario local para proteger el archivo de credenciales.");
    await execFileAsync("icacls.exe", [path, "/inheritance:r", "/grant:r", `${principal}:(F)`]);
  }
}

export async function seedDevelopmentUsers(environment: SeedEnvironment = process.env, root = process.cwd()): Promise<{ path: string; credentials: SeedCredential[] }> {
  assertDevSeedEnvironment(environment);
  const databaseUrl = environment.DATABASE_URL!;
  const baseURL = environment.BETTER_AUTH_URL ?? "http://localhost:3000";
  const pool = new Pool({ connectionString: databaseUrl, application_name: "eso-me-sirve-dev-seed-users", connectionTimeoutMillis: 3_000, max: 2 });
  const verificationTokens = new Map<string, string>();
  const resetTokens = new Map<string, string>();
  const seedAuth = betterAuth({
    appName: "Eso Me Sirve — usuarios locales de prueba",
    baseURL,
    secret: environment.BETTER_AUTH_SECRET,
    database: pool,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, token }) => { resetTokens.set(user.email, token); }
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: false,
      sendVerificationEmail: async ({ user, token }) => { verificationTokens.set(user.email, token); }
    },
    user: {
      modelName: "identity_user",
      additionalFields: {
        role: { type: ["USER", "ADMIN"], required: true, defaultValue: "USER", input: false },
        commune: { type: "string", required: false }
      }
    },
    session: { modelName: "identity_session" },
    account: { modelName: "identity_account" },
    verification: { modelName: "identity_verification", storeIdentifier: "hashed" },
    rateLimit: { enabled: true, storage: "database", modelName: "identity_rate_limit", window: 60, max: 60 },
    advanced: { database: { joins: true, validateSchema: true } },
    trustedOrigins: [baseURL]
  });

  try {
    const credentials: SeedCredential[] = [];
    for (const definition of DEV_SEED_USERS) {
      const password = generateSeedPassword();
      const existing = await pool.query<{ id: string; name: string; emailVerified: boolean; role: string }>(
        `select id, name, "emailVerified", role from identity_user where email=$1`, [definition.email]
      );
      const user = existing.rows[0];
      let result: SeedCredential["result"];
      if (!user) {
        await seedAuth.api.signUpEmail({ body: { name: definition.name, email: definition.email, password, callbackURL: baseURL } });
        const token = verificationTokens.get(definition.email);
        if (!token) throw new Error(`Better Auth no generó verificación para ${definition.email}.`);
        await seedAuth.api.verifyEmail({ query: { token } });
        result = "created";
      } else {
        if (user.name !== definition.name || user.role !== "USER") throw new Error(`La cuenta reservada ${definition.email} no coincide con el usuario sintético esperado; no fue modificada.`);
        if (!user.emailVerified) {
          await seedAuth.api.sendVerificationEmail({ body: { email: definition.email, callbackURL: baseURL } });
          const verificationToken = verificationTokens.get(definition.email);
          if (!verificationToken) throw new Error(`Better Auth no generó verificación para ${definition.email}.`);
          await seedAuth.api.verifyEmail({ query: { token: verificationToken } });
        }
        await seedAuth.api.requestPasswordReset({ body: { email: definition.email, redirectTo: baseURL } });
        const resetToken = resetTokens.get(definition.email);
        if (!resetToken) throw new Error(`Better Auth no generó restablecimiento para ${definition.email}.`);
        await seedAuth.api.resetPassword({ body: { newPassword: password, token: resetToken } });
        result = "rotated";
      }
      const verified = await pool.query<{ emailVerified: boolean; role: string }>(`select "emailVerified", role from identity_user where email=$1`, [definition.email]);
      if (!verified.rows[0]?.emailVerified || verified.rows[0].role !== "USER") throw new Error(`La cuenta ${definition.email} no quedó verificada como USER.`);
      credentials.push({ ...definition, password, result });
    }
    const path = credentialsFilePath(root);
    await writeCredentials(path, credentials);
    return { path, credentials };
  } finally {
    await pool.end();
  }
}

async function main() {
  const result = await seedDevelopmentUsers();
  process.stdout.write(`${safeCompletionMessage(result.path, result.credentials)}\n`);
}

const entryPoint = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (entryPoint === import.meta.url) main().catch((error: unknown) => { process.stderr.write(`No fue posible crear usuarios de prueba: ${error instanceof Error ? error.message : "error desconocido"}\n`); process.exitCode = 1; });
