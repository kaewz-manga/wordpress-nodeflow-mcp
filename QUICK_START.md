# Quick Start Guide

Get wordpress-nodeflow-mcp running in 3 minutes.

## Prerequisites

- Node.js 20+ installed
- WordPress site with REST API enabled
- WordPress Application Password

---

## Step 1: Install

```powershell
cd wordpress-nodeflow-mcp
npm install
```

---

## Step 2: Configure

Edit `.dev.vars` with your WordPress credentials:

```env
WORDPRESS_URL=https://your-wordpress-site.com
WORDPRESS_USERNAME=your_username
WORDPRESS_APP_PASSWORD=yourAppPasswordWithoutSpaces
```

**CRITICAL**: Remove all spaces from Application Password
- WordPress shows: `aBcD eFgH iJkL mNoP qRsT uVwX`
- You use: `aBcDeFgHiJkLmNoPqRsTuVwX`

---

## Step 3: Run

```powershell
.\start-dev.ps1
```

Server starts at: `http://localhost:8787`

---

## Step 4: Test

Open a new terminal and run:

```powershell
.\test-local.ps1
```

This will test all endpoints and WordPress integration.

---

## What's Next?

### Test in Browser
- Open: http://localhost:8787/health
- Should see: `{"status":"healthy",...}`

### Test MCP Protocol
```powershell
curl -X POST http://localhost:8787/mcp `
  -H "Content-Type: application/json" `
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

### Create a WordPress Post
```powershell
curl -X POST http://localhost:8787/mcp `
  -H "Content-Type: application/json" `
  -d '{
    "jsonrpc":"2.0",
    "id":1,
    "method":"tools/call",
    "params":{
      "name":"wp_create_post",
      "arguments":{
        "title":"Test Post",
        "content":"Created via MCP",
        "status":"draft"
      }
    }
  }'
```

### Use with n8n
1. Import workflow from: `examples/n8n-workflow-example.json`
2. Update WordPress credentials in HTTP Request node
3. Test workflow

---

## Troubleshooting

### 401 Unauthorized Error

**Problem**: Write operations (create/update/delete) fail with 401

**Solution**: Check Application Password format
1. Open `.dev.vars`
2. Ensure `WORDPRESS_APP_PASSWORD` has **no spaces**
3. Restart dev server

### CORS Errors

**Solution**: Already configured. Check `wrangler.toml`:
```toml
[vars]
ALLOWED_ORIGINS = "*"
```

### Server Won't Start

**Check**:
1. Port 8787 not in use: `netstat -ano | findstr :8787`
2. Node.js version: `node --version` (should be 20+)
3. Dependencies installed: `ls node_modules`

---

## File Structure

```
wordpress-nodeflow-mcp/
├── src/                    # Source code
├── examples/              # Usage examples
├── .dev.vars              # Local secrets (YOU EDIT THIS)
├── start-dev.ps1          # Start server
├── test-local.ps1         # Test endpoints
└── README.md              # Full documentation
```

---

## Next Steps

- **Deploy to Production**: See [DEPLOYMENT.md](DEPLOYMENT.md)
- **API Reference**: See [examples/curl-examples.md](examples/curl-examples.md)
- **n8n Integration**: See [examples/n8n-workflow-example.json](examples/n8n-workflow-example.json)

---

## Getting Help

- **GitHub Issues**: https://github.com/<username>/wordpress-nodeflow-mcp/issues
- **WordPress REST API Docs**: https://developer.wordpress.org/rest-api/
- **Cloudflare Workers Docs**: https://developers.cloudflare.com/workers/

---

**Estimated time**: 3 minutes ⏱️
