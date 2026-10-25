export interface SupportCategory {
  name: string;
  slug: string;
  description: string;
}

export interface SupportArticle {
  title: string;
  slug: string;
  category: string;
  description: string;
  content: string;
  /** ISO date the article content was last changed. */
  updatedAt: string;
}

/** Per-site help center content and copy. Routes stay at `/support`. */
export interface SupportSiteConfig {
  siteName: string;
  supportEmail: string;
  /** Browser title + h1 prefix. Default: "Help center". */
  homeTitle?: string;
  /** Intro under the h1 on /support. */
  homeDescription: string;
  categories: SupportCategory[];
  articles: SupportArticle[];
  /** Optional extra links shown under a category (e.g. API reference). */
  extraCategoryLinks?: Array<{
    categorySlug: string;
    label: string;
    href: string;
    description?: string;
  }>;
}

export interface SupportTheme {
  link?: string;
  muted?: string;
  heading?: string;
  sectionBorder?: string;
  input?: string;
  prose?: string;
}
