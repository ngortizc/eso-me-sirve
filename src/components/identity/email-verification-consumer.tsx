"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { safeReturnTo } from "@/modules/identity/application/safe-return-to";

export function EmailVerificationConsumer() {
  const router = useRouter();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const token = fragment.get("token");
    const returnTo = safeReturnTo(fragment.get("returnTo"));
    if (!token) {
      router.replace("/verificar-correo?error=invalid_token");
      return;
    }

    void fetch("/api/identity/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    }).then((response) => {
      router.replace(response.ok ? returnTo : "/verificar-correo?error=invalid_token");
      router.refresh();
    });
  }, [router]);

  return <p className="rounded-xl bg-fresh/10 p-4 text-sm text-ink" role="status">Verificando el enlace seguro…</p>;
}
