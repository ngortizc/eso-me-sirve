import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { DemoAction } from "@/components/dashboard/demo-action";
import { DemoBadge } from "@/components/ui/demo-badge";
import { Icon } from "@/components/ui/icon";
import { demoArticles } from "@/shared/demo/catalog";
import { requireUser } from "@/modules/identity/application/session";

export const metadata: Metadata = { title: "Mis publicaciones y reservas" };

const rows = [
  { article: demoArticles[0], context: "Mi publicación", status: "Disponible", tone: "bg-fresh/15 text-green-deep", action: "Ver solicitudes" },
  { article: demoArticles[1], context: "Mi reserva", status: "Solicitud enviada", tone: "bg-amber/20 text-[#744a18]", action: "Ver detalle" },
  { article: demoArticles[2], context: "Mi publicación", status: "Reservado", tone: "bg-ink/8 text-ink", action: "Revisar reserva" }
] as const;

export default async function MyThingsPage() {
  await requireUser("/mis-cosas");
  return <main className="page-container py-10 sm:py-14"><DemoBadge /><div className="mt-5 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">Mis cosas</h1><p className="mt-3 max-w-xl text-lg leading-8 text-muted">Una vista ficticia de tus publicaciones y solicitudes.</p></div><Link className="button button-primary" href="/publicar"><Icon className="size-4" name="plus" />Nueva publicación</Link></div><div className="mt-8 flex gap-2 border-b border-ink/10"><button className="border-b-2 border-green-deep px-4 py-3 text-sm font-extrabold text-green-deep" type="button">Todo <span className="ml-1 rounded-full bg-green-deep/10 px-2 py-0.5">3</span></button><button className="px-4 py-3 text-sm font-bold text-muted" type="button">Publicaciones</button><button className="px-4 py-3 text-sm font-bold text-muted" type="button">Reservas</button></div><div className="mt-5 space-y-3">{rows.map(({ article, context, status, tone, action }) => <article className="grid grid-cols-[5.5rem_1fr] gap-4 rounded-card border border-ink/10 bg-white p-3 shadow-card sm:grid-cols-[6.5rem_1fr_auto] sm:items-center sm:p-4" key={`${context}-${article.slug}`}><div className="relative aspect-square overflow-hidden rounded-xl bg-surface-strong"><Image className="object-cover" src={article.image} alt="" fill sizes="104px" /></div><div><p className="text-xs font-bold uppercase tracking-wider text-muted">{context}</p><h2 className="mt-1 font-extrabold sm:text-lg">{article.title}</h2><span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${tone}`}>{status}</span></div><div className="col-start-2 sm:col-start-auto sm:min-w-32"><DemoAction>{action}</DemoAction></div></article>)}</div><section className="mt-8 rounded-card border border-dashed border-ink/20 bg-surface-strong/60 p-6 text-center"><h2 className="font-black">¿Aún no tienes actividad?</h2><p className="mt-2 text-sm text-muted">En la experiencia real, aquí aparecerían estados vacíos con una acción clara para comenzar.</p></section></main>;
}
