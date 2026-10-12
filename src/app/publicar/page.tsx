import type { Metadata } from "next";
import { PublishDemoForm } from "@/components/listings/publish-demo-form";
import { requireUser } from "@/modules/identity/application/session";

export const metadata: Metadata = { title: "Publicar gratis", description: "Vista de demostración para publicar un artículo gratuito." };

export default async function PublishPage() {
  await requireUser("/publicar");
  return <main className="page-container py-10 sm:py-14"><p className="text-sm font-extrabold uppercase tracking-[0.14em] text-green-deep">Regala en tu comunidad</p><h1 className="mt-3 text-4xl font-black tracking-[-0.04em] sm:text-5xl">Publica algo que ya no usas</h1><p className="mt-3 max-w-2xl text-lg leading-8 text-muted">Completa este formulario visual. Es una demostración: no se almacenará ningún dato.</p><div className="mt-8"><PublishDemoForm /></div></main>;
}
