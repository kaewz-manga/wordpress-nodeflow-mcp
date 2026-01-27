/**
 * Audit Log API Endpoints
 *
 * GET /api/audit              - List audit logs
 * GET /api/audit/:id          - Get audit log entry
 * GET /api/audit/export       - Export audit logs
 */

import { Customer } from '../saas/types';
import { AuditLogFilters, AuditLogResponse, AUDIT_ACTIONS } from '../audit/types';
import { getAuditLogs, getAuditLogById, exportAuditLogs } from '../audit/service';
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

export async function handleListAuditLogs(
  request: Request,
  db: D1Database
): Promise<Response> {
  const auth = await getAuthenticatedCustomer(request, db);
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const filters: AuditLogFilters = {};

  // Parse filters from query params
  const action = url.searchParams.get('action');
  if (action && AUDIT_ACTIONS.includes(action as typeof AUDIT_ACTIONS[number])) {
    filters.action = action as typeof AUDIT_ACTIONS[number];
  }

  const resourceType = url.searchParams.get('resource_type');
  if (resourceType) {
    filters.resourceType = resourceType;
  }

  const resourceId = url.searchParams.get('resource_id');
  if (resourceId) {
    filters.resourceId = resourceId;
  }

  const startDate = url.searchParams.get('start_date');
  if (startDate) {
    filters.startDate = startDate;
  }

  const endDate = url.searchParams.get('end_date');
  if (endDate) {
    filters.endDate = endDate;
  }

  const limit = url.searchParams.get('limit');
  if (limit) {
    filters.limit = Math.min(parseInt(limit, 10) || 50, 100);
  }

  const offset = url.searchParams.get('offset');
  if (offset) {
    filters.offset = parseInt(offset, 10) || 0;
  }

  const result = await getAuditLogs(db, auth.customer.id, filters);

  return jsonResponse({
    logs: result.logs,
    total: result.total,
    limit: filters.limit || 50,
    offset: filters.offset || 0,
  });
}

export async function handleGetAuditLog(
  request: Request,
  db: D1Database,
  logId: string
): Promise<Response> {
  const auth = await getAuthenticatedCustomer(request, db);
  if (auth.error) return auth.error;

  const log = await getAuditLogById(db, auth.customer.id, logId);

  if (!log) {
    return errorResponse('Audit log not found', 404);
  }

  return jsonResponse({ log });
}

export async function handleExportAuditLogs(
  request: Request,
  db: D1Database
): Promise<Response> {
  const auth = await getAuthenticatedCustomer(request, db);
  if (auth.error) return auth.error;

  const url = new URL(request.url);

  const startDate = url.searchParams.get('start_date');
  const endDate = url.searchParams.get('end_date');

  if (!startDate || !endDate) {
    return errorResponse('start_date and end_date are required', 400);
  }

  // Validate date format
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return errorResponse('Invalid date format. Use ISO 8601 (YYYY-MM-DD)', 400);
  }

  // Limit export range to 90 days
  const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  if (daysDiff > 90) {
    return errorResponse('Export range cannot exceed 90 days', 400);
  }

  const logs = await exportAuditLogs(db, auth.customer.id, startDate, endDate);

  // Return as downloadable JSON
  const format = url.searchParams.get('format') || 'json';

  if (format === 'csv') {
    const csvContent = convertToCSV(logs);
    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="audit-logs-${startDate}-${endDate}.csv"`,
      },
    });
  }

  return new Response(JSON.stringify({ logs }, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="audit-logs-${startDate}-${endDate}.json"`,
    },
  });
}

function convertToCSV(logs: AuditLogResponse[]): string {
  if (logs.length === 0) {
    return 'id,actor_id,action,resource_type,resource_id,ip_address,created_at\n';
  }

  const headers = ['id', 'actorId', 'action', 'resourceType', 'resourceId', 'ipAddress', 'createdAt'];

  const escapeValue = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = logs.map(log => [
    escapeValue(log.id),
    escapeValue(log.actorId),
    escapeValue(log.action),
    escapeValue(log.resourceType),
    escapeValue(log.resourceId),
    escapeValue(log.ipAddress),
    escapeValue(log.createdAt),
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}

export function handleGetActionTypes(): Response {
  return jsonResponse({
    actions: AUDIT_ACTIONS.map(action => ({
      action,
      category: action.split('.')[0],
    })),
  });
}
