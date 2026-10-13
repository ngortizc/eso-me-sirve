"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type KeyboardEvent, type ReactNode } from "react";
import { ListingStatusActions } from "@/components/listings/listing-management";
import type { OwnerListing } from "@/modules/listings/application/listing-repository";
import { listingStatusLabels } from "@/modules/listings/domain/listing";
import type { ReceivedRequestView, ReservationOverview, ReservationView, SentRequestView } from "@/modules/reservations/application/reservation-repository";
import { reservationEventDescription } from "@/modules/reservations/application/reservation-history";
import { requestStatusLabels, reservationStatusLabels } from "@/modules/reservations/domain/reservation";
import { formatClp } from "@/shared/format/clp";
import { PaymentCountdown } from "./countdown";

const chileDate = new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santiago" });
const chileLongDate = new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeStyle: "short", timeZone: "America/Santiago" });
const tabs = ["publicaciones", "enviadas", "recibidas"] as const;
export type ActivityTab = (typeof tabs)[number];

function Status({ children }: Readonly<{ children: string }>) {
  return <span className="w-fit rounded-full bg-surface-strong px-2.5 py-1 text-xs font-extrabold">{children}</span>;
}

function ArticleThumb({ src, title }: Readonly<{ src: string | null; title: string }>) {
  const [available, setAvailable] = useState(Boolean(src));
  return <div className="relative aspect-square min-h-24 overflow-hidden rounded-xl bg-surface-strong">
    {src && available ? <Image src={src} alt="" fill unoptimized sizes="(max-width: 640px) 96px, 128px" className="object-cover" onError={() => setAvailable(false)} /> : <span className="grid h-full place-items-center px-2 text-center text-xs font-bold text-muted">Sin fotografía disponible de {title}</span>}
  </div>;
}

function ActionButton({ label, busy, onClick }: Readonly<{ label: string; busy: boolean; onClick: () => void }>) {
  return <button className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-xs font-extrabold disabled:opacity-50" type="button" disabled={busy} onClick={onClick}>{label}</button>;
}

function RequestCard({ request, received, busy, act, highlighted = false }: Readonly<{ request: SentRequestView | ReceivedRequestView; received: boolean; busy: boolean; act: (id: string, action: "cancel" | "reject" | "accept") => void; highlighted?: boolean }>) {
  const actionable = request.selectionAvailability === "ACTIONABLE";
  return <article className={`grid grid-cols-[5rem_1fr] gap-4 rounded-card border bg-white p-4 sm:grid-cols-[6rem_1fr] ${highlighted ? "border-amber/60 shadow-card" : "border-ink/10"}`} data-testid={highlighted ? "pending-request-action" : received ? "received-request" : "sent-request"}>
    <ArticleThumb src={request.primaryPhotoUrl} title={request.listingTitle} />
    <div><div className="flex flex-wrap items-center justify-between gap-2"><Status>{requestStatusLabels[request.status]}</Status><time className="text-xs text-muted">{chileDate.format(new Date(request.createdAt))}</time></div>
      <h3 className="mt-3 text-lg font-black">{request.listingTitle}</h3>
      {received && <p className="mt-1 text-sm text-muted">{(request as ReceivedRequestView).interestedLabel}</p>}
      {request.selectionAvailability === "WAITING_RESERVATION" && <p className="mt-2 rounded-xl bg-amber/10 p-3 text-sm leading-6 text-ink"><strong>En espera.</strong> Hay una reserva activa. Si vence o se cancela, esta solicitud volverá a ser elegible; no se selecciona automáticamente.</p>}
      {request.selectionAvailability === "LISTING_UNAVAILABLE" && <p className="mt-2 rounded-xl bg-surface-strong p-3 text-sm leading-6 text-muted">La publicación no está disponible. La solicitud conserva su historial, pero no puede aceptarse en este estado.</p>}
      {!received && actionable && <p className="mt-2 text-sm leading-6 text-muted">El publicador debe aceptarla antes de que corresponda pagar.</p>}
      {request.rejectionReason && <p className="mt-2 text-sm text-muted">Motivo: {request.rejectionReason}</p>}
      {request.cancellationReason && <p className="mt-2 text-sm text-muted">Motivo: {request.cancellationReason}</p>}
      {request.status === "PENDING" && <div className="mt-4 flex flex-wrap gap-2">{received ? <>{actionable && <ActionButton label="Aceptar" busy={busy} onClick={() => act(request.id, "accept")} />}<ActionButton label="Rechazar" busy={busy} onClick={() => act(request.id, "reject")} /></> : <ActionButton label="Cancelar solicitud" busy={busy} onClick={() => act(request.id, "cancel")} />}</div>}
    </div>
  </article>;
}

export function ReservationCard({ reservation, serverNow, highlighted = false }: Readonly<{ reservation: ReservationView; serverNow: string; highlighted?: boolean }>) {
  const isRecipient = reservation.perspective === "RECIPIENT";
  const active = reservation.status === "PENDING_PAYMENT";
  const experienceLabel = active
    ? isRecipient ? "Tu solicitud fue aceptada" : "Esperando pago del receptor"
    : reservationStatusLabels[reservation.status];
  return <article className={`grid grid-cols-[5rem_1fr] gap-4 rounded-card border bg-white p-4 sm:grid-cols-[6rem_1fr] ${highlighted ? "border-amber/60 shadow-card" : "border-ink/10"}`} data-testid={highlighted ? "pending-reservation-action" : "reservation-card"}>
    <ArticleThumb src={reservation.primaryPhotoUrl} title={reservation.listingTitle} />
    <div><div className="flex flex-wrap items-center justify-between gap-2"><Status>{experienceLabel}</Status><span className="text-xs font-bold text-muted">{isRecipient ? "Como receptor" : "Como publicador"}</span></div>
      <h3 className="mt-3 text-lg font-black">{reservation.listingTitle}</h3>
      {isRecipient ? <><div className="mt-3 grid gap-2 rounded-xl bg-surface-strong p-3 text-sm"><p className="flex justify-between gap-4"><span>Artículo</span><strong className="text-green-deep">Gratis</strong></p><p className="flex justify-between gap-4"><span>Servicio de conexión</span><strong>{formatClp(reservation.serviceFeeClp)}</strong></p></div>{active && <><p className="mt-3 text-sm">Tiempo restante: <PaymentCountdown expiresAt={reservation.paymentExpiresAt} serverNow={serverNow} active /></p><p className="mt-2 text-sm font-bold" data-testid="reservation-deadline">Vence exactamente el {chileLongDate.format(new Date(reservation.paymentExpiresAt))} (hora de Chile).</p><p className="mt-2 text-xs leading-5 text-muted">Si vence el plazo, la reserva expirará y el artículo volverá a estar disponible. La reserva vencida no se reactiva automáticamente.</p><p className="mt-2 text-xs font-bold text-danger">El pago todavía no está habilitado en esta versión.</p></>}{!active && <p className="mt-2 text-xs text-muted">Vencimiento registrado: {chileLongDate.format(new Date(reservation.paymentExpiresAt))}.</p>}</> : <><p className="mt-3 text-sm"><strong>Receptor seleccionado:</strong> {reservation.recipientPublicLabel}</p><p className="mt-2 rounded-xl bg-mint p-3 text-sm font-extrabold text-green-deep">Publicar y regalar siempre es gratis.</p>{active && <><p className="mt-3 text-sm font-bold" data-testid="reservation-deadline">El receptor tiene plazo hasta el {chileLongDate.format(new Date(reservation.paymentExpiresAt))} (hora de Chile).</p><p className="mt-2 text-xs leading-5 text-muted">Si vence sin pagar, el artículo volverá a estar disponible y podrás seleccionar a otro interesado elegible.</p></>}{!active && <p className="mt-2 text-xs text-muted">Vencimiento registrado: {chileLongDate.format(new Date(reservation.paymentExpiresAt))}.</p>}</>}
      <Link className="mt-4 inline-flex text-sm font-extrabold text-green-deep hover:underline" href={`/reservas/${reservation.id}`}>Ver reserva</Link>
    </div>
  </article>;
}

function ListingCard({ listing }: Readonly<{ listing: OwnerListing }>) {
  const photo = listing.photos.find((item) => item.isPrimary) ?? listing.photos[0];
  return <article className="grid grid-cols-[5rem_1fr] gap-4 rounded-card border border-ink/10 bg-white p-4 sm:grid-cols-[6rem_1fr_auto] sm:items-center" data-testid="owner-listing"><ArticleThumb src={photo?.catalogUrl ?? null} title={listing.title} /><div><Status>{listingStatusLabels[listing.status]}</Status><h3 className="mt-3 text-lg font-black">{listing.title}</h3><p className="mt-1 text-xs text-muted">Actualizada {chileDate.format(new Date(listing.updatedAt))}</p><div className="mt-3 flex flex-wrap gap-3"><Link className="text-sm font-extrabold text-green-deep hover:underline" href={`/mis-publicaciones/${listing.id}/editar`}>{listing.status === "REMOVED" ? "Ver detalle" : "Editar"}</Link>{listing.status === "PUBLISHED" && <Link className="text-sm font-extrabold text-green-deep hover:underline" href={`/articulos/${listing.slug}`}>Ver pública</Link>}</div></div><div className="col-span-2 sm:col-span-1"><ListingStatusActions listing={listing} /></div></article>;
}

function EmptyState({ title, detail, action }: Readonly<{ title: string; detail: string; action?: ReactNode }>) {
  return <div className="rounded-card border border-dashed border-ink/20 bg-surface-strong/60 p-8 text-center"><h3 className="text-xl font-black">{title}</h3><p className="mt-2 text-sm text-muted">{detail}</p>{action}</div>;
}

export function ActivityDashboard({ listings, overview, initialTab }: Readonly<{ listings: OwnerListing[]; overview: ReservationOverview; initialTab: ActivityTab }>) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActivityTab>(initialTab);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const pendingReceived = overview.received.filter((item) => item.status === "PENDING");
  const actionableReceived = pendingReceived.filter((item) => item.selectionAvailability === "ACTIONABLE");
  const waitingReceived = pendingReceived.filter((item) => item.selectionAvailability !== "ACTIONABLE");
  const pendingPayments = overview.recipientReservations.filter((item) => item.status === "PENDING_PAYMENT");
  const receivedHistory = overview.received.filter((item) => item.status !== "PENDING");
  const reservationHistory = overview.recipientReservations.filter((item) => item.status !== "PENDING_PAYMENT");

  function selectTab(tab: ActivityTab, focus = false) {
    setActiveTab(tab);
    router.replace(`/mis-cosas?tab=${tab}`, { scroll: false });
    if (focus) window.requestAnimationFrame(() => document.getElementById(`activity-tab-${tab}`)?.focus());
  }

  function moveTab(event: KeyboardEvent<HTMLButtonElement>, current: ActivityTab) {
    const index = tabs.indexOf(current);
    const destination = event.key === "ArrowRight" ? tabs[(index + 1) % tabs.length] : event.key === "ArrowLeft" ? tabs[(index - 1 + tabs.length) % tabs.length] : event.key === "Home" ? tabs[0] : event.key === "End" ? tabs.at(-1) : undefined;
    if (destination) { event.preventDefault(); selectTab(destination, true); }
  }

  async function act(id: string, action: "cancel" | "reject" | "accept") {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/requests/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const body = await response.json() as { error?: string };
      setMessage(response.ok ? action === "accept" ? "Solicitud aceptada y reserva creada." : "Solicitud actualizada." : body.error ?? "No fue posible actualizar.");
      if (response.ok) router.refresh();
    } catch { setMessage("No fue posible comunicarse con el servidor."); }
    finally { setBusy(false); }
  }

  const tabLabels: Record<ActivityTab, { label: string; count: number }> = {
    publicaciones: { label: "Publicaciones", count: listings.length },
    enviadas: { label: "Solicitudes enviadas", count: overview.sent.length },
    recibidas: { label: "Solicitudes recibidas", count: overview.received.length }
  };

  return <div className="mt-7 space-y-7">
    <section className="grid gap-3 sm:grid-cols-3" aria-label="Resumen de actividad">{tabs.map((tab) => <button className={`rounded-card border p-4 text-left transition ${activeTab === tab ? "border-green-deep bg-mint shadow-card" : "border-ink/10 bg-white hover:border-green-deep/40"}`} type="button" onClick={() => selectTab(tab)} key={tab}><span className="block text-3xl font-black text-green-deep">{tabLabels[tab].count}</span><span className="mt-1 block text-sm font-extrabold">{tabLabels[tab].label}</span></button>)}</section>

    {(actionableReceived.length > 0 || pendingPayments.length > 0) && <section className="rounded-[1.6rem] border border-amber/50 bg-amber/10 p-5 sm:p-7" aria-labelledby="pending-you-heading"><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#744a18]">Acciones actuales</p><h2 className="mt-1 text-2xl font-black" id="pending-you-heading">Pendiente de ti</h2><p className="mt-2 text-sm text-muted">Estas acciones provienen del estado vigente registrado en PostgreSQL.</p><div className="mt-5 grid gap-4 lg:grid-cols-2">{actionableReceived.map((item) => <RequestCard request={item} received busy={busy} act={act} highlighted key={`pending-${item.id}`} />)}{pendingPayments.map((item) => <ReservationCard reservation={item} serverNow={overview.serverNow} highlighted key={`pending-${item.id}`} />)}</div></section>}

    {message && <p className="rounded-xl bg-surface-strong p-3 text-sm font-bold" role="status">{message}</p>}

    <section><div className="flex gap-2 overflow-x-auto border-b border-ink/10 pb-2" role="tablist" aria-label="Secciones de Mis cosas">{tabs.map((tab) => <button id={`activity-tab-${tab}`} className={`shrink-0 rounded-full px-4 py-2 text-sm font-extrabold ${activeTab === tab ? "bg-green-deep text-white" : "bg-surface-strong text-ink"}`} type="button" role="tab" aria-selected={activeTab === tab} aria-controls={`activity-panel-${tab}`} tabIndex={activeTab === tab ? 0 : -1} onClick={() => selectTab(tab)} onKeyDown={(event) => moveTab(event, tab)} key={tab}>{tabLabels[tab].label}<span className="ml-2 rounded-full bg-white/20 px-2 py-0.5">{tabLabels[tab].count}</span></button>)}</div>
      {activeTab === "publicaciones" && <div className="mt-5" id="activity-panel-publicaciones" role="tabpanel" aria-labelledby="activity-tab-publicaciones"><div className="space-y-4">{listings.length ? listings.map((listing) => <ListingCard listing={listing} key={listing.id} />) : <EmptyState title="Aún no tienes publicaciones" detail="Publica un artículo gratuito o guarda un borrador para comenzar." action={<Link className="button button-primary mt-5" href="/publicar">Publicar artículo</Link>} />}</div></div>}
      {activeTab === "enviadas" && <div className="mt-5 space-y-8" id="activity-panel-enviadas" role="tabpanel" aria-labelledby="activity-tab-enviadas"><section aria-labelledby="sent-heading"><h2 className="text-2xl font-black" id="sent-heading">Solicitudes enviadas</h2><p className="mt-1 text-sm text-muted">Puedes cancelar una solicitud mientras siga pendiente.</p><div className="mt-4 grid gap-4 lg:grid-cols-2">{overview.sent.length ? overview.sent.map((item) => <RequestCard request={item} received={false} busy={busy} act={act} key={item.id} />) : <EmptyState title="Todavía no has solicitado artículos" detail="Explora el catálogo y solicita el artículo gratuito que te sirva." action={<Link className="button button-secondary mt-5" href="/explorar">Explorar artículos</Link>} />}</div></section><section aria-labelledby="recipient-reservations-heading"><h2 className="text-2xl font-black" id="recipient-reservations-heading">Historial de reservas como receptor</h2><div className="mt-4 grid gap-4 lg:grid-cols-2">{reservationHistory.length ? reservationHistory.map((item) => <ReservationCard reservation={item} serverNow={overview.serverNow} key={item.id} />) : <EmptyState title={pendingPayments.length ? "Tu reserva activa está en Pendiente de ti" : "No tienes historial de reservas"} detail={pendingPayments.length ? "Revisa arriba el vencimiento y la información de pago." : "Una reserva aparecerá cuando un publicador acepte tu solicitud."} />}</div></section></div>}
      {activeTab === "recibidas" && <div className="mt-5 space-y-8" id="activity-panel-recibidas" role="tabpanel" aria-labelledby="activity-tab-recibidas"><section aria-labelledby="received-heading"><h2 className="text-2xl font-black" id="received-heading">Solicitudes recibidas en espera e historial</h2><p className="mt-1 text-sm text-muted">Las solicitudes elegibles que requieren acción aparecen arriba. Las demás conservan aquí su estado real y pueden rechazarse explícitamente.</p><div className="mt-4 grid gap-4 lg:grid-cols-2">{waitingReceived.length || receivedHistory.length ? [...waitingReceived, ...receivedHistory].map((item) => <RequestCard request={item} received busy={busy} act={act} key={item.id} />) : <EmptyState title={actionableReceived.length ? "Las solicitudes elegibles están arriba" : "No tienes solicitudes recibidas"} detail={actionableReceived.length ? "Usa Pendiente de ti para aceptar o rechazar." : "Las solicitudes aparecerán cuando alguien se interese por una publicación disponible."} />}</div></section><section aria-labelledby="publisher-reservations-heading"><h2 className="text-2xl font-black" id="publisher-reservations-heading">Reservas de mis publicaciones</h2><div className="mt-4 grid gap-4 lg:grid-cols-2">{overview.publisherReservations.length ? overview.publisherReservations.map((item) => <ReservationCard reservation={item} serverNow={overview.serverNow} key={item.id} />) : <EmptyState title="No hay reservas de tus publicaciones" detail="Aceptar una solicitud crea una reserva pendiente de pago por 24 horas." />}</div></section></div>}
    </section>

    <details className="rounded-card border border-ink/10 bg-white p-5"><summary className="cursor-pointer text-lg font-black">Historial de cambios ({overview.events.length})</summary>{overview.events.length ? <ul className="mt-4 divide-y divide-ink/10">{overview.events.map((event) => <li className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between" key={event.id}><strong>{reservationEventDescription(event)}</strong><time className="text-xs text-muted">{chileDate.format(new Date(event.occurredAt))}</time></li>)}</ul> : <p className="mt-3 text-sm text-muted">Sin eventos todavía.</p>}</details>
  </div>;
}
