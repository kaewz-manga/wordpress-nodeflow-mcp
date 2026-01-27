/**
 * Authentication & Authorization Middleware
 * Validates API keys and enforces rate limits
 */

import { AuthContext, SubscriptionTier } from './types';
import { findApiKeyByKey, updateApiKeyLastUsed } from './api-keys';
import { findCustomerById, findSubscriptionByCustomerId, checkUsageLimit } from './customers';
import { checkRateLimit, getRateLimitHeaders, createRateLimitExceededResponse } from './rate-limit';

// =============================================================================
// Types
// =============================================================================

export type AuthResult =
  | { success: true; context: AuthContext }
  | { success: false; response: Response };

export interface MiddlewareEnv {
  DB: D1Database;
  RATE_LIMIT: KVNamespace;
}

// =============================================================================
// API Key Extraction
// =============================================================================

/**
 * Extract API key from request
 * Supports: Authorization: Bearer wp_mcp_xxx
 *           X-API-Key: wp_mcp_xxx
 */
export function extractApiKey(request: Request): string | null {
  // Check Authorization header first
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Check X-API-Key header
  const apiKeyHeader = request.headers.get('X-API-Key');
  if (apiKeyHeader) {
    return apiKeyHeader;
  }

  return null;
}

// =============================================================================
// Authentication Middleware
// =============================================================================

/**
 * Authenticate request using API key
 * Returns AuthContext if successful, or error Response if not
 */
export async function authenticateRequest(
  request: Request,
  env: MiddlewareEnv
): Promise<AuthResult> {
  const apiKey = extractApiKey(request);

  // Check if API key is provided
  if (!apiKey) {
    return {
      success: false,
      response: createJsonErrorResponse(
        401,
        'API key required. Use Authorization: Bearer <key> or X-API-Key header.',
        'MISSING_API_KEY'
      ),
    };
  }

  // Validate API key
  const keyRecord = await findApiKeyByKey(env.DB, apiKey);
  if (!keyRecord) {
    return {
      success: false,
      response: createJsonErrorResponse(
        401,
        'Invalid API key',
        'INVALID_API_KEY'
      ),
    };
  }

  // Check if key is active
  if (!keyRecord.is_active) {
    return {
      success: false,
      response: createJsonErrorResponse(
        401,
        'API key has been revoked',
        'REVOKED_API_KEY'
      ),
    };
  }

  // Check if key is expired
  if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
    return {
      success: false,
      response: createJsonErrorResponse(
        401,
        'API key has expired',
        'EXPIRED_API_KEY'
      ),
    };
  }

  // Get customer
  const customer = await findCustomerById(env.DB, keyRecord.customer_id);
  if (!customer || !customer.is_active) {
    return {
      success: false,
      response: createJsonErrorResponse(
        401,
        'Account not found or inactive',
        'INACTIVE_ACCOUNT'
      ),
    };
  }

  // Get subscription
  const subscription = await findSubscriptionByCustomerId(env.DB, customer.id);
  if (!subscription) {
    return {
      success: false,
      response: createJsonErrorResponse(
        500,
        'Subscription not found',
        'SUBSCRIPTION_NOT_FOUND'
      ),
    };
  }

  // Check subscription status
  if (subscription.status !== 'active') {
    return {
      success: false,
      response: createJsonErrorResponse(
        403,
        `Subscription is ${subscription.status}. Please update your payment method.`,
        'SUBSCRIPTION_INACTIVE'
      ),
    };
  }

  // Check usage limit
  const usageCheck = await checkUsageLimit(env.DB, customer.id);
  if (!usageCheck.allowed) {
    return {
      success: false,
      response: createJsonErrorResponse(
        429,
        `Monthly request limit exceeded. Used ${usageCheck.used}/${usageCheck.limit}. Upgrade your plan for more requests.`,
        'USAGE_LIMIT_EXCEEDED'
      ),
    };
  }

  // Check rate limit
  const rateLimitCheck = await checkRateLimit(
    env.RATE_LIMIT,
    customer.id,
    subscription.rate_limit
  );

  if (!rateLimitCheck.allowed) {
    return {
      success: false,
      response: createRateLimitExceededResponse(rateLimitCheck),
    };
  }

  // Update last used timestamp (don't await)
  updateApiKeyLastUsed(env.DB, keyRecord.id).catch(() => {});

  // Return auth context
  return {
    success: true,
    context: {
      customerId: customer.id,
      apiKeyId: keyRecord.id,
      tier: customer.tier as SubscriptionTier,
      subscription,
      rateLimit: subscription.rate_limit,
      requestsRemaining: subscription.requests_limit - subscription.requests_used,
    },
  };
}

// =============================================================================
// Backward Compatibility Mode
// =============================================================================

/**
 * Check if request is using legacy authentication (WordPress headers)
 * This allows existing users to continue using the service without API keys
 */
export function isLegacyAuthRequest(request: Request): boolean {
  const hasWordPressHeaders =
    request.headers.has('x-wordpress-url') ||
    request.headers.has('x-wordpress-username') ||
    request.headers.has('x-wordpress-password');

  const hasApiKey = extractApiKey(request) !== null;

  // Legacy mode: has WordPress headers but no API key
  return hasWordPressHeaders && !hasApiKey;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create JSON error response
 */
function createJsonErrorResponse(
  status: number,
  message: string,
  code: string
): Response {
  return new Response(
    JSON.stringify({
      error: {
        code,
        message,
        status,
      },
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Add usage headers to response
 */
export function addUsageHeaders(
  response: Response,
  context: AuthContext
): Response {
  const headers = new Headers(response.headers);

  headers.set('X-Usage-Limit', context.subscription.requests_limit.toString());
  headers.set('X-Usage-Used', context.subscription.requests_used.toString());
  headers.set('X-Usage-Remaining', context.requestsRemaining.toString());
  headers.set('X-Tier', context.tier);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// =============================================================================
// Export index
// =============================================================================

export { getRateLimitHeaders };
