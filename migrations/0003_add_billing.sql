-- Migration: Add billing history tables
-- Description: Tables to track billing events and payment history

-- =============================================================================
-- Payment History Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS payment_history (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  stripe_invoice_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  amount INTEGER NOT NULL,  -- Amount in cents
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL,  -- succeeded, failed, pending, refunded
  description TEXT,
  tier TEXT,  -- Tier at time of payment
  period_start TEXT,
  period_end TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- =============================================================================
-- Billing Events Table (for webhook events)
-- =============================================================================

CREATE TABLE IF NOT EXISTS billing_events (
  id TEXT PRIMARY KEY,
  customer_id TEXT,
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  event_data TEXT,  -- JSON payload
  processed_at TEXT DEFAULT (datetime('now')),
  status TEXT DEFAULT 'processed',  -- processed, failed, ignored
  error_message TEXT,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_payment_history_customer ON payment_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_created ON payment_history(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON payment_history(status);
CREATE INDEX IF NOT EXISTS idx_billing_events_customer ON billing_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_type ON billing_events(event_type);
CREATE INDEX IF NOT EXISTS idx_billing_events_stripe_id ON billing_events(stripe_event_id);

-- =============================================================================
-- Add price ID tracking to subscriptions (for upgrade/downgrade tracking)
-- =============================================================================

-- Note: SQLite doesn't support ALTER TABLE ADD COLUMN with constraints well,
-- so we add without NOT NULL
ALTER TABLE subscriptions ADD COLUMN stripe_price_id TEXT;
ALTER TABLE subscriptions ADD COLUMN cancel_at_period_end INTEGER DEFAULT 0;
