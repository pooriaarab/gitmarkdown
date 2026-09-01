import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { createOctokitClient } from '@/lib/github/client';
import { getRepoTree } from '@/lib/github/contents';
import { decrypt } from '@/app/api/auth/session/route';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    const branch = searchParams.get('branch') || 'main';

    if (!owner || !repo) {
      return NextResponse.json({ error: 'Missing owner or repo' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decoded = await (await getAdminAuth()).verifyIdToken(idToken);
    const userDoc = await (await getAdminDb())
      .collection('users')
      .doc(decoded.uid)
      .get();
    const encryptedToken = userDoc.data()?.encryptedGithubToken;
    if (!encryptedToken) {
      return NextResponse.json({ error: 'No GitHub token' }, { status: 401 });
    }

    const octokit = createOctokitClient(decrypt(encryptedToken));
    const tree = await getRepoTree(octokit, owner, repo, branch);
    return NextResponse.json(tree);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch tree';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
