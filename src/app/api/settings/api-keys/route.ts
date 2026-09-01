import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { decrypt } from '@/app/api/auth/session/route';

const MAX_KEYS_PER_USER = 5;
const KEY_PREFIX = 'gmk_';

/**
 * Authenticate the request using Firebase Bearer token ONLY.
 * API key management must not be accessible via API keys themselves.
 */
async function authenticateWithFirebase(
  req: NextRequest,
): Promise<{ userId: string; githubToken: string } | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  try {
    const idToken = authHeader.slice(7);
    const decoded = await (await getAdminAuth()).verifyIdToken(idToken);
    const userDoc = await (await getAdminDb())
      .collection('users')
      .doc(decoded.uid)
      .get();
    const encryptedToken = userDoc.data()?.encryptedGithubToken as
      | string
      | undefined;
    return {
      userId: decoded.uid,
      githubToken: encryptedToken ? decrypt(encryptedToken) : '',
    };
  } catch {
    return null;
  }
}

/**
 * POST /api/settings/api-keys
 * Generate a new API key for the authenticated user.
 * Body: { "label": "My agent key" }
 * Returns the full key ONLY on creation.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateWithFirebase(req);
  if (!auth) {
    return NextResponse.json(
      { error: 'API key management requires Firebase authentication' },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();
    const label = typeof body.label === 'string' ? body.label.trim() : '';
    if (!label || label.length > 100) {
      return NextResponse.json(
        { error: 'Label is required and must be 100 characters or fewer' },
        { status: 400 },
      );
    }

    // Generate the key: gmk_ + 32 random bytes hex = 68 chars total
    const rawBytes = crypto.randomBytes(32);
    const rawKey = KEY_PREFIX + rawBytes.toString('hex');

    // Hash the key for storage (SHA-256)
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    // Display prefix: first 8 hex chars after "gmk_"
    const prefix = rawKey.slice(0, 12); // "gmk_" (4) + 8 hex chars

    const now = new Date().toISOString();

    // Use a transaction to atomically check count + create key
    const keysRef = (await getAdminDb())
      .collection('apiKeys')
      .doc(auth.userId)
      .collection('keys');

    const newDocRef = keysRef.doc(); // pre-generate doc ref for use inside transaction
    await (await getAdminDb()).runTransaction(async (transaction) => {
      const snapshot = await transaction.get(keysRef);
      if (snapshot.size >= MAX_KEYS_PER_USER) {
        throw new Error(`Maximum of ${MAX_KEYS_PER_USER} API keys allowed per user`);
      }
      transaction.set(newDocRef, {
        keyHash,
        label,
        prefix,
        createdAt: now,
        lastUsedAt: null,
      });
    });

    // Return the full key ONLY on creation
    return NextResponse.json({
      id: newDocRef.id,
      key: rawKey,
      label,
      prefix,
      createdAt: now,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.startsWith('Maximum of')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error('API key creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/settings/api-keys
 * List all API keys for the authenticated user.
 * Never returns the actual key, only metadata.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateWithFirebase(req);
  if (!auth) {
    return NextResponse.json(
      { error: 'API key management requires Firebase authentication' },
      { status: 401 },
    );
  }

  try {
    const keysRef = (await getAdminDb())
      .collection('apiKeys')
      .doc(auth.userId)
      .collection('keys');
    const snapshot = await keysRef.orderBy('createdAt', 'desc').get();

    const keys = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        label: data.label,
        prefix: data.prefix,
        createdAt: data.createdAt,
        lastUsedAt: data.lastUsedAt,
      };
    });

    return NextResponse.json(keys);
  } catch (error) {
    console.error('API key list error:', error);
    return NextResponse.json(
      { error: 'Failed to list API keys' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/settings/api-keys?id=<keyId>
 * Revoke an API key.
 */
export async function DELETE(req: NextRequest) {
  const auth = await authenticateWithFirebase(req);
  if (!auth) {
    return NextResponse.json(
      { error: 'API key management requires Firebase authentication' },
      { status: 401 },
    );
  }

  const keyId = req.nextUrl.searchParams.get('id');
  if (!keyId) {
    return NextResponse.json(
      { error: 'Missing required query parameter: id' },
      { status: 400 },
    );
  }

  try {
    const keyRef = (await getAdminDb())
      .collection('apiKeys')
      .doc(auth.userId)
      .collection('keys')
      .doc(keyId);

    const keyDoc = await keyRef.get();
    if (!keyDoc.exists) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 },
      );
    }

    await keyRef.delete();

    return NextResponse.json({ deleted: true, id: keyId });
  } catch (error) {
    console.error('API key deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 },
    );
  }
}
