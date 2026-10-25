import type { SupportArticle } from "./types";

export function articleHref(article: Pick<SupportArticle, "category" | "slug">): string {
  return `/support/articles/${article.category}/${article.slug}`;
}

export function articleMarkdownPath(article: Pick<SupportArticle, "category" | "slug">): string {
  return `${articleHref(article)}.md`;
}

export const SUPPORT_INDEX_PATH = "/support";
export const SUPPORT_INDEX_MARKDOWN_PATH = "/support.md";
