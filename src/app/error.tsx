"use client";

import { useEffect } from "react";
import { logger } from "@/shared/logging/logger";

export default function ErrorPage({
  error,
  reset
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    logger.error("Error no controlado en la interfaz", {
      digest: error.digest ?? "not-available"
    });
  }, [error]);

  return (
    <main className="grid min-h-[70vh] place-items-center bg-surface px-5 text-center text-ink">
      <div className="max-w-lg">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-danger">Algo no resultó</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight">No pudimos cargar esta vista.</h1>
        <p className="mt-4 text-muted">Puedes intentarlo otra vez. No se muestran detalles técnicos para proteger la configuración del servicio.</p>
        <button className="button button-primary mt-8" onClick={reset} type="button">
          Reintentar
        </button>
      </div>
    </main>
  );
}
