import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { createOctokitClient } from '@/lib/github/client';
import { listCommits, getCommit } from '@/lib/github/commits';
import { decrypt } from '@/app/api/auth/session/route';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    const path = searchParams.get('path') || undefined;
    const sha = searchParams.get('sha') || undefined;
    const commitSha = searchParams.get('commitSha');

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

    if (commitSha) {
      const commit = await getCommit(octokit, owner, repo, commitSha);
      return NextResponse.json(commit);
    }

    const includeStats = searchParams.get('includeStats') === 'true';
    const commits = await listCommits(octokit, owner, repo, { path, sha, includeStats });
    return NextResponse.json(commits);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch commits';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
