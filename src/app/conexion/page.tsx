import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { DemoBadge } from "@/components/ui/demo-badge";
import { Icon } from "@/components/ui/icon";
import { CONNECTION_SERVICE_FEE_CLP } from "@/modules/reservations/domain/reservation";
import { formatClp } from "@/shared/format/clp";
import { demoArticles } from "@/shared/demo/catalog";

export const metadata: Metadata = { title: "Pago y contacto — demostración", description: "Ejemplo visual del servicio de conexión, sin pagos reales." };

const article = demoArticles[0];

export default function ConnectionPage() {
  return (
    <main className="page-container py-10 sm:py-14">
      <DemoBadge />
      <h1 className="mt-5 text-4xl font-black tracking-[-0.04em] sm:text-5xl">Pago y contacto</h1>
      <p className="mt-3 max-w-2xl text-lg leading-8 text-muted">Ejemplo visual del paso posterior a una reserva aceptada. No procesa pagos ni habilita datos reales.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_23rem] lg:items-start">
        <div className="space-y-5">
          <section className="rounded-card border border-ink/10 bg-white p-5 shadow-card sm:p-7" aria-labelledby="resumen-title"><div className="flex items-center justify-between gap-4"><h2 id="resumen-title" className="text-xl font-black">Resumen</h2><span className="rounded-full bg-amber/20 px-3 py-1 text-xs font-extrabold text-[#744a18]">Reserva aceptada · demo</span></div><div className="mt-5 flex gap-4"><div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-surface-strong"><Image className="object-cover" src={article.image} alt="" fill sizes="96px" /></div><div><p className="text-xs font-bold uppercase tracking-wider text-muted">Artículo</p><h3 className="mt-1 text-lg font-extrabold">{article.title}</h3><p className="mt-2 flex items-center gap-1 text-sm text-muted"><Icon className="size-4" name="location" />{article.commune}</p></div></div><dl className="mt-6 divide-y divide-ink/10 border-y border-ink/10"><div className="flex items-center justify-between py-4"><dt><span className="block font-bold">Artículo</span><span className="text-xs text-muted">Los artículos no se venden</span></dt><dd className="font-black text-green-deep">Gratis</dd></div><div className="flex items-center justify-between py-4"><dt><span className="block font-bold">Servicio de conexión</span><span className="text-xs text-muted">Tarifa referencial del piloto</span></dt><dd className="font-black">{formatClp(CONNECTION_SERVICE_FEE_CLP)}</dd></div><div className="flex items-center justify-between py-4 text-lg"><dt className="font-black">Total del servicio</dt><dd className="font-black">{formatClp(CONNECTION_SERVICE_FEE_CLP)}</dd></div></dl></section>

          <section className="rounded-card border border-ink/10 bg-white p-5 shadow-card sm:p-7" aria-labelledby="contacto-title"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-extrabold text-green-deep">Protección de datos</p><h2 id="contacto-title" className="mt-1 text-xl font-black">Contacto bloqueado</h2></div><span className="grid size-10 place-items-center rounded-full bg-green-deep/10 text-green-deep"><Icon className="size-5" name="lock" /></span></div><p className="mt-3 text-sm leading-6 text-muted">El teléfono y la ubicación de entrega solo se mostrarían después de que el proveedor confirmara el pago en el servidor.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-surface-strong p-4"><p className="text-xs font-bold uppercase tracking-wider text-muted">Teléfono</p><p className="mt-2 font-mono font-bold tracking-[0.2em]" aria-label="Teléfono protegido">•••• ••• •••</p></div><div className="rounded-xl bg-surface-strong p-4"><p className="text-xs font-bold uppercase tracking-wider text-muted">Punto de entrega</p><p className="mt-2 font-bold">Ubicación protegida</p></div></div></section>
        </div>

        <aside className="rounded-card bg-ink p-5 text-white shadow-card sm:p-6 lg:sticky lg:top-24"><p className="text-xs font-extrabold uppercase tracking-[0.15em] text-amber">Solo demostración</p><h2 className="mt-3 text-2xl font-black">Estado del proceso</h2><ol className="mt-6 space-y-5">{[[true,"Solicitud aceptada","El publicador seleccionó la solicitud."],[false,"Pago pendiente","No existe un proveedor configurado."],[false,"Contacto disponible","Solo tras pago confirmado."]].map(([complete,title,text], index) => <li className="flex gap-3" key={String(title)}><span className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-black ${complete ? "bg-fresh text-ink" : "border border-white/20 text-white/50"}`}>{complete ? <Icon className="size-4" name="check" /> : index + 1}</span><div><h3 className={`font-extrabold ${complete ? "text-white" : "text-white/65"}`}>{title}</h3><p className="mt-1 text-xs leading-5 text-white/50">{text}</p></div></li>)}</ol><div className="mt-7 rounded-xl border border-amber/30 bg-amber/10 p-4 text-sm leading-6 text-white/75">Esta pantalla no representa una transacción. El botón permanece deshabilitado deliberadamente.</div><button className="button mt-5 w-full bg-white text-ink" type="button" disabled>Pago no habilitado</button><Link className="mt-4 flex justify-center text-sm font-bold text-fresh hover:underline" href="/mis-cosas">Volver a Mis cosas</Link></aside>
      </div>
    </main>
  );
}
