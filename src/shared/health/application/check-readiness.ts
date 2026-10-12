export interface DatabaseProbe {
  check(): Promise<void>;
}

export type Readiness =
  | { status: "ready"; database: "up" }
  | { status: "not_ready"; database: "down" };

export async function checkReadiness(
  database: DatabaseProbe,
  timeoutMilliseconds = 2_000
): Promise<Readiness> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      database.check(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("database probe timeout")), timeoutMilliseconds);
      })
    ]);

    return { status: "ready", database: "up" };
  } catch {
    return { status: "not_ready", database: "down" };
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
