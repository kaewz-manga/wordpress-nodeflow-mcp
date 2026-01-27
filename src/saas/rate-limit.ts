/**
 * Rate Limiting Service
 * Using Cloudflare KV for distributed rate limiting
 */

import { RateLimitInfo } from './types';

// =============================================================================
// Constants
// =============================================================================

const WINDOW_SIZE_SECONDS = 60;  // 1 minute window

// =============================================================================
// Rate Limit Key Format
// =============================================================================

/**
 * Generate rate limit key for KV
 * Format: ratelimit:{customerId}:{minute}
 */
function getRateLimitKey(customerId: string): string {
  const minute = Math.floor(Date.now() / 1000 / WINDOW_SIZE_SECONDS);
  return `ratelimit:${customerId}:${minute}`;
}

// =============================================================================
// Rate Limiting Operations
// =============================================================================

/**
 * Check and increment rate limit
 * Returns whether the request is allowed
 */
export async function checkRateLimit(
  kv: KVNamespace,
  customerId: string,
  limit: number
): Promise<RateLimitInfo> {
  const key = getRateLimitKey(customerId);
  const resetAt = (Math.floor(Date.now() / 1000 / WINDOW_SIZE_SECONDS) + 1) * WINDOW_SIZE_SECONDS * 1000;

  // Get current count
  const currentValue = await kv.get(key);
  const currentCount = currentValue ? parseInt(currentValue, 10) : 0;

  // Check if limit exceeded
  if (currentCount >= limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAt,
    };
  }

  // Increment counter
  const newCount = currentCount + 1;
  await kv.put(key, newCount.toString(), {
    expirationTtl: WINDOW_SIZE_SECONDS + 10,  // Extra 10s buffer
  });

  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - newCount),
    resetAt,
  };
}

/**
 * Get current rate limit status without incrementing
 */
export async function getRateLimitStatus(
  kv: KVNamespace,
  customerId: string,
  limit: number
): Promise<RateLimitInfo> {
  const key = getRateLimitKey(customerId);
  const resetAt = (Math.floor(Date.now() / 1000 / WINDOW_SIZE_SECONDS) + 1) * WINDOW_SIZE_SECONDS * 1000;

  const currentValue = await kv.get(key);
  const currentCount = currentValue ? parseInt(currentValue, 10) : 0;

  return {
    allowed: currentCount < limit,
    limit,
    remaining: Math.max(0, limit - currentCount),
    resetAt,
  };
}

/**
 * Reset rate limit for a customer (admin use)
 */
export async function resetRateLimit(
  kv: KVNamespace,
  customerId: string
): Promise<void> {
  const key = getRateLimitKey(customerId);
  await kv.delete(key);
}

// =============================================================================
// Rate Limit Headers
// =============================================================================

/**
 * Generate rate limit headers for response
 */
export function getRateLimitHeaders(info: RateLimitInfo): Record<string, string> {
  return {
    'X-RateLimit-Limit': info.limit.toString(),
    'X-RateLimit-Remaining': info.remaining.toString(),
    'X-RateLimit-Reset': Math.floor(info.resetAt / 1000).toString(),
  };
}

/**
 * Create rate limit exceeded response
 */
export function createRateLimitExceededResponse(info: RateLimitInfo): Response {
  return new Response(
    JSON.stringify({
      error: {
        code: 429,
        message: 'Rate limit exceeded',
        retryAfter: Math.ceil((info.resetAt - Date.now()) / 1000),
      },
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil((info.resetAt - Date.now()) / 1000).toString(),
        ...getRateLimitHeaders(info),
      },
    }
  );
}
