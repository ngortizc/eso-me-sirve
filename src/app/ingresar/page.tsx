import type { Metadata } from "next";
import { LoginForm } from "@/components/identity/auth-forms";
import { IdentityCard } from "@/components/identity/identity-card";
import { safeReturnTo } from "@/modules/identity/application/safe-return-to";

export const metadata: Metadata = { title: "Ingresar" };

export default async function LoginPage({ searchParams }: Readonly<{ searchParams: Promise<{ returnTo?: string; passwordReset?: string }> }>) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params.returnTo);
  return <IdentityCard eyebrow="Tu cuenta" title="Qué bueno verte" description="Ingresa para publicar, solicitar artículos y administrar tus sesiones.">{params.passwordReset === "1" && <p className="mb-5 rounded-xl border border-fresh/40 bg-fresh/10 p-3 text-sm" role="status">Tu contraseña fue actualizada. Inicia sesión nuevamente.</p>}<LoginForm returnTo={returnTo} /></IdentityCard>;
}
