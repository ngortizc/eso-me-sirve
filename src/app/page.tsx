const steps = [
  {
    number: "01",
    title: "Publica lo que ya no usas",
    description: "Describe el artículo y define una comuna y condiciones de entrega, sin exponer datos privados."
  },
  {
    number: "02",
    title: "Elige una solicitud",
    description: "Quien publica decide a qué persona reservar el artículo. Una aceptación a la vez."
  },
  {
    number: "03",
    title: "Coordinen con privacidad",
    description: "El contacto se habilitará únicamente después de una reserva aceptada y un pago confirmado."
  }
] as const;

const principles = [
  ["$0", "El artículo siempre es gratuito"],
  ["Privado", "Contacto protegido hasta que corresponda"],
  ["Local", "Pensado para encuentros en tu comuna"]
] as const;

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden">
      <nav aria-label="Navegación principal" className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-12">
        <a className="flex items-center gap-3 font-black tracking-tight text-forest" href="#inicio" aria-label="Eso Me Sirve, inicio">
          <span className="grid size-10 place-items-center rounded-2xl bg-forest text-lg text-cream shadow-sm" aria-hidden="true">↻</span>
          <span className="text-lg sm:text-xl">Eso Me Sirve</span>
        </a>
        <a className="rounded-full border border-forest/20 bg-white/60 px-4 py-2 text-sm font-bold text-forest transition hover:border-forest/50 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forest" href="#como-funciona">
          Cómo funcionará
        </a>
      </nav>

      <section id="inicio" className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:px-12 lg:pb-28 lg:pt-16">
        <div className="relative z-10">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-coral/25 bg-coral/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-coral-dark">
            <span className="size-2 rounded-full bg-coral" aria-hidden="true" />
            Plataforma en preparación
          </p>
          <h1 className="max-w-4xl text-balance text-5xl font-black leading-[0.96] tracking-[-0.055em] text-forest sm:text-7xl lg:text-[5.5rem]">
            Lo que a ti te sobra, a alguien le <span className="relative whitespace-nowrap text-coral">sirve.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-pretty text-lg leading-8 text-forest/70 sm:text-xl">
            Un espacio para regalar artículos, conectar con personas de tu zona y alargar la vida de las cosas de forma simple y responsable.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a className="inline-flex min-h-12 items-center justify-center rounded-full bg-forest px-6 py-3 font-extrabold text-cream shadow-[0_10px_30px_rgba(23,58,49,0.18)] transition hover:-translate-y-0.5 hover:bg-forest-light focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forest" href="#como-funciona">
              Conoce la idea
            </a>
            <p className="px-2 text-sm font-medium text-forest/60">Aún no se reciben publicaciones ni reservas.</p>
          </div>
        </div>

        <div aria-hidden="true" className="relative mx-auto aspect-square w-full max-w-md">
          <div className="absolute inset-5 rotate-6 rounded-[3.5rem] bg-mint shadow-[0_30px_80px_rgba(23,58,49,0.16)]" />
          <div className="absolute inset-10 -rotate-3 overflow-hidden rounded-[3rem] border-2 border-forest/10 bg-cream p-7">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-forest px-3 py-1 text-xs font-black uppercase tracking-wider text-cream">Nueva vida</span>
              <span className="text-3xl">✦</span>
            </div>
            <div className="mt-10 grid place-items-center">
              <div className="relative grid size-48 place-items-center rounded-[42%_58%_55%_45%] bg-coral/15 sm:size-56">
                <span className="text-8xl drop-shadow-sm">🪴</span>
                <span className="absolute -right-6 top-5 rotate-6 rounded-2xl bg-white px-3 py-2 text-sm font-black text-forest shadow-lg">Gratis</span>
              </div>
            </div>
            <div className="mt-8 h-3 w-3/4 rounded-full bg-forest/15" />
            <div className="mt-3 h-3 w-1/2 rounded-full bg-forest/10" />
          </div>
          <div className="absolute -bottom-2 -left-2 rounded-3xl bg-coral px-5 py-4 font-black text-white shadow-xl sm:-left-7">Hecho para Chile 🇨🇱</div>
        </div>
      </section>

      <section aria-label="Principios de la plataforma" className="border-y border-forest/10 bg-white/45">
        <div className="mx-auto grid max-w-7xl divide-y divide-forest/10 px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8 lg:px-12">
          {principles.map(([label, description]) => (
            <div className="flex items-center gap-4 py-7 sm:px-7 sm:first:pl-0" key={label}>
              <strong className="text-xl font-black text-coral">{label}</strong>
              <span className="max-w-48 text-sm leading-5 text-forest/65">{description}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="como-funciona" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="max-w-2xl">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-coral-dark">Una comunidad circular</p>
          <h2 className="mt-4 text-balance text-4xl font-black tracking-[-0.04em] text-forest sm:text-6xl">Menos cosas guardadas. Más cosas aprovechadas.</h2>
        </div>
        <ol className="mt-14 grid gap-5 lg:grid-cols-3">
          {steps.map((step) => (
            <li className="group rounded-[2rem] border border-forest/10 bg-white/65 p-7 transition hover:-translate-y-1 hover:bg-white hover:shadow-[0_20px_50px_rgba(23,58,49,0.09)]" key={step.number}>
              <div className="flex items-start justify-between">
                <span className="font-mono text-sm font-bold text-coral">{step.number}</span>
                <span className="grid size-9 place-items-center rounded-full bg-mint text-forest transition group-hover:rotate-12" aria-hidden="true">→</span>
              </div>
              <h3 className="mt-12 text-2xl font-black tracking-tight text-forest">{step.title}</h3>
              <p className="mt-3 leading-7 text-forest/65">{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="bg-forest px-5 py-10 text-cream sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-black">Eso Me Sirve <span className="font-normal text-cream/60">· identidad provisional</span></p>
          <p className="text-sm text-cream/60">Base técnica EMS-000 · Sin operaciones reales habilitadas</p>
        </div>
      </footer>
    </main>
  );
}
