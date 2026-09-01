import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { createOctokitClient } from '@/lib/github/client';
import { getFileContent, updateFileContent, createFile, deleteFile } from '@/lib/github/contents';
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
    const path = searchParams.get('path');
    const ref = searchParams.get('ref') || undefined;

    if (!owner || !repo || !path) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    const { octokit } = await getOctokitFromRequest(request);
    const content = await getFileContent(octokit, owner, repo, path, ref);
    return NextResponse.json(content);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch content';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { owner, repo, path, content, message, sha, branch } = await request.json();

    if (!owner || !repo || !path || !content || !message || !sha) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    const { octokit } = await getOctokitFromRequest(request);
    const result = await updateFileContent(octokit, owner, repo, path, content, message, sha, branch);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update content';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { owner, repo, path, content, message, branch } = await request.json();

    if (!owner || !repo || !path || content === undefined || !message) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    const { octokit } = await getOctokitFromRequest(request);
    const result = await createFile(octokit, owner, repo, path, content, message, branch);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create file';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { owner, repo, path, sha, message, branch } = await request.json();

    if (!owner || !repo || !path || !sha || !message) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    const { octokit } = await getOctokitFromRequest(request);
    const result = await deleteFile(octokit, owner, repo, path, sha, message, branch);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete file';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
