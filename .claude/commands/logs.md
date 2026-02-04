---
description: View Cloudflare Worker logs
---

# View Worker Logs

## Real-time Logs

```bash
wrangler tail
```

## Filter by Status

```bash
# Only errors
wrangler tail --status error

# Only successful
wrangler tail --status ok
```

## Filter by Path

```bash
# Only MCP requests
wrangler tail --search "/mcp"

# Only health checks
wrangler tail --search "/health"
```

## Filter by IP

```bash
wrangler tail --ip 1.2.3.4
```

## Common Log Patterns

### Successful Request
```
POST /mcp - 200 - 45ms
```

### Authentication Error
```
POST /mcp - 401 - 5ms
Error: No WordPress credentials provided
```

### WordPress API Error
```
POST /mcp - 200 (JSON-RPC error)
Error: WordPress API error: 401 Unauthorized
```

### Validation Error
```
POST /mcp - 200 (JSON-RPC error)
Error: title is required
```

## Local Development Logs

```bash
# Start dev server with logs
npm run dev

# Logs appear in terminal
```

## Cloudflare Dashboard

1. Go to https://dash.cloudflare.com
2. Select Workers & Pages
3. Select `wordpress-nodeflow-mcp`
4. Click "Logs" tab
