import { NextResponse } from "next/server";
import { checkReadiness } from "@/shared/health/application/check-readiness";
import { createPostgresDatabaseProbe } from "@/shared/health/infrastructure/postgres-database-probe";
import { logger } from "@/shared/logging/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const readiness = await checkReadiness(createPostgresDatabaseProbe());

  if (readiness.status === "not_ready") {
    logger.warn("Comprobación de disponibilidad fallida", { check: "database" });
  }

  return NextResponse.json(
    {
      status: readiness.status,
      checks: { database: readiness.database }
    },
    {
      status: readiness.status === "ready" ? 200 : 503,
      headers: { "Cache-Control": "no-store" }
    }
  );
}
