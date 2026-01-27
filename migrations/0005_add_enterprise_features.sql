-- Migration: Add Enterprise Features
-- Date: 2026-01-27
-- Description: Tables for SSO/SAML, SLA Dashboard, and Admin Dashboard

-- =============================================================================
-- SSO/SAML Tables
-- =============================================================================

-- SSO Providers (SAML, OIDC configurations)
CREATE TABLE IF NOT EXISTS sso_providers (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('saml', 'oidc')),
    config TEXT NOT NULL, -- JSON configuration
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE INDEX IF NOT EXISTS idx_sso_providers_customer ON sso_providers(customer_id);
CREATE INDEX IF NOT EXISTS idx_sso_providers_active ON sso_providers(customer_id, is_active);

-- SAML Sessions
CREATE TABLE IF NOT EXISTS saml_sessions (
    id TEXT PRIMARY KEY,
    provider_id TEXT NOT NULL,
    request_id TEXT NOT NULL,
    relay_state TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'expired')),
    user_email TEXT,
    user_attributes TEXT, -- JSON
    error_message TEXT,
    created_at TEXT NOT NULL,
    completed_at TEXT,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (provider_id) REFERENCES sso_providers(id)
);

CREATE INDEX IF NOT EXISTS idx_saml_sessions_request ON saml_sessions(request_id);
CREATE INDEX IF NOT EXISTS idx_saml_sessions_status ON saml_sessions(status, expires_at);

-- =============================================================================
-- SLA Dashboard Tables
-- =============================================================================

-- Health Check Configurations
CREATE TABLE IF NOT EXISTS health_checks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('http', 'tcp', 'dns', 'ssl')),
    target TEXT NOT NULL,
    interval_seconds INTEGER NOT NULL DEFAULT 60,
    timeout_ms INTEGER NOT NULL DEFAULT 5000,
    expected_status INTEGER,
    expected_body TEXT,
    is_active INTEGER DEFAULT 1,
    last_check_at TEXT,
    last_status TEXT CHECK (last_status IN ('healthy', 'degraded', 'down')),
    consecutive_failures INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_health_checks_active ON health_checks(is_active);
CREATE INDEX IF NOT EXISTS idx_health_checks_status ON health_checks(last_status);

-- Uptime Records (aggregated per hour)
CREATE TABLE IF NOT EXISTS uptime_records (
    id TEXT PRIMARY KEY,
    health_check_id TEXT NOT NULL,
    timestamp TEXT NOT NULL, -- Hour start
    total_checks INTEGER NOT NULL DEFAULT 0,
    successful_checks INTEGER NOT NULL DEFAULT 0,
    avg_response_time_ms REAL,
    min_response_time_ms INTEGER,
    max_response_time_ms INTEGER,
    error_count INTEGER DEFAULT 0,
    status TEXT CHECK (status IN ('healthy', 'degraded', 'down')),
    FOREIGN KEY (health_check_id) REFERENCES health_checks(id)
);

CREATE INDEX IF NOT EXISTS idx_uptime_records_check ON uptime_records(health_check_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_uptime_records_timestamp ON uptime_records(timestamp);

-- Incidents
CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'investigating' CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
    severity TEXT NOT NULL DEFAULT 'minor' CHECK (severity IN ('critical', 'major', 'minor')),
    affected_services TEXT, -- JSON array of service names
    started_at TEXT NOT NULL,
    identified_at TEXT,
    resolved_at TEXT,
    created_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity, status);
CREATE INDEX IF NOT EXISTS idx_incidents_dates ON incidents(started_at, resolved_at);

-- Incident Updates
CREATE TABLE IF NOT EXISTS incident_updates (
    id TEXT PRIMARY KEY,
    incident_id TEXT NOT NULL,
    status TEXT NOT NULL,
    message TEXT NOT NULL,
    created_by TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (incident_id) REFERENCES incidents(id)
);

CREATE INDEX IF NOT EXISTS idx_incident_updates_incident ON incident_updates(incident_id, created_at);

-- Maintenance Windows
CREATE TABLE IF NOT EXISTS maintenance_windows (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    affected_services TEXT, -- JSON array of service names
    scheduled_start TEXT NOT NULL,
    scheduled_end TEXT NOT NULL,
    actual_start TEXT,
    actual_end TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    created_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_windows(status, scheduled_start);
CREATE INDEX IF NOT EXISTS idx_maintenance_dates ON maintenance_windows(scheduled_start, scheduled_end);

-- =============================================================================
-- Admin Dashboard Tables
-- =============================================================================

-- Admin Users (internal operators)
CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'support' CHECK (role IN ('super_admin', 'admin', 'support')),
    password_hash TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    last_login_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role, is_active);

-- Admin Actions (audit log for admin operations)
CREATE TABLE IF NOT EXISTS admin_actions (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    details TEXT, -- JSON
    ip_address TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (admin_id) REFERENCES admin_users(id)
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions(admin_id, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON admin_actions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_action ON admin_actions(action, created_at);

-- =============================================================================
-- Customer Extensions
-- =============================================================================

-- Add last_active_at to customers if not exists (for admin dashboard)
-- Note: SQLite doesn't support IF NOT EXISTS for columns, so this may fail if already exists
-- ALTER TABLE customers ADD COLUMN last_active_at TEXT;

-- =============================================================================
-- SLA Agreements (per customer)
-- =============================================================================

CREATE TABLE IF NOT EXISTS sla_agreements (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    tier TEXT NOT NULL, -- matches subscription tier
    uptime_target REAL NOT NULL DEFAULT 99.9,
    response_time_target_ms INTEGER NOT NULL DEFAULT 500,
    support_response_hours INTEGER NOT NULL DEFAULT 24,
    effective_from TEXT NOT NULL,
    effective_until TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE INDEX IF NOT EXISTS idx_sla_agreements_customer ON sla_agreements(customer_id);

-- =============================================================================
-- Service Status (for status page)
-- =============================================================================

CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    is_active INTEGER DEFAULT 1,
    current_status TEXT DEFAULT 'operational' CHECK (current_status IN ('operational', 'degraded', 'partial_outage', 'major_outage', 'maintenance')),
    status_updated_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_services_status ON services(current_status, is_active);
