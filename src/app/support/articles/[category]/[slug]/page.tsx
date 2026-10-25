import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { articleHref, getSupportArticle, supportConfig } from "@/lib/support";
import { SupportArticleView } from "@pooriaarab/support/react";

type PageProps = { params: Promise<{ category: string; slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category, slug } = await params;
  const article = getSupportArticle(category, slug);
  if (!article) return { title: "Help center" };
  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: articleHref(article) },
  };
}

export default async function SupportArticlePage({ params }: PageProps) {
  const { category, slug } = await params;
  const article = getSupportArticle(category, slug);
  if (!article) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <SupportArticleView config={supportConfig} article={article} />
    </main>
  );
}
