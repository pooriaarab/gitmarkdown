import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: 'GitHub OAuth not configured' },
      { status: 500 }
    );
  }
  return NextResponse.json({
    manageUrl: `https://github.com/settings/connections/applications/${clientId}`,
  });
}
