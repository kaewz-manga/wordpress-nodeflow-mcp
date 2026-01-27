/**
 * Webhook API Endpoints
 *
 * GET    /api/webhooks           - List webhooks
 * POST   /api/webhooks           - Create webhook
 * GET    /api/webhooks/:id       - Get webhook
 * PATCH  /api/webhooks/:id       - Update webhook
 * DELETE /api/webhooks/:id       - Delete webhook
 * POST   /api/webhooks/:id/test  - Test webhook
 * POST   /api/webhooks/:id/secret - Regenerate secret
 * GET    /api/webhooks/:id/deliveries - Get delivery history
 */

import { Customer } from '../saas/types';
import {
  CreateWebhookRequest,
  UpdateWebhookRequest,
  WEBHOOK_EVENT_TYPES,
} from '../webhooks/types';
import {
  createWebhook,
  getWebhook,
  listWebhooks,
  updateWebhook,
  deleteWebhook,
  regenerateWebhookSecret,
  getWebhookSecret,
} from '../webhooks/service';
import { testWebhook, getWebhookDeliveries } from '../webhooks/dispatcher';
import { logCustomerAction } from '../audit/service';
import { jsonResponse, errorResponse, verifyToken, extractBearerToken } from './utils';

// =============================================================================
// Auth Helper
// =============================================================================

async function getAuthenticatedCustomer(
  request: Request,
  db: D1Database
): Promise<{ customer: Customer; error?: never } | { customer?: never; error: Response }> {
  const token = extractBearerToken(request);
  if (!token) {
    return { error: errorResponse('Authorization token required', 401, 'MISSING_TOKEN') };
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return { error: errorResponse('Invalid or expired token', 401, 'INVALID_TOKEN') };
  }

  const customer = await db
    .prepare('SELECT * FROM customers WHERE id = ?')
    .bind(payload.sub)
    .first<Customer>();

  if (!customer) {
    return { error: errorResponse('Customer not found', 404, 'CUSTOMER_NOT_FOUND') };
  }

  return { customer };
}

// =============================================================================
// Handlers
// =============================================================================

export async function handleListWebhooks(
  request: Request,
  db: D1Database
): Promise<Response> {
  const auth = await getAuthenticatedCustomer(request, db);
  if (auth.error) return auth.error;

  const webhooks = await listWebhooks(db, auth.customer.id);
  return jsonResponse({ webhooks });
}

export async function handleCreateWebhook(
  request: Request,
  db: D1Database
): Promise<Response> {
  const auth = await getAuthenticatedCustomer(request, db);
  if (auth.error) return auth.error;

  let body: CreateWebhookRequest;
  try {
    body = await request.json() as CreateWebhookRequest;
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  const result = await createWebhook(db, auth.customer.id, body);

  if (result.error) {
    return errorResponse(result.error, 400);
  }

  // Audit log
  await logCustomerAction(db, auth.customer.id, 'webhook.create', request, {
    resourceType: 'webhook',
    resourceId: result.webhook!.id,
    details: { url: body.url, events: body.events },
  });

  return jsonResponse({ webhook: result.webhook }, 201);
}

export async function handleGetWebhook(
  request: Request,
  db: D1Database,
  webhookId: string
): Promise<Response> {
  const auth = await getAuthenticatedCustomer(request, db);
  if (auth.error) return auth.error;

  const webhook = await getWebhook(db, auth.customer.id, webhookId);

  if (!webhook) {
    return errorResponse('Webhook not found', 404);
  }

  return jsonResponse({ webhook });
}

export async function handleUpdateWebhook(
  request: Request,
  db: D1Database,
  webhookId: string
): Promise<Response> {
  const auth = await getAuthenticatedCustomer(request, db);
  if (auth.error) return auth.error;

  let body: UpdateWebhookRequest;
  try {
    body = await request.json() as UpdateWebhookRequest;
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  const result = await updateWebhook(db, auth.customer.id, webhookId, body);

  if (result.error) {
    return errorResponse(result.error, 400);
  }

  // Audit log
  await logCustomerAction(db, auth.customer.id, 'webhook.update', request, {
    resourceType: 'webhook',
    resourceId: webhookId,
    details: body as unknown as Record<string, unknown>,
  });

  return jsonResponse({ webhook: result.webhook });
}

export async function handleDeleteWebhook(
  request: Request,
  db: D1Database,
  webhookId: string
): Promise<Response> {
  const auth = await getAuthenticatedCustomer(request, db);
  if (auth.error) return auth.error;

  const result = await deleteWebhook(db, auth.customer.id, webhookId);

  if (result.error) {
    return errorResponse(result.error, 404);
  }

  // Audit log
  await logCustomerAction(db, auth.customer.id, 'webhook.delete', request, {
    resourceType: 'webhook',
    resourceId: webhookId,
  });

  return jsonResponse({ success: true, message: 'Webhook deleted' });
}

export async function handleTestWebhook(
  request: Request,
  db: D1Database,
  webhookId: string
): Promise<Response> {
  const auth = await getAuthenticatedCustomer(request, db);
  if (auth.error) return auth.error;

  const result = await testWebhook(db, auth.customer.id, webhookId);

  return jsonResponse({
    success: result.success,
    statusCode: result.statusCode,
    responseTimeMs: result.responseTimeMs,
    error: result.error,
  });
}

export async function handleRegenerateSecret(
  request: Request,
  db: D1Database,
  webhookId: string
): Promise<Response> {
  const auth = await getAuthenticatedCustomer(request, db);
  if (auth.error) return auth.error;

  const result = await regenerateWebhookSecret(db, auth.customer.id, webhookId);

  if (result.error) {
    return errorResponse(result.error, 404);
  }

  // Audit log
  await logCustomerAction(db, auth.customer.id, 'webhook.regenerate_secret', request, {
    resourceType: 'webhook',
    resourceId: webhookId,
  });

  return jsonResponse({ secret: result.secret });
}

export async function handleGetSecret(
  request: Request,
  db: D1Database,
  webhookId: string
): Promise<Response> {
  const auth = await getAuthenticatedCustomer(request, db);
  if (auth.error) return auth.error;

  const secret = await getWebhookSecret(db, auth.customer.id, webhookId);

  if (!secret) {
    return errorResponse('Webhook not found', 404);
  }

  return jsonResponse({ secret });
}

export async function handleGetDeliveries(
  request: Request,
  db: D1Database,
  webhookId: string
): Promise<Response> {
  const auth = await getAuthenticatedCustomer(request, db);
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);

  const deliveries = await getWebhookDeliveries(db, auth.customer.id, webhookId, Math.min(limit, 100));

  return jsonResponse({
    deliveries: deliveries.map(d => ({
      id: d.id,
      eventType: d.event_type,
      statusCode: d.status_code,
      responseTimeMs: d.response_time_ms,
      error: d.error_message,
      attemptNumber: d.attempt_number,
      createdAt: d.created_at,
    })),
  });
}

export function handleGetEventTypes(): Response {
  return jsonResponse({
    eventTypes: WEBHOOK_EVENT_TYPES.map(type => ({
      type,
      category: type.split('.')[0],
      description: getEventDescription(type),
    })),
  });
}

function getEventDescription(type: string): string {
  const descriptions: Record<string, string> = {
    'subscription.created': 'When a new subscription is created',
    'subscription.updated': 'When a subscription is upgraded or downgraded',
    'subscription.cancelled': 'When a subscription is cancelled',
    'subscription.renewed': 'When a subscription is renewed',
    'usage.limit_warning': 'When 80% of usage limit is reached',
    'usage.limit_exceeded': 'When 100% of usage limit is reached',
    'api_key.created': 'When a new API key is created',
    'api_key.revoked': 'When an API key is revoked',
    'api_key.expired': 'When an API key expires',
    'mcp.request': 'For every MCP request (high volume)',
    'mcp.error': 'When an MCP request fails',
  };
  return descriptions[type] || type;
}
