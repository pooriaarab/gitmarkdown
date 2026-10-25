import { articleHref, articleMarkdownPath } from "./routes";
import type { SupportArticle, SupportSiteConfig } from "./types";

export function buildArticleMarkdown(article: SupportArticle, siteUrl: string): string {
  const origin = siteUrl.replace(/\/+$/, "");
  return `# ${article.title}

${article.description}

Source: ${origin}${articleHref(article)}
Markdown: ${origin}${articleMarkdownPath(article)}
Last updated: ${article.updatedAt}

${article.content}
`;
}

export function buildSupportIndexMarkdown(config: SupportSiteConfig, siteUrl: string): string {
  const origin = siteUrl.replace(/\/+$/, "");
  const title = config.homeTitle ?? "Help center";
  const sections = config.categories
    .map((category) => {
      const articles = config.articles.filter((a) => a.category === category.slug);
      const extra = (config.extraCategoryLinks ?? []).filter((l) => l.categorySlug === category.slug);
      if (articles.length === 0 && extra.length === 0) return "";
      const lines = articles.map(
        (a) => `- [${a.title}](${origin}${articleMarkdownPath(a)}): ${a.description}`,
      );
      for (const link of extra) {
        lines.push(`- [${link.label}](${origin}${link.href}.md)${link.description ? `: ${link.description}` : ""}`);
      }
      return `## ${category.name}\n\n${category.description}\n\n${lines.join("\n")}`;
    })
    .filter(Boolean);
  return `# ${title} · ${config.siteName}

${config.homeDescription}

Email ${config.supportEmail} if a guide does not answer your question.

${sections.join("\n\n")}
`;
}
