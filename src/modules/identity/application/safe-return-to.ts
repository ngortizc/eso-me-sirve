const FALLBACK_RETURN_TO = "/perfil";

export function safeReturnTo(value: string | null | undefined, fallback = FALLBACK_RETURN_TO): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }

  try {
    const parsed = new URL(value, "https://ems.invalid");
    return parsed.origin === "https://ems.invalid" ? `${parsed.pathname}${parsed.search}${parsed.hash}` : fallback;
  } catch {
    return fallback;
  }
}
