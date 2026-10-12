import type { IdentityEmailKind } from "@/modules/identity/application/ports/email-delivery";

export function protectIdentityActionUrl(generatedUrl: string, kind: IdentityEmailKind): string {
  const source = new URL(generatedUrl);
  const token = source.searchParams.get("token")
    ?? (kind === "PASSWORD_RESET" ? source.pathname.split("/").filter(Boolean).at(-1) ?? null : null);
  if (!token) throw new Error("Identity action URL is missing its token");

  const destination = new URL(kind === "EMAIL_VERIFICATION" ? "/verificar-correo/confirmar" : "/restablecer", source.origin);
  const fragment = new URLSearchParams({ token });
  const callback = source.searchParams.get("callbackURL");
  if (callback) fragment.set("returnTo", callback);
  destination.hash = fragment.toString();
  return destination.toString();
}
