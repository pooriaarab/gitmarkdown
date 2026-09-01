import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { createOctokitClient } from '@/lib/github/client';
import {
  listReviewComments,
  createReviewComment,
  replyToReviewComment,
  updateReviewComment,
  deleteReviewComment,
  addReactionToComment,
  listReactionsForComment,
  deleteReactionFromComment,
  resolveThread,
  unresolveThread,
} from '@/lib/github/review-comments';
import { decrypt } from '@/app/api/auth/session/route';

async function getOctokit(request: NextRequest) {
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
  if (!encryptedToken) {
    throw new Error('No GitHub token');
  }

  return createOctokitClient(decrypt(encryptedToken));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    const pullNumber = searchParams.get('pullNumber');
    const path = searchParams.get('path') || undefined;

    if (!owner || !repo || !pullNumber) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    const octokit = await getOctokit(request);
    const comments = await listReviewComments(
      octokit,
      owner,
      repo,
      parseInt(pullNumber, 10),
      path
    );
    return NextResponse.json(comments);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch review comments';
    const status = message === 'Unauthorized' || message === 'No GitHub token' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { owner, repo, pullNumber, body, commitId, path, line, startLine, inReplyTo, reaction, commentId: reactionCommentId, removeReaction } =
      await request.json();

    if (!owner || !repo) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    const octokit = await getOctokit(request);

    // Handle reaction add
    if (reaction && reactionCommentId && !removeReaction) {
      await addReactionToComment(octokit, owner, repo, reactionCommentId, reaction);
      return NextResponse.json({ success: true });
    }

    // Handle reaction removal: find matching reaction and delete it
    if (reaction && reactionCommentId && removeReaction) {
      const reactions = await listReactionsForComment(octokit, owner, repo, reactionCommentId);
      const matching = reactions.find(
        (r) => r.content === reaction && r.user.login === removeReaction
      );
      if (matching) {
        await deleteReactionFromComment(octokit, owner, repo, reactionCommentId, matching.id);
      }
      return NextResponse.json({ success: true });
    }

    if (!pullNumber || !body) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    if (inReplyTo) {
      const comment = await replyToReviewComment(
        octokit,
        owner,
        repo,
        pullNumber,
        inReplyTo,
        body
      );
      return NextResponse.json(comment);
    }

    if (!commitId || !path || !line) {
      return NextResponse.json(
        { error: 'Missing commitId, path, or line for new comment' },
        { status: 400 }
      );
    }

    const comment = await createReviewComment(octokit, owner, repo, pullNumber, {
      body,
      commitId,
      path,
      line,
      startLine,
    });
    return NextResponse.json(comment);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create review comment';
    const status = message === 'Unauthorized' || message === 'No GitHub token' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { owner, repo, commentId, body } = await request.json();

    if (!owner || !repo || !commentId || !body) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    const octokit = await getOctokit(request);
    const comment = await updateReviewComment(octokit, owner, repo, commentId, body);
    return NextResponse.json(comment);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update review comment';
    const status = message === 'Unauthorized' || message === 'No GitHub token' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { threadId, action } = await request.json();

    if (!threadId || !action) {
      return NextResponse.json({ error: 'Missing threadId or action' }, { status: 400 });
    }

    const octokit = await getOctokit(request);

    if (action === 'resolve') {
      await resolveThread(octokit, threadId);
    } else if (action === 'unresolve') {
      await unresolveThread(octokit, threadId);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update thread';
    const status = message === 'Unauthorized' || message === 'No GitHub token' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { owner, repo, commentId } = await request.json();

    if (!owner || !repo || !commentId) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    const octokit = await getOctokit(request);
    await deleteReviewComment(octokit, owner, repo, commentId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete review comment';
    const status = message === 'Unauthorized' || message === 'No GitHub token' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
