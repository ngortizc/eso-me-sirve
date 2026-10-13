import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListingEditor } from "@/components/listings/listing-manager";
import { requireUser } from "@/modules/identity/application/session";
import { getListingRepository } from "@/modules/listings/infrastructure/postgres-listing-repository";

export const metadata: Metadata = { title: "Editar publicación" };
type Props = { params: Promise<{ listingId: string }> };

export default async function EditListingPage({ params }: Props) {
  const { listingId } = await params;
  const user = await requireUser(`/mis-publicaciones/${listingId}/editar`);
  const repository = getListingRepository();
  const [listing, taxonomy] = await Promise.all([repository.getOwnerListing(user.id, listingId), repository.getTaxonomy()]);
  if (!listing) notFound();
  return <main className="page-container py-10 sm:py-14"><Link className="text-sm font-extrabold text-green-deep hover:underline" href="/mis-cosas">← Mis publicaciones</Link><h1 className="mt-5 text-4xl font-black tracking-[-0.04em] sm:text-5xl">Editar publicación</h1><p className="mt-3 text-muted">Todos los cambios vuelven a validarse en el servidor.</p><div className="mt-8"><ListingEditor listing={listing} taxonomy={taxonomy} /></div></main>;
}
