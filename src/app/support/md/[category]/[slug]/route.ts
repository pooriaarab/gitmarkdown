import { createSupportArticleMarkdownRoute } from "@pooriaarab/support/next";
import { supportConfig } from "@/lib/support";

export const dynamic = "force-dynamic";

export const GET = createSupportArticleMarkdownRoute(supportConfig);
