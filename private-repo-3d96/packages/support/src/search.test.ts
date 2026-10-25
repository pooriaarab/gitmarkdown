import { describe, expect, test } from "bun:test";

import { searchEntries } from "./search";

describe("searchEntries", () => {
  const entries = [
    { title: "Billing FAQ", description: "Invoices and plans", headings: "Upgrade", categoryName: "Billing", href: "/support/articles/billing/faq" },
    { title: "Widget setup", description: "Install the chat widget", headings: "Snippet", categoryName: "Getting started", href: "/support/articles/start/widget" },
  ];

  test("ranks title matches above description", () => {
    const results = searchEntries(entries, "billing");
    expect(results[0]?.title).toBe("Billing FAQ");
  });

  test("returns empty for blank query", () => {
    expect(searchEntries(entries, "   ")).toEqual([]);
  });
});
