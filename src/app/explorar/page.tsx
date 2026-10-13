import type { Metadata } from "next";
import Link from "next/link";
import { RealListingCard } from "@/components/catalog/real-listing-card";
import { getListingRepository } from "@/modules/listings/infrastructure/postgres-listing-repository";

export const metadata: Metadata = { title: "Explorar artículos", description: "Explora artículos gratuitos publicados por personas de tu comunidad." };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (value: string | string[] | undefined) => typeof value === "string" ? value : "";

export default async function ExplorePage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(one(params.page) || "1", 10) || 1);
  const filters = { query: one(params.q), category: one(params.category), region: one(params.region), commune: one(params.commune), page, pageSize: 12 };
  const repository = getListingRepository();
  const [result, taxonomy] = await Promise.all([repository.listPublic(filters), repository.getTaxonomy()]);
  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));
  const communes = filters.region ? taxonomy.communes.filter((commune) => commune.regionCode === filters.region) : taxonomy.communes;

  return <main className="page-container py-10 sm:py-14">
    <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">Encuentra algo que te sirva</h1>
    <p className="mt-3 max-w-2xl text-lg leading-8 text-muted">Publicaciones reales de artículos gratuitos. Solo mostramos ubicación por región y comuna.</p>
    <form className="mt-8 grid gap-3 rounded-card border border-ink/10 bg-white p-4 shadow-card sm:grid-cols-2 lg:grid-cols-5" action="/explorar">
      <label className="sm:col-span-2 lg:col-span-2"><span className="field-label">Buscar</span><input className="field" name="q" defaultValue={filters.query} placeholder="Título o descripción" data-testid="catalog-search" /></label>
      <label><span className="field-label">Categoría</span><select className="field" name="category" defaultValue={filters.category} data-testid="category-filter"><option value="">Todas</option>{taxonomy.categories.map((category) => <option value={category.slug} key={category.slug}>{category.name}</option>)}</select></label>
      <label><span className="field-label">Región</span><select className="field" name="region" defaultValue={filters.region} data-testid="region-filter"><option value="">Todas</option>{taxonomy.regions.map((region) => <option value={region.code} key={region.code}>{region.name}</option>)}</select></label>
      <label><span className="field-label">Comuna</span><select className="field" name="commune" defaultValue={filters.commune} data-testid="commune-filter"><option value="">Todas</option>{communes.map((commune) => <option value={commune.code} key={commune.code}>{commune.name}</option>)}</select></label>
      <div className="flex gap-2 sm:col-span-2 lg:col-span-5"><button className="button button-primary" type="submit">Aplicar filtros</button><Link className="button button-secondary" href="/explorar">Limpiar</Link></div>
    </form>
    <div className="mt-7 flex items-center justify-between"><p className="text-sm font-bold text-muted">{result.total} {result.total === 1 ? "artículo" : "artículos"}</p><Link className="text-sm font-extrabold text-green-deep hover:underline" href="/publicar">Publicar gratis →</Link></div>
    {result.items.length > 0 ? <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" data-testid="catalog-grid">{result.items.map((listing, index) => <RealListingCard listing={listing} priority={index < 2} key={listing.slug} />)}</div> : <section className="mt-5 rounded-card border border-dashed border-ink/20 bg-surface-strong/60 p-10 text-center" data-testid="empty-state"><h2 className="text-2xl font-black">No encontramos artículos</h2><p className="mt-2 text-muted">Prueba con otros filtros o publica algo que pueda servirle a otra persona.</p></section>}
    {pageCount > 1 && <nav className="mt-8 flex justify-center gap-2" aria-label="Paginación del catálogo">{Array.from({ length: pageCount }, (_, index) => index + 1).map((item) => <Link className={`grid size-10 place-items-center rounded-full font-bold ${item === page ? "bg-green-deep text-white" : "border border-ink/10 bg-white"}`} href={{ pathname: "/explorar", query: { ...(filters.query && { q: filters.query }), ...(filters.category && { category: filters.category }), ...(filters.region && { region: filters.region }), ...(filters.commune && { commune: filters.commune }), page: item } }} key={item} aria-current={item === page ? "page" : undefined}>{item}</Link>)}</nav>}
  </main>;
}
