/**
 * Shared auth helper for API routes.
 * Supports Firebase Bearer token, per-user API keys (Firestore), and static API keys.
 */

import crypto from 'crypto';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { decrypt } from '@/app/api/auth/session/route';

export interface AuthResult {
  userId: string;
  githubToken: string;
}

/**
 * Authenticate an incoming API request.
 *
 * Checks (in order):
 *  1. Bearer token -- verified via Firebase Admin Auth, then looks up the
 *     encrypted GitHub token from Firestore.
 *  2. X-API-Key header:
 *     a. Static env var keys (backwards compat for MCP) -- matched against
 *        comma-separated keys in `API_KEYS` / `MCP_API_KEYS` env vars.
 *     b. Per-user API keys stored in Firestore -- looked up by SHA-256 hash.
 *
 * Returns null if authentication fails.
 */
export async function authenticateRequest(
  req: Request,
): Promise<AuthResult | null> {
  // --- Bearer token (Firebase) ---
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
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
      // Token invalid / expired -- fall through to API key check
    }
  }

  // --- API key (x-api-key header) ---
  const apiKey = req.headers.get('x-api-key');
  if (apiKey) {
    // 1. Check static env var keys (backwards compat for MCP)
    const mcpKeys = (process.env.MCP_API_KEYS ?? '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    const genericKeys = (process.env.API_KEYS ?? '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    const allStaticKeys = [...mcpKeys, ...genericKeys];

    if (allStaticKeys.length > 0) {
      const apiKeyBuf = Buffer.from(apiKey);
      const match = allStaticKeys.some((staticKey) => {
        const staticBuf = Buffer.from(staticKey);
        if (apiKeyBuf.length !== staticBuf.length) return false;
        return crypto.timingSafeEqual(apiKeyBuf, staticBuf);
      });
      if (match) {
        const githubToken = process.env.MCP_GITHUB_TOKEN ?? '';
        return { userId: 'api-key-user', githubToken };
      }
    }

    // 2. Look up per-user API key in Firestore by SHA-256 hash
    // NOTE: The collectionGroup query on 'keys' requires a Firestore composite
    // index on the 'keys' collection group with the 'keyHash' field.
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    try {
      const snapshot = await (await getAdminDb())
        .collectionGroup('keys')
        .where('keyHash', '==', keyHash)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const keyDoc = snapshot.docs[0];
        const userId = keyDoc.ref.parent.parent?.id;
        if (userId) {
          // Update lastUsedAt (fire-and-forget, don't block the request)
          keyDoc.ref
            .update({ lastUsedAt: new Date().toISOString() })
            .catch(() => {});

          // Look up user's GitHub token
          const userDoc = await (await getAdminDb())
            .collection('users')
            .doc(userId)
            .get();
          const encryptedToken = userDoc.data()?.encryptedGithubToken as
            | string
            | undefined;
          return {
            userId,
            githubToken: encryptedToken ? decrypt(encryptedToken) : '',
          };
        }
      }
    } catch (error) {
      console.error('Firestore API key lookup failed:', error);
    }
  }

  return null;
}
