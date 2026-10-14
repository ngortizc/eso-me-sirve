export type PrivateContactFailureKind = "CONFIGURATION" | "INTEGRITY" | "OPERATION";

export function privateContactCryptoPublicMessage(kind: PrivateContactFailureKind): string {
  return kind === "CONFIGURATION"
    ? "La configuración segura del contacto no está disponible. Intenta nuevamente más tarde."
    : "No fue posible verificar de forma segura los datos privados.";
}
