import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.GITHUB_TOKEN_ENCRYPTION_KEY
  ? crypto.createHash('sha256').update(process.env.GITHUB_TOKEN_ENCRYPTION_KEY).digest()
  : crypto.createHash('sha256').update(process.env.FIREBASE_ADMIN_PRIVATE_KEY || '').digest();

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(encryptedText: string): string {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      console.error('decrypt: malformed input, expected 3 colon-separated parts');
      return '';
    }
    const [ivHex, tagHex, dataHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const data = Buffer.from(dataHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch (error) {
    console.error('decrypt: failed to decrypt:', error);
    return '';
  }
}

export async function POST(request: NextRequest) {
  try {
    const { uid, githubToken, idToken } = await request.json();

    // Verify the Firebase ID token
    const decodedToken = await (await getAdminAuth()).verifyIdToken(idToken);
    if (decodedToken.uid !== uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Encrypt and store the GitHub token
    const encryptedToken = encrypt(githubToken);
    await (await getAdminDb()).collection('users').doc(uid).set(
      { encryptedGithubToken: encryptedToken },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
