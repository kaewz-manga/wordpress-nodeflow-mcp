/**
 * Usage Statistics Endpoints
 * GET /api/usage - Get usage summary
 * GET /api/usage/history - Get usage history
 * GET /api/usage/logs - Get recent request logs
 * GET /api/usage/tools - Get tool usage breakdown
 */

import {
  getUsageStats,
  getUsageHistory,
  getRecentLogs,
  getToolUsageBreakdown,
} from '../saas/usage';
import { verifyAuthToken } from './auth';
import { errorResponse, successResponse, getQueryParam } from './utils';

// =============================================================================
// Handlers
// =============================================================================

/**
 * GET /api/usage
 * Get usage summary for current billing period
 */
export async function handleGetUsage(
  request: Request,
  db: D1Database
): Promise<Response> {
  // Verify auth
  const auth = await verifyAuthToken(request);
  if (!auth.valid) {
    return auth.error!;
  }

  // Get usage stats
  const stats = await getUsageStats(db, auth.customerId!);

  return successResponse({
    currentPeriod: {
      used: stats.currentPeriod.used,
      limit: stats.currentPeriod.limit,
      remaining: stats.currentPeriod.remaining,
      percentUsed: stats.currentPeriod.percentUsed,
    },
    today: {
      requests: stats.today.requests,
      successful: stats.today.successful,
      errors: stats.today.errors,
      successRate:
        stats.today.requests > 0
          ? Math.round((stats.today.successful / stats.today.requests) * 100)
          : 100,
      avgResponseTime: stats.today.avgResponseTime,
    },
  });
}

/**
 * GET /api/usage/history?days=30
 * Get daily usage history
 */
export async function handleGetUsageHistory(
  request: Request,
  db: D1Database
): Promise<Response> {
  // Verify auth
  const auth = await verifyAuthToken(request);
  if (!auth.valid) {
    return auth.error!;
  }

  // Parse query params
  const url = new URL(request.url);
  const daysParam = getQueryParam(url, 'days');
  const days = daysParam ? parseInt(daysParam, 10) : 30;

  // Validate days
  if (isNaN(days) || days < 1 || days > 90) {
    return errorResponse('Days must be between 1 and 90', 400, 'INVALID_DAYS');
  }

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get history
  const history = await getUsageHistory(
    db,
    auth.customerId!,
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0]
  );

  return successResponse({
    history: history.map((day) => ({
      date: day.date,
      requests: day.requests_count,
      successful: day.successful_count,
      errors: day.errors_count,
      avgResponseTime:
        day.requests_count > 0
          ? Math.round(day.total_response_time_ms / day.requests_count)
          : 0,
    })),
    period: {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
      days,
    },
    totals: {
      requests: history.reduce((sum, d) => sum + d.requests_count, 0),
      successful: history.reduce((sum, d) => sum + d.successful_count, 0),
      errors: history.reduce((sum, d) => sum + d.errors_count, 0),
    },
  });
}

/**
 * GET /api/usage/logs?limit=100
 * Get recent request logs
 */
export async function handleGetUsageLogs(
  request: Request,
  db: D1Database
): Promise<Response> {
  // Verify auth
  const auth = await verifyAuthToken(request);
  if (!auth.valid) {
    return auth.error!;
  }

  // Parse query params
  const url = new URL(request.url);
  const limitParam = getQueryParam(url, 'limit');
  const limit = limitParam ? parseInt(limitParam, 10) : 100;

  // Validate limit
  if (isNaN(limit) || limit < 1 || limit > 1000) {
    return errorResponse('Limit must be between 1 and 1000', 400, 'INVALID_LIMIT');
  }

  // Get logs
  const logs = await getRecentLogs(db, auth.customerId!, limit);

  return successResponse({
    logs: logs.map((log) => ({
      id: log.id,
      toolName: log.tool_name,
      statusCode: log.status_code,
      responseTimeMs: log.response_time_ms,
      errorMessage: log.error_message,
      createdAt: log.created_at,
    })),
    count: logs.length,
  });
}

/**
 * GET /api/usage/tools?days=30
 * Get tool usage breakdown
 */
export async function handleGetToolUsage(
  request: Request,
  db: D1Database
): Promise<Response> {
  // Verify auth
  const auth = await verifyAuthToken(request);
  if (!auth.valid) {
    return auth.error!;
  }

  // Parse query params
  const url = new URL(request.url);
  const daysParam = getQueryParam(url, 'days');
  const days = daysParam ? parseInt(daysParam, 10) : 30;

  // Validate days
  if (isNaN(days) || days < 1 || days > 90) {
    return errorResponse('Days must be between 1 and 90', 400, 'INVALID_DAYS');
  }

  // Get breakdown
  const breakdown = await getToolUsageBreakdown(db, auth.customerId!, days);
  const total = breakdown.reduce((sum, t) => sum + t.count, 0);

  return successResponse({
    tools: breakdown.map((tool) => ({
      name: tool.tool_name,
      count: tool.count,
      percentage: total > 0 ? Math.round((tool.count / total) * 100) : 0,
    })),
    total,
    period: {
      days,
    },
  });
}
