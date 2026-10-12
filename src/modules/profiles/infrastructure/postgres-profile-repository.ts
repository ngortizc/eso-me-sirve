import { getPostgresPool } from "@/shared/database/postgres";

export type ProfileDto = Readonly<{
  id: string;
  name: string;
  commune: string | null;
  role: "USER" | "ADMIN";
  emailVerified: boolean;
  createdAt: string;
}>;

type ProfileRow = {
  id: string;
  name: string;
  commune: string | null;
  role: "USER" | "ADMIN";
  emailVerified: boolean;
  createdAt: Date;
};

function toDto(row: ProfileRow): ProfileDto {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

export async function findProfileByUserId(userId: string): Promise<ProfileDto | null> {
  const result = await getPostgresPool().query<ProfileRow>(
    `SELECT "id", "name", "commune", "role", "emailVerified", "createdAt"
       FROM "identity_user" WHERE "id" = $1`,
    [userId]
  );
  const row = result.rows[0];
  return row ? toDto(row) : null;
}

export async function updateProfile(userId: string, input: { name: string; commune: string | null }): Promise<ProfileDto | null> {
  const result = await getPostgresPool().query<ProfileRow>(
    `UPDATE "identity_user"
        SET "name" = $2, "commune" = $3, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = $1
      RETURNING "id", "name", "commune", "role", "emailVerified", "createdAt"`,
    [userId, input.name, input.commune]
  );
  const row = result.rows[0];
  return row ? toDto(row) : null;
}
