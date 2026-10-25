import { isWorkerPreview } from '@/lib/preview';

export function GET(): Response {
  const body = isWorkerPreview()
    ? [
        'User-agent: *',
        'Content-Signal: search=no, ai-input=no, ai-train=no',
        'Disallow: /',
        '',
      ].join('\n')
    : [
        'User-Agent: *',
        'Allow: /',
        'Allow: /login',
        'Allow: /templates',
        'Disallow: /dashboard',
        'Disallow: /api/',
        'Disallow: /_next/',
        '',
        'Sitemap: https://gitmarkdown.com/sitemap.xml',
        '',
      ].join('\n');
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
