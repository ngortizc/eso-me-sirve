import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/identity/auth-forms";
import { IdentityCard } from "@/components/identity/identity-card";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default function ResetPasswordPage() {
  return <IdentityCard eyebrow="Seguridad" title="Elige una nueva contraseña" description="El enlace vence pronto y deja de funcionar después del primer uso."><ResetPasswordForm /></IdentityCard>;
}
