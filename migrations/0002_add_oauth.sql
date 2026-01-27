-- =============================================================================
-- Add OAuth Support
-- =============================================================================
-- Run with: wrangler d1 execute wordpress-mcp-db --file=./migrations/0002_add_oauth.sql

-- Add OAuth fields to customers table
ALTER TABLE customers ADD COLUMN oauth_provider TEXT;
ALTER TABLE customers ADD COLUMN oauth_provider_id TEXT;
ALTER TABLE customers ADD COLUMN picture_url TEXT;

-- Make password_hash nullable for OAuth users
-- SQLite doesn't support ALTER COLUMN, so we need to work around this
-- OAuth users will have password_hash = 'oauth' as a placeholder

-- Create index for OAuth lookup
CREATE INDEX IF NOT EXISTS idx_customers_oauth ON customers(oauth_provider, oauth_provider_id);

-- Create OAuth accounts table for linking multiple providers to one account
CREATE TABLE IF NOT EXISTS oauth_accounts (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(provider, provider_account_id),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_oauth_accounts_customer ON oauth_accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_provider ON oauth_accounts(provider, provider_account_id);
