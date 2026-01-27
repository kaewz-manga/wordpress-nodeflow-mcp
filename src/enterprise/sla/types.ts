/**
 * SLA Dashboard Types
 */

// =============================================================================
// Health Check Types
// =============================================================================

export type HealthStatus = 'healthy' | 'degraded' | 'down';

export interface HealthCheck {
  id: string;
  name: string;
  endpoint: string;
  status: HealthStatus;
  response_time_ms: number | null;
  last_check_at: string;
  last_error: string | null;
  consecutive_failures: number;
}

export interface HealthCheckLog {
  id: string;
  health_check_id: string;
  status: HealthStatus;
  response_time_ms: number | null;
  error_message: string | null;
  created_at: string;
}

// =============================================================================
// Uptime Types
// =============================================================================

export interface UptimeStats {
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  uptimePercent: number;
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
}

export interface UptimeDaily {
  id: string;
  date: string;
  total_checks: number;
  successful_checks: number;
  failed_checks: number;
  avg_response_time_ms: number;
  min_response_time_ms: number;
  max_response_time_ms: number;
  created_at: string;
}

// =============================================================================
// Incident Types
// =============================================================================

export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved';
export type IncidentSeverity = 'minor' | 'major' | 'critical';

export interface Incident {
  id: string;
  title: string;
  description: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  affected_components: string;  // JSON array
  started_at: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncidentUpdate {
  id: string;
  incident_id: string;
  status: IncidentStatus;
  message: string;
  created_at: string;
}

// =============================================================================
// SLA Configuration
// =============================================================================

export interface SLAConfig {
  uptimeTarget: number;        // e.g., 99.9
  responseTimeTarget: number;  // in ms
  supportResponseTime: {
    critical: number;          // hours
    major: number;
    minor: number;
  };
}

export const DEFAULT_SLA_CONFIG: SLAConfig = {
  uptimeTarget: 99.9,
  responseTimeTarget: 500,
  supportResponseTime: {
    critical: 1,
    major: 4,
    minor: 24,
  },
};

export const ENTERPRISE_SLA_CONFIG: SLAConfig = {
  uptimeTarget: 99.99,
  responseTimeTarget: 200,
  supportResponseTime: {
    critical: 0.25,  // 15 minutes
    major: 1,
    minor: 4,
  },
};

// =============================================================================
// API Response Types
// =============================================================================

export interface SystemStatusResponse {
  status: HealthStatus;
  components: ComponentStatus[];
  activeIncidents: IncidentSummary[];
  uptime: {
    last24h: number;
    last7d: number;
    last30d: number;
  };
}

export interface ComponentStatus {
  name: string;
  status: HealthStatus;
  responseTime: number | null;
  lastChecked: string;
}

export interface IncidentSummary {
  id: string;
  title: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  startedAt: string;
}

export interface SLAReportResponse {
  period: string;
  startDate: string;
  endDate: string;
  sla: {
    target: number;
    actual: number;
    met: boolean;
  };
  uptime: UptimeStats;
  incidents: {
    total: number;
    bySeverity: Record<IncidentSeverity, number>;
    mttr: number;  // Mean Time To Resolve (hours)
  };
  performance: {
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    targetMet: boolean;
  };
}

export interface PerformanceMetrics {
  timestamp: string;
  requests: number;
  avgResponseTime: number;
  errorRate: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
}
