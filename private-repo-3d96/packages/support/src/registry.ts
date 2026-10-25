import { articleHref } from "./routes";
import { articleHeadings, stripInline } from "./markdown";
import { searchEntries, type SearchEntry } from "./search";
import type { SupportArticle, SupportCategory, SupportSiteConfig } from "./types";

export interface SupportRegistry {
  config: SupportSiteConfig;
  categories: SupportCategory[];
  articles: SupportArticle[];
  getArticle(category: string, slug: string): SupportArticle | undefined;
  articleHref(article: Pick<SupportArticle, "category" | "slug">): string;
  search(query: string, limit?: number): SearchEntry[];
}

export function createSupportRegistry(config: SupportSiteConfig): SupportRegistry {
  const articles = config.articles;
  const categories = config.categories;

  const entries: SearchEntry[] = articles.map((article) => {
    const categoryName = categories.find((c) => c.slug === article.category)?.name ?? article.category;
    const headings = articleHeadings(article.content).map((h) => h.text).join(" ");
    return {
      title: article.title,
      description: article.description,
      headings,
      categoryName,
      href: articleHref(article),
    };
  });

  return {
    config,
    categories,
    articles,
    getArticle(category, slug) {
      return articles.find((a) => a.category === category && a.slug === slug);
    },
    articleHref,
    search(query, limit = 8) {
      return searchEntries(entries, query, limit);
    },
  };
}

export function plainTextForArticle(article: SupportArticle): string {
  return `${article.title} ${article.description} ${stripInline(article.content)}`;
}
