/**
 * Webhook Dispatcher
 * Sends webhook events to registered endpoints
 */

import {
  Webhook,
  WebhookDelivery,
  WebhookEventType,
  WebhookPayload,
} from './types';

// =============================================================================
// Constants
// =============================================================================

const WEBHOOK_TIMEOUT_MS = 10000;  // 10 seconds
const MAX_FAILURE_COUNT = 5;       // Disable after 5 consecutive failures
const SIGNATURE_ALGORITHM = 'SHA-256';

// =============================================================================
// Signature Generation
// =============================================================================

async function generateSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: SIGNATURE_ALGORITHM },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );

  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// =============================================================================
// Webhook Delivery
// =============================================================================

interface DeliveryResult {
  success: boolean;
  statusCode: number | null;
  responseBody: string | null;
  responseTimeMs: number;
  error: string | null;
}

async function deliverWebhook(
  webhook: Webhook,
  payload: WebhookPayload
): Promise<DeliveryResult> {
  const payloadString = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signaturePayload = `${timestamp}.${payloadString}`;
  const signature = await generateSignature(signaturePayload, webhook.secret);

  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-ID': webhook.id,
        'X-Webhook-Timestamp': timestamp.toString(),
        'X-Webhook-Signature': `sha256=${signature}`,
        'User-Agent': 'WordPress-MCP-Webhook/1.0',
      },
      body: payloadString,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const responseTimeMs = Date.now() - startTime;

    let responseBody: string | null = null;
    try {
      responseBody = await response.text();
      // Truncate large responses
      if (responseBody.length > 1000) {
        responseBody = responseBody.substring(0, 1000) + '... (truncated)';
      }
    } catch {
      // Ignore response body parsing errors
    }

    return {
      success: response.ok,
      statusCode: response.status,
      responseBody,
      responseTimeMs,
      error: response.ok ? null : `HTTP ${response.status}`,
    };
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      success: false,
      statusCode: null,
      responseBody: null,
      responseTimeMs,
      error: errorMessage,
    };
  }
}

// =============================================================================
// Event Dispatching
// =============================================================================

export async function dispatchEvent<T>(
  db: D1Database,
  customerId: string,
  eventType: WebhookEventType,
  data: T
): Promise<void> {
  // Find active webhooks subscribed to this event
  const webhooks = await db
    .prepare(
      `SELECT * FROM webhooks
       WHERE customer_id = ?
       AND is_active = 1
       AND failure_count < ?`
    )
    .bind(customerId, MAX_FAILURE_COUNT)
    .all<Webhook>();

  // Filter webhooks that are subscribed to this event
  const subscribedWebhooks = webhooks.results.filter(webhook => {
    const events = JSON.parse(webhook.events) as WebhookEventType[];
    return events.includes(eventType);
  });

  if (subscribedWebhooks.length === 0) {
    return;
  }

  // Create payload
  const payload: WebhookPayload<T> = {
    id: crypto.randomUUID(),
    type: eventType,
    timestamp: new Date().toISOString(),
    data,
  };

  // Dispatch to all subscribed webhooks (in parallel, non-blocking)
  const deliveryPromises = subscribedWebhooks.map(async (webhook) => {
    const result = await deliverWebhook(webhook, payload);

    // Log delivery
    await logDelivery(db, webhook.id, eventType, payload, result);

    // Update webhook status
    await updateWebhookStatus(db, webhook.id, result);
  });

  // Don't await - let deliveries happen in background
  // In production, you might want to use Cloudflare Queues for reliability
  Promise.all(deliveryPromises).catch(() => {
    // Log error but don't fail the main operation
  });
}

async function logDelivery(
  db: D1Database,
  webhookId: string,
  eventType: WebhookEventType,
  payload: WebhookPayload,
  result: DeliveryResult
): Promise<void> {
  try {
    await db
      .prepare(
        `INSERT INTO webhook_deliveries
         (id, webhook_id, event_type, payload, status_code, response_body, response_time_ms, error_message, attempt_number, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`
      )
      .bind(
        crypto.randomUUID(),
        webhookId,
        eventType,
        JSON.stringify(payload),
        result.statusCode,
        result.responseBody,
        result.responseTimeMs,
        result.error
      )
      .run();
  } catch {
    // Ignore logging errors
  }
}

async function updateWebhookStatus(
  db: D1Database,
  webhookId: string,
  result: DeliveryResult
): Promise<void> {
  try {
    if (result.success) {
      // Reset failure count on success
      await db
        .prepare(
          `UPDATE webhooks
           SET last_triggered_at = datetime('now'),
               last_status_code = ?,
               failure_count = 0,
               updated_at = datetime('now')
           WHERE id = ?`
        )
        .bind(result.statusCode, webhookId)
        .run();
    } else {
      // Increment failure count
      await db
        .prepare(
          `UPDATE webhooks
           SET last_triggered_at = datetime('now'),
               last_status_code = ?,
               failure_count = failure_count + 1,
               updated_at = datetime('now')
           WHERE id = ?`
        )
        .bind(result.statusCode, webhookId)
        .run();

      // Disable if too many failures
      await db
        .prepare(
          `UPDATE webhooks
           SET is_active = 0
           WHERE id = ? AND failure_count >= ?`
        )
        .bind(webhookId, MAX_FAILURE_COUNT)
        .run();
    }
  } catch {
    // Ignore update errors
  }
}

// =============================================================================
// Delivery History
// =============================================================================

export async function getWebhookDeliveries(
  db: D1Database,
  customerId: string,
  webhookId: string,
  limit = 50
): Promise<WebhookDelivery[]> {
  // First verify webhook belongs to customer
  const webhook = await db
    .prepare('SELECT id FROM webhooks WHERE id = ? AND customer_id = ?')
    .bind(webhookId, customerId)
    .first();

  if (!webhook) {
    return [];
  }

  const result = await db
    .prepare(
      `SELECT * FROM webhook_deliveries
       WHERE webhook_id = ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .bind(webhookId, limit)
    .all<WebhookDelivery>();

  return result.results;
}

// =============================================================================
// Test Webhook
// =============================================================================

export async function testWebhook(
  db: D1Database,
  customerId: string,
  webhookId: string
): Promise<DeliveryResult> {
  const webhook = await db
    .prepare('SELECT * FROM webhooks WHERE id = ? AND customer_id = ?')
    .bind(webhookId, customerId)
    .first<Webhook>();

  if (!webhook) {
    return {
      success: false,
      statusCode: null,
      responseBody: null,
      responseTimeMs: 0,
      error: 'Webhook not found',
    };
  }

  const testPayload: WebhookPayload = {
    id: crypto.randomUUID(),
    type: 'subscription.updated',
    timestamp: new Date().toISOString(),
    data: {
      test: true,
      message: 'This is a test webhook delivery',
    },
  };

  return deliverWebhook(webhook, testPayload);
}
