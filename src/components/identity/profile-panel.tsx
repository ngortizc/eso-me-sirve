"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { authClient } from "@/modules/identity/infrastructure/auth-client";

type SessionSummary = { id: string; userAgent: string | null; createdAt: string; expiresAt: string; current: boolean };
type User = { id: string; name: string; email: string; emailVerified: boolean; role: "USER" | "ADMIN"; commune: string | null };

const chileDate = new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santiago" });

export function ProfilePanel({ user }: Readonly<{ user: User }>) {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState<SessionSummary[]>([]);

  async function loadSessions() {
    const response = await fetch("/api/sessions", { cache: "no-store" });
    if (response.ok) setSessions((await response.json() as { sessions: SessionSummary[] }).sessions);
  }

  useEffect(() => {
    let active = true;
    void fetch("/api/sessions", { cache: "no-store" }).then(async (response) => {
      if (response.ok && active) {
        setSessions((await response.json() as { sessions: SessionSummary[] }).sessions);
      }
    });
    return () => { active = false; };
  }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/users/${user.id}/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.get("name"), commune: form.get("commune") })
    });
    const body = await response.json() as { error?: string };
    if (!response.ok) { setError(body.error ?? "No pudimos actualizar el perfil."); return; }
    setError("");
    setNotice("Perfil actualizado.");
    router.refresh();
  }

  async function revokeSession(id: string) {
    const response = await fetch(`/api/sessions/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (response.ok) { setNotice("Sesión cerrada."); await loadSessions(); }
    else setError("No pudimos cerrar esa sesión.");
  }

  async function revokeOthers() {
    const result = await authClient.revokeOtherSessions();
    if (result.error) return setError("No pudimos cerrar las otras sesiones.");
    setNotice("Las otras sesiones fueron cerradas.");
    await loadSessions();
  }

  async function signOut() {
    await authClient.signOut();
    router.replace("/");
    router.refresh();
  }

  return <div className="grid gap-7 lg:grid-cols-[1fr_0.9fr]"><section className="rounded-card border border-ink/10 bg-white p-5 shadow-card sm:p-7"><h2 className="text-2xl font-black">Datos de perfil</h2><div className="mt-4 rounded-xl bg-surface-strong p-4 text-sm"><p><strong>Correo:</strong> {user.email}</p><p className="mt-1"><strong>Estado:</strong> {user.emailVerified ? "Verificado" : "Pendiente de verificación"}</p><p className="mt-1"><strong>Rol:</strong> {user.role === "ADMIN" ? "Administrador" : "Usuario"}</p></div><form className="mt-6 space-y-5" onSubmit={saveProfile}><label><span className="field-label">Nombre</span><input className="field" defaultValue={user.name} maxLength={80} name="name" required /></label><label><span className="field-label">Comuna</span><input className="field" defaultValue={user.commune ?? ""} maxLength={80} name="commune" placeholder="Ej. Ñuñoa" /></label>{error && <p className="text-sm text-red-800" role="alert">{error}</p>}{notice && <p className="text-sm font-bold text-green-deep" role="status">{notice}</p>}<button className="button button-primary" type="submit">Guardar perfil</button></form></section><section className="rounded-card border border-ink/10 bg-white p-5 shadow-card sm:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-2xl font-black">Sesiones</h2><p className="mt-1 text-sm text-muted">Dispositivos con acceso vigente.</p></div><button className="text-sm font-extrabold text-green-deep hover:underline" onClick={revokeOthers} type="button">Cerrar las demás</button></div><ul className="mt-5 space-y-3">{sessions.map((session) => <li className="rounded-xl border border-ink/10 p-4" key={session.id}><div className="flex items-start justify-between gap-3"><div><p className="font-extrabold">{session.current ? "Esta sesión" : "Otra sesión"}</p><p className="mt-1 line-clamp-2 text-xs text-muted">{session.userAgent ?? "Navegador no identificado"}</p><p className="mt-2 text-xs text-muted">Inició {chileDate.format(new Date(session.createdAt))}</p></div>{!session.current && <button className="text-xs font-extrabold text-red-800 hover:underline" onClick={() => revokeSession(session.id)} type="button">Cerrar</button>}</div></li>)}</ul><button className="button button-secondary mt-6 w-full" onClick={signOut} type="button">Cerrar sesión actual</button></section></div>;
}
