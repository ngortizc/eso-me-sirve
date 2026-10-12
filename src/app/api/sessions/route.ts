import { NextResponse } from "next/server";
import { getCurrentIdentitySession } from "@/modules/identity/application/session";
import { listActiveSessions } from "@/modules/identity/infrastructure/session-repository";

export async function GET(request: Request) {
  const current = await getCurrentIdentitySession(request.headers);
  if (!current) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });

  const sessions = await listActiveSessions(current.user.id);
  return NextResponse.json({
    sessions: sessions.map((session) => ({ ...session, current: session.id === current.session.id }))
  });
}
