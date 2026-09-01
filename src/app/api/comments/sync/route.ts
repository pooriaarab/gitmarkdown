import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { createOctokitClient } from '@/lib/github/client';
import { listReviewComments, createReviewComment, fetchThreadDetails } from '@/lib/github/review-comments';
import { githubReactionToEmoji } from '@/lib/github/position-mapping';
import { getFileContent } from '@/lib/github/contents';
import {
  findAnchorInMarkdown,
  githubCommentToAnchor,
  charOffsetToLineNumber,
} from '@/lib/github/position-mapping';
import { decrypt } from '@/app/api/auth/session/route';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const { owner, repo, pullNumber, filePath, direction, commitId } = await request.json();

    if (!owner || !repo || !pullNumber || !filePath || !direction) {
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
    const repoFullName = `${owner}/${repo}`;

    // Fetch file content for position mapping
    let fileContent = '';
    try {
      const file = await getFileContent(octokit, owner, repo, filePath);
      fileContent = Buffer.from(file.content, 'base64').toString('utf-8');
    } catch {
      // File may not exist yet or may not be accessible
    }

    if (direction === 'from-github') {
      // Pull GitHub PR review comments into Firestore
      const ghComments = await listReviewComments(
        octokit,
        owner,
        repo,
        pullNumber,
        filePath
      );

      const commentsRef = (await getAdminDb()).collection('comments');
      let imported = 0;
      let resolved = 0;

      // Build a map of GitHub comment ID → Firestore doc ID for reply threading
      const ghIdToFirestoreId = new Map<string, string>();
      const existingDataMap = new Map<string, FirebaseFirestore.DocumentData>();

      // First pass: find existing mappings
      const existingSnap = await commentsRef
        .where('repoFullName', '==', repoFullName)
        .where('filePath', '==', filePath)
        .get();

      for (const doc of existingSnap.docs) {
        const data = doc.data();
        if (data.githubCommentId) {
          ghIdToFirestoreId.set(data.githubCommentId, doc.id);
          existingDataMap.set(data.githubCommentId, data);
        }
      }

      // Set of all GitHub comment IDs in this sync — used to detect deletions
      const activeGhIds = new Set(ghComments.map((c) => c.id.toString()));

      for (const ghComment of ghComments) {
        const ghId = ghComment.id.toString();

        // Skip if already imported
        if (ghIdToFirestoreId.has(ghId)) {
          // Check if content changed (update)
          const existingDocId = ghIdToFirestoreId.get(ghId)!;
          const existingData = existingDataMap.get(ghId);
          if (existingData && existingData.content !== ghComment.body) {
            await commentsRef.doc(existingDocId).update({
              content: ghComment.body,
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
          continue;
        }

        // Compute anchor position from line number
        const anchor = githubCommentToAnchor(
          fileContent,
          ghComment.line,
          ghComment.diff_hunk
        );

        // Determine parent comment ID (for replies)
        let parentCommentId: string | null = null;
        if (ghComment.in_reply_to_id) {
          parentCommentId =
            ghIdToFirestoreId.get(ghComment.in_reply_to_id.toString()) || null;
        }

        // Inherit branch from parent comment if it's a reply
        let branch: string | undefined;
        if (parentCommentId) {
          const parentDoc = existingSnap.docs.find((d) => d.id === parentCommentId);
          branch = parentDoc?.data()?.branch;
        }

        const newDoc: Record<string, unknown> = {
          repoFullName,
          filePath,
          fileId: filePath,
          author: {
            uid: `github-${ghComment.user?.login || 'unknown'}`,
            displayName: ghComment.user?.login || 'Unknown',
            photoURL: ghComment.user?.avatar_url || null,
            githubUsername: ghComment.user?.login || '',
          },
          content: ghComment.body,
          type: 'comment',
          anchorStart: anchor.anchorStart,
          anchorEnd: anchor.anchorEnd,
          anchorText: anchor.anchorText,
          reactions: {},
          parentCommentId,
          githubCommentId: ghId,
          status: 'active',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };
        if (branch) newDoc.branch = branch;

        const docRef = await commentsRef.add(newDoc);

        ghIdToFirestoreId.set(ghId, docRef.id);
        imported++;
      }

      // Fetch thread details (resolution, thread IDs, reactions) via GraphQL
      const threadDetails = await fetchThreadDetails(
        octokit, owner, repo, pullNumber
      );

      // Update resolution status, thread IDs, and reactions
      for (const [ghCommentDbId, info] of threadDetails) {
        const ghId = ghCommentDbId.toString();
        const firestoreId = ghIdToFirestoreId.get(ghId);
        if (!firestoreId) continue;

        const existingData = existingDataMap.get(ghId);
        const updates: Record<string, unknown> = {};

        // Sync resolution status
        const currentStatus = existingData?.status || 'active';
        const targetStatus = info.isResolved ? 'resolved' : 'active';
        if (currentStatus !== targetStatus) {
          updates.status = targetStatus;
          resolved++;
        }

        // Store thread ID for resolve/unresolve mutations
        if (existingData?.githubThreadId !== info.threadId) {
          updates.githubThreadId = info.threadId;
        }

        // Sync reactions from GitHub
        const ghReactions: Record<string, string[]> = {};
        for (const r of info.reactions) {
          const emoji = githubReactionToEmoji(r.content);
          if (emoji) {
            const uid = `github-${r.userLogin}`;
            if (!ghReactions[emoji]) ghReactions[emoji] = [];
            ghReactions[emoji].push(uid);
          }
        }
        // Merge with existing local reactions (keep local-only emoji, update GitHub-synced ones)
        const existingReactions = (existingData?.reactions || {}) as Record<string, string[]>;
        const mergedReactions = { ...existingReactions };
        // For each GitHub reaction emoji, set the users from GitHub
        for (const [emoji, users] of Object.entries(ghReactions)) {
          // Merge: keep local non-github users, add github users
          const localUsers = (mergedReactions[emoji] || []).filter((u: string) => !u.startsWith('github-'));
          mergedReactions[emoji] = [...new Set([...localUsers, ...users])];
        }
        // Remove empty reaction arrays
        for (const [emoji, users] of Object.entries(mergedReactions)) {
          if (users.length === 0) delete mergedReactions[emoji];
        }
        if (JSON.stringify(mergedReactions) !== JSON.stringify(existingReactions)) {
          updates.reactions = mergedReactions;
        }

        if (Object.keys(updates).length > 0) {
          updates.updatedAt = FieldValue.serverTimestamp();
          await commentsRef.doc(firestoreId).update(updates);
        }
      }

      return NextResponse.json({ success: true, imported, resolved });
    } else {
      // Push local Firestore comments to GitHub PR
      const commentsRef = (await getAdminDb()).collection('comments');
      const snapshot = await commentsRef
        .where('repoFullName', '==', repoFullName)
        .where('filePath', '==', filePath)
        .where('githubCommentId', '==', null)
        .get();

      let pushed = 0;

      for (const docSnap of snapshot.docs) {
        const comment = docSnap.data();

        // Skip replies for now — they need parent to be pushed first
        if (comment.parentCommentId) continue;

        // Compute line number from anchor
        const lineInfo = findAnchorInMarkdown(
          fileContent,
          comment.anchorText,
          comment.anchorStart
        );

        const line = lineInfo?.line || charOffsetToLineNumber(fileContent, comment.anchorStart) || 1;

        try {
          const ghComment = await createReviewComment(
            octokit,
            owner,
            repo,
            pullNumber,
            {
              body: comment.content,
              commitId: commitId || 'HEAD',
              path: filePath,
              line,
              startLine: lineInfo?.startLine,
            }
          );

          await commentsRef.doc(docSnap.id).update({
            githubCommentId: ghComment.id.toString(),
            updatedAt: FieldValue.serverTimestamp(),
          });
          pushed++;
        } catch (err) {
          // 422 = file not in PR diff — silently skip
          const status = (err as { status?: number }).status;
          if (status !== 422) {
            console.error('Failed to push comment to GitHub:', err);
          }
        }
      }

      return NextResponse.json({ success: true, pushed });
    }
  } catch (error) {
    console.error('Comment sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
