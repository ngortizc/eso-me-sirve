import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { DatabaseEmailDelivery } from "@/modules/identity/infrastructure/database-email-delivery";
import { protectIdentityActionUrl } from "@/modules/identity/infrastructure/protected-action-url";
import { getPostgresPool } from "@/shared/database/postgres";

const fifteenMinutesInSeconds = 15 * 60;
const sevenDaysInSeconds = 7 * 24 * 60 * 60;
const emailDelivery = new DatabaseEmailDelivery();
const useSecureCookies = process.env.NODE_ENV === "production" && process.env.APP_ENV !== "development";

export const auth = betterAuth({
  appName: "Eso Me Sirve",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: getPostgresPool(),
  emailAndPassword: {
    enabled: true,
    disableSignUp: process.env.APP_ENV !== "development",
    minPasswordLength: 12,
    maxPasswordLength: 128,
    requireEmailVerification: true,
    resetPasswordTokenExpiresIn: fifteenMinutesInSeconds,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await emailDelivery.send({
        recipient: user.email,
        kind: "PASSWORD_RESET",
        actionUrl: protectIdentityActionUrl(url, "PASSWORD_RESET"),
        expiresAt: new Date(Date.now() + fifteenMinutesInSeconds * 1_000)
      });
    }
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: fifteenMinutesInSeconds,
    sendVerificationEmail: async ({ user, url }) => {
      await emailDelivery.send({
        recipient: user.email,
        kind: "EMAIL_VERIFICATION",
        actionUrl: protectIdentityActionUrl(url, "EMAIL_VERIFICATION"),
        expiresAt: new Date(Date.now() + fifteenMinutesInSeconds * 1_000)
      });
    }
  },
  user: {
    modelName: "identity_user",
    additionalFields: {
      role: { type: ["USER", "ADMIN"], required: true, defaultValue: "USER", input: false },
      commune: { type: "string", required: false }
    }
  },
  session: {
    modelName: "identity_session",
    expiresIn: sevenDaysInSeconds,
    updateAge: 24 * 60 * 60,
    freshAge: 30 * 60
  },
  account: { modelName: "identity_account" },
  verification: { modelName: "identity_verification", storeIdentifier: "hashed" },
  rateLimit: {
    enabled: true,
    storage: "database",
    modelName: "identity_rate_limit",
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 30 },
      "/request-password-reset": { window: 60, max: 3 },
      "/send-verification-email": { window: 60, max: 3 }
    }
  },
  advanced: {
    cookiePrefix: "ems",
    useSecureCookies,
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: useSecureCookies,
      path: "/"
    },
    ipAddress: process.env.APP_ENV === "development"
      ? { ipAddressHeaders: ["x-ems-test-client-ip"] }
      : undefined,
    database: {
      joins: true,
      validateSchema: process.env.BETTER_AUTH_VALIDATE_SCHEMA !== "false"
    }
  },
  trustedOrigins: [
    process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3100"
  ],
  plugins: [nextCookies()]
});

export type IdentitySession = typeof auth.$Infer.Session;
