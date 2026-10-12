import type { ReactNode } from "react";
import { Brand } from "@/components/layout/brand";

export function IdentityCard({ eyebrow, title, description, children }: Readonly<{ eyebrow: string; title: string; description: string; children: ReactNode }>) {
  return <main className="page-container grid min-h-[calc(100vh-8rem)] place-items-center py-10"><section className="w-full max-w-lg rounded-[1.75rem] border border-ink/10 bg-white p-6 shadow-card sm:p-9"><div className="mb-8"><Brand /><p className="mt-7 text-xs font-extrabold uppercase tracking-[0.14em] text-green-deep">{eyebrow}</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">{title}</h1><p className="mt-3 leading-7 text-muted">{description}</p></div>{children}</section></main>;
}
