# D1 Migrations Guide

> Database migration management for WordPress MCP.

---

## Migration Files

Location: `migrations/`

- `001_initial.sql`
- `002_api_keys.sql`
- `003_usage_tracking.sql`
- `004_totp.sql`
- `005_billing.sql`

---

## Current Schema (8 tables)

| Table | Purpose |
|-------|---------|
| `users` | User accounts |
| `wordpress_connections` | WordPress site connections |
| `api_keys` | SaaS API keys (wp_xxx) |
| `usage_logs` | Per-request usage logs |
| `usage_monthly` | Aggregated monthly usage |
| `plans` | Subscription plans |
| `admin_logs` | Admin action audit trail |
| `oauth_states` | OAuth state storage |

---

## Commands

### Run Locally
```bash
npx wrangler d1 execute wordpress-mcp-db --local --file=./migrations/001_initial.sql
```

### Run on Production
```bash
npx wrangler d1 execute wordpress-mcp-db --remote --file=./migrations/001_initial.sql
```

### Query Database
```bash
npx wrangler d1 execute wordpress-mcp-db --remote --command "SELECT * FROM users LIMIT 5"
```

---

## Table Schemas

### wordpress_connections

```sql
CREATE TABLE wordpress_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  wordpress_url TEXT NOT NULL,
  username TEXT NOT NULL,
  app_password_encrypted TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_wp_connections_user ON wordpress_connections(user_id);
```

### api_keys

```sql
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL REFERENCES wordpress_connections(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  last_used_at TEXT
);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
```

---

## Best Practices

1. **Use `IF NOT EXISTS`** — Migrations should be idempotent
2. **Add indexes** — For foreign keys and frequently queried columns
3. **Test locally first** — Always run on local D1 before production
4. **Encrypt sensitive data** — WordPress passwords must be encrypted
