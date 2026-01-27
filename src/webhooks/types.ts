/**
 * Webhooks Types and Configuration
 */

// =============================================================================
// Webhook Events
// =============================================================================

export type WebhookEventType =
  // Subscription events
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.cancelled'
  | 'subscription.renewed'
  // Usage events
  | 'usage.limit_warning'    // 80% of limit reached
  | 'usage.limit_exceeded'   // 100% of limit reached
  // API Key events
  | 'api_key.created'
  | 'api_key.revoked'
  | 'api_key.expired'
  // MCP events
  | 'mcp.request'            // Optional: log all MCP requests
  | 'mcp.error';             // MCP request errors

export const WEBHOOK_EVENT_TYPES: WebhookEventType[] = [
  'subscription.created',
  'subscription.updated',
  'subscription.cancelled',
  'subscription.renewed',
  'usage.limit_warning',
  'usage.limit_exceeded',
  'api_key.created',
  'api_key.revoked',
  'api_key.expired',
  'mcp.request',
  'mcp.error',
];

// =============================================================================
// Webhook Configuration
// =============================================================================

export interface Webhook {
  id: string;
  customer_id: string;
  url: string;
  secret: string;           // For signature verification
  events: string;           // JSON array of WebhookEventType
  is_active: number;
  description: string | null;
  last_triggered_at: string | null;
  last_status_code: number | null;
  failure_count: number;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_type: WebhookEventType;
  payload: string;          // JSON payload
  status_code: number | null;
  response_body: string | null;
  response_time_ms: number | null;
  error_message: string | null;
  attempt_number: number;
  created_at: string;
}

// =============================================================================
// Webhook Payload
// =============================================================================

export interface WebhookPayload<T = unknown> {
  id: string;               // Unique event ID
  type: WebhookEventType;
  timestamp: string;        // ISO 8601
  data: T;
}

// Event-specific payloads
export interface SubscriptionEventData {
  customerId: string;
  tier: string;
  previousTier?: string;
  status: string;
  requestsLimit: number;
  requestsUsed: number;
}

export interface UsageEventData {
  customerId: string;
  currentUsage: number;
  limit: number;
  percentUsed: number;
}

export interface ApiKeyEventData {
  customerId: string;
  keyId: string;
  keyPrefix: string;
  name: string;
  reason?: string;
}

export interface McpEventData {
  customerId: string;
  apiKeyId: string;
  toolName: string;
  statusCode: number;
  responseTimeMs: number;
  error?: string;
}

// =============================================================================
// API Request/Response Types
// =============================================================================

export interface CreateWebhookRequest {
  url: string;
  events: WebhookEventType[];
  description?: string;
}

export interface UpdateWebhookRequest {
  url?: string;
  events?: WebhookEventType[];
  description?: string;
  is_active?: boolean;
}

export interface WebhookResponse {
  id: string;
  url: string;
  events: WebhookEventType[];
  isActive: boolean;
  description: string | null;
  lastTriggeredAt: string | null;
  lastStatusCode: number | null;
  failureCount: number;
  createdAt: string;
}

export interface WebhookDeliveryResponse {
  id: string;
  eventType: WebhookEventType;
  statusCode: number | null;
  responseTimeMs: number | null;
  error: string | null;
  attemptNumber: number;
  createdAt: string;
}
