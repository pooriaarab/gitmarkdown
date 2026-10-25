export const PREVIEW_ROBOTS =
  'noindex, nofollow, noarchive, nosnippet, noimageindex, noai, noimageai';

export function isWorkerPreview(): boolean {
  return process.env.ENVIRONMENT === 'preview';
}
