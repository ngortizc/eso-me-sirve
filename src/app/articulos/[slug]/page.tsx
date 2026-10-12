import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RequestDemo } from "@/components/catalog/request-demo";
import { DemoBadge } from "@/components/ui/demo-badge";
import { Icon } from "@/components/ui/icon";
import { ArticleGallery } from "@/components/photos/article-gallery";
import { demoArticles } from "@/shared/demo/catalog";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() { return demoArticles.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = demoArticles.find((item) => item.slug === slug);
  return article ? { title: article.title, description: `Artículo gratuito de demostración en ${article.commune}.` } : { title: "Artículo no encontrado" };
}

export default async function ArticleDetailPage({ params }: Props) {
  const { slug } = await params;
  const article = demoArticles.find((item) => item.slug === slug);
  if (!article) notFound();

  return (
    <main className="page-container py-7 sm:py-12">
      <Link className="inline-flex items-center gap-1 text-sm font-extrabold text-green-deep hover:underline" href="/explorar">← Volver a explorar</Link>
      <div className="mt-5 grid gap-8 lg:grid-cols-[1.12fr_0.88fr] lg:gap-12">
        <ArticleGallery photos={article.photos} title={article.title} />

        <section>
          <DemoBadge />
          <div className="mt-5 flex flex-wrap gap-2"><span className="rounded-full bg-green-deep/10 px-3 py-1 text-xs font-extrabold text-green-deep">{article.category}</span><span className="rounded-full bg-surface-strong px-3 py-1 text-xs font-bold text-ink">Disponible · demo</span></div>
          <h1 className="mt-4 text-4xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">{article.title}</h1>
          <p className="mt-4 text-lg leading-8 text-muted">{article.description}</p>
          <dl className="mt-7 grid grid-cols-2 gap-3"><div className="rounded-xl border border-ink/10 bg-white p-4"><dt className="text-xs font-bold uppercase tracking-wider text-muted">Condición</dt><dd className="mt-1 font-extrabold">{article.condition}</dd></div><div className="rounded-xl border border-ink/10 bg-white p-4"><dt className="text-xs font-bold uppercase tracking-wider text-muted">Ubicación</dt><dd className="mt-1 flex items-center gap-1 font-extrabold"><Icon className="size-4 text-green-deep" name="location" />{article.commune}</dd></div></dl>
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-surface-strong p-3 text-xs leading-5 text-muted"><Icon className="mt-0.5 size-4 shrink-0 text-green-deep" name="lock" />Solo mostramos un sector aproximado ({article.area}). La dirección nunca es pública.</p>
          <div className="mt-7"><RequestDemo returnTo={`/articulos/${article.slug}`} /></div>
        </section>
      </div>

      <section className="mt-14 rounded-[1.6rem] bg-ink px-5 py-8 text-white sm:px-9 sm:py-10" aria-labelledby="proceso-title"><div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]"><div><p className="text-sm font-extrabold uppercase tracking-[0.14em] text-fresh">Conexión protegida</p><h2 id="proceso-title" className="mt-3 text-3xl font-black tracking-tight">¿Qué ocurre después?</h2><p className="mt-3 text-sm leading-6 text-white/65">Nada se cobra al enviar una solicitud.</p></div><ol className="grid gap-4 sm:grid-cols-3">{[["01","Solicitud","Muestras tu interés."],["02","Aceptación","El publicador elige."],["03","Conexión","Pago confirmado habilita contacto."]].map(([number,title,text]) => <li className="border-l border-white/15 pl-4" key={number}><span className="text-xs font-black text-amber">{number}</span><h3 className="mt-3 font-extrabold">{title}</h3><p className="mt-1 text-sm leading-5 text-white/60">{text}</p></li>)}</ol></div></section>
    </main>
  );
}
