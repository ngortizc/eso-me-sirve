import { NextResponse } from "next/server";
import { getCurrentIdentitySession } from "@/modules/identity/application/session";
import { revokeOwnedSession } from "@/modules/identity/infrastructure/session-repository";

export async function DELETE(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const current = await getCurrentIdentitySession(request.headers);
  if (!current) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });

  const { sessionId } = await params;
  if (sessionId === current.session.id) {
    return NextResponse.json({ error: "Usa Cerrar sesión para finalizar la sesión actual." }, { status: 400 });
  }

  const revoked = await revokeOwnedSession(sessionId, current.user.id);
  return revoked
    ? NextResponse.json({ revoked: true })
    : NextResponse.json({ error: "Sesión no encontrada." }, { status: 404 });
}
