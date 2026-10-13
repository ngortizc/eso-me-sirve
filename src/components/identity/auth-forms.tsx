"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { isValidEmail, normalizeEmail } from "@/modules/identity/domain/email";

async function postAuth(path: string, body: Record<string, unknown>) {
  return fetch(`/api/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

function ErrorMessage({ message }: Readonly<{ message: string }>) {
  return message ? <p className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">{message}</p> : null;
}

export function LoginForm({ returnTo }: Readonly<{ returnTo: string }>) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = normalizeEmail(String(form.get("email") ?? ""));
    const password = String(form.get("password") ?? "");
    if (!isValidEmail(email) || !password) return setError("Ingresa un correo y una contraseña válidos.");

    setBusy(true);
    setError("");
    const result = await postAuth("sign-in/email", { email, password, rememberMe: true });
    setBusy(false);
    if (!result.ok) {
      setError(result.status === 403 ? "Debes verificar tu correo antes de ingresar." : "No pudimos iniciar sesión con esos datos.");
      return;
    }
    router.replace(returnTo);
    router.refresh();
  }

  return <form className="space-y-5" onSubmit={submit} noValidate><ErrorMessage message={error} /><label><span className="field-label">Correo electrónico</span><input className="field" name="email" type="email" autoComplete="email" inputMode="email" required /></label><label><span className="field-label">Contraseña</span><input className="field" name="password" type="password" autoComplete="current-password" required /></label><div className="flex justify-end"><Link className="text-sm font-bold text-green-deep hover:underline" href="/recuperar">Olvidé mi contraseña</Link></div><button className="button button-primary w-full" disabled={busy} type="submit">{busy ? "Ingresando…" : "Ingresar"}</button><p className="text-center text-sm text-muted">¿Aún no tienes cuenta? <Link className="font-extrabold text-green-deep hover:underline" href={`/registro?returnTo=${encodeURIComponent(returnTo)}`}>Crear cuenta</Link></p></form>;
}

export function RegisterForm({ returnTo }: Readonly<{ returnTo: string }>) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = normalizeEmail(String(form.get("email") ?? ""));
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    if (name.length < 2 || name.length > 80) return setError("El nombre debe tener entre 2 y 80 caracteres.");
    if (!isValidEmail(email)) return setError("Ingresa un correo electrónico válido.");
    if (password.length < 12) return setError("La contraseña debe tener al menos 12 caracteres.");
    if (password !== confirmation) return setError("Las contraseñas no coinciden.");

    setBusy(true);
    setError("");
    const result = await postAuth("sign-up/email", { name, email, password, callbackURL: returnTo });
    setBusy(false);
    if (!result.ok) {
      setError("No pudimos completar el registro. Intenta nuevamente en unos minutos.");
      return;
    }
    router.replace(`/verificar-correo?returnTo=${encodeURIComponent(returnTo)}`);
  }

  return <form className="space-y-5" onSubmit={submit} noValidate><ErrorMessage message={error} /><label><span className="field-label">Nombre público o alias</span><input className="field" name="name" autoComplete="name" maxLength={80} required /><span className="mt-2 block text-xs text-muted">Se mostrará al publicador cuando solicites uno de sus artículos. No uses correo, teléfono ni dirección.</span></label><label><span className="field-label">Correo electrónico</span><input className="field" name="email" type="email" autoComplete="email" inputMode="email" required /></label><label><span className="field-label">Contraseña</span><input className="field" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /><span className="mt-2 block text-xs text-muted">Mínimo 12 caracteres. No reutilices una contraseña de otro servicio.</span></label><label><span className="field-label">Repite la contraseña</span><input className="field" name="confirmation" type="password" autoComplete="new-password" required /></label><button className="button button-primary w-full" disabled={busy} type="submit">{busy ? "Creando cuenta…" : "Crear cuenta"}</button><p className="text-center text-sm text-muted">¿Ya tienes cuenta? <Link className="font-extrabold text-green-deep hover:underline" href={`/ingresar?returnTo=${encodeURIComponent(returnTo)}`}>Ingresar</Link></p></form>;
}

export function RequestResetForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = normalizeEmail(String(new FormData(event.currentTarget).get("email") ?? ""));
    if (!isValidEmail(email)) return setError("Ingresa un correo electrónico válido.");
    setBusy(true);
    setError("");
    await postAuth("request-password-reset", { email, redirectTo: "/restablecer" });
    setBusy(false);
    setMessage("Si existe una cuenta con ese correo, encontrarás instrucciones en el buzón correspondiente.");
  }

  return <form className="space-y-5" onSubmit={submit} noValidate><ErrorMessage message={error} />{message && <p className="rounded-xl border border-fresh/40 bg-fresh/10 p-4 text-sm leading-6 text-ink" role="status">{message}</p>}<label><span className="field-label">Correo electrónico</span><input className="field" name="email" type="email" autoComplete="email" inputMode="email" required /></label><button className="button button-primary w-full" disabled={busy} type="submit">{busy ? "Solicitando…" : "Enviar instrucciones"}</button><Link className="block text-center text-sm font-bold text-green-deep hover:underline" href="/ingresar">Volver a ingresar</Link></form>;
}

export function ResendVerificationForm({ returnTo }: Readonly<{ returnTo: string }>) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = normalizeEmail(String(new FormData(event.currentTarget).get("email") ?? ""));
    if (!isValidEmail(email)) return setError("Ingresa un correo electrónico válido.");
    setError("");
    await postAuth("send-verification-email", { email, callbackURL: returnTo });
    setMessage("Si el correo corresponde a una cuenta pendiente, enviamos un nuevo enlace de verificación.");
  }
  return <form className="mt-6 space-y-4" onSubmit={submit} noValidate><ErrorMessage message={error} />{message && <p className="rounded-xl bg-fresh/10 p-3 text-sm" role="status">{message}</p>}<label><span className="field-label">Correo para reenviar el enlace</span><input className="field" name="email" type="email" autoComplete="email" required /></label><button className="button button-secondary w-full" type="submit">Reenviar verificación</button></form>;
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
    if (!token) return setError("El enlace no es válido o ya venció.");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    if (password.length < 12) return setError("La contraseña debe tener al menos 12 caracteres.");
    if (password !== confirmation) return setError("Las contraseñas no coinciden.");
    setBusy(true);
    const result = await postAuth("reset-password", { newPassword: password, token });
    setBusy(false);
    if (!result.ok) return setError("El enlace no es válido, venció o ya fue utilizado.");
    router.replace("/ingresar?passwordReset=1");
  }

  return <form className="space-y-5" onSubmit={submit}><ErrorMessage message={error} /><label><span className="field-label">Nueva contraseña</span><input className="field" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label><label><span className="field-label">Repite la contraseña</span><input className="field" name="confirmation" type="password" autoComplete="new-password" required /></label><button className="button button-primary w-full" disabled={busy} type="submit">{busy ? "Guardando…" : "Guardar nueva contraseña"}</button></form>;
}
