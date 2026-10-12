"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "@/components/ui/icon";

export type GalleryPhoto = { src: string; alt: string };

export function ArticleGallery({ photos, title }: Readonly<{ photos: readonly GalleryPhoto[]; title: string }>) {
  const galleryPhotos = photos.slice(0, 8);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const mainButtonRef = useRef<HTMLButtonElement>(null);
  const selected = galleryPhotos[selectedIndex] ?? galleryPhotos[0];

  useEffect(() => {
    if (expanded) closeButtonRef.current?.focus();
  }, [expanded]);

  if (!selected) return null;

  function move(direction: -1 | 1) {
    setSelectedIndex((current) => (current + direction + galleryPhotos.length) % galleryPhotos.length);
  }

  function handleGalleryKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
    if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
    if (event.key === "Home") { event.preventDefault(); setSelectedIndex(0); }
    if (event.key === "End") { event.preventDefault(); setSelectedIndex(galleryPhotos.length - 1); }
  }

  function closeExpanded() {
    setExpanded(false);
    requestAnimationFrame(() => mainButtonRef.current?.focus());
  }

  return (
    <section aria-label={`Galería de ${title}`} className="min-w-0" onKeyDown={handleGalleryKeyDown} tabIndex={0} data-testid="article-gallery" data-selected-index={selectedIndex}>
      <div className="group relative aspect-[4/3] overflow-hidden rounded-[1.6rem] bg-surface-strong">
        <button ref={mainButtonRef} className="absolute inset-0 z-10 cursor-zoom-in" type="button" onClick={() => setExpanded(true)} aria-label={`Ampliar fotografía ${selectedIndex + 1} de ${galleryPhotos.length}`}>
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-xs font-extrabold text-ink shadow-sm"><Icon className="size-4" name="expand" />Ampliar</span>
        </button>
        <Image className="object-cover transition duration-300 group-hover:scale-[1.01]" src={selected.src} alt={selected.alt} fill loading="eager" sizes="(max-width: 1024px) 100vw, 58vw" data-testid="gallery-main-image" />
        <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1.5 text-xs font-black text-green-deep shadow-sm">GRATIS</span>
        {galleryPhotos.length > 1 && <span className="absolute bottom-3 left-3 rounded-full bg-ink/80 px-3 py-1.5 text-xs font-bold text-white">{selectedIndex + 1} / {galleryPhotos.length}</span>}
      </div>

      {galleryPhotos.length > 1 && (
        <div className="mt-3 flex gap-3 overflow-x-auto p-1 pb-2" aria-label="Miniaturas de la galería" role="group">
          {galleryPhotos.map((photo, index) => (
            <button className={`relative aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-xl bg-surface-strong transition sm:w-32 ${index === selectedIndex ? "ring-2 ring-green-deep ring-offset-2" : "opacity-70 hover:opacity-100"}`} type="button" onClick={() => setSelectedIndex(index)} aria-label={`Mostrar fotografía ${index + 1}: ${photo.alt}`} aria-pressed={index === selectedIndex} key={photo.src}>
              <Image className="object-cover" src={photo.src} alt="" fill loading="eager" sizes="128px" />
            </button>
          ))}
        </div>
      )}
      <p className="mt-1 text-xs text-muted">Usa las flechas del teclado para recorrer la galería.</p>

      {expanded && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-ink/95 p-3 sm:p-8" role="dialog" aria-modal="true" aria-label={`Vista ampliada de ${title}`} onKeyDown={(event) => { if (event.key === "Escape") closeExpanded(); }}>
          <button ref={closeButtonRef} className="absolute right-4 top-4 z-20 grid size-11 place-items-center rounded-full bg-white text-ink shadow-lg sm:right-7 sm:top-7" type="button" onClick={closeExpanded} aria-label="Cerrar vista ampliada"><Icon className="size-5" name="x" /></button>
          <div className="relative h-[76vh] w-full max-w-6xl"><Image className="object-contain" src={selected.src} alt={selected.alt} fill sizes="100vw" loading="eager" /></div>
          {galleryPhotos.length > 1 && <><button className="absolute left-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white text-ink shadow-lg sm:left-7" type="button" onClick={() => move(-1)} aria-label="Fotografía anterior">←</button><button className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white text-ink shadow-lg sm:right-7" type="button" onClick={() => move(1)} aria-label="Fotografía siguiente">→</button></>}
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-4 py-2 text-sm font-bold text-white">{selectedIndex + 1} de {galleryPhotos.length}</p>
        </div>
      )}
    </section>
  );
}
