const privateKeys = new Set(["token", "password", "hash", "accesstoken", "refreshtoken", "idtoken"]);

export function sanitizeAuthResponse(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeAuthResponse);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !privateKeys.has(key.toLowerCase()))
      .map(([key, child]) => [key, sanitizeAuthResponse(child)])
  );
}
