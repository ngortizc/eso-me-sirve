import { NextResponse } from "next/server";
import { auth } from "@/modules/identity/infrastructure/auth";
import { consumeEmailVerificationToken } from "@/modules/identity/infrastructure/token-consumption";

export async function POST(request: Request) {
  let token = "";
  try {
    const body = await request.json() as { token?: unknown };
    token = typeof body.token === "string" ? body.token : "";
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  if (!token || token.length > 4_096) return NextResponse.json({ error: "Enlace inválido." }, { status: 400 });
  if (!await consumeEmailVerificationToken(token)) {
    return NextResponse.json({ error: "El enlace ya fue utilizado." }, { status: 409 });
  }

  const internalUrl = new URL("/api/auth/verify-email", request.url);
  internalUrl.searchParams.set("token", token);
  return auth.handler(new Request(internalUrl, { method: "GET", headers: request.headers }));
}
