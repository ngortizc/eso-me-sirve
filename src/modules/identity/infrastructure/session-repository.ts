import { getPostgresPool } from "@/shared/database/postgres";

export type SessionSummary = Readonly<{
  id: string;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
}>;

type SessionRow = { id: string; userAgent: string | null; createdAt: Date; expiresAt: Date };

export async function listActiveSessions(userId: string): Promise<SessionSummary[]> {
  const result = await getPostgresPool().query<SessionRow>(
    `SELECT "id", "userAgent", "createdAt", "expiresAt"
       FROM "identity_session"
      WHERE "userId" = $1 AND "expiresAt" > CURRENT_TIMESTAMP
      ORDER BY "createdAt" DESC`,
    [userId]
  );
  return result.rows.map((row) => ({
    id: row.id,
    userAgent: row.userAgent,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString()
  }));
}

export async function revokeOwnedSession(sessionId: string, userId: string): Promise<boolean> {
  const result = await getPostgresPool().query(
    `DELETE FROM "identity_session" WHERE "id" = $1 AND "userId" = $2`,
    [sessionId, userId]
  );
  return result.rowCount === 1;
}
