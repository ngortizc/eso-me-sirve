import { randomUUID } from "node:crypto";
import process from "node:process";
import { setTimeout as wait } from "node:timers/promises";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString, application_name: "eso-me-sirve-reservation-worker", max: 1 });
const watch = process.argv.includes("--watch");
const pollMilliseconds = Number(process.env.RESERVATION_WORKER_POLL_MS ?? "60000");
if (watch && (!Number.isInteger(pollMilliseconds) || pollMilliseconds < 5_000 || pollMilliseconds > 300_000)) {
  console.error("RESERVATION_WORKER_POLL_MS must be an integer between 5000 and 300000");
  process.exit(1);
}

let running = true;
const stopController = new AbortController();
function stop() {
  running = false;
  stopController.abort();
}
process.once("SIGTERM", stop);
process.once("SIGINT", stop);

async function expireBatch() {
  const result = await pool.query(
    "select reservation_expire_due($1,$2) as expired_count",
    [100, randomUUID()]
  );
  console.info(JSON.stringify({ task: "reservation-expiration", expired: Number(result.rows[0]?.expired_count ?? 0) }));
}

try {
  do {
    try {
      await expireBatch();
    } catch {
      console.error(JSON.stringify({ task: "reservation-expiration", error: "batch-failed" }));
      if (!watch) throw new Error("reservation expiration batch failed");
    }
    if (watch && running) {
      try {
        await wait(pollMilliseconds, undefined, { signal: stopController.signal });
      } catch (error) {
        if (!(error instanceof Error) || error.name !== "AbortError") throw error;
      }
    }
  } while (watch && running);
} finally {
  await pool.end();
}
