"use client";

import Image from "next/image";
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ListingTaxonomy, OwnerListing } from "@/modules/listings/application/listing-repository";
import { listingConditionLabels, listingConditions, listingStatusLabels, type ListingStatus } from "@/modules/listings/domain/listing";

function payload(listing: OwnerListing, status: ListingStatus) {
  return {
    title: listing.title, description: listing.description ?? "", categorySlug: listing.categorySlug ?? "",
    condition: listing.condition ?? "", regionCode: listing.regionCode ?? "", communeCode: listing.communeCode ?? "",
    status, version: listing.version
  };
}

export function ListingStatusActions({ listing }: Readonly<{ listing: OwnerListing }>) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const options: Array<{ status: ListingStatus; label: string }> = listing.status === "PUBLISHED"
    ? [{ status: "PAUSED", label: "Pausar" }, { status: "REMOVED", label: "Retirar" }]
    : listing.status === "PAUSED"
      ? [{ status: "PUBLISHED", label: "Reactivar" }, { status: "REMOVED", label: "Retirar" }]
      : listing.status === "DRAFT" ? [{ status: "PUBLISHED", label: "Publicar" }, { status: "REMOVED", label: "Retirar" }] : [];

  async function change(status: ListingStatus) {
    setBusy(true); setMessage("");
    const response = await fetch(`/api/listings/${listing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload(listing, status)) });
    const body = await response.json() as { error?: string; errors?: { message: string }[] };
    if (!response.ok) setMessage(body.errors?.map((item) => item.message).join(" ") || body.error || "No fue posible actualizar.");
    else router.refresh();
    setBusy(false);
  }

  return <div><div className="flex flex-wrap gap-2">{options.map((option) => <button className="rounded-lg border border-ink/15 px-3 py-2 text-xs font-extrabold disabled:opacity-50" type="button" disabled={busy} onClick={() => change(option.status)} key={option.status}>{option.label}</button>)}</div>{message && <p className="mt-2 text-xs text-danger" role="alert">{message}</p>}</div>;
}

export function ListingEditor({ listing, taxonomy }: Readonly<{ listing: OwnerListing; taxonomy: ListingTaxonomy }>) {
  const router = useRouter();
  const [regionCode, setRegionCode] = useState(listing.regionCode ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const communes = useMemo(() => taxonomy.communes.filter((commune) => commune.regionCode === regionCode), [regionCode, taxonomy.communes]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const data = new FormData(event.currentTarget);
    const body = Object.fromEntries(data.entries());
    const response = await fetch(`/api/listings/${listing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, version: listing.version }) });
    const result = await response.json() as { error?: string; errors?: { message: string }[] };
    setMessage(response.ok ? "Cambios guardados correctamente." : result.errors?.map((item) => item.message).join(" ") || result.error || "No fue posible guardar.");
    if (response.ok) router.refresh();
    setBusy(false);
  }

  async function photoAction(photoId: string, method: "PATCH" | "DELETE") {
    setBusy(true); setMessage("");
    const response = await fetch(`/api/listings/${listing.id}/photos/${photoId}`, { method });
    const result = await response.json() as { error?: string };
    setMessage(response.ok ? "Fotografías actualizadas." : result.error || "No fue posible actualizar las fotografías.");
    if (response.ok) router.refresh();
    setBusy(false);
  }

  async function addPhotos(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const data = new FormData(event.currentTarget);
    const response = await fetch(`/api/listings/${listing.id}/photos`, { method: "POST", body: data });
    const result = await response.json() as { error?: string };
    setMessage(response.ok ? "Fotografías agregadas." : result.error || "No fue posible agregar fotografías.");
    if (response.ok) { event.currentTarget.reset(); router.refresh(); }
    setBusy(false);
  }

  return <div className="grid gap-7 lg:grid-cols-[1fr_22rem]">
    <form className="space-y-5 rounded-card border border-ink/10 bg-white p-5 shadow-card sm:p-7" onSubmit={save}>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className="field-label">Título</span><input className="field" name="title" required minLength={3} maxLength={80} defaultValue={listing.title} /></label>
        <label className="sm:col-span-2"><span className="field-label">Descripción</span><textarea className="field min-h-32" name="description" minLength={30} maxLength={2000} defaultValue={listing.description ?? ""} /></label>
        <label><span className="field-label">Categoría</span><select className="field" name="categorySlug" defaultValue={listing.categorySlug ?? ""}><option value="">Sin definir</option>{taxonomy.categories.map((item) => <option value={item.slug} key={item.slug}>{item.name}</option>)}</select></label>
        <label><span className="field-label">Condición</span><select className="field" name="condition" defaultValue={listing.condition ?? ""}><option value="">Sin definir</option>{listingConditions.map((item) => <option value={item} key={item}>{listingConditionLabels[item]}</option>)}</select></label>
        <label><span className="field-label">Región</span><select className="field" name="regionCode" value={regionCode} onChange={(event) => setRegionCode(event.target.value)}><option value="">Sin definir</option>{taxonomy.regions.map((item) => <option value={item.code} key={item.code}>{item.name}</option>)}</select></label>
        <label><span className="field-label">Comuna</span><select className="field" name="communeCode" defaultValue={listing.communeCode ?? ""} key={regionCode}><option value="">Sin definir</option>{communes.map((item) => <option value={item.code} key={item.code}>{item.name}</option>)}</select></label>
        <label><span className="field-label">Estado</span><select className="field" name="status" defaultValue={listing.status}><option value={listing.status}>{listingStatusLabels[listing.status]}</option>{listing.status === "DRAFT" && <option value="PUBLISHED">Publicado</option>}{listing.status === "PUBLISHED" && <><option value="PAUSED">Pausado</option><option value="REMOVED">Retirado</option></>}{listing.status === "PAUSED" && <><option value="PUBLISHED">Publicado</option><option value="REMOVED">Retirado</option></>}</select></label>
      </div>
      <button className="button button-primary" disabled={busy || listing.status === "REMOVED"} type="submit">{busy ? "Guardando…" : "Guardar cambios"}</button>
    </form>
    <aside className="space-y-5">
      <section className="rounded-card border border-ink/10 bg-white p-5"><h2 className="text-xl font-black">Fotografías</h2><div className="mt-4 grid grid-cols-2 gap-3">{listing.photos.map((photo, index) => <article className="overflow-hidden rounded-xl border border-ink/10" key={photo.id}><div className="relative aspect-square bg-surface-strong"><Image src={photo.catalogUrl} alt={`Fotografía ${index + 1}`} fill unoptimized className="object-cover" />{photo.isPrimary && <span className="absolute left-2 top-2 rounded-full bg-green-deep px-2 py-1 text-[0.65rem] font-bold text-white">Principal</span>}</div><div className="grid gap-1 p-2"><button className="text-xs font-bold text-green-deep disabled:opacity-40" type="button" disabled={busy || photo.isPrimary} onClick={() => photoAction(photo.id, "PATCH")}>Hacer principal</button><button className="text-xs font-bold text-danger disabled:opacity-40" type="button" disabled={busy} onClick={() => photoAction(photo.id, "DELETE")}>Eliminar</button></div></article>)}</div></section>
      <form className="rounded-card border border-ink/10 bg-white p-5" onSubmit={addPhotos}><h2 className="font-black">Agregar fotografías</h2><input className="mt-3 block w-full text-sm" type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple required /><label className="mt-3 flex gap-2 text-sm"><input type="checkbox" name="makePrimary" value="true" />Usar la primera como principal</label><button className="button button-secondary mt-4 w-full" type="submit" disabled={busy || listing.photos.length >= 8}>Agregar</button></form>
      {message && <p className="rounded-xl bg-surface-strong p-3 text-sm" role="status">{message}</p>}
    </aside>
  </div>;
}
