-- Migration: Add Growth Features (Phase 4)
-- Description: Webhooks, Audit Logs, Team Management

-- =============================================================================
-- Webhooks Tables
-- =============================================================================

CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT NOT NULL,              -- JSON array of event types
  is_active INTEGER DEFAULT 1,
  description TEXT,
  last_triggered_at TEXT,
  last_status_code INTEGER,
  failure_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  UNIQUE(customer_id, url)
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id TEXT PRIMARY KEY,
  webhook_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,              -- JSON payload
  status_code INTEGER,
  response_body TEXT,
  response_time_ms INTEGER,
  error_message TEXT,
  attempt_number INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (webhook_id) REFERENCES webhooks(id)
);

-- Webhook Indexes
CREATE INDEX IF NOT EXISTS idx_webhooks_customer ON webhooks(customer_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created ON webhook_deliveries(created_at);

-- =============================================================================
-- Audit Logs Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,             -- Who performed the action
  actor_type TEXT NOT NULL,           -- 'customer', 'team_member', 'system'
  action TEXT NOT NULL,               -- e.g., 'api_key.create', 'webhook.update'
  resource_type TEXT,                 -- e.g., 'api_key', 'webhook'
  resource_id TEXT,                   -- ID of affected resource
  details TEXT,                       -- JSON with additional details
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Audit Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_customer ON audit_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- =============================================================================
-- Teams Tables
-- =============================================================================

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  customer_id TEXT UNIQUE NOT NULL,   -- Owner's customer ID
  name TEXT NOT NULL,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member', 'viewer'
  password_hash TEXT,                   -- Null for pending invites
  invite_token TEXT,
  invite_expires_at TEXT,
  status TEXT DEFAULT 'pending',        -- 'pending', 'active', 'suspended'
  last_login_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (team_id) REFERENCES teams(id),
  UNIQUE(team_id, email)
);

CREATE TABLE IF NOT EXISTS team_invites (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  invited_by TEXT NOT NULL,             -- Customer or member ID
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Team Indexes
CREATE INDEX IF NOT EXISTS idx_teams_customer ON teams(customer_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);
CREATE INDEX IF NOT EXISTS idx_team_invites_team ON team_invites(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_token ON team_invites(token);
CREATE INDEX IF NOT EXISTS idx_team_invites_expires ON team_invites(expires_at);
