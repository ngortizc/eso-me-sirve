import type { Metadata } from "next";
import { RequestResetForm } from "@/components/identity/auth-forms";
import { IdentityCard } from "@/components/identity/identity-card";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecoverPage() {
  return <IdentityCard eyebrow="Seguridad" title="Recupera tu acceso" description="Te indicaremos los pasos sin revelar si el correo está registrado."><RequestResetForm /></IdentityCard>;
}
