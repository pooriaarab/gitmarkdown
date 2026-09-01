import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { createOctokitClient } from '@/lib/github/client';
import { listBranches, createBranch } from '@/lib/github/branches';
import { decrypt } from '@/app/api/auth/session/route';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');

    if (!owner || !repo) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
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
    const branches = await listBranches(octokit, owner, repo);
    return NextResponse.json(branches);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch branches';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { owner, repo, branchName, fromSha } = await request.json();

    if (!owner || !repo || !branchName || !fromSha) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
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
    await createBranch(octokit, owner, repo, branchName, fromSha);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create branch';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
