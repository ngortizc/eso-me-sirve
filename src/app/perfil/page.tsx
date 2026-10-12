import type { Metadata } from "next";
import { ProfilePanel } from "@/components/identity/profile-panel";
import { requireUser } from "@/modules/identity/application/session";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function ProfilePage() {
  const user = await requireUser("/perfil");
  return <main className="page-container py-10 sm:py-14"><p className="text-sm font-extrabold uppercase tracking-[0.14em] text-green-deep">Cuenta protegida</p><h1 className="mt-3 text-4xl font-black tracking-[-0.04em] sm:text-5xl">Hola, {user.name}</h1><p className="mt-3 max-w-2xl text-lg leading-8 text-muted">Administra tu perfil y revisa dónde has iniciado sesión.</p><div className="mt-8"><ProfilePanel user={user} /></div></main>;
}
