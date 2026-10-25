/** Ranked help-center search: title hits outrank description hits outrank heading hits. */

export interface SearchEntry {
  title: string;
  description: string;
  headings: string;
  categoryName: string;
  href: string;
}

export function searchEntries(entries: SearchEntry[], query: string, limit = 8): SearchEntry[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  return entries
    .map((entry) => {
      const title = entry.title.toLowerCase();
      const description = entry.description.toLowerCase();
      const headings = entry.headings.toLowerCase();
      let score = 0;
      for (const term of terms) {
        const s = (title.includes(term) ? 6 : 0) + (description.includes(term) ? 3 : 0) + (headings.includes(term) ? 1 : 0);
        if (s === 0) return { entry, score: 0 };
        score += s;
      }
      return { entry, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .slice(0, limit)
    .map((r) => r.entry);
}
