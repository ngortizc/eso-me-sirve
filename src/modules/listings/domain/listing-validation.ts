import { isListingCondition, type ListingCondition } from "./listing";

export const MAX_LISTING_PHOTOS = 8;
export const MAX_LISTING_PHOTO_BYTES = 10 * 1024 * 1024;

export type ListingFields = {
  title: string;
  description: string | null;
  categorySlug: string | null;
  condition: ListingCondition | null;
  regionCode: string | null;
  communeCode: string | null;
};

export type ListingValidationError = { field: string; message: string };

const phonePattern = /(?:\+?56\s*)?(?:9\s*)?(?:\d[\s.-]*){8}\d/;
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const exactAddressPattern = /\b(?:calle|avenida|av\.?|pasaje|camino|ruta|departamento|depto\.?|casa)\s+[\p{L}\s.]{2,}\s+\d{1,6}\b/iu;
const salePattern = /(?:\$\s*\d|\b(?:vendo|venta|precio|permuto|permuta|subasta|cambio\s+por)\b)/iu;

export function containsPrivateContact(text: string): boolean {
  return phonePattern.test(text) || emailPattern.test(text) || exactAddressPattern.test(text);
}

export function containsSaleIntent(text: string): boolean {
  return salePattern.test(text);
}

export function validateListingFields(
  raw: Record<string, unknown>,
  options: { publish: boolean; photoCount: number }
): { value: ListingFields; errors: ListingValidationError[] } {
  const title = typeof raw.title === "string" ? raw.title.trim().replace(/\s+/g, " ") : "";
  const descriptionValue = typeof raw.description === "string" ? raw.description.trim().replace(/\s+/g, " ") : "";
  const categorySlug = typeof raw.categorySlug === "string" && raw.categorySlug ? raw.categorySlug : null;
  const condition = isListingCondition(raw.condition) ? raw.condition : null;
  const regionCode = typeof raw.regionCode === "string" && raw.regionCode ? raw.regionCode : null;
  const communeCode = typeof raw.communeCode === "string" && raw.communeCode ? raw.communeCode : null;
  const errors: ListingValidationError[] = [];

  if (title.length < 3 || title.length > 80) errors.push({ field: "title", message: "El título debe tener entre 3 y 80 caracteres." });
  if (descriptionValue && (descriptionValue.length < 30 || descriptionValue.length > 2000)) errors.push({ field: "description", message: "La descripción debe tener entre 30 y 2.000 caracteres." });
  if (options.publish && !descriptionValue) errors.push({ field: "description", message: "Agrega una descripción para publicar." });
  if (options.publish && !categorySlug) errors.push({ field: "categorySlug", message: "Selecciona una categoría." });
  if (options.publish && !condition) errors.push({ field: "condition", message: "Selecciona la condición del artículo." });
  if (options.publish && (!regionCode || !communeCode)) errors.push({ field: "location", message: "Selecciona región y comuna." });
  if ((regionCode && !communeCode) || (!regionCode && communeCode)) errors.push({ field: "location", message: "Región y comuna deben seleccionarse juntas." });
  if (options.photoCount > MAX_LISTING_PHOTOS) errors.push({ field: "photos", message: "Puedes adjuntar como máximo 8 fotografías." });
  if (options.publish && options.photoCount < 1) errors.push({ field: "photos", message: "Agrega al menos una fotografía para publicar." });

  const publicText = `${title} ${descriptionValue}`;
  if (containsPrivateContact(publicText)) errors.push({ field: "privacy", message: "No incluyas teléfonos, correos ni direcciones exactas." });
  if (containsSaleIntent(publicText)) errors.push({ field: "price", message: "Los artículos deben ser gratuitos; elimina precios, ventas o permutas." });

  return {
    value: { title, description: descriptionValue || null, categorySlug, condition, regionCode, communeCode },
    errors
  };
}
