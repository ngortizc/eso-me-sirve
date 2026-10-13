import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RequestDemo } from "@/components/catalog/request-demo";
import { ArticleGallery } from "@/components/photos/article-gallery";
import { RequestArticle } from "@/components/reservations/request-article";
import { DemoBadge } from "@/components/ui/demo-badge";
import { Icon } from "@/components/ui/icon";
import { getCurrentUser } from "@/modules/identity/application/session";
import { getListingRepository } from "@/modules/listings/infrastructure/postgres-listing-repository";
import { demoArticles } from "@/shared/demo/catalog";

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return demoArticles.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const demo = demoArticles.find((item) => item.slug === slug);
  if (demo) return { title: demo.title, description: `Artículo gratuito de demostración en ${demo.commune}.` };
  const listing = await getListingRepository().getPublicBySlug(slug);
  return listing ? { title: listing.title, description: `Artículo gratuito publicado en ${listing.communeName}.` } : { title: "Artículo no encontrado" };
}

export default async function ArticleDetailPage({ params }: Props) {
  const { slug } = await params;
  const demo = demoArticles.find((item) => item.slug === slug);
  if (demo) return <DemoDetail slug={slug} />;
  const repository = getListingRepository();
  const [listing, viewer] = await Promise.all([repository.getPublicBySlug(slug), getCurrentUser()]);
  if (!listing) notFound();
  const ownerListingId = viewer ? await repository.getOwnedPublishedListingIdBySlug(viewer.id, slug) : null;
  return <DetailLayout title={listing.title} description={listing.description} category={listing.categoryName} condition={listing.conditionLabel} commune={listing.communeName} region={listing.regionName} slug={listing.slug} ownerListingId={ownerListingId} photos={listing.photos.map((photo, index) => ({ src: photo.detailUrl, alt: `Fotografía ${index + 1} de ${listing.title}` }))} />;
}

function DetailLayout(props: Readonly<{ title: string; description: string; category: string; condition: string; commune: string; region: string; slug: string; ownerListingId?: string | null; photos: readonly { src: string; alt: string }[]; demo?: boolean }>) {
  const action = props.demo
    ? <RequestDemo returnTo={`/articulos/${props.slug}`} />
    : props.ownerListingId
      ? <section className="rounded-card border border-green-deep/20 bg-mint p-5" aria-label="Publicación propia"><p className="text-sm font-bold text-green-deep">Esta publicación es tuya. No puedes solicitar tu propio artículo.</p><Link className="button button-primary mt-4 w-full" href={`/mis-publicaciones/${props.ownerListingId}/editar`}>Administrar mi publicación</Link></section>
      : <RequestArticle listingSlug={props.slug} returnTo={`/articulos/${props.slug}`} />;
  return <main className="page-container py-7 sm:py-12"><Link className="inline-flex items-center gap-1 text-sm font-extrabold text-green-deep hover:underline" href="/explorar">← Volver a explorar</Link><div className="mt-5 grid gap-8 lg:grid-cols-[1.12fr_0.88fr] lg:gap-12"><ArticleGallery photos={props.photos} title={props.title} /><section>{props.demo && <DemoBadge />}<div className={`${props.demo ? "mt-5" : ""} flex flex-wrap gap-2`}><span className="rounded-full bg-green-deep/10 px-3 py-1 text-xs font-extrabold text-green-deep">{props.category}</span><span className="rounded-full bg-surface-strong px-3 py-1 text-xs font-bold text-ink">Disponible{props.demo ? " · demo" : ""}</span></div><h1 className="mt-4 text-4xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">{props.title}</h1><p className="mt-4 text-lg leading-8 text-muted">{props.description}</p><dl className="mt-7 grid grid-cols-2 gap-3"><div className="rounded-xl border border-ink/10 bg-white p-4"><dt className="text-xs font-bold uppercase tracking-wider text-muted">Condición</dt><dd className="mt-1 font-extrabold">{props.condition}</dd></div><div className="rounded-xl border border-ink/10 bg-white p-4"><dt className="text-xs font-bold uppercase tracking-wider text-muted">Ubicación pública</dt><dd className="mt-1 flex items-center gap-1 font-extrabold"><Icon className="size-4 text-green-deep" name="location" />{props.commune}</dd></div></dl><p className="mt-3 flex items-start gap-2 rounded-xl bg-surface-strong p-3 text-xs leading-5 text-muted"><Icon className="mt-0.5 size-4 shrink-0 text-green-deep" name="lock" />Solo mostramos {props.commune}, {props.region}. La dirección y los datos de contacto nunca son públicos.</p><div className="mt-7">{action}</div></section></div><section className="mt-14 rounded-[1.6rem] bg-ink px-5 py-8 text-white sm:px-9 sm:py-10"><h2 className="text-3xl font-black">Reserva segura por 24 horas</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">El publicador elige una solicitud. Al aceptarla, el receptor dispone de 24 horas exactas para pagar el servicio de conexión. El artículo es gratis; la tarifa corresponde únicamente al servicio. El pago y el contacto siguen deshabilitados en esta versión.</p></section></main>;
}

function DemoDetail({ slug }: Readonly<{ slug: string }>) {
  const article = demoArticles.find((item) => item.slug === slug);
  if (!article) notFound();
  return <DetailLayout title={article.title} description={article.description} category={article.category} condition={article.condition} commune={article.commune} region="contenido de demostración" slug={slug} photos={article.photos} demo />;
}
