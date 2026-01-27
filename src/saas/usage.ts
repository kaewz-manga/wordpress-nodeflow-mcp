/**
 * Usage Tracking Service
 * Log and aggregate API usage for billing and analytics
 */

import { UsageLog, UsageDaily, UsageStats } from './types';

// =============================================================================
// Usage Logging
// =============================================================================

/**
 * Log a single API request
 */
export async function logUsage(
  db: D1Database,
  params: {
    apiKeyId: string;
    customerId: string;
    toolName: string;
    wordpressUrl?: string;
    statusCode?: number;
    responseTimeMs?: number;
    errorMessage?: string;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<void> {
  const id = crypto.randomUUID();

  await db
    .prepare(
      `INSERT INTO usage_logs (id, api_key_id, customer_id, tool_name, wordpress_url, status_code, response_time_ms, error_message, ip_address, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    )
    .bind(
      id,
      params.apiKeyId,
      params.customerId,
      params.toolName,
      params.wordpressUrl || null,
      params.statusCode || null,
      params.responseTimeMs || null,
      params.errorMessage || null,
      params.ipAddress || null,
      params.userAgent || null
    )
    .run();

  // Update daily aggregate
  const isError = !!params.errorMessage || (params.statusCode !== undefined && params.statusCode >= 400);
  await updateDailyUsage(db, params.customerId, {
    isError,
    responseTimeMs: params.responseTimeMs || 0,
  });
}

/**
 * Update daily usage aggregate
 */
async function updateDailyUsage(
  db: D1Database,
  customerId: string,
  params: { isError: boolean; responseTimeMs: number }
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const id = `${customerId}:${today}`;

  // Try to insert or update
  await db
    .prepare(
      `INSERT INTO usage_daily (id, customer_id, date, requests_count, successful_count, errors_count, total_response_time_ms)
       VALUES (?, ?, ?, 1, ?, ?, ?)
       ON CONFLICT(customer_id, date) DO UPDATE SET
         requests_count = requests_count + 1,
         successful_count = successful_count + ?,
         errors_count = errors_count + ?,
         total_response_time_ms = total_response_time_ms + ?`
    )
    .bind(
      id,
      customerId,
      today,
      params.isError ? 0 : 1,
      params.isError ? 1 : 0,
      params.responseTimeMs,
      params.isError ? 0 : 1,
      params.isError ? 1 : 0,
      params.responseTimeMs
    )
    .run();
}

// =============================================================================
// Usage Queries
// =============================================================================

/**
 * Get usage stats for a customer
 */
export async function getUsageStats(
  db: D1Database,
  customerId: string
): Promise<UsageStats> {
  // Get subscription info
  const subscription = await db
    .prepare('SELECT requests_used, requests_limit FROM subscriptions WHERE customer_id = ?')
    .bind(customerId)
    .first<{ requests_used: number; requests_limit: number }>();

  // Get today's usage
  const today = new Date().toISOString().split('T')[0];
  const dailyUsage = await db
    .prepare('SELECT * FROM usage_daily WHERE customer_id = ? AND date = ?')
    .bind(customerId, today)
    .first<UsageDaily>();

  const used = subscription?.requests_used || 0;
  const limit = subscription?.requests_limit || 0;

  return {
    currentPeriod: {
      used,
      limit,
      remaining: Math.max(0, limit - used),
      percentUsed: limit > 0 ? Math.round((used / limit) * 100) : 0,
    },
    today: {
      requests: dailyUsage?.requests_count || 0,
      successful: dailyUsage?.successful_count || 0,
      errors: dailyUsage?.errors_count || 0,
      avgResponseTime:
        dailyUsage && dailyUsage.requests_count > 0
          ? Math.round(dailyUsage.total_response_time_ms / dailyUsage.requests_count)
          : 0,
    },
  };
}

/**
 * Get usage history for a date range
 */
export async function getUsageHistory(
  db: D1Database,
  customerId: string,
  startDate: string,
  endDate: string
): Promise<UsageDaily[]> {
  const results = await db
    .prepare(
      `SELECT * FROM usage_daily
       WHERE customer_id = ? AND date >= ? AND date <= ?
       ORDER BY date DESC`
    )
    .bind(customerId, startDate, endDate)
    .all<UsageDaily>();

  return results.results;
}

/**
 * Get recent usage logs
 */
export async function getRecentLogs(
  db: D1Database,
  customerId: string,
  limit: number = 100
): Promise<UsageLog[]> {
  const results = await db
    .prepare(
      `SELECT * FROM usage_logs
       WHERE customer_id = ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .bind(customerId, limit)
    .all<UsageLog>();

  return results.results;
}

/**
 * Get tool usage breakdown
 */
export async function getToolUsageBreakdown(
  db: D1Database,
  customerId: string,
  days: number = 30
): Promise<{ tool_name: string; count: number }[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const results = await db
    .prepare(
      `SELECT tool_name, COUNT(*) as count
       FROM usage_logs
       WHERE customer_id = ? AND created_at >= ?
       GROUP BY tool_name
       ORDER BY count DESC`
    )
    .bind(customerId, startDate.toISOString())
    .all<{ tool_name: string; count: number }>();

  return results.results;
}

// =============================================================================
// Cleanup (for GDPR/data retention)
// =============================================================================

/**
 * Delete old usage logs (keep last N days)
 */
export async function cleanupOldLogs(
  db: D1Database,
  retentionDays: number = 90
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await db
    .prepare('DELETE FROM usage_logs WHERE created_at < ?')
    .bind(cutoffDate.toISOString())
    .run();

  return result.meta.changes;
}
