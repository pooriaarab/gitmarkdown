/** Help-center markdown subset: headings, paragraphs, lists, callouts, images, code. */

export type SupportBlock =
  | { type: "h2" | "h3"; id: string; text: string }
  | { type: "p"; text: string }
  | { type: "ul" | "ol"; items: string[] }
  | { type: "callout"; tone: "note" | "tip" | "warning"; text: string }
  | { type: "image"; alt: string; src: string }
  | { type: "code"; text: string };

const CALLOUT_RE = /^>\s*(Note|Tip|Warning):\s*(.+)$/;
const IMAGE_RE = /^!\[([^\]]*)\]\(([^)]+)\)$/;
const ORDERED_RE = /^\d+\.\s+(.*)$/;

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parseSupportMarkdown(content: string): SupportBlock[] {
  const blocks: SupportBlock[] = [];
  const lines = content.split("\n");
  let list: { type: "ul" | "ol"; items: string[] } | null = null;
  let code: string[] | null = null;
  const usedIds = new Set<string>();
  const uniqueId = (text: string) => {
    const base = slugifyHeading(stripInline(text)) || "section";
    let id = base;
    for (let n = 2; usedIds.has(id); n++) id = `${base}-${n}`;
    usedIds.add(id);
    return id;
  };
  const flush = () => {
    if (list) blocks.push(list);
    list = null;
  };
  for (const raw of lines) {
    if (raw.trim().startsWith("```")) {
      if (code) {
        blocks.push({ type: "code", text: code.join("\n") });
        code = null;
      } else {
        flush();
        code = [];
      }
      continue;
    }
    if (code) {
      code.push(raw);
      continue;
    }
    const line = raw.trim();
    const ordered = ORDERED_RE.exec(line);
    const callout = CALLOUT_RE.exec(line);
    const image = IMAGE_RE.exec(line);
    if (line.startsWith("## ") || line.startsWith("### ")) {
      flush();
      const text = line.replace(/^#+\s+/, "");
      blocks.push({ type: line.startsWith("### ") ? "h3" : "h2", id: uniqueId(text), text });
    } else if (ordered) {
      if (list?.type !== "ol") {
        flush();
        list = { type: "ol", items: [] };
      }
      list.items.push(ordered[1]!);
    } else if (line.startsWith("- ")) {
      if (list?.type !== "ul") {
        flush();
        list = { type: "ul", items: [] };
      }
      list.items.push(line.slice(2));
    } else if (callout) {
      flush();
      blocks.push({ type: "callout", tone: callout[1]!.toLowerCase() as "note" | "tip" | "warning", text: callout[2]! });
    } else if (image) {
      flush();
      blocks.push({ type: "image", alt: image[1]!, src: image[2]! });
    } else if (line !== "") {
      flush();
      blocks.push({ type: "p", text: line });
    }
  }
  if (code) blocks.push({ type: "code", text: code.join("\n") });
  flush();
  return blocks;
}

export function articleHeadings(content: string): Array<{ id: string; text: string }> {
  return parseSupportMarkdown(content).flatMap((b) => (b.type === "h2" ? [{ id: b.id, text: b.text }] : []));
}

export function stripInline(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/`([^`]+)`/g, "$1");
}
