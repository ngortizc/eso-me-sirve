import type { Metadata } from "next";
import Link from "next/link";
import { ResendVerificationForm } from "@/components/identity/auth-forms";
import { IdentityCard } from "@/components/identity/identity-card";
import { safeReturnTo } from "@/modules/identity/application/safe-return-to";

export const metadata: Metadata = { title: "Verifica tu correo" };

export default async function VerifyEmailPage({ searchParams }: Readonly<{ searchParams: Promise<{ returnTo?: string; error?: string }> }>) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params.returnTo);
  return <IdentityCard eyebrow="Un paso más" title="Verifica tu correo" description="En desarrollo, el enlace se guarda en el buzón local de pruebas y no se envía un mensaje real.">{params.error && <p className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">El enlace no es válido o ya venció.</p>}<ol className="mt-5 list-decimal space-y-2 pl-5 text-sm leading-6 text-muted"><li>Consulta el último mensaje del buzón local.</li><li>Abre el enlace de uso único antes de 15 minutos.</li><li>Volverás al destino que solicitaste.</li></ol><ResendVerificationForm returnTo={returnTo} /><Link className="mt-5 block text-center text-sm font-bold text-green-deep hover:underline" href={`/ingresar?returnTo=${encodeURIComponent(returnTo)}`}>Volver a ingresar</Link></IdentityCard>;
}
