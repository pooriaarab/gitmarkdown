'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { onAuthChange } from '@/lib/firebase/auth';
import {
  GitBranch,
  Users,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Github,
  Shield,
  Globe,
  Check,
  ChevronRight,
  PanelLeft,
  History,
  ChevronDown,
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Code,
  Quote,
  Table,
  Image,
  Minus,
  ExternalLink,
  RotateCcw,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { LogoMark } from '@/components/ui/logo';

// ─── Typing animation hook ───
function useTypewriter(text: string, speed = 30, startDelay = 500) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const delayTimer = setTimeout(() => setStarted(true), startDelay);
    return () => clearTimeout(delayTimer);
  }, [startDelay]);

  useEffect(() => {
    if (!started) return;
    if (displayed.length >= text.length) return;
    const timer = setTimeout(() => {
      setDisplayed(text.slice(0, displayed.length + 1));
    }, speed);
    return () => clearTimeout(timer);
  }, [displayed, text, speed, started]);

  return displayed;
}

// ─── Per-file demo content ───
const fileHtmlContents: Record<string, string> = {
  'README.md':
    '<h1>Getting Started</h1><p>Welcome to <strong>GitMarkdown</strong> — a collaborative editor that syncs with GitHub.</p><h2>Quick Start</h2><ol><li>Connect your GitHub account</li><li>Select a repository</li><li>Start editing markdown files</li></ol><blockquote><p>Changes auto-save and sync to your repo.</p></blockquote>',
  'getting-started.md':
    '<h1>Getting Started Guide</h1><p>This guide walks you through setting up <strong>GitMarkdown</strong> for your team.</p><h2>Prerequisites</h2><ul><li>A GitHub account</li><li>At least one repository with markdown files</li></ul><h2>Step 1: Sign In</h2><p>Click <strong>Sign in with GitHub</strong> and authorize access to your repositories.</p>',
  'api-reference.md':
    '<h1>API Reference</h1><p>GitMarkdown exposes several APIs for integration.</p><h2>Authentication</h2><p>All API requests require a valid <code>Bearer</code> token.</p><h2>Endpoints</h2><p><code>GET /api/repos</code> — List connected repositories</p><p><code>POST /api/sync</code> — Trigger a manual sync</p>',
  'CHANGELOG.md':
    '<h1>Changelog</h1><h2>v1.2.0</h2><ul><li>Added AI-powered editing</li><li>Improved GitHub sync performance</li><li>Fixed comment threading bugs</li></ul><h2>v1.1.0</h2><ul><li>Real-time collaboration</li><li>Inline comments and reactions</li></ul>',
  'CONTRIBUTING.md':
    "<h1>Contributing</h1><p>We welcome contributions! Here's how to get started.</p><h2>Development Setup</h2><ol><li>Fork the repository</li><li>Clone your fork locally</li><li>Run <code>npm install</code></li><li>Run <code>npm run dev</code></li></ol><p>Please read our <strong>Code of Conduct</strong> before contributing.</p>",
};

function getAiResponse(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('summarize') || lower.includes('summary'))
    return 'This document is a quick-start guide for GitMarkdown. It covers connecting GitHub, selecting repos, and the auto-save sync workflow.';
  if (lower.includes('improve') || lower.includes('better') || lower.includes('suggestion'))
    return "I'd suggest adding code examples for each setup step, and including a troubleshooting section at the end for common issues.";
  if (lower.includes('grammar') || lower.includes('fix') || lower.includes('typo'))
    return 'I found 2 suggestions: Line 3 could use a comma after "However", and "it\'s" on line 7 should be "its" (possessive).';
  if (lower.includes('diagram') || lower.includes('mermaid') || lower.includes('chart'))
    return 'Here\'s a suggested flow:\n\nEdit → Auto-save → Push to GitHub → PR Review → Merge';
  if (lower.includes('hello') || lower.includes('hi ') || lower.includes('hey'))
    return "Hello! I'm your AI writing assistant. I can summarize docs, improve writing, fix grammar, or generate diagrams. What would you like?";
  return 'I can help with your markdown! Try asking me to summarize, suggest improvements, fix grammar, or generate a diagram.';
}

// ─── Interactive App Preview ───
function InteractivePreview() {
  const fullMarkdown = `# Getting Started\n\nWelcome to **GitMarkdown** — a collaborative editor that syncs with GitHub.\n\n## Quick Start\n\n1. Connect your GitHub account\n2. Select a repository\n3. Start editing markdown files\n\n> Changes auto-save and sync to your repo.`;

  const typewriterText = useTypewriter(fullMarkdown, 25, 800);
  const typewriterDone = typewriterText.length >= fullMarkdown.length;

  const [selectedFile, setSelectedFile] = useState('README.md');
  const [isEditing, setIsEditing] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});

  // AI state
  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState<{ role: string; text: string }[]>([]);
  const [aiTyping, setAiTyping] = useState(false);
  const aiScrollRef = useRef<HTMLDivElement>(null);

  // Switch to editable after typewriter finishes
  useEffect(() => {
    if (typewriterDone && !isEditing) {
      setIsEditing(true);
      requestAnimationFrame(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = fileHtmlContents['README.md'];
        }
      });
    }
  }, [typewriterDone, isEditing]);

  // Click-to-edit before typewriter finishes
  const handleEditorClick = () => {
    if (!isEditing) {
      setIsEditing(true);
      requestAnimationFrame(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = fileHtmlContents[selectedFile];
          editorRef.current.focus();
          const sel = window.getSelection();
          if (sel) {
            const range = document.createRange();
            range.selectNodeContents(editorRef.current);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      });
    }
  };

  // File switching
  const handleFileSelect = (file: string) => {
    setSelectedFile(file);
    if (isEditing && editorRef.current) {
      editorRef.current.innerHTML = fileHtmlContents[file] || `<h1>${file}</h1><p>Edit this file...</p>`;
    }
  };

  // Track active formatting at cursor position
  const updateActiveFormats = () => {
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      insertUnorderedList: document.queryCommandState('insertUnorderedList'),
      insertOrderedList: document.queryCommandState('insertOrderedList'),
    });
  };

  // Toolbar items
  const toolbarItems: { icon: typeof Bold; command: string | null; value?: string; key: string }[] = [
    { icon: Heading1, command: 'formatBlock', value: 'H1', key: 'h1' },
    { icon: Heading2, command: 'formatBlock', value: 'H2', key: 'h2' },
    { icon: Bold, command: 'bold', key: 'bold' },
    { icon: Italic, command: 'italic', key: 'italic' },
    { icon: Code, command: 'formatBlock', value: 'PRE', key: 'code' },
    { icon: List, command: 'insertUnorderedList', key: 'insertUnorderedList' },
    { icon: ListOrdered, command: 'insertOrderedList', key: 'insertOrderedList' },
    { icon: Quote, command: 'formatBlock', value: 'BLOCKQUOTE', key: 'quote' },
    { icon: Table, command: null, key: 'table' },
    { icon: Image, command: null, key: 'image' },
    { icon: Minus, command: 'insertHorizontalRule', key: 'hr' },
  ];

  const handleFormat = (command: string | null, value?: string) => {
    if (!command) return;
    if (!isEditing) {
      handleEditorClick();
      return;
    }
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    updateActiveFormats();
  };

  // AI send handler
  const handleAiSend = (text?: string) => {
    const msg = (text || aiInput).trim();
    if (!msg || aiTyping) return;
    setAiInput('');
    setAiMessages((prev) => [...prev, { role: 'user', text: msg }]);
    setAiTyping(true);
    setTimeout(() => {
      setAiTyping(false);
      setAiMessages((prev) => [
        ...prev,
        { role: 'assistant', text: getAiResponse(msg) },
      ]);
    }, 1200);
  };

  // Auto-scroll AI messages
  useEffect(() => {
    if (aiScrollRef.current) {
      aiScrollRef.current.scrollTop = aiScrollRef.current.scrollHeight;
    }
  }, [aiMessages, aiTyping]);

  const files = [
    { name: 'README.md', indent: 0 },
    { name: 'docs/', indent: 0, isDir: true },
    { name: 'getting-started.md', indent: 1 },
    { name: 'api-reference.md', indent: 1 },
    { name: 'CHANGELOG.md', indent: 0 },
    { name: 'CONTRIBUTING.md', indent: 0 },
  ];

  const suggestedPrompts = [
    'Summarize this document',
    'Suggest improvements',
    'Fix grammar issues',
  ];

  return (
    <div data-testid="interactive-preview" className="overflow-hidden rounded-xl border bg-card shadow-2xl" role="region" aria-label="Interactive application preview demonstrating GitMarkdown editor features">
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-400" />
          <div className="h-3 w-3 rounded-full bg-yellow-400" />
          <div className="h-3 w-3 rounded-full bg-green-400" />
        </div>
        <div className="ml-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <PanelLeft className="h-3.5 w-3.5" />
          <span className="font-semibold text-foreground">GitMarkdown</span>
          <ChevronRight className="h-3 w-3" />
          <span>acme/docs</span>
          <ChevronRight className="h-3 w-3" />
          <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" />main</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">{selectedFile}</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-[10px]">
            <Check className="h-3 w-3 text-green-500" />
            Synced
          </div>
        </div>
      </div>

      <div className="flex" style={{ height: 420 }}>
        {/* File tree */}
        <nav data-testid="preview-file-tree" className="w-52 shrink-0 border-r bg-muted/20 p-3" aria-label="File tree navigation for selecting markdown files to edit">
          <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Files</div>
          <div className="space-y-0.5 text-sm" role="list">
            {files.map((f) => (
              <button
                key={f.name}
                data-testid={`preview-file-${f.name.replace(/[/.]/g, '-')}`}
                aria-label={f.isDir ? `${f.name} folder` : `Open ${f.name} in the editor`}
                aria-current={f.name === selectedFile ? 'page' : undefined}
                onClick={() => !f.isDir && handleFileSelect(f.name)}
                className={`flex w-full items-center rounded px-2 py-1 text-left text-xs transition-colors ${
                  f.name === selectedFile
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent/50'
                }`}
                style={{ paddingLeft: `${8 + f.indent * 16}px` }}
              >
                {f.name}
              </button>
            ))}
          </div>
        </nav>

        {/* Editor */}
        <div data-testid="preview-editor" className="flex-1 flex flex-col min-w-0" role="region" aria-label="Markdown editor area with formatting toolbar and content">
          {/* Toolbar */}
          <div className="flex items-center gap-0.5 border-b px-3 py-1.5" role="toolbar" aria-label="Text formatting toolbar">
            {toolbarItems.map(({ icon: Icon, command, value, key }, i) => (
              <button
                key={i}
                data-testid={`preview-toolbar-${key}`}
                aria-label={`Format text as ${key}`}
                aria-pressed={!!activeFormats[key]}
                onClick={() => handleFormat(command, value)}
                className={`rounded p-1 transition-colors ${
                  activeFormats[key]
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>

          {/* Content area */}
          <div
            className="flex-1 overflow-auto p-6 cursor-text"
            onClick={!isEditing ? handleEditorClick : undefined}
          >
            {!isEditing ? (
              <div className="prose prose-sm max-w-none">
                {typewriterText.split('\n').map((line, i) => {
                  if (line.startsWith('# '))
                    return <h1 key={i} className="text-2xl font-bold mt-0 mb-3">{line.slice(2)}</h1>;
                  if (line.startsWith('## '))
                    return <h2 key={i} className="text-lg font-semibold mt-4 mb-2">{line.slice(3)}</h2>;
                  if (line.startsWith('> '))
                    return <blockquote key={i} className="border-l-3 border-border pl-3 text-muted-foreground italic text-sm">{line.slice(2)}</blockquote>;
                  if (line.match(/^\d+\. /))
                    return <div key={i} className="text-sm ml-4">{line}</div>;
                  if (line === '') return <div key={i} className="h-3" />;
                  const parts = line.split(/(\*\*[^*]+\*\*)/g);
                  return (
                    <p key={i} className="text-sm leading-relaxed my-1">
                      {parts.map((part, j) =>
                        part.startsWith('**') && part.endsWith('**')
                          ? <strong key={j}>{part.slice(2, -2)}</strong>
                          : <span key={j}>{part}</span>
                      )}
                    </p>
                  );
                })}
                <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5 align-text-bottom" />
              </div>
            ) : (
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-label="Rich text editor for editing the selected markdown file"
                aria-multiline="true"
                data-testid="preview-editor-content"
                className="prose prose-sm max-w-none outline-none min-h-full focus:outline-none [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-0 [&_h1]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_blockquote]:border-l-3 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_blockquote]:italic [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono [&_li]:text-sm [&_p]:text-sm [&_p]:leading-relaxed"
                onKeyUp={updateActiveFormats}
                onMouseUp={updateActiveFormats}
              />
            )}
          </div>
        </div>

        {/* AI Sidebar */}
        <aside data-testid="preview-ai-sidebar" className="w-64 shrink-0 border-l bg-muted/10 flex flex-col" aria-label="AI assistant sidebar for asking questions about your documents">
          <div className="flex items-center gap-2 border-b px-3 py-2.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold">AI Assistant</span>
          </div>
          <div ref={aiScrollRef} className="flex-1 p-3 space-y-3 overflow-auto" aria-live="polite" role="log" aria-label="AI conversation messages">
            {aiMessages.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <Sparkles className="h-6 w-6 text-muted-foreground/40 mb-3" />
                <p className="text-[11px] text-muted-foreground mb-3">Ask AI about your docs</p>
                <div className="space-y-1.5 w-full">
                  {suggestedPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      data-testid={`preview-ai-prompt-${prompt.toLowerCase().replace(/\s+/g, '-')}`}
                      aria-label={`Send suggested prompt: ${prompt}`}
                      onClick={() => handleAiSend(prompt)}
                      className="w-full rounded-md border bg-background px-2.5 py-1.5 text-left text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {aiMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`rounded-lg px-2.5 py-2 text-xs ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground ml-6'
                        : 'bg-muted mr-4 leading-relaxed'
                    }`}
                  >
                    {msg.text}
                  </div>
                ))}
                {aiTyping && (
                  <div className="rounded-lg bg-muted px-2.5 py-2 mr-4" role="status" aria-label="AI is typing a response">
                    <div className="flex gap-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="border-t p-2">
            <div className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1.5">
              <input
                data-testid="preview-ai-input"
                aria-label="Type a message to ask the AI assistant about your documents"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAiSend()}
                placeholder="Ask about your docs..."
                className="flex-1 text-[11px] bg-transparent outline-none placeholder:text-muted-foreground"
              />
              <button
                data-testid="preview-ai-send-button"
                aria-label="Send message to AI assistant"
                onClick={() => handleAiSend()}
                disabled={aiTyping || !aiInput.trim()}
                aria-busy={aiTyping}
                className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              >
                <Send className="h-3 w-3" />
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─── Bento Feature Cards ───

function GitSyncPreview() {
  return (
    <div className="mt-4 rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center gap-1.5 border-b bg-muted/30 px-3 py-1.5 text-[10px] text-muted-foreground">
        <GitBranch className="h-3 w-3" /> main
        <ChevronDown className="h-2.5 w-2.5" />
        <div className="flex-1" />
        <div className="flex items-center gap-1 rounded border bg-background px-1.5 py-0.5">
          <Check className="h-2.5 w-2.5 text-green-500" />
          Synced
        </div>
      </div>
      <div className="p-3 space-y-1.5">
        {['Push to main', 'Pull from GitHub', 'Create Pull Request'].map((action) => (
          <div key={action} className="flex items-center gap-2 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent/50">
            <ChevronRight className="h-3 w-3" />
            {action}
          </div>
        ))}
      </div>
    </div>
  );
}

function CollabPreview() {
  return (
    <div className="mt-4 rounded-lg border bg-card p-3">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center text-[8px] text-white font-bold">A</div>
          <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center text-[8px] text-white font-bold">B</div>
          <div className="h-5 w-5 rounded-full bg-purple-500 flex items-center justify-center text-[8px] text-white font-bold">C</div>
          <span className="text-[10px] text-muted-foreground ml-1">3 editors</span>
        </div>
        <div className="rounded bg-muted/50 p-2 text-xs leading-relaxed">
          <span>The quick brown fox </span>
          <span className="border-l-2 border-blue-500 bg-blue-500/10 px-0.5">jumps over</span>
          <span> the lazy </span>
          <span className="border-l-2 border-green-500 bg-green-500/10 px-0.5">dog|</span>
        </div>
        <div className="text-[10px] text-muted-foreground">Real-time CRDT-powered editing</div>
      </div>
    </div>
  );
}

function CommentsPreview() {
  return (
    <div className="mt-4 rounded-lg border bg-card p-3 space-y-2">
      <div className="rounded bg-yellow-500/10 border-l-2 border-yellow-500 p-2">
        <div className="text-[10px] font-medium mb-1">Sarah commented:</div>
        <div className="text-[10px] text-muted-foreground">&quot;Can we add more detail here about the API?&quot;</div>
      </div>
      <div className="rounded bg-muted p-2">
        <div className="text-[10px] font-medium mb-1">AI suggestion:</div>
        <div className="text-[10px] text-muted-foreground">&quot;Consider adding request/response examples.&quot;</div>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <button className="rounded border px-1.5 py-0.5 hover:bg-accent">Resolve</button>
        <button className="rounded border px-1.5 py-0.5 hover:bg-accent">Reply</button>
      </div>
    </div>
  );
}

function AIPreview() {
  return (
    <div className="mt-4 rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center gap-1.5 border-b bg-muted/30 px-3 py-1.5">
        <Sparkles className="h-3 w-3 text-primary" />
        <span className="text-[10px] font-semibold">AI Assistant</span>
      </div>
      <div className="p-3 space-y-2">
        <div className="rounded-lg bg-primary text-primary-foreground px-2 py-1.5 text-[10px] ml-6">
          Fix grammar in this section
        </div>
        <div className="rounded-lg bg-muted px-2 py-1.5 text-[10px] mr-4 leading-relaxed">
          <div className="rounded bg-red-500/10 px-1.5 py-0.5 line-through text-red-600 mb-1 text-[9px]">Their going to the store</div>
          <div className="rounded bg-green-500/10 px-1.5 py-0.5 text-green-600 text-[9px]">They&apos;re going to the store</div>
        </div>
      </div>
    </div>
  );
}

function EditorPreview() {
  return (
    <div className="mt-4 rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center gap-0.5 border-b px-2 py-1">
        {[Heading1, Bold, Italic, Code, List, Quote, Table, Image].map((Icon, i) => (
          <div key={i} className="rounded p-1 text-muted-foreground">
            <Icon className="h-3 w-3" />
          </div>
        ))}
      </div>
      <div className="p-3 text-xs space-y-1.5">
        <div className="text-base font-bold">Project Overview</div>
        <div className="text-muted-foreground">A modern editor with <strong>rich formatting</strong>, slash commands, and more.</div>
        <div className="flex items-center gap-2 text-[10px] mt-2">
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono">/table</span>
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono">/code</span>
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono">/image</span>
        </div>
      </div>
    </div>
  );
}

function VersionHistoryPreview() {
  return (
    <div className="mt-4 rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center gap-1.5 border-b bg-muted/30 px-3 py-1.5">
        <History className="h-3 w-3 text-primary" />
        <span className="text-[10px] font-semibold">Version History</span>
      </div>
      <div className="p-2 space-y-1">
        {[
          { msg: 'Update API docs', time: '2m ago', sha: 'a3f21b4' },
          { msg: 'Fix typo in README', time: '1h ago', sha: 'b7c9e01' },
          { msg: 'Add getting started', time: '3h ago', sha: 'e5d8f23' },
        ].map((c) => (
          <div key={c.sha} className="flex items-center gap-2 rounded px-2 py-1.5 text-[10px] hover:bg-accent/50">
            <div className="h-4 w-4 rounded-full bg-muted flex items-center justify-center text-[7px] font-bold">G</div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{c.msg}</div>
              <div className="text-muted-foreground">{c.time}</div>
            </div>
            <code className="text-[9px] text-muted-foreground font-mono">{c.sha}</code>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FAQ Data ───
const faqItems = [
  {
    q: 'How does GitHub sync work?',
    a: 'GitMarkdown connects to your GitHub repositories via OAuth. You can push, pull, and create pull requests directly from the editor. Changes are synced using the GitHub Contents API, so your files are always backed by your repo.',
  },
  {
    q: 'Is my data stored on your servers?',
    a: 'Your markdown content lives in your GitHub repository. We use Firebase for real-time collaboration features (comments, presence) but your actual file content is always in your repo. You own your data.',
  },
  {
    q: 'Can I use it for free?',
    a: 'Yes! GitMarkdown is open source and free to use. Connect your public or private GitHub repos and start editing right away.',
  },
  {
    q: 'What AI features are available?',
    a: 'You can chat with AI about your documents, use inline editing to fix grammar or improve writing, and generate Mermaid diagrams from natural language descriptions. We support both Anthropic (Claude) and OpenAI models.',
  },
  {
    q: 'Does it support real-time collaboration?',
    a: 'Yes! Multiple users can edit the same document simultaneously with live cursors and presence indicators. We use CRDTs (via Yjs) for conflict-free real-time merging.',
  },
  {
    q: 'What markdown features are supported?',
    a: 'Full GitHub-Flavored Markdown including tables, task lists, code blocks with syntax highlighting, blockquotes, images, horizontal rules, and more. Plus slash commands for quick insertion.',
  },
  {
    q: 'Can I use it with private repositories?',
    a: 'Absolutely. When you sign in with GitHub, you grant access to your repos. Both public and private repositories are fully supported.',
  },
];

// ─── Main Page ───
export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => setIsLoggedIn(!!user));
    return () => unsubscribe();
  }, []);

  const ctaHref = isLoggedIn ? '/dashboard' : '/login';
  const ctaLabel = isLoggedIn ? 'Go to Dashboard' : 'Sign in with GitHub';

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "GitMarkdown",
            "url": "https://gitmarkdown.com",
            "description": "A collaborative markdown editor with two-way GitHub sync, real-time collaboration, AI features, and inline reviews.",
            "applicationCategory": "DeveloperApplication",
            "operatingSystem": "Web",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "featureList": [
              "Two-way GitHub sync",
              "Real-time collaboration",
              "AI-powered editing",
              "Inline comments and reviews",
              "Version history",
              "Slash commands",
              "Mermaid diagram generation"
            ]
          })
        }}
      />
      {/* Nav */}
      <nav data-testid="main-nav" className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm" aria-label="Main navigation">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" data-testid="nav-logo" aria-label="GitMarkdown home page" className="flex items-center gap-2">
            <LogoMark className="h-6 w-6" />
            <span className="text-lg font-bold">GitMarkdown</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="#features" data-testid="nav-features-link" className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#faq" data-testid="nav-faq-link" className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </Link>
            {isLoggedIn ? (
              <Link href="/dashboard" data-testid="nav-dashboard-link">
                <Button size="sm">Go to Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/login" data-testid="nav-sign-in-link">
                  <Button variant="ghost" size="sm">Sign In</Button>
                </Link>
                <Link href="/login" data-testid="nav-get-started-link">
                  <Button size="sm">
                    <Github className="mr-1.5 h-4 w-4" />
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section data-testid="hero-section" className="mx-auto max-w-6xl px-4 pt-20 pb-16 text-center" aria-label="Hero section introducing GitMarkdown">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center rounded-full border px-3 py-1 text-sm text-muted-foreground">
            <Sparkles className="mr-1.5 h-3.5 w-3.5 text-yellow-500" />
            Now with AI-powered editing
          </div>
          <h1 data-testid="hero-heading" className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Google Docs meets GitHub
            <br />
            <span className="text-muted-foreground">for Markdown</span>
          </h1>
          <p data-testid="hero-description" className="mb-8 text-lg text-muted-foreground max-w-2xl mx-auto">
            A collaborative markdown editor with two-way GitHub sync, real-time collaboration, AI features, and inline reviews. Write better docs, together.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href={ctaHref} data-testid="hero-get-started">
              <Button size="lg" className="h-11 px-6">
                {!isLoggedIn && <Github className="mr-2 h-4 w-4" />}
                {ctaLabel}
              </Button>
            </Link>
            <Link href="#features" data-testid="hero-learn-more">
              <Button variant="outline" size="lg" className="h-11 px-6">
                Learn More
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Interactive Preview */}
      <section data-testid="interactive-preview-section" className="mx-auto max-w-5xl px-4 pb-24" aria-label="Interactive demo of the GitMarkdown editor">
        <InteractivePreview />
      </section>

      {/* Bento Feature Grid */}
      <section id="features" data-testid="features-section" className="border-t bg-muted/20 py-24" aria-label="Feature highlights for GitMarkdown">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-16 text-center">
            <h2 data-testid="features-heading" className="mb-3 text-3xl font-bold">Everything you need for collaborative docs</h2>
            <p className="text-muted-foreground">
              Built for teams that write markdown and use GitHub.
            </p>
          </div>

          {/* Bento grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* GitHub Sync - large */}
            <div data-testid="feature-github-sync" className="lg:col-span-2 rounded-xl border bg-card p-6 transition-shadow hover:shadow-md">
              <div className="flex items-center gap-2 mb-1">
                <GitBranch className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Two-Way GitHub Sync</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Push, pull, and create PRs directly from the editor. Your markdown stays in sync with your repository.
              </p>
              <GitSyncPreview />
            </div>

            {/* Real-time Collab */}
            <div data-testid="feature-real-time-collaboration" className="rounded-xl border bg-card p-6 transition-shadow hover:shadow-md">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Real-Time Collaboration</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Edit together with live cursors and conflict-free merging.
              </p>
              <CollabPreview />
            </div>

            {/* Comments */}
            <div data-testid="feature-inline-comments" className="rounded-xl border bg-card p-6 transition-shadow hover:shadow-md">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Inline Comments</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Add comments, suggestions, and reactions directly on text.
              </p>
              <CommentsPreview />
            </div>

            {/* AI - large */}
            <div data-testid="feature-ai-powered-editing" className="lg:col-span-2 rounded-xl border bg-card p-6 transition-shadow hover:shadow-md">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">AI-Powered Editing</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Chat with AI, use Cmd+K for inline edits, fix grammar, and generate diagrams automatically.
              </p>
              <AIPreview />
            </div>

            {/* Rich Editor */}
            <div data-testid="feature-rich-markdown-editor" className="rounded-xl border bg-card p-6 transition-shadow hover:shadow-md">
              <div className="flex items-center gap-2 mb-1">
                <Code className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Rich Markdown Editor</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Notion-like editing with slash commands, tables, and code blocks.
              </p>
              <EditorPreview />
            </div>

            {/* Version History */}
            <div data-testid="feature-version-history" className="lg:col-span-2 rounded-xl border bg-card p-6 transition-shadow hover:shadow-md">
              <div className="flex items-center gap-2 mb-1">
                <History className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Version History & Diff</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Browse commit history, view inline diffs, and restore any version with one click.
              </p>
              <VersionHistoryPreview />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" data-testid="faq-section" className="py-24" aria-label="Frequently asked questions about GitMarkdown">
        <div className="mx-auto max-w-3xl px-4">
          <div className="mb-12 text-center">
            <h2 data-testid="faq-heading" className="mb-3 text-3xl font-bold">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">
              Everything you need to know about GitMarkdown.
            </p>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`} data-testid={`faq-item-${i}`}>
                <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section data-testid="cta-section" className="border-t bg-muted/20 py-24" aria-label="Call to action to sign up for GitMarkdown">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold">Ready to write better docs?</h2>
          <p className="mb-8 text-muted-foreground">
            Connect your GitHub repos and start collaborating in minutes.
          </p>
          <Link href={ctaHref} data-testid="cta-get-started">
            <Button size="lg" className="h-11 px-8">
              {!isLoggedIn && <Github className="mr-2 h-5 w-5" />}
              {isLoggedIn ? 'Go to Dashboard' : 'Get Started Free'}
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer data-testid="footer" className="border-t py-8" aria-label="Footer with project information and credits">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LogoMark className="h-4 w-4" />
            GitMarkdown
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/brand" className="transition-colors hover:text-foreground">
              Brand
            </Link>
            <span className="flex items-center gap-1">
              <Shield className="h-4 w-4" />
              Open Source
            </span>
            <span className="flex items-center gap-1">
              <Globe className="h-4 w-4" />
              Built with Next.js
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
