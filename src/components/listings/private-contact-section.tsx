"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { OwnerPrivateContactView } from "@/modules/private-contact/application/private-contact-repository";
import { deliveryMethodLabels, deliveryMethods } from "@/modules/private-contact/domain/private-contact";

type Result = { contact?: OwnerPrivateContactView | null; error?: string; errors?: { message: string }[] };
const chileDate = new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santiago" });

export function PrivateContactSection({ listingId, mutationLocked = false }: Readonly<{ listingId: string; mutationLocked?: boolean }>) {
  const [contact, setContact] = useState<OwnerPrivateContactView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/listings/${listingId}/private-contact`, { cache: "no-store" })
      .then(async (response) => ({ response, body: await response.json() as Result }))
      .then(({ response, body }) => {
        if (!active) return;
        if (!response.ok) setMessage(body.error ?? "No fue posible consultar los datos privados.");
        else setContact(body.contact ?? null);
      })
      .catch(() => { if (active) setMessage("No fue posible consultar los datos privados."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [listingId]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true); setMessage("");
    const values = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetch(`/api/listings/${listingId}/private-contact`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, version: contact?.version ?? 0 })
      });
      const body = await response.json() as Result;
      if (!response.ok || !body.contact) setMessage(body.errors?.map((item) => item.message).join(" ") || body.error || "No fue posible guardar los datos privados.");
      else {
        setContact(body.contact);
        setMessage("Datos privados guardados correctamente.");
        form.reset();
      }
    } catch { setMessage("No fue posible comunicarse con el servidor. Los datos no fueron confirmados."); }
    finally { setBusy(false); }
  }

  return <section aria-labelledby="private-contact-heading">
    <h2 className="text-2xl font-black" id="private-contact-heading">2. Datos privados para coordinar el retiro</h2>
    <div className="mt-4 rounded-card border border-green-deep/20 bg-white p-5 shadow-card sm:p-7">
      <p className="rounded-xl bg-mint p-4 text-sm leading-6 text-green-deep"><strong>Información privada.</strong> No se publica en el catálogo. Solo se compartirá con el receptor seleccionado después de un pago confirmado y una autorización válida en una etapa posterior. Los accesos futuros podrán registrarse para seguridad y reclamos.</p>
      {mutationLocked && <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6" data-testid="private-contact-reservation-lock"><strong>Datos protegidos durante la reserva.</strong> Puedes consultarlos, pero no modificar el teléfono ni el lugar de retiro mientras exista una reserva pendiente de pago. Si la reserva vence o se cancela, podrás actualizarlos antes de aceptar otra solicitud.</p>}
      {loading ? <p className="mt-5 text-sm text-muted">Consultando datos protegidos…</p> : mutationLocked ? (
        contact ? <dl className="mt-5 grid gap-4 rounded-xl border border-ink/10 bg-surface p-4 sm:grid-cols-2" data-testid="private-contact-readonly">
          <div><dt className="field-label">Teléfono chileno</dt><dd className="mt-1 break-words font-bold">{contact.phone}</dd></div>
          <div><dt className="field-label">Modalidad de entrega</dt><dd className="mt-1 font-bold">{deliveryMethodLabels[contact.deliveryMethod]}</dd></div>
          <div className="sm:col-span-2"><dt className="field-label">Dirección o punto de retiro</dt><dd className="mt-1 break-words">{contact.location}</dd></div>
          <div className="sm:col-span-2"><dt className="field-label">Indicaciones adicionales</dt><dd className="mt-1 break-words">{contact.instructions || "Sin indicaciones adicionales"}</dd></div>
          <div className="sm:col-span-2 text-xs text-muted">Consentimiento {contact.consentVersion} registrado el {chileDate.format(new Date(contact.consentedAt))}. Versión de solo lectura durante la reserva.</div>
        </dl> : <p className="mt-5 rounded-xl bg-surface-strong p-4 text-sm" data-testid="private-contact-missing-locked">Esta publicación reservada no tiene datos privados registrados. No pueden agregarse mientras la reserva esté activa.</p>
      ) : <form className="mt-5 grid gap-5 sm:grid-cols-2" key={contact?.version ?? 0} onSubmit={save}>
        <label><span className="field-label">Teléfono chileno</span><input className="field" name="contactPhone" type="tel" required autoComplete="tel" defaultValue={contact?.phone ?? ""} placeholder="+56 9 1234 5678" /></label>
        <label><span className="field-label">Modalidad de entrega</span><select className="field" name="deliveryMethod" required defaultValue={contact?.deliveryMethod ?? ""}><option value="" disabled>Selecciona una modalidad</option>{deliveryMethods.map((method) => <option value={method} key={method}>{deliveryMethodLabels[method]}</option>)}</select></label>
        <label className="sm:col-span-2"><span className="field-label">Dirección o descripción del punto de retiro</span><textarea className="field min-h-24" name="deliveryLocation" required minLength={5} maxLength={300} defaultValue={contact?.location ?? ""} /></label>
        <label className="sm:col-span-2"><span className="field-label">Indicaciones adicionales (opcional)</span><textarea className="field min-h-20" name="deliveryInstructions" maxLength={500} defaultValue={contact?.instructions ?? ""} /></label>
        <label className="sm:col-span-2 flex items-start gap-3 rounded-xl border border-ink/10 p-4 text-sm leading-6"><input className="mt-1 size-4" type="checkbox" name="contactConsent" value="true" required /><span>Acepto que estos datos se almacenen de forma protegida para coordinar la entrega y que, después de un pago confirmado, puedan compartirse con el receptor seleccionado. Comprendo que su acceso puede quedar registrado.</span></label>
        {contact && <p className="sm:col-span-2 text-xs text-muted">Consentimiento {contact.consentVersion} registrado el {chileDate.format(new Date(contact.consentedAt))}. Para actualizar los datos debes confirmar nuevamente.</p>}
        <div className="sm:col-span-2"><button className="button button-primary" type="submit" disabled={busy}>{busy ? "Protegiendo datos…" : contact ? "Actualizar datos privados" : "Guardar datos privados"}</button></div>
      </form>}
      {message && <p className="mt-4 rounded-xl bg-surface-strong p-3 text-sm" role="status">{message}</p>}
    </div>
  </section>;
}
