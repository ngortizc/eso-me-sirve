import type { IdentityEmail, IdentityEmailDelivery } from "@/modules/identity/application/ports/email-delivery";
import { normalizeEmail } from "@/modules/identity/domain/email";
import { getPostgresPool } from "@/shared/database/postgres";

export class DatabaseEmailDelivery implements IdentityEmailDelivery {
  async send(message: IdentityEmail): Promise<void> {
    if (process.env.APP_ENV !== "development" || process.env.EMAIL_DELIVERY_MODE !== "database") {
      throw new Error("No email delivery provider is configured");
    }

    await getPostgresPool().query(
      `INSERT INTO identity_test_email (recipient, kind, action_url, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [normalizeEmail(message.recipient), message.kind, message.actionUrl, message.expiresAt]
    );
  }
}
