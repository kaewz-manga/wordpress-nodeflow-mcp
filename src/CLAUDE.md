# Worker Code Guide

> Cloudflare Worker source code for WordPress MCP SaaS platform.

---

## File Overview

| File | Purpose |
|------|---------|
| `index.ts` | Main entry — all API routes + MCP handler |
| `auth.ts` | Register, login, API key validation, TOTP, sudo mode |
| `db.ts` | All D1 CRUD operations |
| `crypto-utils.ts` | PBKDF2, AES-256-GCM, JWT, API key gen, TOTP |
| `oauth.ts` | GitHub + Google OAuth 2.0 flows |
| `stripe.ts` | Stripe checkout, billing portal, webhooks |
| `mcp/server.ts` | JSON-RPC 2.0 handler |
| `mcp/tools.ts` | 13 MCP tool definitions |
| `mcp/handlers/*.ts` | Posts, pages, media handlers |
| `wordpress/client.ts` | WordPress REST API client |
| `wordpress/auth.ts` | Application Password handling |
| `types.ts` | TypeScript interfaces |

---

## Patterns

### D1 Queries

Always use prepared statements:
```typescript
const result = await env.DB.prepare(
  'SELECT * FROM users WHERE id = ?'
).bind(userId).first();
```

### WordPress Auth

Application Password must have spaces removed:
```typescript
function cleanApplicationPassword(password: string): string {
  return password.replace(/\s+/g, '');
}

const auth = btoa(`${username}:${cleanPassword}`);
```

### Multi-tenant Header Auth

```typescript
function getWordPressCredentials(request: Request, env: Env) {
  // Priority 1: Headers (multi-tenant)
  const url = request.headers.get('x-wordpress-url');
  const username = request.headers.get('x-wordpress-username');
  const password = request.headers.get('x-wordpress-password');

  if (url && username && password) {
    return { url, username, password };
  }

  // Priority 2: Environment (single-tenant)
  return {
    url: env.WORDPRESS_URL,
    username: env.WORDPRESS_USERNAME,
    password: env.WORDPRESS_APP_PASSWORD
  };
}
```

---

## Auth Systems (4 types)

| Type | Header | Used By |
|------|--------|---------|
| **JWT** | `Authorization: Bearer eyJhbG...` | Dashboard |
| **API Key** | `Authorization: Bearer wp_xxx` | MCP clients |
| **OAuth** | Redirect flow | GitHub/Google login |
| **WordPress Headers** | `x-wordpress-*` | Multi-tenant MCP |

---

## API Routes

### Auth (`/api/auth/*`)
- `POST /register` — Create account
- `POST /login` — Get JWT
- `GET /me` — Get current user
- `POST /totp/setup` — Setup 2FA
- `POST /verify-sudo` — Verify TOTP

### Resources (`/api/*`)
- `GET|POST /connections` — WordPress connections
- `GET|POST /api-keys` — Manage API keys
- `GET /usage` — Usage statistics

### MCP (`/mcp`)
- `POST /mcp` — JSON-RPC 2.0 endpoint (13 tools)

---

## WordPress Tools (13)

### Posts (5)
- `wp_get_posts`, `wp_get_post`, `wp_create_post`, `wp_update_post`, `wp_delete_post`

### Pages (4)
- `wp_get_pages`, `wp_create_page`, `wp_update_page`, `wp_delete_page`

### Media (4)
- `wp_get_media`, `wp_get_media_item`, `wp_upload_media_from_url`, `wp_upload_media_from_base64`

---

## Things to Avoid

- Don't use Node.js APIs (`fs`, `crypto`, `process`)
- Don't log WordPress passwords
- Don't change `ENCRYPTION_KEY` — breaks all credentials
- Always remove spaces from Application Password
