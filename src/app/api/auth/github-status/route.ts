import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { createOctokitClient } from '@/lib/github/client';
import { decrypt } from '@/app/api/auth/session/route';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ connected: false, error: 'Not authenticated' });
    }
    const idToken = authHeader.split('Bearer ')[1];
    const decoded = await (await getAdminAuth()).verifyIdToken(idToken);
    const userDoc = await (await getAdminDb())
      .collection('users')
      .doc(decoded.uid)
      .get();
    const encryptedToken = userDoc.data()?.encryptedGithubToken;
    if (!encryptedToken) {
      return NextResponse.json({ connected: false, error: 'No GitHub token stored' });
    }
    const githubToken = decrypt(encryptedToken);
    if (!githubToken) {
      return NextResponse.json({ connected: false, error: 'Token decryption failed' });
    }
    const octokit = createOctokitClient(githubToken);
    const { data } = await octokit.rest.users.getAuthenticated();
    return NextResponse.json({
      connected: true,
      username: data.login,
      avatarUrl: data.avatar_url,
      name: data.name,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Connection check failed';
    return NextResponse.json({ connected: false, error: message });
  }
}
