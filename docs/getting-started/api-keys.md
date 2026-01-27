# API Key Management

Learn how to create, manage, and secure your API keys.

## Overview

API keys authenticate your requests to WordPress MCP. Each key:

- Is unique to your account
- Can be named for organization
- Can be revoked at any time
- Shows usage statistics

## Key Format

```
wp_mcp_{environment}_{random_string}

Examples:
wp_mcp_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
wp_mcp_test_x9y8z7w6v5u4t3s2r1q0p9o8n7m6l5k4
```

## Creating API Keys

### Via Dashboard

1. Go to **Dashboard > API Keys**
2. Click **Create API Key**
3. Enter a descriptive name
4. Copy the key immediately

### Via API

```bash
curl -X POST https://api.wordpress-mcp.com/api/keys \
  -H "Authorization: Bearer YOUR_EXISTING_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "New Production Key"}'
```

Response:
```json
{
  "apiKey": {
    "id": "key_abc123",
    "name": "New Production Key",
    "keyPrefix": "wp_mcp_live_a1b2c3d4",
    "isActive": true,
    "createdAt": "2026-01-27T10:00:00Z"
  },
  "key": "wp_mcp_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
}
```

> **Important**: The full key is only shown once. Store it securely!

## Using API Keys

Include your key in the `Authorization` header:

```bash
curl -X POST https://api.wordpress-mcp.com/mcp \
  -H "Authorization: Bearer wp_mcp_live_xxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

## Key Limits by Tier

| Tier | Max Keys | Rate Limit |
|------|----------|------------|
| Free | 1 | 10 req/min |
| Starter | 5 | 30 req/min |
| Pro | Unlimited | 100 req/min |
| Business | Unlimited | 300 req/min |
| Enterprise | Unlimited | Custom |

## Revoking Keys

### Via Dashboard

1. Go to **Dashboard > API Keys**
2. Find the key to revoke
3. Click the delete icon
4. Confirm deletion

### Via API

```bash
curl -X DELETE https://api.wordpress-mcp.com/api/keys/key_abc123 \
  -H "Authorization: Bearer YOUR_KEY"
```

## Security Best Practices

### Do's

- ✅ Use environment variables to store keys
- ✅ Create separate keys for dev/staging/production
- ✅ Rotate keys periodically (every 90 days)
- ✅ Name keys descriptively
- ✅ Revoke unused keys immediately

### Don'ts

- ❌ Never commit keys to version control
- ❌ Never share keys in plain text
- ❌ Never expose keys in client-side code
- ❌ Never use production keys for testing

## Environment Variables

### Node.js

```javascript
// .env
WORDPRESS_MCP_API_KEY=wp_mcp_live_xxxx

// app.js
const apiKey = process.env.WORDPRESS_MCP_API_KEY;
```

### Python

```python
# .env
WORDPRESS_MCP_API_KEY=wp_mcp_live_xxxx

# app.py
import os
api_key = os.environ.get('WORDPRESS_MCP_API_KEY')
```

## Key Rotation

For enhanced security, rotate your keys regularly:

1. Create a new key
2. Update your applications to use the new key
3. Verify all systems work with the new key
4. Revoke the old key

## Monitoring Key Usage

View usage statistics for each key:

1. Go to **Dashboard > API Keys**
2. Click on a key name
3. View requests, errors, and last used time

Or via API:

```bash
curl https://api.wordpress-mcp.com/api/keys/key_abc123/stats \
  -H "Authorization: Bearer YOUR_KEY"
```

Response:
```json
{
  "keyId": "key_abc123",
  "totalRequests": 12345,
  "successRate": 99.5,
  "lastUsedAt": "2026-01-27T10:30:00Z",
  "topTools": [
    {"tool": "wp_get_posts", "count": 5432},
    {"tool": "wp_create_post", "count": 2345}
  ]
}
```
