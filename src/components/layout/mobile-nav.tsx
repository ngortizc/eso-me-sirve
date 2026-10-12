"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icon";

const navItems: readonly { href: string; label: string; icon: IconName; match: (path: string) => boolean }[] = [
  { href: "/", label: "Inicio", icon: "home", match: (path) => path === "/" },
  { href: "/explorar", label: "Explorar", icon: "search", match: (path) => path.startsWith("/explorar") || path.startsWith("/articulos") },
  { href: "/publicar", label: "Publicar", icon: "plus", match: (path) => path.startsWith("/publicar") },
  { href: "/mis-cosas", label: "Mis cosas", icon: "user", match: (path) => path.startsWith("/mis-cosas") || path.startsWith("/conexion") }
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="mobile-nav" aria-label="Navegación móvil">
      {navItems.map((item) => {
        const active = item.match(pathname);
        return (
          <Link className={`mobile-nav-link ${active ? "is-active" : ""}`} href={item.href} key={item.href} aria-current={active ? "page" : undefined}>
            <span className={`grid size-8 place-items-center rounded-xl ${item.href === "/publicar" ? "bg-green-deep text-white" : ""}`}><Icon className="size-5" name={item.icon} /></span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
