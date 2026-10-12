import { Client } from "pg";
import type { DatabaseProbe } from "@/shared/health/application/check-readiness";

function createClient(): Client {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  return new Client({
    connectionString,
    connectionTimeoutMillis: 1_500,
    query_timeout: 1_500
  });
}

export function createPostgresDatabaseProbe(): DatabaseProbe {
  return {
    async check() {
      const client = createClient();
      await client.connect();
      try {
        await client.query("SELECT 1");
      } finally {
        await client.end();
      }
    }
  };
}
