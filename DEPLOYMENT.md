# Deployment Guide

Deploy wordpress-nodeflow-mcp to Cloudflare Workers.

---

## Prerequisites

- Cloudflare account (free tier works)
- Wrangler CLI installed (already included in `node_modules`)
- Cloudflare API token

---

## Method 1: Manual Deployment

### Step 1: Login to Cloudflare

```powershell
npx wrangler login
```

This opens a browser for authentication.

### Step 2: Set Production Secrets

```powershell
npx wrangler secret put WORDPRESS_URL
# Enter: https://your-wordpress-site.com

npx wrangler secret put WORDPRESS_USERNAME
# Enter: your_username

npx wrangler secret put WORDPRESS_APP_PASSWORD
# Enter: yourAppPasswordWithoutSpaces (no spaces!)
```

**IMPORTANT**: Secrets are encrypted and stored securely by Cloudflare.

### Step 3: Deploy

```powershell
npm run deploy
```

Or:

```powershell
npx wrangler deploy
```

### Step 4: Test Production

```powershell
# Test health
curl https://wordpress-mcp.nodeflow.workers.dev/health

# Test MCP
curl -X POST https://wordpress-mcp.nodeflow.workers.dev/mcp `
  -H "Content-Type: application/json" `
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

---

## Method 2: GitHub Actions (Automatic)

### Step 1: Push to GitHub

```powershell
# Initialize git (if not already)
git init
git add .
git commit -m "Initial commit"

# Create repository on GitHub, then:
git remote add origin https://github.com/<username>/wordpress-nodeflow-mcp.git
git branch -M main
git push -u origin main
```

### Step 2: Get Cloudflare Credentials

#### A. API Token

1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click **Create Token**
3. Use template: **Edit Cloudflare Workers**
4. Click **Continue to summary**
5. Click **Create Token**
6. Copy the token

#### B. Account ID

1. Go to: https://dash.cloudflare.com/
2. Select your website
3. Scroll down to **Account ID** (right sidebar)
4. Copy the ID

### Step 3: Add GitHub Secrets

1. Go to GitHub repository → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add these secrets:

| Name | Value | Description |
|------|-------|-------------|
| `CLOUDFLARE_API_TOKEN` | `your_api_token` | From Step 2A |
| `CLOUDFLARE_ACCOUNT_ID` | `your_account_id` | From Step 2B |

### Step 4: Set WordPress Secrets (Optional)

If you want single-tenant mode (one WordPress site for all requests):

```powershell
npx wrangler secret put WORDPRESS_URL
npx wrangler secret put WORDPRESS_USERNAME
npx wrangler secret put WORDPRESS_APP_PASSWORD
```

If you skip this, you must provide credentials via HTTP headers.

### Step 5: Deploy

Push to `main` branch:

```powershell
git add .
git commit -m "Update configuration"
git push
```

GitHub Actions automatically deploys to Cloudflare Workers.

Check deployment status:
- GitHub: Repository → **Actions** tab
- Cloudflare: https://dash.cloudflare.com/ → **Workers & Pages**

---

## Configuration

### Environment Variables

Set via `wrangler secret put <KEY>`:

| Variable | Required | Description |
|----------|----------|-------------|
| `WORDPRESS_URL` | No* | Default WordPress site URL |
| `WORDPRESS_USERNAME` | No* | WordPress username |
| `WORDPRESS_APP_PASSWORD` | No* | Application Password (no spaces) |

*Required for single-tenant mode. Optional if using multi-tenant mode (headers).

### Multi-Tenant Mode

To use different WordPress sites per request, send credentials via headers:

```bash
curl -X POST https://wordpress-mcp.nodeflow.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -H "x-wordpress-url: https://site1.com" \
  -H "x-wordpress-username: user1" \
  -H "x-wordpress-password: password1" \
  -d '{"jsonrpc":"2.0",...}'
```

Headers override environment variables.

---

## Custom Domain (Optional)

### Step 1: Add Route

Edit `wrangler.toml`:

```toml
[env.production]
name = "wordpress-nodeflow-mcp"
routes = [
  { pattern = "api.yourdomain.com/*", zone_name = "yourdomain.com" }
]
```

### Step 2: Add DNS Record

In Cloudflare DNS:

1. Go to: DNS → **Records**
2. Click **Add record**
3. Type: `CNAME`
4. Name: `api` (or your subdomain)
5. Target: `wordpress-nodeflow-mcp.workers.dev`
6. Proxy: **Proxied** (orange cloud)

### Step 3: Deploy

```powershell
npm run deploy
```

Now accessible at: `https://api.yourdomain.com/mcp`

---

## Monitoring

### View Logs

```powershell
npx wrangler tail
```

Shows real-time logs from production.

### Cloudflare Dashboard

1. Go to: https://dash.cloudflare.com/
2. Click **Workers & Pages**
3. Click **wordpress-nodeflow-mcp**
4. View:
   - Requests per day
   - CPU time
   - Errors
   - Invocations

### Free Tier Limits

- **100,000 requests/day**
- **10ms CPU time per request**
- **Unlimited bandwidth**

Upgrade to Paid ($5/month) for:
- 10 million requests/month
- 50ms CPU time per request

---

## Rollback

### Rollback to Previous Version

```powershell
# List deployments
npx wrangler deployments list

# Rollback to specific version
npx wrangler rollback --version-id <version-id>
```

### Rollback via GitHub

Revert commit and push:

```powershell
git revert HEAD
git push
```

GitHub Actions auto-deploys the reverted version.

---

## Security Best Practices

### 1. Never Commit Secrets

`.dev.vars` is in `.gitignore` - **DO NOT remove it**

### 2. Use Environment Variables

Store credentials in Cloudflare secrets, not in code:

```powershell
npx wrangler secret put WORDPRESS_APP_PASSWORD
```

### 3. Rotate Secrets

If compromised:

1. Generate new WordPress Application Password
2. Update secret:
   ```powershell
   npx wrangler secret put WORDPRESS_APP_PASSWORD
   ```
3. Deploy:
   ```powershell
   npm run deploy
   ```

### 4. Use HTTPS Only

Cloudflare Workers enforce HTTPS automatically.

---

## Troubleshooting

### Deployment Failed

**Check**:
1. Wrangler authentication: `npx wrangler whoami`
2. Account ID correct: Check `wrangler.toml`
3. API token permissions: Must have "Edit Cloudflare Workers"

### 401 Unauthorized in Production

**Solution**: Check secrets

```powershell
# List secrets (shows names only, not values)
npx wrangler secret list

# Update password
npx wrangler secret put WORDPRESS_APP_PASSWORD
```

### High CPU Time

**Optimization**:
- WordPress API calls take time (100-300ms)
- Use caching if needed
- Consider upgrading to Paid plan (50ms CPU limit)

---

## Cost Estimate

### Free Tier (100K requests/day)

**Cost**: $0/month

**Suitable for**:
- Personal projects
- Small businesses
- Development/testing

### Paid Tier (10M requests/month)

**Cost**: $5/month

**Suitable for**:
- Production apps
- Multiple WordPress sites
- High traffic

---

## Next Steps

- **Monitor Usage**: https://dash.cloudflare.com/
- **View Logs**: `npx wrangler tail`
- **Update Code**: Push to GitHub → Auto-deploy
- **Scale Up**: Upgrade plan if needed

---

**Deployment time**: 5-10 minutes ⏱️
