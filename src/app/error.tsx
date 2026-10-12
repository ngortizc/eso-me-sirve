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
    <main className="grid min-h-screen place-items-center bg-cream px-5 text-center text-forest">
      <div className="max-w-lg">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-coral-dark">Algo no resultó</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight">No pudimos cargar esta vista.</h1>
        <p className="mt-4 text-forest/65">Puedes intentarlo otra vez. No se muestran detalles técnicos para proteger la configuración del servicio.</p>
        <button className="mt-8 rounded-full bg-forest px-6 py-3 font-bold text-cream" onClick={reset} type="button">
          Reintentar
        </button>
      </div>
    </main>
  );
}
