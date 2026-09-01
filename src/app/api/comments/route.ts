import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const fileId = searchParams.get('fileId');

    if (!workspaceId || !fileId) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    const commentsRef = (await getAdminDb())
      .collection('workspaces')
      .doc(workspaceId)
      .collection('files')
      .doc(fileId)
      .collection('comments');

    const snapshot = await commentsRef.orderBy('createdAt', 'asc').get();
    const comments = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json(comments);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId, fileId, ...commentData } = body;

    if (!workspaceId || !fileId) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    const commentsRef = (await getAdminDb())
      .collection('workspaces')
      .doc(workspaceId)
      .collection('files')
      .doc(fileId)
      .collection('comments');

    const docRef = await commentsRef.add({
      ...commentData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ id: docRef.id });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}
