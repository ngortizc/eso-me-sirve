import type { Metadata } from "next";
import Link from "next/link";
import { ActivityDashboard, type ActivityTab } from "@/components/reservations/activity-dashboard";
import { Icon } from "@/components/ui/icon";
import { requireUser } from "@/modules/identity/application/session";
import { getListingRepository } from "@/modules/listings/infrastructure/postgres-listing-repository";
import { getReservationRepository } from "@/modules/reservations/infrastructure/postgres-reservation-repository";

export const metadata: Metadata = { title: "Mis cosas" };
type Props = { searchParams: Promise<{ tab?: string }> };

export default async function MyThingsPage({ searchParams }: Props) {
  const user = await requireUser("/mis-cosas");
  const requestedTab = (await searchParams).tab;
  const initialTab: ActivityTab = requestedTab === "enviadas" || requestedTab === "recibidas" ? requestedTab : "publicaciones";
  const [listings, overview] = await Promise.all([getListingRepository().getOwnerListings(user.id), getReservationRepository().getOverview(user.id)]);
  return <main className="page-container py-7 sm:py-10"><header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-green-deep">Tu actividad real</p><h1 className="mt-1 text-4xl font-black tracking-[-0.04em]">Mis cosas</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Publicaciones, solicitudes y reservas reales. Los datos de contacto permanecen privados hasta un pago confirmado en una etapa posterior.</p></div><Link className="button button-primary shrink-0" href="/publicar"><Icon className="size-4" name="plus" />Nueva publicación</Link></header>
    <ActivityDashboard listings={listings} overview={overview} initialTab={initialTab} />
  </main>;
}
