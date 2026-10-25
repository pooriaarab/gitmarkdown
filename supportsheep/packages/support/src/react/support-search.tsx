"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { createSupportRegistry, type SupportRegistry } from "../registry";
import type { SupportSiteConfig, SupportTheme } from "../types";

export function SupportSearch({
  config,
  registry,
  theme,
  placeholder = "Search articles…",
  testId = "support-search-input",
}: {
  config: SupportSiteConfig;
  registry?: SupportRegistry;
  theme?: SupportTheme;
  placeholder?: string;
  testId?: string;
}) {
  const reg = useMemo(() => registry ?? createSupportRegistry(config), [config, registry]);
  const [query, setQuery] = useState("");
  const results = useMemo(() => (query.trim() ? reg.search(query) : []), [query, reg]);
  const linkClass = theme?.link ?? "text-sm text-primary hover:underline";
  const muted = theme?.muted ?? "text-sm text-muted-foreground";
  const inputClass =
    theme?.input ?? "mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

  return (
    <div className="mt-6" role="search">
      <label htmlFor="support-search" className="text-sm font-medium text-foreground">
        Search articles
      </label>
      <input
        id="support-search"
        type="search"
        data-testid={testId}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
      {query.trim() ? (
        <ul className="mt-3 space-y-2" data-testid="support-search-results">
          {results.length === 0 ? (
            <li className={muted}>
              No articles match — email{" "}
              <a href={`mailto:${config.supportEmail}`} className={linkClass}>
                {config.supportEmail}
              </a>
              .
            </li>
          ) : (
            results.map((entry) => (
              <li key={entry.href}>
                <Link href={entry.href} className={linkClass}>
                  {entry.title}
                </Link>
                <span className={`ml-2 ${muted}`}>{entry.categoryName}</span>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
