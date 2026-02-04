---
description: Deploy Cloudflare Worker with full verification
---

# Deploy wordpress-nodeflow-mcp

## Pre-deployment Checks

1. Type check:
   ```bash
   npm run type-check
   ```

2. Run tests:
   ```bash
   npm test
   ```

3. Check for uncommitted changes:
   ```bash
   git status
   ```

## Deployment Steps

### 1. Set Secrets (First Time Only)

```bash
wrangler secret put WORDPRESS_URL
wrangler secret put WORDPRESS_USERNAME
wrangler secret put WORDPRESS_APP_PASSWORD
```

### 2. Deploy

```bash
npm run deploy
# or
wrangler deploy
```

### 3. Verify Deployment

```bash
# Health check
curl https://wordpress-mcp.nodeflow.workers.dev/health

# Tools list
curl -X POST https://wordpress-mcp.nodeflow.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# Test with credentials
curl -X POST https://wordpress-mcp.nodeflow.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -H "x-wordpress-url: https://your-site.com" \
  -H "x-wordpress-username: admin" \
  -H "x-wordpress-password: AppPasswordNoSpaces" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"wp_get_posts"},"id":2}'
```

### 4. Monitor Logs

```bash
wrangler tail
```

## Rollback

If deployment fails:

```bash
# List deployments
wrangler deployments list

# Rollback to previous
wrangler rollback
```

## GitHub Actions (Automatic)

Push to `main` branch → Auto-deploys via `.github/workflows/deploy.yml`

**Required GitHub Secrets**:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
