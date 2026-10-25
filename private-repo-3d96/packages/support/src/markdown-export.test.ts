import { describe, expect, test } from "bun:test";

import { buildSupportIndexMarkdown } from "./markdown-export";
import type { SupportSiteConfig } from "./types";

const config: SupportSiteConfig = {
  siteName: "Example",
  supportEmail: "support@example.com",
  homeDescription: "Guides for Example.",
  categories: [{ slug: "start", name: "Start", description: "First steps." }],
  articles: [
    {
      slug: "hello",
      category: "start",
      title: "Hello",
      description: "Say hi.",
      updatedAt: "2026-10-24",
      content: "## Hi\n\nWelcome.",
    },
  ],
};

describe("buildSupportIndexMarkdown", () => {
  test("includes site name and article link", () => {
    const md = buildSupportIndexMarkdown(config, "https://example.com");
    expect(md).toContain("Example");
    expect(md).toContain("support@example.com");
    expect(md).toContain("/support/articles/start/hello.md");
  });
});
