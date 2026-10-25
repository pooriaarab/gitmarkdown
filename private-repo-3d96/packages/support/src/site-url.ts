/** Canonical origin for markdown twins (no trailing slash). */
export function siteUrlFromRequest(request: Request): string {
  return new URL(request.url).origin;
}
