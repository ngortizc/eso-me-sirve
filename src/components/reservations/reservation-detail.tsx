"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ReservationView } from "@/modules/reservations/application/reservation-repository";
import { reservationStatusLabels } from "@/modules/reservations/domain/reservation";
import { formatClp } from "@/shared/format/clp";
import { PaymentCountdown } from "./countdown";

const chileDate = new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeStyle: "short", timeZone: "America/Santiago" });

export function ReservationDetail({ reservation, serverNow }: Readonly<{ reservation: ReservationView; serverNow: string }>) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const isRecipient = reservation.perspective === "RECIPIENT";
  const active = reservation.status === "PENDING_PAYMENT";
  async function cancel() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/reservations/${reservation.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel" }) });
      const body = await response.json() as { error?: string };
      setMessage(response.ok ? "Reserva cancelada y artículo liberado." : body.error ?? "No fue posible cancelar.");
      if (response.ok) router.refresh();
    } catch { setMessage("No fue posible comunicarse con el servidor."); }
    finally { setBusy(false); }
  }
  return <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
    <section className="rounded-card border border-ink/10 bg-white p-5 shadow-card sm:p-7">
      <span className="rounded-full bg-surface-strong px-3 py-1 text-xs font-extrabold">{active ? isRecipient ? "Tu solicitud fue aceptada" : "Esperando pago del receptor" : reservationStatusLabels[reservation.status]}</span>
      <h1 className="mt-4 text-4xl font-black tracking-tight">{isRecipient && active ? "Tu solicitud fue aceptada" : reservation.listingTitle}</h1>
      {isRecipient && active && <h2 className="mt-2 text-xl font-black text-green-deep">{reservation.listingTitle}</h2>}
      {!isRecipient && <p className="mt-3 text-base"><strong>Receptor seleccionado:</strong> {reservation.recipientPublicLabel}</p>}
      <p className="mt-2 text-muted">Aceptada el {chileDate.format(new Date(reservation.acceptedAt))}</p>
      {isRecipient && active && <div className="mt-6 rounded-card bg-green-deep p-5 text-white"><p className="text-sm font-bold text-white/75">Tiempo restante para pagar el servicio</p><p className="mt-2 text-4xl"><PaymentCountdown expiresAt={reservation.paymentExpiresAt} serverNow={serverNow} active /></p></div>}
      <p className="mt-5 text-sm font-bold" data-testid="reservation-deadline">{isRecipient ? "Tu plazo vence" : "El receptor tiene plazo"} exactamente el {chileDate.format(new Date(reservation.paymentExpiresAt))} (hora de Chile).</p>
      <p className="mt-2 text-sm leading-6 text-muted">PostgreSQL valida el vencimiento; cambiar el reloj del dispositivo no extiende la reserva. {isRecipient ? "Si vence el plazo, la reserva expirará y no podrá reactivarse automáticamente." : "Si vence sin pagar, el artículo volverá a estar disponible y podrás seleccionar a otro interesado elegible."}</p>
      {active && <button className="button button-secondary mt-6" type="button" disabled={busy} onClick={cancel}>{busy ? "Cancelando…" : isRecipient ? "Cancelar mi reserva" : "Cancelar reserva y liberar artículo"}</button>}
      {message && <p className="mt-3 text-sm" role="status">{message}</p>}
    </section>
    {isRecipient ? <aside className="rounded-card border border-ink/10 bg-white p-5"><h2 className="text-xl font-black">Lo que corresponde pagar</h2><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-4"><dt>Artículo</dt><dd className="font-black text-green-deep">Gratis</dd></div><div className="flex justify-between gap-4"><dt>Servicio de conexión</dt><dd className="font-black">{formatClp(reservation.serviceFeeClp)}</dd></div></dl>{active && <button className="button button-primary mt-6 w-full" type="button" disabled>Pagar (todavía no habilitado)</button>}<p className="mt-3 text-xs font-bold text-danger">El pago todavía no está habilitado en esta versión.</p><p className="mt-2 text-xs leading-5 text-muted">En EMS-005, solo un pago confirmado por el servidor podrá habilitar los datos de contacto. Por ahora no se muestran teléfono, correo privado ni dirección.</p></aside> : <aside className="rounded-card border border-green-deep/20 bg-mint p-5"><h2 className="text-xl font-black text-green-deep">Para ti no hay cobros</h2><p className="mt-4 text-lg font-black">Publicar y regalar siempre es gratis.</p><p className="mt-3 text-sm leading-6 text-muted">Estamos esperando que el receptor gestione el servicio de conexión. No necesitas realizar ningún pago.</p><p className="mt-3 text-xs leading-5 text-muted">Los datos de contacto continúan protegidos hasta una confirmación de pago futura.</p></aside>}
  </div>;
}
