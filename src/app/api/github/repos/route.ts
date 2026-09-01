import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { createOctokitClient } from '@/lib/github/client';
import { listUserRepos, getRepo, createRepo } from '@/lib/github/repos';
import { decrypt } from '@/app/api/auth/session/route';

async function getOctokitFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing authorization header');
  }
  const idToken = authHeader.split('Bearer ')[1];
  const decoded = await (await getAdminAuth()).verifyIdToken(idToken);
  const userDoc = await (await getAdminDb())
    .collection('users')
    .doc(decoded.uid)
    .get();
  const encryptedToken = userDoc.data()?.encryptedGithubToken;
  if (!encryptedToken) throw new Error('No GitHub token found');
  const githubToken = decrypt(encryptedToken);
  return createOctokitClient(githubToken);
}

export async function GET(request: NextRequest) {
  try {
    const octokit = await getOctokitFromRequest(request);
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');

    // Single repo lookup when owner & repo are provided
    if (owner && repo) {
      const repoData = await getRepo(octokit, owner, repo);
      return NextResponse.json(repoData);
    }

    const repos = await listUserRepos(octokit);
    return NextResponse.json(repos);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch repos';
    const status = (error as { status?: number }).status ?? 500;
    return NextResponse.json({ error: message }, { status: status >= 400 ? status : 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const octokit = await getOctokitFromRequest(request);
    const { name, description, isPrivate, autoInit } = await request.json();
    if (!name) {
      return NextResponse.json({ error: 'Repository name is required' }, { status: 400 });
    }
    const repo = await createRepo(octokit, name, { description, isPrivate, autoInit });
    return NextResponse.json(repo);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create repository';
    // Forward GitHub API status (e.g. 422 for validation errors like duplicate name)
    const status = (error as { status?: number }).status ?? 500;
    return NextResponse.json({ error: message }, { status: status >= 400 ? status : 500 });
  }
}
