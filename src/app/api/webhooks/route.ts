import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { authenticateRequest } from '@/lib/auth/api-auth';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { encrypt } from '@/app/api/auth/session/route';
import net from 'net';

const MAX_WEBHOOKS_PER_USER = 10;

const VALID_EVENT_TYPES = new Set([
  'file.changed',
  'pr.opened',
  'comment.created',
  'sync.completed',
  '*',
]);

/**
 * Returns true if the hostname resolves to a private/internal network address.
 */
function isInternalHost(hostname: string): boolean {
  // Check IP address directly
  if (net.isIP(hostname)) {
    return isPrivateIP(hostname);
  }
  // Block common internal hostnames
  const lower = hostname.toLowerCase();
  if (
    lower === 'localhost' ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal')
  ) {
    return true;
  }
  return false;
}

function isPrivateIP(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    // 10.0.0.0/8
    if (parts[0] === 10) return true;
    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 169.254.0.0/16 (link-local)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 127.0.0.0/8 (loopback)
    if (parts[0] === 127) return true;
    // 0.0.0.0
    if (parts.every((p) => p === 0)) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    // ::1 loopback
    if (lower === '::1') return true;
    // fd00::/8 (unique local)
    if (lower.startsWith('fd')) return true;
    // fe80::/10 (link-local)
    if (lower.startsWith('fe80')) return true;
    return false;
  }
  return false;
}

/**
 * GET /api/webhooks — List all registered webhooks for the authenticated user.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: 30 requests/minute per user
    const rateLimited = checkRateLimit(auth.userId, { maxTokens: 30, refillRate: 0.5 });
    if (rateLimited) return rateLimited;

    const snap = await (await getAdminDb())
      .collection('webhooks')
      .doc(auth.userId)
      .collection('registrations')
      .get();

    const webhooks = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ webhooks });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to list webhooks';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/webhooks — Register a new webhook.
 *
 * Body:
 * {
 *   "url": "https://agent.example.com/callback",
 *   "events": ["file.changed", "pr.opened", "comment.created", "sync.completed"],
 *   "secret": "optional-hmac-secret"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: 30 requests/minute per user
    const rateLimited = checkRateLimit(auth.userId, { maxTokens: 30, refillRate: 0.5 });
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const { url, events, secret } = body as {
      url?: string;
      events?: string[];
      secret?: string;
    };

    if (!url || !events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: url, events (non-empty array)' },
        { status: 400 },
      );
    }

    // Validate event types against whitelist
    const invalidEvents = events.filter((e: string) => !VALID_EVENT_TYPES.has(e));
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        { error: `Invalid event types: ${invalidEvents.join(', ')}. Valid types: ${[...VALID_EVENT_TYPES].join(', ')}` },
        { status: 400 },
      );
    }

    // Basic URL validation
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Enforce HTTPS (allow localhost for development)
    if (parsedUrl.protocol !== 'https:' && parsedUrl.hostname !== 'localhost' && parsedUrl.hostname !== '127.0.0.1') {
      return NextResponse.json(
        { error: 'Webhook URL must use HTTPS (except localhost for development)' },
        { status: 400 },
      );
    }

    // Block internal/private network addresses (SSRF prevention)
    if (isInternalHost(parsedUrl.hostname)) {
      return NextResponse.json(
        { error: 'Webhook URL must not point to internal or private network addresses' },
        { status: 400 },
      );
    }

    // Check webhook registration limit
    const registrationsRef = (await getAdminDb())
      .collection('webhooks')
      .doc(auth.userId)
      .collection('registrations');
    const existingCount = await registrationsRef.count().get();
    if (existingCount.data().count >= MAX_WEBHOOKS_PER_USER) {
      return NextResponse.json(
        { error: `Maximum of ${MAX_WEBHOOKS_PER_USER} webhooks allowed per user` },
        { status: 400 },
      );
    }

    const data: Record<string, unknown> = {
      url,
      events,
      createdAt: new Date().toISOString(),
    };
    if (secret) {
      data.encryptedSecret = encrypt(secret);
    }

    const ref = await registrationsRef.add(data);

    return NextResponse.json(
      { id: ref.id, url, events, createdAt: data.createdAt },
      { status: 201 },
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to register webhook';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/webhooks?id=<webhookId> — Remove a webhook by ID.
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: 30 requests/minute per user
    const rateLimited = checkRateLimit(auth.userId, { maxTokens: 30, refillRate: 0.5 });
    if (rateLimited) return rateLimited;

    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get('id');

    if (!webhookId) {
      return NextResponse.json(
        { error: 'Missing query param: id' },
        { status: 400 },
      );
    }

    const docRef = (await getAdminDb())
      .collection('webhooks')
      .doc(auth.userId)
      .collection('registrations')
      .doc(webhookId);

    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 },
      );
    }

    await docRef.delete();
    return NextResponse.json({ deleted: true, id: webhookId });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to delete webhook';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
