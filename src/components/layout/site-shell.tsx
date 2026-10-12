import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Brand } from "@/components/layout/brand";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Icon } from "@/components/ui/icon";
import { AuthMenu } from "@/components/identity/auth-menu";

export function SiteShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-ink/8 bg-surface/90 backdrop-blur-xl">
        <div className="page-container flex h-16 items-center justify-between sm:h-[4.5rem]">
          <Brand />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Navegación principal">
            <Link className="nav-link" href="/explorar">Explorar</Link>
            <Link className="nav-link" href="/mis-cosas">Mis cosas</Link>
            <Suspense fallback={<span className="h-10 w-24 animate-pulse rounded-xl bg-ink/8" aria-hidden="true" />}><AuthMenu /></Suspense>
            <Link className="button button-primary ml-3 !min-h-10 !px-4 !py-2" href="/publicar"><Icon className="size-4" name="plus" />Publicar gratis</Link>
          </nav>
          <Link className="button button-primary !min-h-10 !px-4 !py-2 md:!hidden" href="/publicar"><Icon className="size-4" name="plus" /><span>Publicar</span></Link>
        </div>
      </header>
      <div>{children}</div>
      <footer className="mt-16 bg-ink pb-28 pt-12 text-surface md:pb-12">
        <div className="page-container grid gap-10 md:grid-cols-[1.3fr_1fr_1fr]">
          <div><Brand inverse /><p className="mt-4 max-w-sm text-sm leading-6 text-surface/65">Dale una nueva vida a lo que ya no usas. Una experiencia local pensada para compartir con confianza.</p></div>
          <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-fresh">Explora</p><div className="mt-4 flex flex-col gap-3 text-sm text-surface/75"><Link href="/explorar">Artículos disponibles</Link><Link href="/publicar">Publicar gratis</Link><Link href="/perfil">Mi cuenta</Link></div></div>
          <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-fresh">Piloto</p><p className="mt-4 text-sm leading-6 text-surface/65">Interfaz de demostración. No procesa pagos, reservas ni datos de contacto reales.</p></div>
        </div>
      </footer>
      <MobileNav />
    </div>
  );
}
