-- =============================================================================
-- WordPress MCP SaaS - Initial Database Schema
-- =============================================================================
-- Run with: wrangler d1 execute wordpress-mcp-db --file=./migrations/0001_initial_schema.sql

-- -----------------------------------------------------------------------------
-- Customers Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT NOT NULL,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'starter', 'pro', 'business', 'enterprise')),
  is_active INTEGER DEFAULT 1,
  email_verified INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_tier ON customers(tier);

-- -----------------------------------------------------------------------------
-- API Keys Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  key_hash TEXT UNIQUE NOT NULL,
  key_prefix TEXT NOT NULL,
  name TEXT DEFAULT 'Default',
  permissions TEXT DEFAULT '["*"]',
  is_active INTEGER DEFAULT 1,
  last_used_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX idx_api_keys_customer ON api_keys(customer_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);

-- -----------------------------------------------------------------------------
-- Subscriptions Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  customer_id TEXT UNIQUE NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'starter', 'pro', 'business', 'enterprise')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
  requests_limit INTEGER NOT NULL,
  requests_used INTEGER DEFAULT 0,
  rate_limit INTEGER NOT NULL,
  billing_cycle_start TEXT,
  billing_cycle_end TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX idx_subscriptions_customer ON subscriptions(customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- -----------------------------------------------------------------------------
-- Usage Logs Table (detailed logs for analytics)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usage_logs (
  id TEXT PRIMARY KEY,
  api_key_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  wordpress_url TEXT,
  status_code INTEGER,
  response_time_ms INTEGER,
  error_message TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX idx_usage_logs_customer ON usage_logs(customer_id);
CREATE INDEX idx_usage_logs_api_key ON usage_logs(api_key_id);
CREATE INDEX idx_usage_logs_created ON usage_logs(created_at);
CREATE INDEX idx_usage_logs_tool ON usage_logs(tool_name);

-- -----------------------------------------------------------------------------
-- Daily Usage Summary (aggregated for billing)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usage_daily (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  date TEXT NOT NULL,
  requests_count INTEGER DEFAULT 0,
  successful_count INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  total_response_time_ms INTEGER DEFAULT 0,
  UNIQUE(customer_id, date),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX idx_usage_daily_customer_date ON usage_daily(customer_id, date);

-- -----------------------------------------------------------------------------
-- Insert default tier configurations (for reference)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tier_configs (
  tier TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_monthly INTEGER NOT NULL,
  requests_limit INTEGER NOT NULL,
  rate_limit INTEGER NOT NULL,
  description TEXT
);

INSERT OR REPLACE INTO tier_configs (tier, name, price_monthly, requests_limit, rate_limit, description) VALUES
  ('free', 'Free', 0, 1000, 10, 'For testing and small projects'),
  ('starter', 'Starter', 900, 10000, 30, 'For individual developers'),
  ('pro', 'Pro', 2900, 50000, 100, 'For growing projects'),
  ('business', 'Business', 9900, 200000, 300, 'For teams and agencies'),
  ('enterprise', 'Enterprise', 0, 999999999, 1000, 'Custom pricing for large organizations');
