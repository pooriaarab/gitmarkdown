import { NextResponse } from 'next/server';
import { isWorkerPreview, PREVIEW_ROBOTS } from '@/lib/preview';

export function middleware() {
  const response = NextResponse.next();
  if (isWorkerPreview()) {
    response.headers.set('X-Robots-Tag', PREVIEW_ROBOTS);
    response.headers.set('Content-Signal', 'search=no, ai-input=no, ai-train=no');
  }
  return response;
}
