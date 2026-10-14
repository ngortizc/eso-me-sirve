"use client";

import { useCallback, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PhotoManager, type ManagedPhoto } from "@/components/photos/photo-manager";
import { Icon } from "@/components/ui/icon";
import type { ListingTaxonomy } from "@/modules/listings/application/listing-repository";
import { listingConditionLabels, listingConditions } from "@/modules/listings/domain/listing";
import { deliveryMethodLabels, deliveryMethods } from "@/modules/private-contact/domain/private-contact";

export function PublishListingForm({ taxonomy }: Readonly<{ taxonomy: ListingTaxonomy }>) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [photos, setPhotos] = useState<readonly ManagedPhoto[]>([]);
  const [regionCode, setRegionCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const communes = useMemo(() => taxonomy.communes.filter((commune) => commune.regionCode === regionCode), [regionCode, taxonomy.communes]);
  const handlePhotos = useCallback((next: readonly ManagedPhoto[]) => setPhotos(next), []);

  async function submit(intent: "draft" | "publish") {
    const form = formRef.current;
    if (!form || busy) return;
    setMessage("");
    if (intent === "publish" && !form.reportValidity()) return;
    const data = new FormData(form);
    data.set("intent", intent);
    for (const photo of photos) data.append("photos", photo.file, photo.file.name);
    data.set("primaryPhotoIndex", String(Math.max(0, photos.findIndex((photo) => photo.isPrimary))));
    setBusy(true);
    try {
      const response = await fetch("/api/listings", { method: "POST", body: data });
      const body = await response.json() as { error?: string; errors?: { message: string }[]; listing?: { slug: string; status: string } };
      if (!response.ok || !body.listing) {
        setMessage(body.errors?.map((error) => error.message).join(" ") || body.error || "No fue posible guardar la publicación.");
        return;
      }
      if (body.listing.status === "PUBLISHED") router.push(`/articulos/${body.listing.slug}?created=1`);
      else router.push("/mis-cosas?created=draft");
      router.refresh();
    } catch {
      setMessage("No fue posible conectar con el servidor. Intenta nuevamente.");
    } finally {
      setBusy(false);
    }
  }

  function preventNativeSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); }

  return (
    <form ref={formRef} className="grid gap-6 lg:grid-cols-[1fr_21rem]" onSubmit={preventNativeSubmit}>
      <div className="space-y-5 rounded-card border border-ink/10 bg-white p-5 shadow-card sm:p-7">
        <div><p className="text-sm font-extrabold text-green-deep">Publicación real</p><h2 className="mt-1 text-2xl font-black">Describe el artículo gratuito</h2></div>
        <PhotoManager onPhotosChange={handlePhotos} />
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className="field-label">Título</span><input className="field" name="title" required minLength={3} maxLength={80} placeholder="Ej. Mesa lateral de madera" /></label>
          <label className="sm:col-span-2"><span className="field-label">Descripción</span><textarea className="field min-h-32" name="description" required minLength={30} maxLength={2000} placeholder="Describe el estado, medidas aproximadas y una forma general de retiro. No incluyas contacto ni dirección." /></label>
          <label><span className="field-label">Categoría</span><select className="field" name="categorySlug" required defaultValue=""><option value="" disabled>Selecciona una</option>{taxonomy.categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select></label>
          <label><span className="field-label">Condición</span><select className="field" name="condition" required defaultValue="GOOD">{listingConditions.map((condition) => <option key={condition} value={condition}>{listingConditionLabels[condition]}</option>)}</select></label>
          <label><span className="field-label">Región</span><select className="field" name="regionCode" required value={regionCode} onChange={(event) => setRegionCode(event.target.value)}><option value="" disabled>Selecciona una región</option>{taxonomy.regions.map((region) => <option key={region.code} value={region.code}>{region.name}</option>)}</select></label>
          <label><span className="field-label">Comuna</span><select className="field" name="communeCode" required defaultValue="" key={regionCode}><option value="" disabled>Selecciona una comuna</option>{communes.map((commune) => <option key={commune.code} value={commune.code}>{commune.name}</option>)}</select></label>
        </div>
        <p className="flex items-start gap-2 rounded-xl bg-surface-strong p-3 text-xs leading-5 text-muted"><Icon className="mt-0.5 size-4 shrink-0 text-green-deep" name="lock" />La ubicación pública se limita a región y comuna. No escribas teléfono, correo, calle ni número.</p>
        <section className="rounded-card border border-green-deep/20 bg-mint/50 p-5" aria-labelledby="publish-contact-heading">
          <h2 className="text-xl font-black" id="publish-contact-heading">Datos privados para coordinar el retiro</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Recopilamos teléfono y lugar de entrega para coordinar el retiro. No aparecerán en el catálogo ni se entregarán a solicitantes o reservas sin pago. Solo podrán compartirse con el receptor seleccionado después de un pago confirmado; el acceso futuro podrá registrarse.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label><span className="field-label">Teléfono chileno</span><input className="field" name="contactPhone" type="tel" required autoComplete="tel" placeholder="+56 9 1234 5678" /></label>
            <label><span className="field-label">Modalidad de entrega</span><select className="field" name="deliveryMethod" required defaultValue=""><option value="" disabled>Selecciona una modalidad</option>{deliveryMethods.map((method) => <option value={method} key={method}>{deliveryMethodLabels[method]}</option>)}</select></label>
            <label className="sm:col-span-2"><span className="field-label">Dirección o punto de retiro</span><textarea className="field min-h-24" name="deliveryLocation" required minLength={5} maxLength={300} placeholder="Escribe la dirección o describe claramente el punto de encuentro" /></label>
            <label className="sm:col-span-2"><span className="field-label">Indicaciones adicionales (opcional)</span><textarea className="field min-h-20" name="deliveryInstructions" maxLength={500} /></label>
            <label className="sm:col-span-2 flex items-start gap-3 rounded-xl border border-ink/10 bg-white p-4 text-sm leading-6"><input className="mt-1 size-4" type="checkbox" name="contactConsent" value="true" required /><span>Acepto el tratamiento protegido y la futura compartición con el receptor seleccionado únicamente después de un pago confirmado.</span></label>
          </div>
          <p className="mt-3 text-xs text-muted">Puedes guardar un borrador sin completar esta sección. Será obligatoria antes de publicar.</p>
        </section>
      </div>
      <aside className="h-fit rounded-card bg-ink p-5 text-white lg:sticky lg:top-24 sm:p-6">
        <span className="grid size-11 place-items-center rounded-2xl bg-fresh/20 text-fresh"><Icon className="size-6" name="sparkle" /></span>
        <h2 className="mt-5 text-2xl font-black">Publicar siempre es gratis</h2>
        <p className="mt-3 text-sm leading-6 text-white/65">No existe campo de precio. La confirmación aparece solamente después de guardar en PostgreSQL y procesar las fotografías.</p>
        <div className="mt-7 grid gap-3">
          <button className="button w-full bg-white text-green-deep hover:bg-surface" type="button" disabled={busy} onClick={() => submit("publish")}>{busy ? "Guardando…" : "Publicar artículo"}</button>
          <button className="button w-full border border-white/25 text-white hover:bg-white/10" type="button" disabled={busy} onClick={() => submit("draft")}>Guardar borrador</button>
        </div>
        {message && <div className="mt-4 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm leading-5" role="alert">{message}</div>}
      </aside>
    </form>
  );
}
