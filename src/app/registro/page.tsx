import type { Metadata } from "next";
import { RegisterForm } from "@/components/identity/auth-forms";
import { IdentityCard } from "@/components/identity/identity-card";
import { safeReturnTo } from "@/modules/identity/application/safe-return-to";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function RegisterPage({ searchParams }: Readonly<{ searchParams: Promise<{ returnTo?: string }> }>) {
  const { returnTo: requestedReturnTo } = await searchParams;
  return <IdentityCard eyebrow="Registro" title="Crea tu cuenta" description="Una misma cuenta sirve para regalar artículos y solicitar los de otras personas."><RegisterForm returnTo={safeReturnTo(requestedReturnTo)} /></IdentityCard>;
}
