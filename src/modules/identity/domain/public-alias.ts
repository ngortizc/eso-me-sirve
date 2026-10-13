const safePublicName = /^[\p{L}\p{M}][\p{L}\p{M}\s.'-]{1,79}$/u;
const addressPattern = /\b(?:calle|avenida|av\.?|pasaje|psje\.?|camino|ruta)\s+.*\d/iu;

function publicCode(stableId: string): string {
  let hash = 2166136261;
  for (const character of stableId) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).toUpperCase().padStart(6, "0").slice(0, 6);
}

export function publicAlias(name: string, stableId: string): string {
  const normalized = name.trim().replace(/\s+/g, " ");
  const digitCount = normalized.replace(/\D/g, "").length;
  const containsSensitiveShape = normalized.includes("@") || /https?:|www\./i.test(normalized)
    || digitCount >= 7 || addressPattern.test(normalized) || /\b[A-Za-z0-9_-]{24,}\b/.test(normalized);
  return safePublicName.test(normalized) && !containsSensitiveShape
    ? normalized
    : `Persona interesada ${publicCode(stableId)}`;
}
