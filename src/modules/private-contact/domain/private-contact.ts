export const deliveryMethods = ["HOME_ADDRESS", "MEETING_POINT"] as const;
export type DeliveryMethod = (typeof deliveryMethods)[number];

export const deliveryMethodLabels: Record<DeliveryMethod, string> = {
  HOME_ADDRESS: "Retiro en domicilio",
  MEETING_POINT: "Punto de encuentro"
};

export const PRIVATE_CONTACT_CONSENT_VERSION = "2026-10-13-v1";

export type PrivateContact = {
  phone: string;
  deliveryMethod: DeliveryMethod;
  location: string;
  instructions: string | null;
};

export type PrivateContactValidationError = { field: string; message: string };

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export function normalizeChileanPhone(value: unknown): string | null {
  let digits = stringValue(value).replace(/[^0-9]/g, "");
  if (digits.startsWith("0056")) digits = digits.slice(4);
  else if (digits.startsWith("56")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return /^[2-9][0-9]{8}$/.test(digits) ? `+56${digits}` : null;
}

export function validatePrivateContact(
  raw: Record<string, unknown>,
  options: { required: boolean }
): { value: PrivateContact | null; consentAccepted: boolean; errors: PrivateContactValidationError[] } {
  const phoneRaw = stringValue(raw.contactPhone);
  const deliveryMethod = deliveryMethods.includes(raw.deliveryMethod as DeliveryMethod) ? raw.deliveryMethod as DeliveryMethod : null;
  const location = stringValue(raw.deliveryLocation);
  const instructionsValue = stringValue(raw.deliveryInstructions);
  const consentAccepted = raw.contactConsent === true || raw.contactConsent === "true" || raw.contactConsent === "on";
  const hasAnyValue = Boolean(phoneRaw || deliveryMethod || location || instructionsValue || consentAccepted);
  if (!options.required && !hasAnyValue) return { value: null, consentAccepted: false, errors: [] };

  const errors: PrivateContactValidationError[] = [];
  const phone = normalizeChileanPhone(phoneRaw);
  if (!phone) errors.push({ field: "contactPhone", message: "Ingresa un teléfono chileno válido, por ejemplo +56 9 1234 5678." });
  if (!deliveryMethod) errors.push({ field: "deliveryMethod", message: "Selecciona una modalidad de entrega." });
  if (location.length < 5 || location.length > 300) errors.push({ field: "deliveryLocation", message: "La dirección o punto de retiro debe tener entre 5 y 300 caracteres." });
  if (instructionsValue.length > 500) errors.push({ field: "deliveryInstructions", message: "Las indicaciones adicionales no pueden superar 500 caracteres." });
  if (!consentAccepted) errors.push({ field: "contactConsent", message: "Debes aceptar el tratamiento y la futura compartición de estos datos." });

  return {
    value: phone && deliveryMethod && location.length >= 5 && location.length <= 300 && instructionsValue.length <= 500
      ? { phone, deliveryMethod, location, instructions: instructionsValue || null }
      : null,
    consentAccepted,
    errors
  };
}
