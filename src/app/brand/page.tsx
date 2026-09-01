import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { LogoMark } from '@/components/ui/logo';

export const metadata: Metadata = {
  title: 'Brand',
  description: 'The GitMarkdown brand and interface design principles.',
};

const palette = [
  { name: 'Canvas', value: 'oklch(1 0 0)', className: 'bg-white' },
  { name: 'Ink', value: 'oklch(0.145 0 0)', className: 'bg-zinc-950' },
  { name: 'Muted', value: 'oklch(0.97 0 0)', className: 'bg-zinc-100' },
  { name: 'Border', value: 'oklch(0.922 0 0)', className: 'bg-zinc-200' },
];

const principles = [
  {
    number: '01',
    title: 'Keep the document central',
    body: 'Repository tools frame the work. They never compete with the text.',
  },
  {
    number: '02',
    title: 'Make state explicit',
    body: 'Show unsaved work, sync, comments, and checks as distinct states.',
  },
  {
    number: '03',
    title: 'Stay close to GitHub',
    body: 'Use familiar repository terms and preserve the team workflow.',
  },
  {
    number: '04',
    title: 'Let themes reach the shell',
    body: 'Selected code themes can reskin the full app without changing structure.',
  },
];

export default function BrandPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <LogoMark className="h-6 w-6" />
            GitMarkdown
          </Link>
          <Link
            href="/design.md"
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Read design.md
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="border-b">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 md:grid-cols-[1.4fr_1fr] md:py-28">
          <div>
            <p className="mb-5 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Brand and interface
            </p>
            <h1 className="max-w-3xl text-5xl font-bold tracking-tight sm:text-7xl">
              Write together.
              <span className="block text-muted-foreground">Keep Git in the loop.</span>
            </h1>
          </div>
          <div className="flex items-end">
            <p className="max-w-md text-lg leading-8 text-muted-foreground">
              GitMarkdown joins a focused writing surface with repository-native
              review and collaboration.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b bg-muted/20">
        <div className="mx-auto grid max-w-6xl gap-px border-x bg-border md:grid-cols-4">
          {principles.map((principle) => (
            <article key={principle.number} className="bg-background p-6 md:min-h-64">
              <p className="font-mono text-xs text-muted-foreground">{principle.number}</p>
              <h2 className="mt-12 text-xl font-semibold">{principle.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{principle.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Mark
            </p>
            <div className="mt-6 flex aspect-square max-w-md items-center justify-center rounded-xl border bg-card shadow-sm">
              <LogoMark className="h-40 w-40" />
            </div>
            <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
              The primary mark combines a document, Markdown M, branch dot, and
              connector. Use it in the current text color.
            </p>
          </div>

          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Default palette
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {palette.map((color) => (
                <div key={color.name} className="overflow-hidden rounded-lg border bg-card">
                  <div className={`h-28 ${color.className}`} />
                  <div className="border-t p-4">
                    <p className="font-medium">{color.name}</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {color.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              This neutral set is the GitHub theme baseline. Other selected code
              themes intentionally derive a complete application palette.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y bg-zinc-950 text-zinc-50">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-2 md:py-28">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-400">
              Type
            </p>
            <p className="mt-8 text-5xl font-semibold tracking-tight sm:text-6xl">
              Geist keeps prose clear.
            </p>
          </div>
          <div className="flex flex-col justify-end gap-5 font-mono text-sm text-zinc-300">
            <p>Geist Sans — interface and document text</p>
            <p>Geist Mono — code, diffs, shortcuts, and file data</p>
            <p className="text-zinc-500">Aa Bb Cc 0123 {'{}'} / #</p>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-10 text-sm">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to GitMarkdown
        </Link>
        <Link href="/design.md" className="font-mono text-muted-foreground hover:text-foreground">
          /design.md
        </Link>
      </footer>
    </main>
  );
}
