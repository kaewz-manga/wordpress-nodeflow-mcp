/**
 * Audit Log Service
 * Logging and querying audit events
 */

import {
  AuditLog,
  AuditAction,
  AuditContext,
  AuditLogResponse,
  AuditLogFilters,
} from './types';

// =============================================================================
// Helper Functions
// =============================================================================

function auditLogToResponse(log: AuditLog): AuditLogResponse {
  return {
    id: log.id,
    actorId: log.actor_id,
    actorType: log.actor_type,
    action: log.action,
    resourceType: log.resource_type,
    resourceId: log.resource_id,
    details: log.details ? JSON.parse(log.details) : null,
    ipAddress: log.ip_address,
    createdAt: log.created_at,
  };
}

// =============================================================================
// Logging Functions
// =============================================================================

export async function logAuditEvent(
  db: D1Database,
  context: AuditContext,
  action: AuditAction,
  options?: {
    resourceType?: string;
    resourceId?: string;
    details?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    const id = crypto.randomUUID();

    await db
      .prepare(
        `INSERT INTO audit_logs
         (id, customer_id, actor_id, actor_type, action, resource_type, resource_id, details, ip_address, user_agent, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .bind(
        id,
        context.customerId,
        context.actorId,
        context.actorType,
        action,
        options?.resourceType || null,
        options?.resourceId || null,
        options?.details ? JSON.stringify(options.details) : null,
        context.ipAddress || null,
        context.userAgent || null
      )
      .run();
  } catch {
    // Don't fail the main operation if audit logging fails
    console.error('Failed to log audit event');
  }
}

// Convenience function for customer actions
export async function logCustomerAction(
  db: D1Database,
  customerId: string,
  action: AuditAction,
  request: Request,
  options?: {
    resourceType?: string;
    resourceId?: string;
    details?: Record<string, unknown>;
  }
): Promise<void> {
  const context: AuditContext = {
    customerId,
    actorId: customerId,
    actorType: 'customer',
    ipAddress: request.headers.get('CF-Connecting-IP') || undefined,
    userAgent: request.headers.get('User-Agent') || undefined,
  };

  await logAuditEvent(db, context, action, options);
}

// Convenience function for system actions
export async function logSystemAction(
  db: D1Database,
  customerId: string,
  action: AuditAction,
  options?: {
    resourceType?: string;
    resourceId?: string;
    details?: Record<string, unknown>;
  }
): Promise<void> {
  const context: AuditContext = {
    customerId,
    actorId: 'system',
    actorType: 'system',
  };

  await logAuditEvent(db, context, action, options);
}

// =============================================================================
// Query Functions
// =============================================================================

export async function getAuditLogs(
  db: D1Database,
  customerId: string,
  filters: AuditLogFilters = {}
): Promise<{ logs: AuditLogResponse[]; total: number }> {
  const conditions: string[] = ['customer_id = ?'];
  const params: (string | number)[] = [customerId];

  if (filters.action) {
    conditions.push('action = ?');
    params.push(filters.action);
  }

  if (filters.resourceType) {
    conditions.push('resource_type = ?');
    params.push(filters.resourceType);
  }

  if (filters.resourceId) {
    conditions.push('resource_id = ?');
    params.push(filters.resourceId);
  }

  if (filters.actorId) {
    conditions.push('actor_id = ?');
    params.push(filters.actorId);
  }

  if (filters.startDate) {
    conditions.push('created_at >= ?');
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    conditions.push('created_at <= ?');
    params.push(filters.endDate);
  }

  const whereClause = conditions.join(' AND ');
  const limit = Math.min(filters.limit || 50, 100);
  const offset = filters.offset || 0;

  // Get total count
  const countResult = await db
    .prepare(`SELECT COUNT(*) as total FROM audit_logs WHERE ${whereClause}`)
    .bind(...params)
    .first<{ total: number }>();

  // Get logs
  const logsResult = await db
    .prepare(
      `SELECT * FROM audit_logs
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    )
    .bind(...params, limit, offset)
    .all<AuditLog>();

  return {
    logs: logsResult.results.map(auditLogToResponse),
    total: countResult?.total || 0,
  };
}

export async function getAuditLogById(
  db: D1Database,
  customerId: string,
  logId: string
): Promise<AuditLogResponse | null> {
  const log = await db
    .prepare('SELECT * FROM audit_logs WHERE id = ? AND customer_id = ?')
    .bind(logId, customerId)
    .first<AuditLog>();

  return log ? auditLogToResponse(log) : null;
}

// =============================================================================
// Cleanup Functions
// =============================================================================

export async function cleanupOldAuditLogs(
  db: D1Database,
  retentionDays: number = 90
): Promise<number> {
  const result = await db
    .prepare(
      `DELETE FROM audit_logs
       WHERE created_at < datetime('now', '-' || ? || ' days')`
    )
    .bind(retentionDays)
    .run();

  return result.meta.changes;
}

// =============================================================================
// Export Functions (for compliance)
// =============================================================================

export async function exportAuditLogs(
  db: D1Database,
  customerId: string,
  startDate: string,
  endDate: string
): Promise<AuditLogResponse[]> {
  const result = await db
    .prepare(
      `SELECT * FROM audit_logs
       WHERE customer_id = ?
       AND created_at >= ?
       AND created_at <= ?
       ORDER BY created_at ASC`
    )
    .bind(customerId, startDate, endDate)
    .all<AuditLog>();

  return result.results.map(auditLogToResponse);
}
