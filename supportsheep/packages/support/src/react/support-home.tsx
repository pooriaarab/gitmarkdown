import Link from "next/link";

import { createSupportRegistry } from "../registry";
import type { SupportSiteConfig, SupportTheme } from "../types";
import { SupportSearch } from "./support-search";

export function SupportHome({
  config,
  theme,
  searchPlaceholder,
}: {
  config: SupportSiteConfig;
  theme?: SupportTheme;
  searchPlaceholder?: string;
}) {
  const registry = createSupportRegistry(config);
  const title = config.homeTitle ?? "Help center";
  const linkClass = theme?.link ?? "text-sm text-primary hover:underline";
  const muted = theme?.muted ?? "text-sm text-muted-foreground";
  const sectionBorder = theme?.sectionBorder ?? "border-t border-border pt-6";

  return (
    <>
      <h1 className={theme?.heading ?? "text-3xl font-semibold tracking-tight text-foreground"}>{title}</h1>
      <p className={`mt-3 ${muted}`}>
        {config.homeDescription} Stuck? Email{" "}
        <a href={`mailto:${config.supportEmail}`} className={linkClass}>
          {config.supportEmail}
        </a>
        .
      </p>
      <SupportSearch config={config} theme={theme} placeholder={searchPlaceholder} />
      <div className="mt-10 space-y-8">
        {registry.categories.map((category) => {
          const articles = registry.articles.filter((a) => a.category === category.slug);
          const extra = (config.extraCategoryLinks ?? []).filter((l) => l.categorySlug === category.slug);
          if (articles.length === 0 && extra.length === 0) return null;
          return (
            <section key={category.slug} className={sectionBorder}>
              <h2 className="text-lg font-semibold text-foreground">{category.name}</h2>
              <p className={`mt-1 ${muted}`}>{category.description}</p>
              <ul className="mt-3 space-y-2">
                {articles.map((article) => (
                  <li key={article.slug}>
                    <Link href={registry.articleHref(article)} className={linkClass}>
                      {article.title}
                    </Link>
                  </li>
                ))}
                {extra.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={linkClass}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
