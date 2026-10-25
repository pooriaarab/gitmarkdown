import type { MetadataRoute } from 'next';
import { articleHref, supportConfig } from '@/lib/support';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://gitmarkdown.com/support', changeFrequency: 'monthly', priority: 0.5 },
    ...supportConfig.articles.map((article) => ({
      url: `https://gitmarkdown.com${articleHref(article)}`,
      lastModified: new Date(`${article.updatedAt}T00:00:00Z`),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
    {
      url: 'https://gitmarkdown.com',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://gitmarkdown.com/login',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: 'https://gitmarkdown.com/templates',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: 'https://gitmarkdown.com/brand',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];
}
