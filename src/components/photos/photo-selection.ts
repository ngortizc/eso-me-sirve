export const MAX_PHOTO_COUNT = 8;
export const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type PhotoCandidate = {
  name: string;
  size: number;
  type: string;
};

export type PhotoValidationError = {
  code: "invalid-type" | "too-large" | "limit-exceeded";
  fileName: string;
  message: string;
};

export type SelectablePhoto = {
  id: string;
  isPrimary: boolean;
};

export function validatePhotoCandidates<T extends PhotoCandidate>(
  candidates: readonly T[],
  currentCount: number
): { accepted: T[]; errors: PhotoValidationError[] } {
  const accepted: T[] = [];
  const errors: PhotoValidationError[] = [];

  for (const candidate of candidates) {
    if (!ACCEPTED_PHOTO_TYPES.includes(candidate.type as typeof ACCEPTED_PHOTO_TYPES[number])) {
      errors.push({ code: "invalid-type", fileName: candidate.name, message: `${candidate.name}: usa una imagen JPG, PNG o WebP.` });
      continue;
    }
    if (candidate.size > MAX_PHOTO_SIZE_BYTES) {
      errors.push({ code: "too-large", fileName: candidate.name, message: `${candidate.name}: supera el máximo de 10 MB.` });
      continue;
    }
    if (currentCount + accepted.length >= MAX_PHOTO_COUNT) {
      errors.push({ code: "limit-exceeded", fileName: candidate.name, message: `${candidate.name}: puedes agregar hasta 8 fotografías.` });
      continue;
    }
    accepted.push(candidate);
  }

  return { accepted, errors };
}

export function selectPrimaryPhoto<T extends SelectablePhoto>(photos: readonly T[], id: string): T[] {
  return photos.map((photo) => ({ ...photo, isPrimary: photo.id === id }));
}

export function removeSelectedPhoto<T extends SelectablePhoto>(photos: readonly T[], id: string): T[] {
  const removed = photos.find((photo) => photo.id === id);
  const remaining = photos.filter((photo) => photo.id !== id).map((photo) => ({ ...photo }));
  if (removed?.isPrimary && remaining[0]) remaining[0].isPrimary = true;
  return remaining;
}

export function moveSelectedPhoto<T extends SelectablePhoto>(photos: readonly T[], id: string, direction: -1 | 1): T[] {
  const currentIndex = photos.findIndex((photo) => photo.id === id);
  const destination = currentIndex + direction;
  if (currentIndex < 0 || destination < 0 || destination >= photos.length) return [...photos];
  const reordered = [...photos];
  const [selected] = reordered.splice(currentIndex, 1);
  if (!selected) return [...photos];
  reordered.splice(destination, 0, selected);
  return reordered;
}
