"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/modules/identity/infrastructure/auth-client";
import { CONNECTION_SERVICE_FEE_CLP } from "@/modules/reservations/domain/reservation";
import { formatClp } from "@/shared/format/clp";

export function RequestArticle({ listingSlug, returnTo }: Readonly<{ listingSlug: string; returnTo: string }>) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [created, setCreated] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true); setMessage("");
    const { data: session } = await authClient.getSession();
    if (!session) {
      router.push(`/ingresar?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
    const response = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingSlug })
    });
    const body = await response.json() as { error?: string };
    if (response.ok) {
      setCreated(true);
      setMessage("Tu solicitud fue enviada. El publicador debe aceptarla antes de que corresponda pagar.");
      router.refresh();
    } else {
      setMessage(body.error ?? "No fue posible enviar la solicitud.");
    }
    setBusy(false);
  }

  return <section className="rounded-card border border-ink/10 bg-white p-5 shadow-card" aria-label="Costo y solicitud">
    <div className="grid gap-2 text-sm">
      <div className="flex items-center justify-between gap-4"><span className="font-bold">Artículo</span><strong className="text-green-deep">Gratis</strong></div>
      <div className="flex items-center justify-between gap-4"><span className="font-bold">Servicio de conexión</span><strong>{formatClp(CONNECTION_SERVICE_FEE_CLP)}</strong></div>
    </div>
    <p className="mt-3 text-sm leading-6 text-muted">El artículo es gratis. Si aceptan tu solicitud, tendrás 24 horas para pagar {formatClp(CONNECTION_SERVICE_FEE_CLP).replace(" CLP", "")} por el servicio de conexión y obtener los datos de contacto.</p>
    <p className="mt-2 text-xs leading-5 text-muted">El pago y los datos de contacto todavía no están habilitados en esta versión.</p>
    <button className="button button-primary mt-5 w-full" disabled={busy || created} type="button" onClick={submit}>
      {created ? "Solicitud enviada" : busy ? "Enviando…" : "Solicitar artículo"}
    </button>
    {message && <p className={`mt-3 rounded-xl p-3 text-sm leading-6 ${created ? "bg-green-deep/10 text-green-deep" : "bg-amber/10 text-ink"}`} role="status">{message}{created && <> <Link className="font-extrabold underline" href="/mis-cosas?tab=enviadas">Ver mis solicitudes</Link></>}</p>}
  </section>;
}
