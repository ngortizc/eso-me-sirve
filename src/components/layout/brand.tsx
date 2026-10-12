import Link from "next/link";

export function Brand({ inverse = false }: Readonly<{ inverse?: boolean }>) {
  return (
    <Link className={`inline-flex items-center gap-2.5 font-extrabold tracking-[-0.035em] ${inverse ? "text-surface" : "text-ink"}`} href="/" aria-label="Eso Me Sirve, ir al inicio">
      <span className={`grid size-9 place-items-center rounded-xl ${inverse ? "bg-surface text-green-deep" : "bg-green-deep text-white"}`} aria-hidden="true">
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12a7 7 0 0 1 12-4.9L19 9" /><path d="M19 5v4h-4" /><path d="M19 12a7 7 0 0 1-12 4.9L5 15" /><path d="M5 19v-4h4" />
        </svg>
      </span>
      <span className="text-[1.05rem]">Eso Me Sirve</span>
    </Link>
  );
}
