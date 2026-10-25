import Link from "next/link";

import { createSupportRegistry } from "../registry";
import type { SupportArticle, SupportSiteConfig, SupportTheme } from "../types";
import { SupportArticleBody } from "./support-article-body";

export function SupportArticleView({
  config,
  article,
  theme,
}: {
  config: SupportSiteConfig;
  article: SupportArticle;
  theme?: SupportTheme;
}) {
  const registry = createSupportRegistry(config);
  const categoryMeta = registry.categories.find((c) => c.slug === article.category);
  const linkClass = theme?.link ?? "text-sm text-primary hover:underline";
  const muted = theme?.muted ?? "text-sm text-muted-foreground";

  return (
    <>
      <p className={muted}>
        <Link href="/support" className={linkClass}>
          Help center
        </Link>
        {categoryMeta ? <> / <span>{categoryMeta.name}</span></> : null}
      </p>
      <h1 className={theme?.heading ?? "mt-4 text-3xl font-semibold tracking-tight text-foreground"}>{article.title}</h1>
      <p className={`mt-2 ${muted}`}>{article.description}</p>
      <p className={`mt-1 text-xs ${muted}`}>Updated {article.updatedAt}</p>
      <div className="mt-8">
        <SupportArticleBody content={article.content} theme={theme} />
      </div>
      <p className={`mt-10 ${muted}`}>
        Still need help?{" "}
        <a href={`mailto:${config.supportEmail}`} className={linkClass}>
          {config.supportEmail}
        </a>
      </p>
    </>
  );
}
