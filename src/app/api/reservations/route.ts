import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/identity/application/session";
import { getReservationRepository } from "@/modules/reservations/infrastructure/postgres-reservation-repository";

export async function GET(request: Request) {
  const actor = await getCurrentUser(request.headers);
  if (!actor) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  const scope = new URL(request.url).searchParams.get("scope") ?? "mine";
  if (scope !== "mine" && scope !== "owned") return NextResponse.json({ error: "Ámbito inválido." }, { status: 400 });
  const overview = await getReservationRepository().getOverview(actor.id);
  return NextResponse.json({ reservations: scope === "mine" ? overview.recipientReservations : overview.publisherReservations, serverNow: overview.serverNow });
}
