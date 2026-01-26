# CLAUDE.md - wordpress-nodeflow-mcp Technical Guide

> Technical reference for AI assistants working with wordpress-nodeflow-mcp

---

## Project Overview

**Type**: Cloudflare Workers MCP Server for WordPress REST API

**Purpose**: Serverless MCP server that wraps WordPress REST API as MCP tools

**Key Features**:
- 13 WordPress tools (posts, pages, media)
- Multi-tenant support (headers + environment)
- JSON-RPC 2.0 over HTTP
- Zero memory leaks (stateless Workers)
- Auto-scaling (100K requests/day free)

**Deployment**:
- Platform: Cloudflare Workers
- URL: `https://wordpress-mcp.nodeflow.workers.dev/mcp`
- Protocol: MCP (JSON-RPC 2.0 over HTTP)

---

## Architecture

### File Structure

```
src/
├── index.ts                    # Worker entry point, routing
├── mcp/
│   ├── server.ts              # JSON-RPC 2.0 handler
│   ├── tools.ts               # Tool definitions (12 tools)
│   └── handlers/
│       ├── index.ts           # Tool routing
│       ├── posts.ts           # Posts handlers (5 tools)
│       ├── pages.ts           # Pages handlers (4 tools)
│       └── media.ts           # Media handlers (3 tools)
├── wordpress/
│   ├── client.ts              # WordPress REST API client
│   ├── auth.ts                # Authentication (HTTP Basic)
│   └── types.ts               # TypeScript interfaces
└── utils/
    ├── errors.ts              # MCP error codes
    ├── validation.ts          # Input validation
    └── response.ts            # Response formatting (not implemented yet)
```

### Request Flow

```
1. Request → index.ts (routing)
2. /mcp → mcp/server.ts (JSON-RPC parser)
3. tools/call → handlers/index.ts (tool routing)
4. Tool handler → wordpress/client.ts (API call)
5. Response ← JSON-RPC 2.0 format
```

### Authentication Flow

```
1. getCredentials(request, env)
   ├── Check headers (x-wordpress-url, x-wordpress-username, x-wordpress-password)
   │   └── If found → Multi-tenant mode
   └── Check env (WORDPRESS_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD)
       └── If found → Single-tenant mode

2. createAuthHeader(username, password)
   ├── cleanApplicationPassword(password) → Remove spaces
   └── btoa(username:cleanPassword) → Base64 encode

3. WordPressClient.makeRequest()
   └── Add Authorization: Basic <encoded>
```

---

## Key Implementation Details

### 1. WordPress Application Password Format

**Critical Issue**: WordPress displays Application Passwords **with spaces** for readability, but HTTP Basic Auth **does not support spaces**.

**Implementation**: `src/wordpress/auth.ts:11-13`
```typescript
function cleanApplicationPassword(password: string): string {
  return password.replace(/\s+/g, '');
}
```

**Example**:
- WordPress UI shows: `cUAn CKZ1 u5DN IkpS bMra FCWL`
- Must use: `cUAnCKZ1u5DNIkpSbMraFCWL`

### 2. Multi-Tenant Credential Priority

**Implementation**: `src/wordpress/auth.ts:30-50`

**Priority Order**:
1. HTTP Headers (`x-wordpress-url`, `x-wordpress-username`, `x-wordpress-password`)
2. Environment Variables (`WORDPRESS_URL`, `WORDPRESS_USERNAME`, `WORDPRESS_APP_PASSWORD`)
3. Throw error if neither provided

**Use Cases**:
- Single WordPress site → Use environment variables
- Multiple WordPress sites → Use HTTP headers per request

### 3. JSON-RPC 2.0 Error Handling

**Implementation**: `src/mcp/server.ts:25-75`

**Error Types**:
- Parse Error (-32700): Invalid JSON
- Invalid Request (-32600): Invalid JSON-RPC format
- Method Not Found (-32601): Unknown method
- Invalid Params (-32602): Missing/invalid parameters
- Internal Error (-32603): Server error

**Custom MCP Errors** (`src/utils/errors.ts:27-33`):
- No Credentials (-32001): Missing WordPress credentials
- Invalid Credentials (-32002): Invalid URL or credentials
- WordPress API Error (-32003): WordPress API returned error
- Tool Not Found (-32004): Unknown tool name
- Validation Error (-32005): Invalid tool arguments

### 4. Tool Validation Pattern

**Implementation**: All handlers use validation utilities (`src/utils/validation.ts`)

**Validation Functions**:
- `validateRequiredString(value, fieldName)` → Throws if missing/empty
- `validateOptionalString(value, fieldName)` → Returns undefined if missing
- `validateEnum(value, fieldName, allowedValues, defaultValue)` → Validates enum
- `validateNumber(value, fieldName, required)` → Validates number
- `validateBoolean(value, fieldName, defaultValue)` → Validates boolean

**Example**: `src/mcp/handlers/posts.ts:75-81`
```typescript
const title = validateRequiredString(args.title, 'title');
const content = validateRequiredString(args.content, 'content');
const status = validateEnum(args.status, 'status', POST_STATUSES, 'draft');
```

---

## Tools Reference

### Posts Tools (5)

| Tool | Required Args | Optional Args | Returns |
|------|---------------|---------------|---------|
| `wp_get_posts` | - | per_page, page, status, search | {count, posts[]} |
| `wp_get_post` | id | - | {id, title, content, link, status} |
| `wp_create_post` | title, content | status, excerpt, featured_media | {id, title, link, status} |
| `wp_update_post` | id | title, content, status, excerpt, featured_media | {id, title, link, status} |
| `wp_delete_post` | id | force | {success, id, deleted} |

### Pages Tools (4)

| Tool | Required Args | Optional Args | Returns |
|------|---------------|---------------|---------|
| `wp_get_pages` | - | per_page, page, search | {count, pages[]} |
| `wp_create_page` | title, content | status | {id, title, link, status} |
| `wp_update_page` | id | title, content, status | {id, title, link, status} |
| `wp_delete_page` | id | force | {success, id, deleted} |

### Media Tools (4)

| Tool | Required Args | Optional Args | Returns |
|------|---------------|---------------|---------|
| `wp_get_media` | - | per_page, page, media_type | {count, media[]} |
| `wp_get_media_item` | id | - | {id, title, source_url, media_type} |
| `wp_upload_media_from_url` | url | title, alt_text, caption | {id, title, source_url, media_type} |
| `wp_upload_media_from_base64` | base64, fileName, mimeType | title, alt_text, caption | {id, title, source_url, media_type} |

---

## Configuration

### Environment Variables (Single-tenant)

Set via `wrangler secret put <KEY>`:

```bash
WORDPRESS_URL                # WordPress site URL (e.g., https://wp.missmanga.org)
WORDPRESS_USERNAME           # WordPress admin username
WORDPRESS_APP_PASSWORD       # Application Password (spaces removed!)
ALLOWED_ORIGINS              # CORS allowed origins (default: *)
```

### HTTP Headers (Multi-tenant)

Send with each request to override environment:

```
x-wordpress-url: https://wp.example.com
x-wordpress-username: admin
x-wordpress-password: cUAnCKZ1u5DNIkpSbMraFCWL
```

### wrangler.toml

```toml
name = "wordpress-nodeflow-mcp"
main = "src/index.ts"
compatibility_date = "2024-11-27"
compatibility_flags = ["nodejs_compat"]

[env.production]
name = "wordpress-nodeflow-mcp"
route = { pattern = "wordpress-mcp.nodeflow.workers.dev", zone_name = "nodeflow.workers.dev" }

[vars]
ALLOWED_ORIGINS = "*"
```

---

## Testing

### Local Testing

```bash
# Start dev server
npm run dev

# Test health endpoint
curl http://localhost:8787/health

# Test MCP protocol
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

### Production Testing

```bash
# Test health
curl https://wordpress-mcp.nodeflow.workers.dev/health

# Test create post (multi-tenant)
curl -X POST https://wordpress-mcp.nodeflow.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -H "x-wordpress-url: https://wp.missmanga.org" \
  -H "x-wordpress-username: kaewz" \
  -H "x-wordpress-password: cUAnCKZ1u5DNIkpSbMraFCWL" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "wp_create_post",
      "arguments": {
        "title": "Test Post",
        "content": "Test content",
        "status": "draft"
      }
    }
  }'
```

---

## Common Issues

### 1. 401 Unauthorized on Write Operations

**Symptoms**: GET works, POST/PUT/DELETE fail with 401

**Cause**: Application Password has spaces

**Fix**: Remove all spaces from password
```typescript
// ❌ Wrong
WORDPRESS_APP_PASSWORD=cUAn CKZ1 u5DN IkpS bMra FCWL

// ✅ Correct
WORDPRESS_APP_PASSWORD=cUAnCKZ1u5DNIkpSbMraFCWL
```

### 2. CORS Errors

**Symptoms**: Browser blocks requests

**Fix**: Check `ALLOWED_ORIGINS` in wrangler.toml or use `*` for development

### 3. Tool Not Found

**Symptoms**: `"error": {"code": -32601, "message": "Tool not found: wp_..."}`

**Fix**: Call `tools/list` to verify exact tool names (all lowercase with underscores)

### 4. Invalid WordPress URL

**Symptoms**: `"error": {"code": -32002, "message": "Invalid WordPress URL: ..."}`

**Fix**: Ensure URL includes protocol (`https://`) and no trailing slash

---

## Development Guidelines

### Adding New Tools

1. Define tool schema in `src/mcp/tools.ts`
2. Create handler function in appropriate file (`posts.ts`, `pages.ts`, `media.ts`)
3. Add route in `src/mcp/handlers/index.ts`
4. Add WordPress API method in `src/wordpress/client.ts` (if needed)
5. Update README.md with tool documentation

### Error Handling

Always use `MCPError` for errors:

```typescript
import { MCPError, MCPErrorCodes } from '../utils/errors';

throw new MCPError(
  MCPErrorCodes.VALIDATION_ERROR,
  'Title is required',
  { field: 'title' }
);
```

### Validation

Always validate inputs using utilities:

```typescript
import { validateRequiredString } from '../../utils/validation';

const title = validateRequiredString(args.title, 'title');
```

---

## Deployment

### Manual Deployment

```bash
# Set secrets
wrangler secret put WORDPRESS_URL
wrangler secret put WORDPRESS_USERNAME
wrangler secret put WORDPRESS_APP_PASSWORD

# Deploy
wrangler deploy
```

### GitHub Actions (Automatic)

Push to `main` branch → Auto-deploys via `.github/workflows/deploy.yml`

**Required GitHub Secrets**:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

---

## Performance

**Cloudflare Workers Limits**:
- CPU time: 50ms per request (free tier), 30s (paid)
- Memory: 128MB
- Request size: 100MB
- Response size: 100MB

**Typical Response Times**:
- Local development: < 10ms
- Production (edge): < 50ms (Workers) + 100-300ms (WordPress API)

**Optimization Tips**:
- Workers run on edge (300+ locations)
- Stateless = zero memory leaks
- Auto-scaling based on traffic
- Free tier: 100,000 requests/day

---

**Version**: 1.0.0 | Updated: 2026-01-25 | By: Claude Code
