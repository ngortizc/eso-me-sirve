import type { Metadata } from "next";
import { PublishListingForm } from "@/components/listings/publish-listing-form";
import { requireUser } from "@/modules/identity/application/session";
import { getListingRepository } from "@/modules/listings/infrastructure/postgres-listing-repository";

export const metadata: Metadata = { title: "Publicar gratis", description: "Publica un artículo gratuito para compartirlo con tu comunidad." };

export default async function PublishPage() {
  const user = await requireUser("/publicar");
  if (!user.emailVerified) return <main className="page-container py-14"><h1 className="text-4xl font-black">Verifica tu correo</h1><p className="mt-4 text-muted">Necesitas verificar tu correo antes de publicar.</p></main>;
  const taxonomy = await getListingRepository().getTaxonomy();
  return <main className="page-container py-10 sm:py-14"><p className="text-sm font-extrabold uppercase tracking-[0.14em] text-green-deep">Regala en tu comunidad</p><h1 className="mt-3 text-4xl font-black tracking-[-0.04em] sm:text-5xl">Publica algo que ya no usas</h1><p className="mt-3 max-w-2xl text-lg leading-8 text-muted">El artículo debe ser gratuito. En público solo mostraremos región y comuna; el contacto y lugar de retiro se guardan protegidos.</p><div className="mt-8"><PublishListingForm taxonomy={taxonomy} /></div></main>;
}
