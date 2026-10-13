"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import {
  MAX_PHOTO_COUNT,
  moveSelectedPhoto,
  removeSelectedPhoto,
  selectPrimaryPhoto,
  validatePhotoCandidates,
  type PhotoValidationError
} from "@/components/photos/photo-selection";

export type ManagedPhoto = {
  id: string;
  file: File;
  previewUrl: string;
  isPrimary: boolean;
};

type Props = {
  onCountChange?: (count: number) => void;
  onPhotosChange?: (photos: readonly ManagedPhoto[]) => void;
  requirementMessage?: string;
};

export function PhotoManager({ onCountChange, onPhotosChange, requirementMessage }: Readonly<Props>) {
  const galleryInputId = useId();
  const cameraInputId = useId();
  const [photos, setPhotos] = useState<ManagedPhoto[]>([]);
  const [errors, setErrors] = useState<PhotoValidationError[]>([]);
  const photosRef = useRef<ManagedPhoto[]>([]);

  useEffect(() => {
    photosRef.current = photos;
    onCountChange?.(photos.length);
    onPhotosChange?.(photos);
  }, [onCountChange, onPhotosChange, photos]);

  useEffect(() => () => {
    for (const photo of photosRef.current) URL.revokeObjectURL(photo.previewUrl);
  }, []);

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    const { accepted, errors: nextErrors } = validatePhotoCandidates(Array.from(fileList), photos.length);
    const additions = accepted.map((file, index): ManagedPhoto => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      isPrimary: photos.length === 0 && index === 0
    }));
    setErrors(nextErrors);
    if (additions.length > 0) setPhotos((current) => [...current, ...additions]);
  }

  function removePhoto(id: string) {
    setPhotos((current) => {
      const removed = current.find((photo) => photo.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return removeSelectedPhoto(current, id);
    });
  }

  return (
    <section aria-labelledby="photo-manager-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-black" id="photo-manager-title">Fotografías</h3>
          <p className="mt-1 text-sm text-muted">Entre 1 y 8 imágenes · JPG, PNG o WebP · máximo 10 MB cada una.</p>
        </div>
        <span className="rounded-full bg-surface-strong px-3 py-1.5 text-xs font-extrabold text-ink" aria-live="polite">{photos.length} / {MAX_PHOTO_COUNT}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed border-green-deep/30 bg-green-deep/[0.035] p-4 text-center transition hover:border-green-deep hover:bg-green-deep/[0.06]" htmlFor={galleryInputId}>
          <Icon className="size-6 text-green-deep" name="image" />
          <span className="mt-2 text-sm font-extrabold">Elegir fotografías</span>
          <span className="mt-1 text-xs text-muted">Selección múltiple</span>
        </label>
        <input id={galleryInputId} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { addFiles(event.currentTarget.files); event.currentTarget.value = ""; }} data-testid="gallery-photo-input" />

        <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed border-ink/15 bg-surface-strong/60 p-4 text-center transition hover:border-green-deep/50" htmlFor={cameraInputId}>
          <Icon className="size-6 text-green-deep" name="camera" />
          <span className="mt-2 text-sm font-extrabold">Usar cámara</span>
          <span className="mt-1 text-xs text-muted">Si tu dispositivo lo permite</span>
        </label>
        <input id={cameraInputId} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => { addFiles(event.currentTarget.files); event.currentTarget.value = ""; }} data-testid="camera-photo-input" />
      </div>

      {(errors.length > 0 || requirementMessage) && (
        <div className="mt-4 rounded-xl border border-danger/25 bg-danger/[0.06] p-4 text-sm text-danger" role="alert">
          {requirementMessage && <p className="font-bold">{requirementMessage}</p>}
          {errors.length > 0 && <ul className="list-disc space-y-1 pl-5">{errors.map((error, index) => <li key={`${error.fileName}-${error.code}-${index}`}>{error.message}</li>)}</ul>}
        </div>
      )}

      {photos.length > 0 && (
        <ol className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Fotografías seleccionadas" data-testid="selected-photos">
          {photos.map((photo, index) => (
            <li className={`overflow-hidden rounded-card border bg-white ${photo.isPrimary ? "border-green-deep ring-2 ring-green-deep/20" : "border-ink/10"}`} key={photo.id} data-testid="selected-photo" data-primary={photo.isPrimary}>
              <div className="relative aspect-[4/3] bg-surface-strong">
                <Image src={photo.previewUrl} alt={`Vista previa ${index + 1}: ${photo.file.name}`} fill unoptimized className="object-cover" />
                {photo.isPrimary && <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-green-deep px-2 py-1 text-[0.65rem] font-extrabold text-white"><Icon className="size-3" name="star" />Principal</span>}
                <button className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-white text-danger shadow-sm" type="button" onClick={() => removePhoto(photo.id)} aria-label={`Eliminar ${photo.file.name}`}><Icon className="size-4" name="trash" /></button>
              </div>
              <div className="p-2.5">
                <p className="truncate text-xs font-bold" title={photo.file.name}>{photo.file.name}</p>
                <div className="mt-2 flex items-center justify-between gap-1">
                  <button className="rounded-lg px-2 py-1.5 text-xs font-extrabold text-green-deep disabled:opacity-40" type="button" disabled={photo.isPrimary} onClick={() => setPhotos((current) => selectPrimaryPhoto(current, photo.id))}>Principal</button>
                  <span className="flex gap-1">
                    <button className="grid size-8 place-items-center rounded-lg border border-ink/10 text-ink disabled:opacity-30" type="button" disabled={index === 0} onClick={() => setPhotos((current) => moveSelectedPhoto(current, photo.id, -1))} aria-label={`Mover ${photo.file.name} hacia atrás`}>←</button>
                    <button className="grid size-8 place-items-center rounded-lg border border-ink/10 text-ink disabled:opacity-30" type="button" disabled={index === photos.length - 1} onClick={() => setPhotos((current) => moveSelectedPhoto(current, photo.id, 1))} aria-label={`Mover ${photo.file.name} hacia adelante`}>→</button>
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted"><Icon className="mt-0.5 size-4 shrink-0 text-green-deep" name="lock" />Al guardar, el servidor verificará y volverá a codificar las imágenes, eliminando EXIF y GPS. Revisa igualmente que los píxeles no muestren teléfonos, direcciones ni otros datos personales.</p>
    </section>
  );
}
