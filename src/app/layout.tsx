import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { ThemedToaster } from '@/components/ui/themed-toaster';
import { CodeThemeStyle } from '@/components/editor/code-theme-style';
import { isWorkerPreview, PREVIEW_ROBOTS } from '@/lib/preview';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const siteUrl = 'https://gitmarkdown.com';
const siteName = 'GitMarkdown';
const siteDescription =
  'A collaborative markdown editor with two-way GitHub sync, real-time collaboration, AI-powered editing, and inline reviews. Google Docs meets GitHub for Markdown.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'GitMarkdown - Collaborative Markdown Editor with GitHub Sync',
    template: '%s | GitMarkdown',
  },
  description: siteDescription,
  keywords: [
    'markdown editor',
    'github sync',
    'collaborative editing',
    'real-time collaboration',
    'ai writing assistant',
    'markdown',
    'github',
    'documentation',
    'technical writing',
    'open source',
  ],
  authors: [{ name: 'GitMarkdown' }],
  creator: 'GitMarkdown',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName,
    title: 'GitMarkdown - Collaborative Markdown Editor with GitHub Sync',
    description: siteDescription,
    images: [
      {
        url: '/og-image.png',
        width: 1440,
        height: 900,
        alt: 'GitMarkdown - Collaborative Markdown Editor',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GitMarkdown - Collaborative Markdown Editor with GitHub Sync',
    description: siteDescription,
    images: ['/og-image.png'],
  },
  robots: isWorkerPreview() ? PREVIEW_ROBOTS : {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/logomark.svg',
    apple: '/logomark.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "GitMarkdown",
              "url": "https://gitmarkdown.com",
              "description": "A collaborative markdown editor with two-way GitHub sync, real-time collaboration, AI-powered editing, and inline reviews.",
              "applicationCategory": "DeveloperApplication",
              "operatingSystem": "Web",
              "image": "https://gitmarkdown.com/og-image.png",
              "screenshot": "https://gitmarkdown.com/screenshots/hero-editor-preview.png",
              "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
              "featureList": [
                "Two-way GitHub sync",
                "Real-time collaboration with live cursors",
                "AI-powered editing and chat",
                "Inline comments and reviews",
                "Version history and diffs",
                "Slash commands",
                "Mermaid diagram generation",
                "Rich markdown editing"
              ]
            })
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
          <CodeThemeStyle />
          <ThemedToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
