import type { Metadata } from "next";
import { Suspense } from "react";
import { ExploreCatalog } from "@/components/catalog/explore-catalog";
import { DemoBadge } from "@/components/ui/demo-badge";

export const metadata: Metadata = { title: "Explorar artículos", description: "Explora artículos gratuitos de demostración cerca de ti." };

export default function ExplorePage() {
  return (
    <main className="page-container py-10 sm:py-14">
      <DemoBadge />
      <h1 className="mt-5 text-4xl font-black tracking-[-0.04em] sm:text-5xl">Encuentra algo que te sirva</h1>
      <p className="mt-3 max-w-2xl text-lg leading-8 text-muted">Todos los artículos son gratuitos. Filtra el catálogo ficticio por categoría o comuna.</p>
      <div className="mt-8"><Suspense fallback={<CatalogSkeleton />}><ExploreCatalog /></Suspense></div>
    </main>
  );
}

function CatalogSkeleton() {
  return <div aria-label="Cargando catálogo" className="animate-pulse"><div className="h-32 rounded-card bg-surface-strong" /><div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{[1,2,3,4].map((item) => <div className="aspect-[3/4] rounded-card bg-surface-strong" key={item} />)}</div></div>;
}
