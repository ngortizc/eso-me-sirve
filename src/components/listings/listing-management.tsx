"use client";

import Image from "next/image";
import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ListingTaxonomy, OwnerListing } from "@/modules/listings/application/listing-repository";
import { listingConditionLabels, listingConditions, listingStatusLabels, type ListingStatus } from "@/modules/listings/domain/listing";
import { PrivateContactSection } from "./private-contact-section";

type ApiResult = { listing?: OwnerListing; error?: string; errors?: { message: string }[] };

function listingPayload(listing: OwnerListing, status: ListingStatus) {
  return { title: listing.title, description: listing.description ?? "", categorySlug: listing.categorySlug ?? "", condition: listing.condition ?? "", regionCode: listing.regionCode ?? "", communeCode: listing.communeCode ?? "", status, version: listing.version };
}

async function readResult(response: Response): Promise<ApiResult> {
  try { return await response.json() as ApiResult; }
  catch { return { error: `El servidor respondió ${response.status} sin un mensaje válido.` }; }
}

function resultError(result: ApiResult, fallback: string) {
  return result.errors?.map((item) => item.message).join(" ") || result.error || fallback;
}

export function ListingStatusActions({ listing }: Readonly<{ listing: OwnerListing }>) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmRetire, setConfirmRetire] = useState(false);
  const options: Array<{ status: ListingStatus; label: string }> = listing.status === "PUBLISHED"
    ? [{ status: "PAUSED", label: "Pausar publicación" }, { status: "REMOVED", label: "Retirar definitivamente" }]
    : listing.status === "PAUSED"
      ? [{ status: "PUBLISHED", label: "Reactivar publicación" }, { status: "REMOVED", label: "Retirar definitivamente" }]
      : listing.status === "DRAFT" ? [{ status: "PUBLISHED", label: "Publicar" }, { status: "REMOVED", label: "Retirar definitivamente" }] : [];

  async function change(status: ListingStatus) {
    if (status === "REMOVED" && !confirmRetire) { setConfirmRetire(true); setMessage(""); return; }
    setBusy(true); setMessage("");
    try {
      const response = status === "REMOVED"
        ? await fetch(`/api/listings/${listing.id}/retire`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ version: listing.version }) })
        : await fetch(`/api/listings/${listing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(listingPayload(listing, status)) });
      const result = await readResult(response);
      if (!response.ok) setMessage(resultError(result, "No fue posible actualizar la publicación."));
      else { setMessage(status === "REMOVED" ? "Publicación retirada correctamente." : "Estado actualizado correctamente."); setConfirmRetire(false); router.refresh(); }
    } catch { setMessage("No fue posible comunicarse con el servidor. Intenta nuevamente."); }
    finally { setBusy(false); }
  }

  if (listing.status === "REMOVED") return null;

  return <div>
    <div className="flex flex-wrap gap-2">{options.map((option) => <button className="rounded-lg border border-ink/15 px-3 py-2 text-xs font-extrabold disabled:opacity-50" type="button" disabled={busy} onClick={() => change(option.status)} key={option.status}>{option.label}</button>)}</div>
    {listing.status !== "RESERVED" && <button className="mt-2 block rounded-lg border border-dashed border-ink/15 px-3 py-2 text-xs font-extrabold text-muted opacity-70" type="button" disabled>Marcar como entregado · Próximamente</button>}
    {confirmRetire && <div className="mt-3 rounded-xl border border-danger/30 bg-red-50 p-3 text-sm" role="alert"><p className="font-bold">¿Retirar definitivamente esta publicación?</p><p className="mt-1 text-muted">Dejará de aparecer públicamente y no podrá editarse ni reactivarse. Esta acción es irreversible.</p><div className="mt-3 flex gap-2"><button className="button button-primary" type="button" disabled={busy} onClick={() => change("REMOVED")}>{busy ? "Retirando…" : "Sí, retirar definitivamente"}</button><button className="button button-secondary" type="button" disabled={busy} onClick={() => setConfirmRetire(false)}>Cancelar</button></div></div>}
    {message && <p className={`mt-2 text-xs ${message.includes("correctamente") ? "text-green-deep" : "text-danger"}`} role="status">{message}</p>}
  </div>;
}

export function ListingEditor({ listing, taxonomy }: Readonly<{ listing: OwnerListing; taxonomy: ListingTaxonomy }>) {
  const router = useRouter();
  const [current, setCurrent] = useState(listing);
  const [regionCode, setRegionCode] = useState(listing.regionCode ?? "");
  const [saveMessage, setSaveMessage] = useState("");
  const [photoMessage, setPhotoMessage] = useState("");
  const [retireMessage, setRetireMessage] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [retireBusy, setRetireBusy] = useState(false);
  const [confirmRetire, setConfirmRetire] = useState(false);
  const communes = useMemo(() => taxonomy.communes.filter((commune) => commune.regionCode === regionCode), [regionCode, taxonomy.communes]);
  const editingDisabled = current.status === "REMOVED" || current.status === "RESERVED";

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaveBusy(true); setSaveMessage("");
    try {
      const response = await fetch(`/api/listings/${current.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...Object.fromEntries(new FormData(event.currentTarget).entries()), version: current.version }) });
      const result = await readResult(response);
      if (!response.ok || !result.listing) setSaveMessage(resultError(result, "No fue posible guardar los cambios."));
      else { setCurrent(result.listing); setSaveMessage("Cambios guardados correctamente."); router.refresh(); }
    } catch { setSaveMessage("No fue posible comunicarse con el servidor. Los cambios no fueron confirmados."); }
    finally { setSaveBusy(false); }
  }

  async function runPhotoRequest(request: () => Promise<Response>, successMessage: string) {
    setPhotoBusy(true); setPhotoMessage("");
    try {
      const resultResponse = await request();
      const result = await readResult(resultResponse);
      if (!resultResponse.ok || !result.listing) setPhotoMessage(resultError(result, "No fue posible actualizar las fotografías."));
      else { setCurrent(result.listing); setPhotoMessage(successMessage); router.refresh(); }
    } catch { setPhotoMessage("No fue posible comunicarse con el servidor. Las fotografías no fueron confirmadas."); }
    finally { setPhotoBusy(false); }
  }

  async function addPhotos(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    await runPhotoRequest(() => fetch(`/api/listings/${current.id}/photos`, { method: "POST", body: new FormData(form) }), "Fotografías agregadas correctamente.");
    form.reset();
  }

  async function replacePhoto(photoId: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const data = new FormData(); data.set("photo", file);
    await runPhotoRequest(() => fetch(`/api/listings/${current.id}/photos/${photoId}`, { method: "PUT", body: data }), "Fotografía reemplazada correctamente.");
    event.currentTarget.value = "";
  }

  async function reorder(photoId: string, direction: -1 | 1) {
    const index = current.photos.findIndex((photo) => photo.id === photoId);
    const destination = index + direction;
    if (index < 0 || destination < 0 || destination >= current.photos.length) return;
    const ordered = current.photos.map((photo) => photo.id);
    [ordered[index], ordered[destination]] = [ordered[destination]!, ordered[index]!];
    await runPhotoRequest(() => fetch(`/api/listings/${current.id}/photos`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderedPhotoIds: ordered }) }), "Orden de fotografías guardado correctamente.");
  }

  async function retire() {
    setRetireBusy(true); setRetireMessage("");
    try {
      const response = await fetch(`/api/listings/${current.id}/retire`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ version: current.version }) });
      const result = await readResult(response);
      if (!response.ok || !result.listing) setRetireMessage(resultError(result, "No fue posible retirar la publicación."));
      else { setCurrent(result.listing); setConfirmRetire(false); setRetireMessage("Publicación retirada correctamente."); router.refresh(); }
    } catch { setRetireMessage("No fue posible comunicarse con el servidor. El retiro no fue confirmado."); }
    finally { setRetireBusy(false); }
  }

  const statusOptions: ListingStatus[] = current.status === "DRAFT" ? ["DRAFT", "PUBLISHED"] : current.status === "PUBLISHED" ? ["PUBLISHED", "PAUSED"] : current.status === "PAUSED" ? ["PAUSED", "PUBLISHED"] : [current.status];

  return <div className="space-y-7">
    {current.status === "REMOVED" && <div className="rounded-card border border-green-deep/25 bg-mint p-5" role="status"><p className="font-black text-green-deep">Publicación retirada</p><p className="mt-1 text-sm text-muted">El retiro está persistido. La publicación ya no aparece en el catálogo y su estado es terminal.</p></div>}
    {current.status === "RESERVED" && <div className="rounded-card border border-amber-300 bg-amber-50 p-5" role="status"><p className="font-black">Publicación reservada</p><p className="mt-1 text-sm text-muted">No se puede editar ni retirar mientras exista una reserva activa pendiente de pago.</p></div>}

    <section aria-labelledby="listing-content-heading"><h2 className="text-2xl font-black" id="listing-content-heading">1. Guardar cambios de la publicación</h2>
      <form className="mt-4 space-y-5 rounded-card border border-ink/10 bg-white p-5 shadow-card sm:p-7" onSubmit={save}>
        <fieldset disabled={editingDisabled || saveBusy} className="grid gap-5 sm:grid-cols-2 disabled:opacity-60">
          <label className="sm:col-span-2"><span className="field-label">Título</span><input className="field" name="title" required minLength={3} maxLength={80} defaultValue={current.title} /></label>
          <label className="sm:col-span-2"><span className="field-label">Descripción</span><textarea className="field min-h-32" name="description" minLength={30} maxLength={2000} defaultValue={current.description ?? ""} /></label>
          <label><span className="field-label">Categoría</span><select className="field" name="categorySlug" defaultValue={current.categorySlug ?? ""}><option value="">Sin definir</option>{taxonomy.categories.map((item) => <option value={item.slug} key={item.slug}>{item.name}</option>)}</select></label>
          <label><span className="field-label">Condición</span><select className="field" name="condition" defaultValue={current.condition ?? ""}><option value="">Sin definir</option>{listingConditions.map((item) => <option value={item} key={item}>{listingConditionLabels[item]}</option>)}</select></label>
          <label><span className="field-label">Región</span><select className="field" name="regionCode" value={regionCode} onChange={(event) => setRegionCode(event.target.value)}><option value="">Sin definir</option>{taxonomy.regions.map((item) => <option value={item.code} key={item.code}>{item.name}</option>)}</select></label>
          <label><span className="field-label">Comuna</span><select className="field" name="communeCode" defaultValue={current.communeCode ?? ""} key={regionCode}><option value="">Sin definir</option>{communes.map((item) => <option value={item.code} key={item.code}>{item.name}</option>)}</select></label>
          <label><span className="field-label">Disponibilidad</span><select className="field" name="status" defaultValue={current.status}>{statusOptions.map((status) => <option value={status} key={status}>{listingStatusLabels[status]}</option>)}</select></label>
        </fieldset>
        {!editingDisabled && <button className="button button-primary" disabled={saveBusy} type="submit">{saveBusy ? "Guardando…" : "Guardar cambios"}</button>}
        {editingDisabled && <p className="text-sm font-bold text-muted">La edición está bloqueada por el estado {listingStatusLabels[current.status].toLowerCase()}.</p>}
        {saveMessage && <p className="rounded-xl bg-surface-strong p-3 text-sm" role="status">{saveMessage}</p>}
      </form>
    </section>

    <PrivateContactSection listingId={current.id} mutationLocked={current.status === "RESERVED"} />

    <section aria-labelledby="listing-photos-heading"><h2 className="text-2xl font-black" id="listing-photos-heading">3. Administrar fotografías</h2>
      <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_22rem]"><div className="rounded-card border border-ink/10 bg-white p-5">
        {current.photos.length === 0 && <p className="rounded-xl bg-surface-strong p-4 text-sm" data-testid="empty-photo-gallery">No hay fotografías persistidas. Una publicación sin fotografías no puede quedar publicada.</p>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{current.photos.map((photo, index) => <article className="overflow-hidden rounded-xl border border-ink/10" data-testid="managed-photo" key={photo.id}><div className="relative aspect-square bg-surface-strong"><Image src={photo.catalogUrl} alt={`Fotografía ${index + 1}`} fill unoptimized className="object-cover" />{photo.isPrimary && <span className="absolute left-2 top-2 rounded-full bg-green-deep px-2 py-1 text-[0.65rem] font-bold text-white">Principal</span>}</div><div className="grid gap-2 p-3">
          <button className="text-xs font-bold text-green-deep disabled:opacity-40" type="button" disabled={photoBusy || editingDisabled || photo.isPrimary} onClick={() => runPhotoRequest(() => fetch(`/api/listings/${current.id}/photos/${photo.id}`, { method: "PATCH" }), "Fotografía principal actualizada correctamente.")}>Hacer principal</button>
          <div className="flex justify-center gap-3"><button aria-label={`Mover fotografía ${index + 1} a la izquierda`} className="text-xs font-bold disabled:opacity-30" type="button" disabled={photoBusy || editingDisabled || index === 0} onClick={() => reorder(photo.id, -1)}>←</button><button aria-label={`Mover fotografía ${index + 1} a la derecha`} className="text-xs font-bold disabled:opacity-30" type="button" disabled={photoBusy || editingDisabled || index === current.photos.length - 1} onClick={() => reorder(photo.id, 1)}>→</button></div>
          <label className={`text-center text-xs font-bold ${photoBusy || editingDisabled ? "cursor-not-allowed text-muted opacity-40" : "cursor-pointer text-green-deep"}`}>Reemplazar<input className="sr-only" type="file" aria-label={`Reemplazar fotografía ${index + 1}`} accept="image/jpeg,image/png,image/webp" disabled={photoBusy || editingDisabled} onChange={(event) => replacePhoto(photo.id, event)} /></label>
          <button className="text-xs font-bold text-danger disabled:opacity-40" type="button" disabled={photoBusy || editingDisabled} onClick={() => runPhotoRequest(() => fetch(`/api/listings/${current.id}/photos/${photo.id}`, { method: "DELETE" }), "Fotografía eliminada correctamente.")}>Eliminar</button>
        </div></article>)}</div></div>
        <form className="h-fit rounded-card border border-ink/10 bg-white p-5" onSubmit={addPhotos}><h3 className="font-black">Agregar fotografías</h3><input className="mt-3 block w-full text-sm" type="file" name="photos" aria-label="Nuevas fotografías" accept="image/jpeg,image/png,image/webp" multiple required disabled={photoBusy || editingDisabled} /><label className="mt-3 flex gap-2 text-sm"><input type="checkbox" name="makePrimary" value="true" disabled={photoBusy || editingDisabled} />Usar la primera como principal</label><button className="button button-secondary mt-4 w-full" type="submit" disabled={photoBusy || editingDisabled || current.photos.length >= 8}>{photoBusy ? "Procesando…" : "Agregar fotografías"}</button></form>
      </div>{photoMessage && <p className="mt-4 rounded-xl bg-surface-strong p-3 text-sm" role="status">{photoMessage}</p>}
    </section>

    <section className="rounded-card border border-danger/25 bg-white p-5" aria-labelledby="listing-retire-heading"><h2 className="text-2xl font-black" id="listing-retire-heading">4. Retirar definitivamente</h2><p className="mt-2 text-sm text-muted">A diferencia de pausar, el retiro quita la publicación del catálogo, es irreversible y no está permitido mientras exista una reserva activa.</p><p className="mt-2 text-sm text-muted"><strong className="text-ink">Marcar como entregado</strong> será una acción distinta en una etapa futura; todavía no está disponible.</p>
      {!editingDisabled && !confirmRetire && <button className="button button-secondary mt-4 border-danger text-danger" type="button" onClick={() => setConfirmRetire(true)}>Retirar definitivamente</button>}
      {confirmRetire && <div className="mt-4 rounded-xl border border-danger/30 bg-red-50 p-4" role="alert"><p className="font-black">Confirma el retiro definitivo</p><p className="mt-1 text-sm text-muted">La publicación dejará de estar disponible inmediatamente, no podrá editarse ni reactivarse. Esta acción es irreversible.</p><div className="mt-3 flex flex-wrap gap-2"><button className="button button-primary" type="button" disabled={retireBusy} onClick={retire}>{retireBusy ? "Retirando…" : "Sí, retirar definitivamente"}</button><button className="button button-secondary" type="button" disabled={retireBusy} onClick={() => setConfirmRetire(false)}>Cancelar</button></div></div>}
      {retireMessage && <p className="mt-4 rounded-xl bg-mint p-3 text-sm font-bold text-green-deep" role="status">{retireMessage}</p>}
    </section>
  </div>;
}
