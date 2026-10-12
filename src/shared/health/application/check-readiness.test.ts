import { describe, expect, it, vi } from "vitest";
import { checkReadiness, type DatabaseProbe } from "@/shared/health/application/check-readiness";

describe("checkReadiness", () => {
  it("informa que la base de datos está disponible", async () => {
    const database: DatabaseProbe = { check: vi.fn().mockResolvedValue(undefined) };

    await expect(checkReadiness(database)).resolves.toEqual({
      status: "ready",
      database: "up"
    });
  });

  it("no expone el error de infraestructura cuando la base de datos falla", async () => {
    const database: DatabaseProbe = {
      check: vi.fn().mockRejectedValue(new Error("postgresql://usuario:secreto@host/db"))
    };

    const result = await checkReadiness(database);

    expect(result).toEqual({ status: "not_ready", database: "down" });
    expect(JSON.stringify(result)).not.toContain("secreto");
  });

  it("limita la espera de una comprobación bloqueada", async () => {
    vi.useFakeTimers();
    const database: DatabaseProbe = { check: () => new Promise(() => undefined) };
    const readiness = checkReadiness(database, 100);

    await vi.advanceTimersByTimeAsync(100);

    await expect(readiness).resolves.toEqual({ status: "not_ready", database: "down" });
    vi.useRealTimers();
  });
});
