---
description: Query WordPress MCP D1 database
---

# Query D1 Database

## Common Queries

```bash
# List tables
npx wrangler d1 execute wordpress-mcp-db --remote --command "SELECT name FROM sqlite_master WHERE type='table'"

# Count users
npx wrangler d1 execute wordpress-mcp-db --remote --command "SELECT COUNT(*) as count FROM users"

# Recent connections
npx wrangler d1 execute wordpress-mcp-db --remote --command "SELECT c.name, c.wordpress_url, u.email FROM wordpress_connections c JOIN users u ON c.user_id = u.id ORDER BY c.created_at DESC LIMIT 10"

# Usage by tool
npx wrangler d1 execute wordpress-mcp-db --remote --command "SELECT tool_name, COUNT(*) as calls FROM usage_logs GROUP BY tool_name ORDER BY calls DESC"
```
