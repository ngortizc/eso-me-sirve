import Image from "next/image";
import type { ListingTaxonomy, OwnerListing } from "@/modules/listings/application/listing-repository";
import { listingConditionLabels } from "@/modules/listings/domain/listing";

export function RemovedListingDetail({ listing, taxonomy }: Readonly<{ listing: OwnerListing; taxonomy: ListingTaxonomy }>) {
  const category = taxonomy.categories.find((item) => item.slug === listing.categorySlug)?.name ?? "Sin definir";
  const region = taxonomy.regions.find((item) => item.code === listing.regionCode)?.name ?? "Sin definir";
  const commune = taxonomy.communes.find((item) => item.code === listing.communeCode)?.name ?? "Sin definir";
  const condition = listing.condition ? listingConditionLabels[listing.condition] : "Sin definir";

  return <div className="space-y-7" data-testid="removed-listing-detail">
    <section className="rounded-card border border-green-deep/25 bg-mint p-5 sm:p-7" role="status">
      <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-green-deep">Publicación retirada</p>
      <h2 className="mt-2 text-2xl font-black">Esta publicación fue retirada definitivamente y no puede modificarse</h2>
      <p className="mt-2 text-sm font-bold text-green-deep">Publicación retirada correctamente.</p>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">El retiro es irreversible. La publicación permanece fuera del catálogo público y este detalle se conserva para consulta del propietario y trazabilidad.</p>
    </section>

    <section className="rounded-card border border-ink/10 bg-white p-5 shadow-card sm:p-7" aria-labelledby="removed-summary-heading">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start"><div><p className="text-sm font-extrabold text-green-deep">Detalle de solo lectura</p><h2 className="mt-1 text-3xl font-black" id="removed-summary-heading">{listing.title}</h2></div><span className="w-fit rounded-full bg-surface-strong px-3 py-1 text-xs font-extrabold">Retirada</span></div>
      <p className="mt-5 whitespace-pre-wrap leading-7 text-muted">{listing.description || "Sin descripción"}</p>
      <dl className="mt-6 grid gap-4 border-t border-ink/10 pt-5 sm:grid-cols-2 lg:grid-cols-4">
        <div><dt className="text-xs font-extrabold uppercase tracking-wide text-muted">Categoría</dt><dd className="mt-1 font-bold">{category}</dd></div>
        <div><dt className="text-xs font-extrabold uppercase tracking-wide text-muted">Condición</dt><dd className="mt-1 font-bold">{condition}</dd></div>
        <div><dt className="text-xs font-extrabold uppercase tracking-wide text-muted">Región</dt><dd className="mt-1 font-bold">{region}</dd></div>
        <div><dt className="text-xs font-extrabold uppercase tracking-wide text-muted">Comuna</dt><dd className="mt-1 font-bold">{commune}</dd></div>
      </dl>
      <p className="mt-5 text-xs text-muted">Última actualización: {new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(listing.updatedAt))}</p>
    </section>

    <section aria-labelledby="removed-photos-heading"><h2 className="text-2xl font-black" id="removed-photos-heading">Fotografías conservadas</h2>
      {listing.photos.length > 0 ? <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{listing.photos.map((photo, index) => <figure className="overflow-hidden rounded-xl border border-ink/10 bg-white" key={photo.id}><div className="relative aspect-square bg-surface-strong"><Image src={photo.detailUrl} alt={`Fotografía ${index + 1} de ${listing.title}`} fill unoptimized className="object-cover" />{photo.isPrimary && <span className="absolute left-2 top-2 rounded-full bg-green-deep px-2 py-1 text-[0.65rem] font-bold text-white">Principal</span>}</div></figure>)}</div> : <p className="mt-4 rounded-xl bg-surface-strong p-4 text-sm text-muted">Esta publicación no conserva fotografías asociadas.</p>}
    </section>

    <section className="rounded-card border border-ink/10 bg-white p-5" aria-labelledby="removed-actions-heading"><h2 className="text-xl font-black" id="removed-actions-heading">Estado de las acciones</h2><ul className="mt-3 space-y-2 text-sm text-muted"><li><strong className="text-ink">Pausar publicación:</strong> disponible únicamente para publicaciones activas.</li><li><strong className="text-ink">Retirar definitivamente:</strong> completado; no puede deshacerse.</li><li><strong className="text-ink">Marcar como entregado:</strong> funcionalidad futura, todavía no disponible.</li></ul></section>
  </div>;
}
