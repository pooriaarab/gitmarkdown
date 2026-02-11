import { NextResponse } from 'next/server';

export async function GET() {
  const slug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG;
  if (!slug) {
    return NextResponse.json(
      { error: 'GitHub App not configured' },
      { status: 500 }
    );
  }
  return NextResponse.json({
    installUrl: `https://github.com/apps/${slug}/installations/new`,
    manageUrl: `https://github.com/settings/installations`,
  });
}
