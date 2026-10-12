import { NextResponse } from "next/server";
import { canAccessUserResource } from "@/modules/identity/application/authorization";
import { getCurrentUser } from "@/modules/identity/application/session";
import { findProfileByUserId, updateProfile } from "@/modules/profiles/infrastructure/postgres-profile-repository";
import { logger } from "@/shared/logging/logger";

type Context = { params: Promise<{ userId: string }> };

function forbidden() {
  return NextResponse.json({ error: "No tienes permiso para acceder a este perfil." }, { status: 403 });
}

export async function GET(request: Request, { params }: Context) {
  const actor = await getCurrentUser(request.headers);
  if (!actor) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });

  const { userId } = await params;
  if (!canAccessUserResource(actor, userId)) return forbidden();

  const profile = await findProfileByUserId(userId);
  return profile
    ? NextResponse.json({ profile })
    : NextResponse.json({ error: "Perfil no encontrado." }, { status: 404 });
}

export async function PATCH(request: Request, { params }: Context) {
  const actor = await getCurrentUser(request.headers);
  if (!actor) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });

  const { userId } = await params;
  if (!canAccessUserResource(actor, userId)) {
    logger.warn("Actualización de perfil denegada", { reason: "ownership" });
    return forbidden();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "La solicitud no contiene JSON válido." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Datos de perfil inválidos." }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const commune = typeof raw.commune === "string" && raw.commune.trim() ? raw.commune.trim() : null;
  if (name.length < 2 || name.length > 80 || (commune?.length ?? 0) > 80) {
    return NextResponse.json({ error: "Revisa el nombre y la comuna ingresados." }, { status: 400 });
  }

  const profile = await updateProfile(userId, { name, commune });
  return profile
    ? NextResponse.json({ profile })
    : NextResponse.json({ error: "Perfil no encontrado." }, { status: 404 });
}
