"use client";

import { useEffect, useState } from "react";

function label(milliseconds: number) {
  if (milliseconds <= 0) return "Plazo vencido";
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function PaymentCountdown({ expiresAt, serverNow, active }: Readonly<{ expiresAt: string; serverNow: string; active: boolean }>) {
  const [remaining, setRemaining] = useState(() => new Date(expiresAt).getTime() - new Date(serverNow).getTime());
  useEffect(() => {
    if (!active) return;
    const initialOffset = Date.now() - new Date(serverNow).getTime();
    const tick = () => setRemaining(new Date(expiresAt).getTime() - (Date.now() - initialOffset));
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [active, expiresAt, serverNow]);
  return <span className="font-black tabular-nums" data-testid="payment-countdown" aria-label={`Tiempo informativo restante: ${label(remaining)}`}>{label(remaining)}</span>;
}
