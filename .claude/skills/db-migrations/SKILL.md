---
name: db-migrations
description: D1 database migration patterns for WordPress MCP
user-invocable: false
---

# D1 Migrations Reference

## Commands

```bash
# Run locally
npx wrangler d1 execute wordpress-mcp-db --local --file=./migrations/001_initial.sql

# Run on production
npx wrangler d1 execute wordpress-mcp-db --remote --file=./migrations/001_initial.sql

# Query
npx wrangler d1 execute wordpress-mcp-db --remote --command "SELECT * FROM users LIMIT 5"
```

## WordPress Connection Schema

```sql
CREATE TABLE wordpress_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  wordpress_url TEXT NOT NULL,
  username TEXT NOT NULL,
  app_password_encrypted TEXT NOT NULL,  -- AES-256-GCM encrypted
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_wp_conn_user ON wordpress_connections(user_id);
```

## Important Notes

1. **Application Password must be encrypted** — Never store plaintext
2. **Spaces must be removed** before encryption
3. **Use ON DELETE CASCADE** for child tables
