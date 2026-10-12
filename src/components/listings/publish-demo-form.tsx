"use client";

import { useCallback, useState, type FormEvent } from "react";
import { PhotoManager } from "@/components/photos/photo-manager";
import { DemoBadge } from "@/components/ui/demo-badge";
import { Icon } from "@/components/ui/icon";

export function PublishDemoForm() {
  const [photoCount, setPhotoCount] = useState(0);
  const [photoRequirementMessage, setPhotoRequirementMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (photoCount === 0) {
      setPhotoRequirementMessage("Agrega al menos una fotografía para revisar la publicación.");
      setSubmitted(false);
      return;
    }
    setSubmitted(true);
  }

  const handlePhotoCountChange = useCallback((count: number) => {
    setPhotoCount(count);
    if (count > 0) setPhotoRequirementMessage("");
  }, []);

  return (
    <form className="grid gap-6 lg:grid-cols-[1fr_21rem]" onSubmit={handleSubmit}>
      <div className="space-y-5 rounded-card border border-ink/10 bg-white p-5 shadow-card sm:p-7">
        <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-extrabold text-green-deep">Paso único</p><h2 className="mt-1 text-2xl font-black">Describe tu artículo</h2></div><DemoBadge compact /></div>
        <PhotoManager onCountChange={handlePhotoCountChange} requirementMessage={photoRequirementMessage} />
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className="field-label">Título</span><input className="field" name="title" required maxLength={70} placeholder="Ej. Mesa lateral de madera" /></label>
          <label className="sm:col-span-2"><span className="field-label">Descripción</span><textarea className="field" name="description" required maxLength={600} placeholder="Cuenta su estado, medidas aproximadas y cómo se podría retirar." /></label>
          <label><span className="field-label">Categoría</span><select className="field" name="category" required defaultValue=""><option value="" disabled>Selecciona una</option><option>Hogar</option><option>Infantil</option><option>Libros</option><option>Plantas</option><option>Otro</option></select></label>
          <label><span className="field-label">Condición</span><select className="field" name="condition" required defaultValue="Buen estado"><option>Como nuevo</option><option>Buen estado</option><option>Usado, funcional</option><option>Requiere reparación</option></select></label>
          <label className="sm:col-span-2"><span className="field-label">Comuna</span><select className="field" name="commune" required defaultValue=""><option value="" disabled>Selecciona una comuna</option><option>Ñuñoa</option><option>Providencia</option><option>Santiago</option><option>La Florida</option></select><span className="mt-2 flex items-center gap-1.5 text-xs text-muted"><Icon className="size-4 text-green-deep" name="lock" />No ingreses una dirección exacta.</span></label>
        </div>
      </div>

      <aside className="h-fit rounded-card bg-ink p-5 text-white lg:sticky lg:top-24 sm:p-6"><span className="grid size-11 place-items-center rounded-2xl bg-fresh/20 text-fresh"><Icon className="size-6" name="sparkle" /></span><h2 className="mt-5 text-2xl font-black">Publicar siempre es gratis</h2><p className="mt-3 text-sm leading-6 text-white/65">No cobramos a quien regala. Antes de publicar podrás revisar la información visible.</p><ul className="mt-5 space-y-3 text-sm">{["Sin dirección ni teléfono públicos", "Puedes elegir una solicitud", "El artículo debe ser gratuito"].map((item) => <li className="flex gap-2" key={item}><Icon className="mt-0.5 size-4 shrink-0 text-fresh" name="check" />{item}</li>)}</ul><button className="button mt-7 w-full bg-white text-green-deep hover:bg-surface" type="submit">Revisar publicación</button>{submitted && <div className="mt-4 rounded-xl border border-amber/40 bg-amber/10 p-3 text-sm leading-5 text-white" role="status"><strong>Prototipo:</strong> no se guardó ni publicó información.</div>}</aside>
    </form>
  );
}
