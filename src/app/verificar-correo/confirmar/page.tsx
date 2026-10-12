import { EmailVerificationConsumer } from "@/components/identity/email-verification-consumer";
import { IdentityCard } from "@/components/identity/identity-card";

export default function ConfirmEmailPage() {
  return <IdentityCard eyebrow="Seguridad" title="Verificando correo" description="Este enlace solo puede utilizarse una vez."><EmailVerificationConsumer /></IdentityCard>;
}
