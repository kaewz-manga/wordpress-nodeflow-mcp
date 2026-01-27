-- Migration: Add Custom Domains Feature
-- Date: 2026-01-27
-- Description: Tables for custom domain support (Business and Enterprise tiers)

-- =============================================================================
-- Custom Domains Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS custom_domains (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    domain TEXT NOT NULL UNIQUE,
    domain_type TEXT NOT NULL DEFAULT 'custom' CHECK (domain_type IN ('subdomain', 'custom')),
    status TEXT NOT NULL DEFAULT 'pending_verification' CHECK (status IN (
        'pending_verification',
        'pending_ssl',
        'active',
        'ssl_expired',
        'verification_failed',
        'suspended'
    )),
    verification_token TEXT NOT NULL,
    verification_record TEXT NOT NULL,
    verified_at TEXT,
    ssl_status TEXT CHECK (ssl_status IN ('pending', 'active', 'expired')),
    ssl_expires_at TEXT,
    last_check_at TEXT,
    check_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Indexes for custom domains
CREATE INDEX IF NOT EXISTS idx_custom_domains_customer ON custom_domains(customer_id);
CREATE INDEX IF NOT EXISTS idx_custom_domains_domain ON custom_domains(domain);
CREATE INDEX IF NOT EXISTS idx_custom_domains_status ON custom_domains(status);
CREATE INDEX IF NOT EXISTS idx_custom_domains_ssl ON custom_domains(ssl_status, ssl_expires_at);

-- =============================================================================
-- Domain SSL Certificates (for tracking SSL cert details)
-- =============================================================================

CREATE TABLE IF NOT EXISTS domain_certificates (
    id TEXT PRIMARY KEY,
    domain_id TEXT NOT NULL,
    issuer TEXT,
    serial_number TEXT,
    issued_at TEXT,
    expires_at TEXT NOT NULL,
    fingerprint TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    FOREIGN KEY (domain_id) REFERENCES custom_domains(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_domain_certs_domain ON domain_certificates(domain_id);
CREATE INDEX IF NOT EXISTS idx_domain_certs_expires ON domain_certificates(expires_at, is_active);

-- =============================================================================
-- Domain Routing Rules (for advanced routing)
-- =============================================================================

CREATE TABLE IF NOT EXISTS domain_routes (
    id TEXT PRIMARY KEY,
    domain_id TEXT NOT NULL,
    path_pattern TEXT NOT NULL DEFAULT '/*',
    target_url TEXT,
    priority INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (domain_id) REFERENCES custom_domains(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_domain_routes_domain ON domain_routes(domain_id, priority);

-- =============================================================================
-- Domain Analytics (track requests per domain)
-- =============================================================================

CREATE TABLE IF NOT EXISTS domain_analytics (
    id TEXT PRIMARY KEY,
    domain_id TEXT NOT NULL,
    date TEXT NOT NULL,
    requests_count INTEGER DEFAULT 0,
    bandwidth_bytes INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    avg_response_time_ms REAL,
    unique_ips INTEGER DEFAULT 0,
    FOREIGN KEY (domain_id) REFERENCES custom_domains(id) ON DELETE CASCADE,
    UNIQUE(domain_id, date)
);

CREATE INDEX IF NOT EXISTS idx_domain_analytics_domain ON domain_analytics(domain_id, date);
CREATE INDEX IF NOT EXISTS idx_domain_analytics_date ON domain_analytics(date);
