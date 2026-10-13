import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReservationDetail } from "@/components/reservations/reservation-detail";
import { requireUser } from "@/modules/identity/application/session";
import { reservationEventDescription } from "@/modules/reservations/application/reservation-history";
import { getReservationRepository } from "@/modules/reservations/infrastructure/postgres-reservation-repository";

export const metadata: Metadata = { title: "Reserva" };
type Props = { params: Promise<{ reservationId: string }> };

export default async function ReservationPage({ params }: Props) {
  const { reservationId } = await params;
  const user = await requireUser(`/reservas/${reservationId}`);
  const result = await getReservationRepository().getReservation(user.id, reservationId);
  if (!result) notFound();
  const returnTab = result.reservation.perspective === "RECIPIENT" ? "enviadas" : "recibidas";
  return <main className="page-container py-8 sm:py-12"><Link className="text-sm font-extrabold text-green-deep hover:underline" href={`/mis-cosas?tab=${returnTab}`}>← Volver a mis cosas</Link><div className="mt-5"><ReservationDetail reservation={result.reservation} serverNow={result.serverNow} /></div><section className="mt-8 rounded-card border border-ink/10 bg-white p-5"><h2 className="text-xl font-black">Historial de la reserva</h2><ul className="mt-4 space-y-3">{result.events.map((event) => <li className="rounded-xl bg-surface-strong p-3 text-sm" key={event.id}><strong>{reservationEventDescription(event)}</strong></li>)}</ul></section></main>;
}
