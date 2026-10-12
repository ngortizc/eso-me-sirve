import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-cream px-5 text-center text-forest">
      <div>
        <p className="font-mono text-sm font-bold text-coral">404</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight">Esta página no está disponible.</h1>
        <Link className="mt-8 inline-flex rounded-full bg-forest px-6 py-3 font-bold text-cream" href="/">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
