"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { authClient } from "@/modules/identity/infrastructure/auth-client";

export function RequestDemo({ returnTo }: Readonly<{ returnTo: string }>) {
  const router = useRouter();
  const [noticeVisible, setNoticeVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  async function requestArticle() {
    setBusy(true);
    const { data: session } = await authClient.getSession();
    setBusy(false);
    if (!session) {
      router.push(`/ingresar?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
    setNoticeVisible(true);
  }

  return (
    <div>
      <button className="button button-primary w-full" disabled={busy} type="button" onClick={requestArticle}>{busy ? "Comprobando cuenta…" : "Solicitar artículo"}</button>
      {noticeVisible && <div className="mt-3 rounded-xl border border-amber/45 bg-amber/10 p-4 text-sm leading-6 text-ink" role="status"><strong>Demostración:</strong> no se envió ninguna solicitud. Puedes revisar cómo funcionaría la conexión, sin pagar ni revelar datos reales. <Link className="mt-3 flex items-center gap-1 font-extrabold text-green-deep hover:underline" href="/conexion">Ver proceso de conexión <Icon className="size-4" name="arrow" /></Link></div>}
    </div>
  );
}
