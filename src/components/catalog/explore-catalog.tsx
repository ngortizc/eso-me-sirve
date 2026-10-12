"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArticleCard } from "@/components/catalog/article-card";
import { Icon } from "@/components/ui/icon";
import { demoArticles, demoCategories, demoCommunes, filterDemoArticles } from "@/shared/demo/catalog";

export function ExploreCatalog() {
  const searchParams = useSearchParams();
  const requestedCategory = searchParams.get("categoria") ?? "Todas";
  const requestedCommune = searchParams.get("comuna") ?? "Todas";
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [category, setCategory] = useState(demoCategories.includes(requestedCategory as typeof demoCategories[number]) ? requestedCategory : "Todas");
  const [commune, setCommune] = useState(demoCommunes.includes(requestedCommune as typeof demoCommunes[number]) ? requestedCommune : "Todas");

  const filtered = useMemo(() => filterDemoArticles(demoArticles, { query, category, commune }), [query, category, commune]);
  const clearFilters = () => { setQuery(""); setCategory("Todas"); setCommune("Todas"); };

  return (
    <div>
      <div className="grid gap-3 rounded-card border border-ink/10 bg-white p-4 shadow-card md:grid-cols-[1fr_0.55fr_0.55fr]">
        <label><span className="field-label">Buscar</span><span className="relative block"><Icon className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-green-deep" name="search" /><input className="field !pl-11" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej. sillón, libros o planta" data-testid="catalog-search" /></span></label>
        <label><span className="field-label">Categoría</span><select className="field" value={category} onChange={(event) => setCategory(event.target.value)} data-testid="category-filter">{demoCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span className="field-label">Comuna</span><select className="field" value={commune} onChange={(event) => setCommune(event.target.value)} data-testid="commune-filter">{demoCommunes.map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>

      <div className="mt-7 flex items-center justify-between gap-4"><p className="text-sm font-semibold text-muted" role="status"><strong className="text-ink">{filtered.length}</strong> {filtered.length === 1 ? "artículo encontrado" : "artículos encontrados"}</p>{(query || category !== "Todas" || commune !== "Todas") && <button className="text-sm font-extrabold text-green-deep underline decoration-green-deep/25 hover:decoration-green-deep" type="button" onClick={clearFilters}>Limpiar filtros</button>}</div>

      {filtered.length > 0 ? (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-testid="catalog-grid">{filtered.map((article, index) => <ArticleCard article={article} priority={index < 2} key={article.slug} />)}</div>
      ) : (
        <div className="mt-5 grid min-h-72 place-items-center rounded-card border border-dashed border-ink/20 bg-white px-6 text-center" data-testid="empty-state"><div><span className="mx-auto grid size-12 place-items-center rounded-full bg-surface-strong text-green-deep"><Icon className="size-6" name="search" /></span><h2 className="mt-4 text-xl font-black">No encontramos coincidencias</h2><p className="mt-2 max-w-sm text-sm leading-6 text-muted">Prueba con otra palabra o amplía la categoría y comuna. Estos datos son solo de demostración.</p><button className="button button-secondary mt-5" type="button" onClick={clearFilters}>Ver todos los artículos</button></div></div>
      )}
    </div>
  );
}
