"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ReceivedRequestView, ReservationOverview, ReservationView, SentRequestView } from "@/modules/reservations/application/reservation-repository";
import { reservationEventDescription } from "@/modules/reservations/application/reservation-history";
import { requestStatusLabels, reservationStatusLabels } from "@/modules/reservations/domain/reservation";
import { formatClp } from "@/shared/format/clp";
import { PaymentCountdown } from "./countdown";

const chileDate = new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santiago" });

function Status({ children }: Readonly<{ children: string }>) {
  return <span className="rounded-full bg-surface-strong px-2.5 py-1 text-xs font-extrabold">{children}</span>;
}

function ActionButton({ label, busy, onClick }: Readonly<{ label: string; busy: boolean; onClick: () => void }>) {
  return <button className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-xs font-extrabold disabled:opacity-50" type="button" disabled={busy} onClick={onClick}>{label}</button>;
}

function RequestCard({ request, received, busy, act }: Readonly<{ request: SentRequestView | ReceivedRequestView; received: boolean; busy: boolean; act: (id: string, action: "cancel" | "reject" | "accept") => void }>) {
  return <article className="rounded-card border border-ink/10 bg-white p-4" data-testid={received ? "received-request" : "sent-request"}>
    <div className="flex flex-wrap items-center justify-between gap-2"><Status>{requestStatusLabels[request.status]}</Status><time className="text-xs text-muted">{chileDate.format(new Date(request.createdAt))}</time></div>
    <h3 className="mt-3 text-lg font-black">{request.listingTitle}</h3>
    {received && <p className="mt-1 text-sm text-muted">{(request as ReceivedRequestView).interestedLabel}</p>}
    {request.rejectionReason && <p className="mt-2 text-sm text-muted">Motivo: {request.rejectionReason}</p>}
    {request.cancellationReason && <p className="mt-2 text-sm text-muted">Motivo: {request.cancellationReason}</p>}
    {request.status === "PENDING" && <div className="mt-4 flex flex-wrap gap-2">{received ? <><ActionButton label="Aceptar" busy={busy} onClick={() => act(request.id, "accept")} /><ActionButton label="Rechazar" busy={busy} onClick={() => act(request.id, "reject")} /></> : <ActionButton label="Cancelar solicitud" busy={busy} onClick={() => act(request.id, "cancel")} />}</div>}
  </article>;
}

export function ReservationCard({ reservation, serverNow }: Readonly<{ reservation: ReservationView; serverNow: string }>) {
  const isRecipient = reservation.perspective === "RECIPIENT";
  return <article className="rounded-card border border-ink/10 bg-white p-4" data-testid="reservation-card">
    <div className="flex flex-wrap items-center justify-between gap-2"><Status>{reservation.status === "PENDING_PAYMENT" ? isRecipient ? "Tu solicitud fue aceptada" : "Esperando pago del receptor" : reservationStatusLabels[reservation.status]}</Status><span className="text-xs font-bold text-muted">{isRecipient ? "Como receptor" : "Como publicador"}</span></div>
    <h3 className="mt-3 text-lg font-black">{reservation.listingTitle}</h3>
    {isRecipient ? <div className="mt-3 grid gap-2 rounded-xl bg-surface-strong p-3 text-sm">
      <p className="flex justify-between gap-4"><span>Artículo</span><strong className="text-green-deep">Gratis</strong></p>
      <p className="flex justify-between gap-4"><span>Servicio de conexión</span><strong>{formatClp(reservation.serviceFeeClp)}</strong></p>
    </div> : <><p className="mt-3 text-sm"><strong>Receptor seleccionado:</strong> {reservation.recipientPublicLabel}</p><p className="mt-3 rounded-xl bg-mint p-3 text-sm font-extrabold text-green-deep">Publicar y regalar siempre es gratis.</p></>}
    {reservation.status === "PENDING_PAYMENT" && isRecipient && <p className="mt-3 text-sm">Tiempo restante: <PaymentCountdown expiresAt={reservation.paymentExpiresAt} serverNow={serverNow} active /></p>}
    <p className="mt-2 text-xs text-muted">Vence: {chileDate.format(new Date(reservation.paymentExpiresAt))} (hora de Chile)</p>
    <Link className="mt-4 inline-flex text-sm font-extrabold text-green-deep hover:underline" href={`/reservas/${reservation.id}`}>Ver reserva</Link>
  </article>;
}

export function ReservationDashboard({ overview }: Readonly<{ overview: ReservationOverview }>) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function act(id: string, action: "cancel" | "reject" | "accept") {
    setBusy(true); setMessage("");
    const response = await fetch(`/api/requests/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const body = await response.json() as { error?: string };
    setMessage(response.ok ? action === "accept" ? "Solicitud aceptada y reserva creada." : "Solicitud actualizada." : body.error ?? "No fue posible actualizar.");
    if (response.ok) router.refresh();
    setBusy(false);
  }

  return <div className="mt-14 space-y-12">
    {message && <p className="rounded-xl bg-surface-strong p-3 text-sm font-bold" role="status">{message}</p>}
    <section id="solicitudes-enviadas"><h2 className="text-3xl font-black tracking-tight">Solicitudes enviadas</h2><p className="mt-2 text-muted">Puedes cancelar una solicitud mientras siga pendiente.</p><div className="mt-5 grid gap-4 md:grid-cols-2">{overview.sent.length ? overview.sent.map((item) => <RequestCard request={item} received={false} busy={busy} act={act} key={item.id} />) : <p className="rounded-card border border-dashed border-ink/20 p-6 text-muted">Aún no has solicitado artículos.</p>}</div></section>
    <section id="solicitudes-recibidas"><h2 className="text-3xl font-black tracking-tight">Solicitudes recibidas</h2><p className="mt-2 text-muted">Se muestra solo la información mínima necesaria de cada interesado.</p><div className="mt-5 grid gap-4 md:grid-cols-2">{overview.received.length ? overview.received.map((item) => <RequestCard request={item} received busy={busy} act={act} key={item.id} />) : <p className="rounded-card border border-dashed border-ink/20 p-6 text-muted">Tus publicaciones aún no tienen solicitudes.</p>}</div></section>
    <section id="reservas"><h2 className="text-3xl font-black tracking-tight">Reservas</h2><p className="mt-2 text-muted">Activas y vencidas. La cuenta regresiva es informativa; el servidor decide la validez.</p><div className="mt-5 grid gap-4 md:grid-cols-2">{[...overview.recipientReservations, ...overview.publisherReservations].length ? [...overview.recipientReservations, ...overview.publisherReservations].map((item) => <ReservationCard reservation={item} serverNow={overview.serverNow} key={`${item.perspective}-${item.id}`} />) : <p className="rounded-card border border-dashed border-ink/20 p-6 text-muted">Aún no tienes reservas.</p>}</div></section>
    <section id="historial"><h2 className="text-2xl font-black">Historial de cambios</h2><div className="mt-4 overflow-hidden rounded-card border border-ink/10 bg-white">{overview.events.length ? <ul className="divide-y divide-ink/10">{overview.events.map((event) => <li className="flex flex-col gap-1 p-4 text-sm sm:flex-row sm:items-center sm:justify-between" key={event.id}><strong>{reservationEventDescription(event)}</strong><time className="text-xs text-muted">{chileDate.format(new Date(event.occurredAt))}</time></li>)}</ul> : <p className="p-5 text-muted">Sin eventos todavía.</p>}</div></section>
  </div>;
}
