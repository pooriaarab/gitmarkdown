import { buildArticleMarkdown, buildSupportIndexMarkdown } from "../markdown-export";
import { createSupportRegistry } from "../registry";
import { siteUrlFromRequest } from "../site-url";
import type { SupportSiteConfig } from "../types";

const markdownHeaders = {
  "Content-Type": "text/markdown; charset=utf-8",
  "Cache-Control": "public, max-age=3600, s-maxage=86400",
  Vary: "Host, X-Forwarded-Host, X-Forwarded-Proto",
} as const;

export function createSupportIndexMarkdownRoute(config: SupportSiteConfig) {
  return function GET(request: Request): Response {
    const siteUrl = siteUrlFromRequest(request);
    return new Response(buildSupportIndexMarkdown(config, siteUrl), { headers: markdownHeaders });
  };
}

export function createSupportArticleMarkdownRoute(config: SupportSiteConfig) {
  return async function GET(
    request: Request,
    context: { params: Promise<{ category: string; slug: string }> },
  ): Promise<Response> {
    const { category, slug } = await context.params;
    const article = createSupportRegistry(config).getArticle(category, slug);
    if (!article) return new Response("Not found", { status: 404 });
    const siteUrl = siteUrlFromRequest(request);
    return new Response(buildArticleMarkdown(article, siteUrl), {
      headers: { ...markdownHeaders, "X-Robots-Tag": "noindex" },
    });
  };
}
