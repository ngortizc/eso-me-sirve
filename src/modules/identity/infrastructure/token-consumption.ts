import { createHash } from "node:crypto";
import { getPostgresPool } from "@/shared/database/postgres";

export async function consumeEmailVerificationToken(token: string): Promise<boolean> {
  const digest = createHash("sha256").update(token).digest("hex");
  try {
    await getPostgresPool().query(
      `INSERT INTO identity_consumed_token (digest, kind) VALUES ($1, 'EMAIL_VERIFICATION')`,
      [digest]
    );
    return true;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") return false;
    throw error;
  }
}
