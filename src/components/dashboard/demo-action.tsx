"use client";

import { useState } from "react";

export function DemoAction({ children }: Readonly<{ children: string }>) {
  const [active, setActive] = useState(false);
  return <div><button className="text-sm font-extrabold text-green-deep hover:underline" type="button" onClick={() => setActive(true)}>{children}</button>{active && <p className="mt-2 text-xs leading-5 text-muted" role="status">Acción de demostración: no se modificó ningún dato.</p>}</div>;
}
