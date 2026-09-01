/**
 * Webhook dispatch utility.
 * Loads a user's registered webhooks from Firestore, filters by event type,
 * and POSTs the payload to each matching URL. Fire-and-forget.
 *
 * Retries on 5xx / network errors with exponential backoff (up to 3 attempts).
 * 4xx responses are treated as permanent failures and are not retried.
 */

import crypto from 'crypto';
import { getAdminDb } from '@/lib/firebase/admin';
import { decrypt } from '@/app/api/auth/session/route';

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1_000;

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
  signature?: string;
}

interface WebhookDoc {
  id: string;
  url: string;
  events: string[];
  encryptedSecret?: string;
}

function sign(payload: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  return `sha256=${hmac.digest('hex')}`;
}

/**
 * Verify an incoming webhook signature against the expected secret.
 *
 * Use this on the receiving end to validate that a webhook payload was
 * genuinely sent by GitMarkdown and has not been tampered with.
 *
 * @example
 * ```ts
 * import { verifySignature } from '@/lib/webhooks/dispatch';
 *
 * const rawBody = await request.text();
 * const header = request.headers.get('X-Hub-Signature-256') ?? '';
 * if (!verifySignature(rawBody, header, process.env.WEBHOOK_SECRET!)) {
 *   return new Response('Invalid signature', { status: 401 });
 * }
 * ```
 */
export function verifySignature(
  payload: string,
  signatureHeader: string,
  secret: string,
): boolean {
  const expected = sign(payload, secret);
  if (expected.length !== signatureHeader.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signatureHeader),
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Dispatch an event to all matching webhooks for a given user.
 * Non-blocking — failures are logged but never thrown.
 */
export async function dispatchWebhookEvent(
  userId: string,
  event: string,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    const snap = await (await getAdminDb())
      .collection('webhooks')
      .doc(userId)
      .collection('registrations')
      .get();

    if (snap.empty) return;

    const webhooks: WebhookDoc[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<WebhookDoc, 'id'>),
    }));

    const matching = webhooks.filter(
      (w) => w.events.includes('*') || w.events.includes(event),
    );

    if (matching.length === 0) return;

    const timestamp = new Date().toISOString();
    const payload: WebhookPayload = { event, timestamp, data };
    const body = JSON.stringify(payload);

    const deliveries = matching.map(async (webhook) => {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent': 'GitMarkdown-Webhook/1.0',
        };

        if (webhook.encryptedSecret) {
          let secret: string;
          try {
            secret = decrypt(webhook.encryptedSecret);
          } catch (err) {
            console.error(
              `[Webhook] Failed to decrypt secret for ${webhook.url}, skipping delivery:`,
              err,
            );
            return;
          }
          headers['X-Hub-Signature-256'] = sign(body, secret);
        }

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          try {
            const res = await fetch(webhook.url, {
              method: 'POST',
              headers,
              body,
              signal: AbortSignal.timeout(10_000),
            });

            if (res.ok) return; // success

            // 4xx — permanent failure, don't retry
            if (res.status >= 400 && res.status < 500) {
              console.warn(
                `[Webhook] Permanent failure for ${webhook.url}: ${res.status} (attempt ${attempt}/${MAX_ATTEMPTS})`,
              );
              return;
            }

            // 5xx — transient failure, retry with backoff
            console.warn(
              `[Webhook] Transient failure for ${webhook.url}: ${res.status} (attempt ${attempt}/${MAX_ATTEMPTS})`,
            );
          } catch (networkErr) {
            console.warn(
              `[Webhook] Network error for ${webhook.url} (attempt ${attempt}/${MAX_ATTEMPTS}):`,
              networkErr,
            );
          }

          if (attempt < MAX_ATTEMPTS) {
            await delay(BASE_DELAY_MS * Math.pow(2, attempt - 1));
          }
        }

        console.error(
          `[Webhook] All ${MAX_ATTEMPTS} attempts failed for ${webhook.url}`,
        );
      } catch (err) {
        console.warn(`[Webhook] Delivery error for ${webhook.url}:`, err);
      }
    });

    // Keep the Worker alive until every concurrent delivery settles.
    await Promise.allSettled(deliveries);
  } catch (err) {
    console.error('[Webhook] Failed to load webhooks:', err);
  }
}
