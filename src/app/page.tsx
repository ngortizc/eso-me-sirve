import Image from "next/image";
import Link from "next/link";
import { ArticleCard } from "@/components/catalog/article-card";
import { RealListingCard } from "@/components/catalog/real-listing-card";
import { DemoBadge } from "@/components/ui/demo-badge";
import { Icon } from "@/components/ui/icon";
import { getListingRepository } from "@/modules/listings/infrastructure/postgres-listing-repository";
import { demoArticles } from "@/shared/demo/catalog";

export const dynamic = "force-dynamic";

const categories = [
  { label: "Hogar", slug: "hogar", symbol: "◒", tone: "bg-fresh/15 text-green-deep" },
  { label: "Infantil", slug: "infantil", symbol: "✦", tone: "bg-amber/20 text-[#744a18]" },
  { label: "Libros", slug: "libros", symbol: "▤", tone: "bg-ink/8 text-ink" },
  { label: "Tecnología", slug: "tecnologia", symbol: "⌁", tone: "bg-green-deep/10 text-green-deep" }
] as const;

const steps = [
  ["1", "Encuentra algo útil", "Explora artículos gratuitos cerca de tu comuna."],
  ["2", "Envía tu solicitud", "La persona que publica elige a quién reservar."],
  ["3", "Conecta con seguridad", "Tras la aceptación y el pago confirmado, se habilita el contacto."]
] as const;

export default async function HomePage() {
  const recent = await getListingRepository().listPublic({ page: 1, pageSize: 4 });
  return (
    <main className="flex flex-col">
      <section className="order-1 relative overflow-hidden bg-ink text-white">
        <div className="absolute -right-32 -top-32 size-[30rem] rounded-full bg-fresh/15 blur-3xl" aria-hidden="true" />
        <div className="page-container relative grid gap-7 py-8 sm:py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-12">
          <div className="z-10">
            <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.17em] text-fresh">Compartir nos hace bien</p>
            <h1 className="mt-3 max-w-2xl text-balance text-4xl font-black leading-[1.03] tracking-[-0.045em] sm:text-5xl lg:text-6xl">Dale una nueva vida a lo que ya no usas</h1>
            <p className="mt-4 max-w-xl text-pretty text-base leading-7 text-white/72 sm:text-lg">Encuentra artículos gratis cerca de ti y conecta con personas de tu comunidad de forma simple y protegida.</p>
            <form className="mt-6 grid max-w-2xl gap-2 rounded-card bg-white p-2 shadow-2xl sm:grid-cols-[1fr_0.72fr_auto]" action="/explorar">
              <label className="relative flex min-h-12 items-center border-b border-ink/10 sm:border-b-0 sm:border-r">
                <Icon className="ml-3 size-5 shrink-0 text-green-deep" name="search" />
                <span className="sr-only">Buscar artículos</span>
                <input className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm font-medium text-ink outline-none placeholder:text-muted" name="q" placeholder="¿Qué estás buscando?" />
              </label>
              <div className="relative flex min-h-12 items-center"><Icon className="ml-3 size-5 shrink-0 text-green-deep" name="location" /><span className="px-3 py-3 text-sm font-semibold text-ink">Todo Chile</span></div>
              <button className="button button-primary !rounded-xl !px-5" type="submit">Buscar</button>
            </form>
            <p className="mt-4 flex items-center gap-2 text-xs text-white/55"><Icon className="size-4" name="location" />Ubicaciones aproximadas · nunca mostramos direcciones públicas</p>
          </div>

          <div className="relative mx-auto hidden w-full max-w-lg lg:block" aria-hidden="true">
            <div className="relative ml-auto aspect-[4/3] w-[88%] overflow-hidden rounded-[2.25rem] border border-white/15 shadow-2xl">
              <Image className="object-cover" src={demoArticles[0].image} alt="" fill loading="eager" sizes="40vw" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 to-transparent p-7 pt-20"><span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-green-deep">GRATIS</span><p className="mt-3 text-xl font-extrabold">{demoArticles[0].title}</p><p className="mt-1 text-sm text-white/70">{demoArticles[0].commune}</p></div>
            </div>
            <div className="absolute -bottom-5 left-0 rounded-2xl bg-amber px-5 py-4 text-ink shadow-xl"><p className="text-xs font-bold uppercase tracking-wider">Impacto compartido</p><p className="mt-1 font-extrabold">Una cosa menos guardada</p></div>
          </div>
        </div>
      </section>

      <section className="order-3 page-container py-12 sm:py-16" aria-labelledby="categorias-title">
        <div className="flex items-end justify-between gap-4"><div><p className="text-sm font-extrabold uppercase tracking-[0.14em] text-green-deep">Explora a tu manera</p><h2 id="categorias-title" className="mt-2 text-3xl font-black tracking-[-0.035em] text-ink sm:text-4xl">Categorías</h2></div><Link className="hidden text-sm font-extrabold text-green-deep hover:underline sm:block" href="/explorar">Ver todo →</Link></div>
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {categories.map((category) => <Link className="group rounded-card border border-ink/10 bg-white p-4 shadow-card transition hover:-translate-y-1 hover:border-green-deep/30 hover:shadow-card-hover sm:p-5" href={`/explorar?category=${category.slug}`} key={category.label}><span className={`grid size-11 place-items-center rounded-2xl text-xl font-black ${category.tone}`}>{category.symbol}</span><span className="mt-5 flex items-center justify-between font-extrabold text-ink"><span>{category.label}</span><Icon className="size-4 text-muted transition group-hover:translate-x-1 group-hover:text-green-deep" name="arrow" /></span></Link>)}
        </div>
      </section>

      <section className="order-2 border-y border-ink/8 bg-white py-10 sm:py-14" aria-labelledby="recientes-title">
        <div className="page-container">
          <div className="flex items-end justify-between gap-4"><div><p className="text-sm font-extrabold uppercase tracking-[0.14em] text-green-deep">Cerca de ti</p><h2 id="recientes-title" className="mt-2 text-3xl font-black tracking-[-0.035em] text-ink sm:text-4xl">Artículos recientes</h2>{recent.items.length === 0 && <div className="mt-2"><DemoBadge compact /></div>}</div><Link className="button button-secondary !hidden sm:!inline-flex" href="/explorar">Explorar todos <Icon className="size-4" name="arrow" /></Link></div>
          <div className="mt-6 grid auto-cols-[82%] grid-flow-col gap-4 overflow-x-auto px-0.5 pb-4 snap-x snap-mandatory sm:auto-cols-auto sm:grid-flow-row sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-4">{recent.items.length > 0 ? recent.items.map((listing, index) => <div className="snap-start" key={listing.slug}><RealListingCard listing={listing} priority={index < 2} /></div>) : demoArticles.map((article, index) => <div className="snap-start" key={article.slug}><ArticleCard article={article} priority={index < 2} /></div>)}</div>
          <Link className="button button-secondary mt-6 w-full sm:!hidden" href="/explorar">Explorar todos <Icon className="size-4" name="arrow" /></Link>
        </div>
      </section>

      <section className="order-4 page-container py-16 sm:py-24" aria-labelledby="como-funciona-title">
        <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20"><div><span className="grid size-12 place-items-center rounded-2xl bg-green-deep text-white"><Icon className="size-6" name="sparkle" /></span><h2 id="como-funciona-title" className="mt-5 text-3xl font-black tracking-[-0.035em] sm:text-4xl">Simple, local y con privacidad</h2><p className="mt-4 leading-7 text-muted">El artículo siempre es gratis. El servicio de conexión solo se considera después de que una solicitud sea aceptada.</p></div><ol className="grid gap-3">{steps.map(([number, title, description]) => <li className="flex gap-4 rounded-card border border-ink/10 bg-white p-5" key={number}><span className="grid size-9 shrink-0 place-items-center rounded-full bg-fresh/15 text-sm font-black text-green-deep">{number}</span><div><h3 className="font-extrabold">{title}</h3><p className="mt-1 text-sm leading-6 text-muted">{description}</p></div></li>)}</ol></div>
      </section>

      <section className="order-5 page-container"><div className="relative overflow-hidden rounded-[2rem] bg-green-deep px-6 py-10 text-white sm:px-12 sm:py-14"><div className="absolute -right-16 -top-20 size-64 rounded-full bg-fresh/30 blur-2xl" aria-hidden="true" /><div className="relative max-w-2xl"><p className="text-sm font-extrabold uppercase tracking-[0.15em] text-white/70">¿Tienes algo que ya no usas?</p><h2 className="mt-3 text-3xl font-black tracking-[-0.035em] sm:text-5xl">Publicar siempre es gratis</h2><p className="mt-4 max-w-xl leading-7 text-white/75">Crea una publicación persistente y comparte fotografías procesadas de forma segura.</p><Link className="button mt-7 bg-white text-green-deep hover:bg-surface" href="/publicar"><Icon className="size-5" name="plus" />Publicar un artículo</Link></div></div></section>
    </main>
  );
}
