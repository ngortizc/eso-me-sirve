import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="grid min-h-[70vh] place-items-center bg-surface px-5 text-center text-ink">
      <div>
        <p className="font-mono text-sm font-bold text-amber">404</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight">Esta página no está disponible.</h1>
        <Link className="button button-primary mt-8" href="/">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
