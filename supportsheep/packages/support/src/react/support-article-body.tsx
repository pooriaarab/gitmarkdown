import { parseSupportMarkdown, type SupportBlock } from "../markdown";
import type { SupportTheme } from "../types";

const defaultTheme: SupportTheme = {
  prose: "prose prose-neutral dark:prose-invert max-w-none text-sm leading-relaxed",
  heading: "text-base font-semibold text-foreground mt-8 mb-2 first:mt-0",
  muted: "text-muted-foreground",
};

function renderBlock(block: SupportBlock, theme: SupportTheme, key: number) {
  switch (block.type) {
    case "h2":
      return (
        <h2 key={key} id={block.id} className={theme.heading}>
          {block.text}
        </h2>
      );
    case "h3":
      return (
        <h3 key={key} id={block.id} className={theme.heading}>
          {block.text}
        </h3>
      );
    case "p":
      return (
        <p key={key} className={`my-3 ${theme.muted ?? ""}`}>
          {block.text}
        </p>
      );
    case "ul":
      return (
        <ul key={key} className={`list-disc pl-5 my-3 space-y-1 ${theme.muted ?? ""}`}>
          {block.items.map((item, j) => (
            <li key={j}>{item}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={key} className={`list-decimal pl-5 my-3 space-y-1 ${theme.muted ?? ""}`}>
          {block.items.map((item, j) => (
            <li key={j}>{item}</li>
          ))}
        </ol>
      );
    case "callout":
      return (
        <p key={key} className={`my-3 rounded-md border border-border px-3 py-2 text-sm ${theme.muted ?? ""}`}>
          <strong className="text-foreground">{block.tone}:</strong> {block.text}
        </p>
      );
    case "image":
      return <img key={key} src={block.src} alt={block.alt} className="my-4 max-w-full rounded-md" />;
    case "code":
      return (
        <pre key={key} className="my-4 overflow-x-auto rounded-md bg-muted p-3 text-xs">
          <code>{block.text}</code>
        </pre>
      );
    default:
      return null;
  }
}

export function SupportArticleBody({ content, theme }: { content: string; theme?: SupportTheme }) {
  const merged = { ...defaultTheme, ...theme };
  const blocks = parseSupportMarkdown(content);
  return <div className={merged.prose}>{blocks.map((block, i) => renderBlock(block, merged, i))}</div>;
}
