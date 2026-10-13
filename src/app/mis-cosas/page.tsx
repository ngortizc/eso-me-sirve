import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ListingStatusActions } from "@/components/listings/listing-manager";
import { Icon } from "@/components/ui/icon";
import { requireUser } from "@/modules/identity/application/session";
import { listingStatusLabels } from "@/modules/listings/domain/listing";
import { getListingRepository } from "@/modules/listings/infrastructure/postgres-listing-repository";

export const metadata: Metadata = { title: "Mis publicaciones" };

export default async function MyThingsPage() {
  const user = await requireUser("/mis-cosas");
  const listings = await getListingRepository().getOwnerListings(user.id);
  return <main className="page-container py-10 sm:py-14"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-sm font-extrabold uppercase tracking-[0.14em] text-green-deep">Tu actividad real</p><h1 className="mt-2 text-4xl font-black tracking-[-0.04em] sm:text-5xl">Mis publicaciones</h1><p className="mt-3 max-w-xl text-lg leading-8 text-muted">Administra borradores y artículos publicados. Las reservas todavía no están implementadas.</p></div><Link className="button button-primary" href="/publicar"><Icon className="size-4" name="plus" />Nueva publicación</Link></div>
    {listings.length > 0 ? <div className="mt-8 space-y-4">{listings.map((listing) => <article className="grid gap-4 rounded-card border border-ink/10 bg-white p-4 shadow-card sm:grid-cols-[7rem_1fr_auto] sm:items-center" key={listing.id} data-testid="owner-listing"><div className="relative aspect-square overflow-hidden rounded-xl bg-surface-strong">{listing.photos[0] ? <Image src={(listing.photos.find((photo) => photo.isPrimary) ?? listing.photos[0]).catalogUrl} alt="" fill unoptimized className="object-cover" /> : <span className="grid h-full place-items-center text-xs font-bold text-muted">Sin foto</span>}</div><div><span className="rounded-full bg-surface-strong px-2.5 py-1 text-xs font-extrabold">{listingStatusLabels[listing.status]}</span><h2 className="mt-3 text-xl font-black">{listing.title}</h2><p className="mt-1 text-xs text-muted">Actualizada {new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "America/Santiago" }).format(new Date(listing.updatedAt))}</p><div className="mt-3 flex flex-wrap gap-3"><Link className="text-sm font-extrabold text-green-deep hover:underline" href={`/mis-publicaciones/${listing.id}/editar`}>Editar</Link>{listing.status === "PUBLISHED" && <Link className="text-sm font-extrabold text-green-deep hover:underline" href={`/articulos/${listing.slug}`}>Ver pública</Link>}</div></div><ListingStatusActions listing={listing} /></article>)}</div> : <section className="mt-8 rounded-card border border-dashed border-ink/20 bg-surface-strong/60 p-10 text-center" data-testid="owner-empty-state"><h2 className="text-2xl font-black">Aún no tienes publicaciones</h2><p className="mt-2 text-muted">Guarda un borrador o publica tu primer artículo gratuito.</p><Link className="button button-primary mt-5" href="/publicar">Comenzar</Link></section>}
  </main>;
}
