import Image from "next/image";
import Link from "next/link";
import type { DemoArticle } from "@/shared/demo/catalog";
import { Icon } from "@/components/ui/icon";

export function ArticleCard({ article, priority = false }: Readonly<{ article: DemoArticle; priority?: boolean }>) {
  return (
    <article className="group overflow-hidden rounded-card border border-ink/10 bg-white shadow-card transition duration-200 hover:-translate-y-1 hover:shadow-card-hover">
      <Link className="block focus-visible:outline-none" href={`/articulos/${article.slug}`} aria-label={`Ver ${article.title}`}>
        <div className="relative aspect-[4/3] overflow-hidden bg-surface-strong">
          <Image className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" src={article.image} alt={article.imageAlt} fill sizes="(max-width: 640px) 86vw, (max-width: 1024px) 44vw, 28vw" loading={priority ? "eager" : "lazy"} />
          <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-green-deep shadow-sm">Gratis</span>
          <span className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white/95 text-ink shadow-sm" aria-hidden="true">
            <Icon className="size-4" name="heart" />
          </span>
        </div>
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 text-xs font-semibold text-muted">
            <span>{article.category}</span>
            <span>{article.publishedLabel}</span>
          </div>
          <h3 className="mt-2 text-lg font-extrabold leading-snug tracking-tight text-ink group-hover:text-green-deep">{article.title}</h3>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="flex items-center gap-1.5 text-sm font-medium text-muted"><Icon className="size-4" name="location" />{article.commune}</p><span className="rounded-full bg-surface-strong px-2.5 py-1 text-[0.68rem] font-extrabold text-ink">{article.condition}</span></div>
        </div>
      </Link>
    </article>
  );
}
