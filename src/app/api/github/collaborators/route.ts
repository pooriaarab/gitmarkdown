import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { createOctokitClient } from '@/lib/github/client';
import { decrypt } from '@/app/api/auth/session/route';

async function getOctokitFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }
  const idToken = authHeader.split('Bearer ')[1];
  const decoded = await (await getAdminAuth()).verifyIdToken(idToken);
  const userDoc = await (await getAdminDb())
    .collection('users')
    .doc(decoded.uid)
    .get();
  const encryptedToken = userDoc.data()?.encryptedGithubToken;
  if (!encryptedToken) throw new Error('No GitHub token');
  return { octokit: createOctokitClient(decrypt(encryptedToken)), uid: decoded.uid };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');

    if (!owner || !repo) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    const { octokit } = await getOctokitFromRequest(request);

    // Fetch collaborators (works for repos you have admin/push access to)
    // Falls back to contributors for repos where you only have read access
    let users: { login: string; avatar_url: string; id: number }[] = [];

    try {
      const { data } = await octokit.repos.listCollaborators({
        owner,
        repo,
        per_page: 100,
      });
      users = data.map((u) => ({
        login: u.login,
        avatar_url: u.avatar_url,
        id: u.id,
      }));
    } catch {
      // Fallback to contributors if collaborators endpoint is forbidden
      const { data } = await octokit.repos.listContributors({
        owner,
        repo,
        per_page: 100,
      });
      users = (data || [])
        .filter((u): u is typeof u & { login: string } => u.login !== undefined)
        .map((u) => ({
          login: u.login!,
          avatar_url: u.avatar_url || '',
          id: u.id || 0,
        }));
    }

    return NextResponse.json(users);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch collaborators';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
