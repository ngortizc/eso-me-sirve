import { Pool } from "pg";

declare global {
  var emsPostgresPool: Pool | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  return new Pool({
    connectionString,
    application_name: "eso-me-sirve",
    connectionTimeoutMillis: 3_000,
    max: 10
  });
}

export function getPostgresPool(): Pool {
  globalThis.emsPostgresPool ??= createPool();
  return globalThis.emsPostgresPool;
}
