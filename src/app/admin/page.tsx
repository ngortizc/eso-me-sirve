import type { Metadata } from "next";
import { requireRole } from "@/modules/identity/application/session";

export const metadata: Metadata = { title: "Administración" };

export default async function AdminPage() {
  await requireRole("ADMIN", "/admin");
  return <main className="page-container py-14"><p className="text-sm font-extrabold uppercase tracking-[0.14em] text-green-deep">Rol ADMIN</p><h1 className="mt-3 text-4xl font-black">Administración</h1><div className="mt-7 rounded-card border border-dashed border-ink/20 bg-white p-7"><h2 className="text-xl font-black">Sin módulos administrativos todavía</h2><p className="mt-2 text-muted">Esta ruta verifica el rol en el servidor. Moderación y operaciones se implementarán en tareas posteriores.</p></div></main>;
}
