/**
 * Webhook Service
 * CRUD operations for webhooks
 */

import {
  Webhook,
  WebhookEventType,
  CreateWebhookRequest,
  UpdateWebhookRequest,
  WebhookResponse,
  WEBHOOK_EVENT_TYPES,
} from './types';

// =============================================================================
// Constants
// =============================================================================

const MAX_WEBHOOKS_PER_CUSTOMER = 10;
const WEBHOOK_SECRET_LENGTH = 32;

// =============================================================================
// Helper Functions
// =============================================================================

function generateWebhookSecret(): string {
  const array = new Uint8Array(WEBHOOK_SECRET_LENGTH);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateId(): string {
  return crypto.randomUUID();
}

function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function validateEvents(events: string[]): { valid: boolean; invalid: string[] } {
  const invalid = events.filter(e => !WEBHOOK_EVENT_TYPES.includes(e as WebhookEventType));
  return {
    valid: invalid.length === 0,
    invalid,
  };
}

function webhookToResponse(webhook: Webhook): WebhookResponse {
  return {
    id: webhook.id,
    url: webhook.url,
    events: JSON.parse(webhook.events) as WebhookEventType[],
    isActive: webhook.is_active === 1,
    description: webhook.description,
    lastTriggeredAt: webhook.last_triggered_at,
    lastStatusCode: webhook.last_status_code,
    failureCount: webhook.failure_count,
    createdAt: webhook.created_at,
  };
}

// =============================================================================
// CRUD Operations
// =============================================================================

export async function createWebhook(
  db: D1Database,
  customerId: string,
  request: CreateWebhookRequest
): Promise<{ webhook?: WebhookResponse; error?: string }> {
  // Validate URL
  if (!validateUrl(request.url)) {
    return { error: 'URL must be a valid HTTPS URL' };
  }

  // Validate events
  if (!request.events || request.events.length === 0) {
    return { error: 'At least one event type is required' };
  }

  const eventValidation = validateEvents(request.events);
  if (!eventValidation.valid) {
    return { error: `Invalid event types: ${eventValidation.invalid.join(', ')}` };
  }

  // Check webhook limit
  const countResult = await db
    .prepare('SELECT COUNT(*) as count FROM webhooks WHERE customer_id = ?')
    .bind(customerId)
    .first<{ count: number }>();

  if (countResult && countResult.count >= MAX_WEBHOOKS_PER_CUSTOMER) {
    return { error: `Maximum ${MAX_WEBHOOKS_PER_CUSTOMER} webhooks allowed per customer` };
  }

  // Check for duplicate URL
  const existing = await db
    .prepare('SELECT id FROM webhooks WHERE customer_id = ? AND url = ?')
    .bind(customerId, request.url)
    .first();

  if (existing) {
    return { error: 'A webhook with this URL already exists' };
  }

  // Create webhook
  const id = generateId();
  const secret = generateWebhookSecret();

  await db
    .prepare(
      `INSERT INTO webhooks (id, customer_id, url, secret, events, description, is_active, failure_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, 0, datetime('now'), datetime('now'))`
    )
    .bind(
      id,
      customerId,
      request.url,
      secret,
      JSON.stringify(request.events),
      request.description || null
    )
    .run();

  const webhook = await db
    .prepare('SELECT * FROM webhooks WHERE id = ?')
    .bind(id)
    .first<Webhook>();

  if (!webhook) {
    return { error: 'Failed to create webhook' };
  }

  // Return webhook with secret (only shown once)
  const response = webhookToResponse(webhook);
  return {
    webhook: {
      ...response,
      // Include secret in response only on creation
    },
  };
}

export async function getWebhook(
  db: D1Database,
  customerId: string,
  webhookId: string
): Promise<WebhookResponse | null> {
  const webhook = await db
    .prepare('SELECT * FROM webhooks WHERE id = ? AND customer_id = ?')
    .bind(webhookId, customerId)
    .first<Webhook>();

  return webhook ? webhookToResponse(webhook) : null;
}

export async function listWebhooks(
  db: D1Database,
  customerId: string
): Promise<WebhookResponse[]> {
  const result = await db
    .prepare('SELECT * FROM webhooks WHERE customer_id = ? ORDER BY created_at DESC')
    .bind(customerId)
    .all<Webhook>();

  return result.results.map(webhookToResponse);
}

export async function updateWebhook(
  db: D1Database,
  customerId: string,
  webhookId: string,
  request: UpdateWebhookRequest
): Promise<{ webhook?: WebhookResponse; error?: string }> {
  // Check webhook exists
  const existing = await db
    .prepare('SELECT * FROM webhooks WHERE id = ? AND customer_id = ?')
    .bind(webhookId, customerId)
    .first<Webhook>();

  if (!existing) {
    return { error: 'Webhook not found' };
  }

  // Validate URL if provided
  if (request.url !== undefined) {
    if (!validateUrl(request.url)) {
      return { error: 'URL must be a valid HTTPS URL' };
    }

    // Check for duplicate URL
    const duplicate = await db
      .prepare('SELECT id FROM webhooks WHERE customer_id = ? AND url = ? AND id != ?')
      .bind(customerId, request.url, webhookId)
      .first();

    if (duplicate) {
      return { error: 'A webhook with this URL already exists' };
    }
  }

  // Validate events if provided
  if (request.events !== undefined) {
    if (request.events.length === 0) {
      return { error: 'At least one event type is required' };
    }

    const eventValidation = validateEvents(request.events);
    if (!eventValidation.valid) {
      return { error: `Invalid event types: ${eventValidation.invalid.join(', ')}` };
    }
  }

  // Build update query
  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (request.url !== undefined) {
    updates.push('url = ?');
    values.push(request.url);
  }

  if (request.events !== undefined) {
    updates.push('events = ?');
    values.push(JSON.stringify(request.events));
  }

  if (request.description !== undefined) {
    updates.push('description = ?');
    values.push(request.description);
  }

  if (request.is_active !== undefined) {
    updates.push('is_active = ?');
    values.push(request.is_active ? 1 : 0);

    // Reset failure count when reactivating
    if (request.is_active) {
      updates.push('failure_count = 0');
    }
  }

  if (updates.length === 0) {
    return { webhook: webhookToResponse(existing) };
  }

  updates.push("updated_at = datetime('now')");
  values.push(webhookId, customerId);

  await db
    .prepare(
      `UPDATE webhooks SET ${updates.join(', ')} WHERE id = ? AND customer_id = ?`
    )
    .bind(...values)
    .run();

  const updated = await db
    .prepare('SELECT * FROM webhooks WHERE id = ?')
    .bind(webhookId)
    .first<Webhook>();

  return { webhook: updated ? webhookToResponse(updated) : undefined };
}

export async function deleteWebhook(
  db: D1Database,
  customerId: string,
  webhookId: string
): Promise<{ success: boolean; error?: string }> {
  const result = await db
    .prepare('DELETE FROM webhooks WHERE id = ? AND customer_id = ?')
    .bind(webhookId, customerId)
    .run();

  if (result.meta.changes === 0) {
    return { success: false, error: 'Webhook not found' };
  }

  // Also delete delivery history
  await db
    .prepare('DELETE FROM webhook_deliveries WHERE webhook_id = ?')
    .bind(webhookId)
    .run();

  return { success: true };
}

export async function regenerateWebhookSecret(
  db: D1Database,
  customerId: string,
  webhookId: string
): Promise<{ secret?: string; error?: string }> {
  const existing = await db
    .prepare('SELECT id FROM webhooks WHERE id = ? AND customer_id = ?')
    .bind(webhookId, customerId)
    .first();

  if (!existing) {
    return { error: 'Webhook not found' };
  }

  const newSecret = generateWebhookSecret();

  await db
    .prepare("UPDATE webhooks SET secret = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(newSecret, webhookId)
    .run();

  return { secret: newSecret };
}

export async function getWebhookSecret(
  db: D1Database,
  customerId: string,
  webhookId: string
): Promise<string | null> {
  const webhook = await db
    .prepare('SELECT secret FROM webhooks WHERE id = ? AND customer_id = ?')
    .bind(webhookId, customerId)
    .first<{ secret: string }>();

  return webhook?.secret || null;
}
