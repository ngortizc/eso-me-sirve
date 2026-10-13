export const listingStatuses = ["DRAFT", "PUBLISHED", "PAUSED", "REMOVED"] as const;
export type ListingStatus = typeof listingStatuses[number];

export const listingConditions = ["LIKE_NEW", "GOOD", "USED_FUNCTIONAL", "NEEDS_REPAIR"] as const;
export type ListingCondition = typeof listingConditions[number];

export const listingStatusLabels: Record<ListingStatus, string> = {
  DRAFT: "Borrador",
  PUBLISHED: "Publicado",
  PAUSED: "Pausado",
  REMOVED: "Retirado"
};

export const listingConditionLabels: Record<ListingCondition, string> = {
  LIKE_NEW: "Como nuevo",
  GOOD: "Buen estado",
  USED_FUNCTIONAL: "Usado, funcional",
  NEEDS_REPAIR: "Requiere reparación"
};

const transitions: Record<ListingStatus, readonly ListingStatus[]> = {
  DRAFT: ["DRAFT", "PUBLISHED", "REMOVED"],
  PUBLISHED: ["PUBLISHED", "PAUSED", "REMOVED"],
  PAUSED: ["PAUSED", "PUBLISHED", "REMOVED"],
  REMOVED: ["REMOVED"]
};

export function canTransitionListing(from: ListingStatus, to: ListingStatus): boolean {
  return transitions[from].includes(to);
}

export function isListingStatus(value: unknown): value is ListingStatus {
  return typeof value === "string" && listingStatuses.includes(value as ListingStatus);
}

export function isListingCondition(value: unknown): value is ListingCondition {
  return typeof value === "string" && listingConditions.includes(value as ListingCondition);
}
