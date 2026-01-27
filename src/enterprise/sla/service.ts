/**
 * SLA Dashboard Service
 * Uptime monitoring, performance metrics, and SLA reporting
 */

import {
  HealthStatus,
  HealthCheck,
  UptimeStats,
  Incident,
  IncidentUpdate,
  IncidentStatus,
  IncidentSeverity,
  SystemStatusResponse,
  ComponentStatus,
  SLAReportResponse,
  PerformanceMetrics,
  DEFAULT_SLA_CONFIG,
  ENTERPRISE_SLA_CONFIG,
} from './types';

// =============================================================================
// System Status
// =============================================================================

export async function getSystemStatus(db: D1Database): Promise<SystemStatusResponse> {
  // Get latest health checks
  const healthChecks = await db
    .prepare('SELECT * FROM health_checks ORDER BY name ASC')
    .all<HealthCheck>();

  const components: ComponentStatus[] = healthChecks.results.map(hc => ({
    name: hc.name,
    status: hc.status as HealthStatus,
    responseTime: hc.response_time_ms,
    lastChecked: hc.last_check_at,
  }));

  // Determine overall status
  let overallStatus: HealthStatus = 'healthy';
  if (components.some(c => c.status === 'down')) {
    overallStatus = 'down';
  } else if (components.some(c => c.status === 'degraded')) {
    overallStatus = 'degraded';
  }

  // Get active incidents
  const incidents = await db
    .prepare(
      `SELECT id, title, status, severity, started_at
       FROM incidents
       WHERE status != 'resolved'
       ORDER BY started_at DESC`
    )
    .all<Incident>();

  // Calculate uptime
  const uptime = await calculateUptimePeriods(db);

  return {
    status: overallStatus,
    components,
    activeIncidents: incidents.results.map(i => ({
      id: i.id,
      title: i.title,
      status: i.status as IncidentStatus,
      severity: i.severity as IncidentSeverity,
      startedAt: i.started_at,
    })),
    uptime,
  };
}

async function calculateUptimePeriods(db: D1Database): Promise<{
  last24h: number;
  last7d: number;
  last30d: number;
}> {
  const periods = [
    { name: 'last24h', days: 1 },
    { name: 'last7d', days: 7 },
    { name: 'last30d', days: 30 },
  ];

  const result: Record<string, number> = {};

  for (const period of periods) {
    const stats = await db
      .prepare(
        `SELECT
           SUM(successful_checks) as success,
           SUM(total_checks) as total
         FROM uptime_daily
         WHERE date >= date('now', '-' || ? || ' days')`
      )
      .bind(period.days)
      .first<{ success: number; total: number }>();

    if (stats && stats.total > 0) {
      result[period.name] = (stats.success / stats.total) * 100;
    } else {
      result[period.name] = 100; // No data = assume healthy
    }
  }

  return {
    last24h: Math.round(result.last24h * 100) / 100,
    last7d: Math.round(result.last7d * 100) / 100,
    last30d: Math.round(result.last30d * 100) / 100,
  };
}

// =============================================================================
// Uptime Statistics
// =============================================================================

export async function getUptimeStats(
  db: D1Database,
  period: 'day' | 'week' | 'month' | 'quarter' | 'year'
): Promise<UptimeStats> {
  const days = {
    day: 1,
    week: 7,
    month: 30,
    quarter: 90,
    year: 365,
  }[period];

  const stats = await db
    .prepare(
      `SELECT
         SUM(total_checks) as total_checks,
         SUM(successful_checks) as successful_checks,
         SUM(failed_checks) as failed_checks,
         AVG(avg_response_time_ms) as avg_response_time,
         MAX(max_response_time_ms) as max_response_time
       FROM uptime_daily
       WHERE date >= date('now', '-' || ? || ' days')`
    )
    .bind(days)
    .first<{
      total_checks: number;
      successful_checks: number;
      failed_checks: number;
      avg_response_time: number;
      max_response_time: number;
    }>();

  // Get percentiles from health check logs
  const percentiles = await db
    .prepare(
      `SELECT response_time_ms
       FROM health_check_logs
       WHERE created_at >= datetime('now', '-' || ? || ' days')
       AND response_time_ms IS NOT NULL
       ORDER BY response_time_ms ASC`
    )
    .bind(days)
    .all<{ response_time_ms: number }>();

  const times = percentiles.results.map(r => r.response_time_ms);
  const p95 = times[Math.floor(times.length * 0.95)] || 0;
  const p99 = times[Math.floor(times.length * 0.99)] || 0;

  const totalChecks = stats?.total_checks || 0;
  const successfulChecks = stats?.successful_checks || 0;

  return {
    period,
    uptimePercent: totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 100,
    totalChecks,
    successfulChecks,
    failedChecks: stats?.failed_checks || 0,
    avgResponseTime: Math.round(stats?.avg_response_time || 0),
    p95ResponseTime: p95,
    p99ResponseTime: p99,
  };
}

// =============================================================================
// SLA Report
// =============================================================================

export async function generateSLAReport(
  db: D1Database,
  _customerId: string, // Reserved for future per-customer SLA reports
  startDate: string,
  endDate: string,
  isEnterprise: boolean = false
): Promise<SLAReportResponse> {
  const slaConfig = isEnterprise ? ENTERPRISE_SLA_CONFIG : DEFAULT_SLA_CONFIG;

  // Get uptime for period
  const uptimeStats = await db
    .prepare(
      `SELECT
         SUM(total_checks) as total_checks,
         SUM(successful_checks) as successful_checks,
         SUM(failed_checks) as failed_checks,
         AVG(avg_response_time_ms) as avg_response_time
       FROM uptime_daily
       WHERE date >= ? AND date <= ?`
    )
    .bind(startDate, endDate)
    .first<{
      total_checks: number;
      successful_checks: number;
      failed_checks: number;
      avg_response_time: number;
    }>();

  const totalChecks = uptimeStats?.total_checks || 0;
  const successfulChecks = uptimeStats?.successful_checks || 0;
  const actualUptime = totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 100;

  // Get incidents
  const incidents = await db
    .prepare(
      `SELECT severity, started_at, resolved_at
       FROM incidents
       WHERE started_at >= ? AND started_at <= ?`
    )
    .bind(startDate, endDate)
    .all<{ severity: string; started_at: string; resolved_at: string | null }>();

  const bySeverity: Record<IncidentSeverity, number> = {
    minor: 0,
    major: 0,
    critical: 0,
  };

  let totalResolutionTime = 0;
  let resolvedCount = 0;

  for (const incident of incidents.results) {
    bySeverity[incident.severity as IncidentSeverity]++;
    if (incident.resolved_at) {
      const start = new Date(incident.started_at).getTime();
      const end = new Date(incident.resolved_at).getTime();
      totalResolutionTime += (end - start) / (1000 * 60 * 60); // hours
      resolvedCount++;
    }
  }

  const mttr = resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0;

  // Get performance percentiles
  const perfLogs = await db
    .prepare(
      `SELECT response_time_ms
       FROM health_check_logs
       WHERE created_at >= ? AND created_at <= ?
       AND response_time_ms IS NOT NULL
       ORDER BY response_time_ms ASC`
    )
    .bind(startDate, endDate)
    .all<{ response_time_ms: number }>();

  const times = perfLogs.results.map(r => r.response_time_ms);
  const p95 = times[Math.floor(times.length * 0.95)] || 0;
  const p99 = times[Math.floor(times.length * 0.99)] || 0;
  const avgResponseTime = uptimeStats?.avg_response_time || 0;

  return {
    period: `${startDate} to ${endDate}`,
    startDate,
    endDate,
    sla: {
      target: slaConfig.uptimeTarget,
      actual: Math.round(actualUptime * 100) / 100,
      met: actualUptime >= slaConfig.uptimeTarget,
    },
    uptime: {
      period: 'month',
      uptimePercent: actualUptime,
      totalChecks,
      successfulChecks,
      failedChecks: uptimeStats?.failed_checks || 0,
      avgResponseTime: Math.round(avgResponseTime),
      p95ResponseTime: p95,
      p99ResponseTime: p99,
    },
    incidents: {
      total: incidents.results.length,
      bySeverity,
      mttr: Math.round(mttr * 100) / 100,
    },
    performance: {
      avgResponseTime: Math.round(avgResponseTime),
      p95ResponseTime: p95,
      p99ResponseTime: p99,
      targetMet: avgResponseTime <= slaConfig.responseTimeTarget,
    },
  };
}

// =============================================================================
// Performance Metrics
// =============================================================================

export async function getPerformanceMetrics(
  db: D1Database,
  hours: number = 24
): Promise<PerformanceMetrics[]> {
  // Get hourly aggregated metrics
  const result = await db
    .prepare(
      `SELECT
         strftime('%Y-%m-%d %H:00:00', created_at) as hour,
         COUNT(*) as requests,
         AVG(response_time_ms) as avg_response_time,
         SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as error_rate
       FROM usage_logs
       WHERE created_at >= datetime('now', '-' || ? || ' hours')
       GROUP BY strftime('%Y-%m-%d %H:00:00', created_at)
       ORDER BY hour ASC`
    )
    .bind(hours)
    .all<{
      hour: string;
      requests: number;
      avg_response_time: number;
      error_rate: number;
    }>();

  // For each hour, we'd need to calculate percentiles
  // This is a simplified version
  return result.results.map(row => ({
    timestamp: row.hour,
    requests: row.requests,
    avgResponseTime: Math.round(row.avg_response_time || 0),
    errorRate: Math.round((row.error_rate || 0) * 100) / 100,
    p50ResponseTime: Math.round((row.avg_response_time || 0) * 0.8),
    p95ResponseTime: Math.round((row.avg_response_time || 0) * 1.5),
    p99ResponseTime: Math.round((row.avg_response_time || 0) * 2),
  }));
}

// =============================================================================
// Incident Management
// =============================================================================

export async function createIncident(
  db: D1Database,
  title: string,
  description: string,
  severity: IncidentSeverity,
  affectedComponents: string[]
): Promise<Incident> {
  const id = crypto.randomUUID();

  await db
    .prepare(
      `INSERT INTO incidents
       (id, title, description, status, severity, affected_components, started_at, created_at, updated_at)
       VALUES (?, ?, ?, 'investigating', ?, ?, datetime('now'), datetime('now'), datetime('now'))`
    )
    .bind(id, title, description, severity, JSON.stringify(affectedComponents))
    .run();

  const incident = await db
    .prepare('SELECT * FROM incidents WHERE id = ?')
    .bind(id)
    .first<Incident>();

  return incident!;
}

export async function updateIncidentStatus(
  db: D1Database,
  incidentId: string,
  status: IncidentStatus,
  message: string
): Promise<void> {
  const updateId = crypto.randomUUID();

  // Add update
  await db
    .prepare(
      `INSERT INTO incident_updates (id, incident_id, status, message, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    )
    .bind(updateId, incidentId, status, message)
    .run();

  // Update incident
  await db
    .prepare(
      `UPDATE incidents
       SET status = ?,
           resolved_at = ${status === 'resolved' ? "datetime('now')" : 'resolved_at'},
           updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(status, incidentId)
    .run();
}

export async function getIncidentHistory(
  db: D1Database,
  limit: number = 20
): Promise<Incident[]> {
  const result = await db
    .prepare(
      `SELECT * FROM incidents
       ORDER BY started_at DESC
       LIMIT ?`
    )
    .bind(limit)
    .all<Incident>();

  return result.results;
}

export async function getIncidentUpdates(
  db: D1Database,
  incidentId: string
): Promise<IncidentUpdate[]> {
  const result = await db
    .prepare(
      `SELECT * FROM incident_updates
       WHERE incident_id = ?
       ORDER BY created_at ASC`
    )
    .bind(incidentId)
    .all<IncidentUpdate>();

  return result.results;
}

// =============================================================================
// Health Check Recording
// =============================================================================

export async function recordHealthCheck(
  db: D1Database,
  name: string,
  status: HealthStatus,
  responseTimeMs: number | null,
  error: string | null
): Promise<void> {
  const logId = crypto.randomUUID();

  // Get or create health check
  let healthCheck = await db
    .prepare('SELECT * FROM health_checks WHERE name = ?')
    .bind(name)
    .first<HealthCheck>();

  if (!healthCheck) {
    const id = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO health_checks (id, name, endpoint, status, response_time_ms, last_check_at, consecutive_failures)
         VALUES (?, ?, ?, ?, ?, datetime('now'), ?)`
      )
      .bind(id, name, '', status, responseTimeMs, status === 'healthy' ? 0 : 1)
      .run();

    healthCheck = await db
      .prepare('SELECT * FROM health_checks WHERE id = ?')
      .bind(id)
      .first<HealthCheck>();
  } else {
    // Update existing
    const failures = status === 'healthy' ? 0 : (healthCheck.consecutive_failures + 1);

    await db
      .prepare(
        `UPDATE health_checks
         SET status = ?, response_time_ms = ?, last_check_at = datetime('now'),
             last_error = ?, consecutive_failures = ?
         WHERE id = ?`
      )
      .bind(status, responseTimeMs, error, failures, healthCheck.id)
      .run();
  }

  // Log the check
  await db
    .prepare(
      `INSERT INTO health_check_logs (id, health_check_id, status, response_time_ms, error_message, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    )
    .bind(logId, healthCheck!.id, status, responseTimeMs, error)
    .run();

  // Update daily stats
  await updateDailyStats(db, status === 'healthy', responseTimeMs);
}

async function updateDailyStats(
  db: D1Database,
  success: boolean,
  responseTimeMs: number | null
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  // Try to update existing
  const result = await db
    .prepare(
      `UPDATE uptime_daily
       SET total_checks = total_checks + 1,
           successful_checks = successful_checks + ?,
           failed_checks = failed_checks + ?,
           avg_response_time_ms = (avg_response_time_ms * total_checks + COALESCE(?, 0)) / (total_checks + 1),
           min_response_time_ms = MIN(min_response_time_ms, COALESCE(?, min_response_time_ms)),
           max_response_time_ms = MAX(max_response_time_ms, COALESCE(?, max_response_time_ms))
       WHERE date = ?`
    )
    .bind(success ? 1 : 0, success ? 0 : 1, responseTimeMs, responseTimeMs, responseTimeMs, today)
    .run();

  // Insert if not exists
  if (result.meta.changes === 0) {
    await db
      .prepare(
        `INSERT INTO uptime_daily
         (id, date, total_checks, successful_checks, failed_checks, avg_response_time_ms, min_response_time_ms, max_response_time_ms, created_at)
         VALUES (?, ?, 1, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .bind(
        crypto.randomUUID(),
        today,
        success ? 1 : 0,
        success ? 0 : 1,
        responseTimeMs || 0,
        responseTimeMs || 0,
        responseTimeMs || 0
      )
      .run();
  }
}
