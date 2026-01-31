# Handoff: wordpress-nodeflow-mcp

**Date**: 2026-01-31
**Branch**: `claude/code-review-bbJuJ`
**Commit**: `6257867`
**Template**: `n8n-management-mcp` (same parent directory)

---

## What Was Done

Refactored from deep nested modules (58 files, ~13,800 lines) to flat SaaS structure (10 files, ~4,600 lines) matching the `n8n-management-mcp` template. Removed all enterprise features.

---

## File Structure

```
src/
├── index.ts          (995 lines)  - Main router, API routes, MCP handler
├── tools.ts          (614 lines)  - 24 MCP tool definitions
├── db.ts             (567 lines)  - All D1 database operations
├── auth.ts           (563 lines)  - Register, login, API key auth, connections
├── wp-client.ts      (525 lines)  - WordPress REST API + ImgBB client
├── saas-types.ts     (417 lines)  - All TypeScript interfaces
├── oauth.ts          (329 lines)  - GitHub + Google OAuth flows
├── crypto-utils.ts   (306 lines)  - PBKDF2, AES-GCM, JWT, API keys
├── stripe.ts         (286 lines)  - Checkout, portal, webhooks
└── types.ts          (20 lines)   - Base MCP types

schema.sql            (150 lines)  - D1 database schema (7 tables)
wrangler.toml                      - D1 + KV bindings
```

---

## What Was Removed

Enterprise features not in the template:

- SSO (SAML/OIDC)
- SLA Dashboard
- Team Management (roles, invitations)
- Webhooks (event dispatcher)
- Custom Domains (domain mapping, SSL)
- Audit Logs (enterprise trail)
- Admin Portal (enterprise admin)

---

## Key Differences from Template

### 1. WordPress Connections vs n8n Connections

WordPress stores **two** encrypted fields (username + password), n8n stores **one** (api_key):

| Template (n8n) | WordPress |
|---|---|
| `n8n_url` | `wp_url` |
| `n8n_api_key_encrypted` | `wp_username_encrypted` |
| - | `wp_password_encrypted` |

Table: `wp_connections` (was `n8n_connections`)

### 2. AuthContext

```typescript
// Template
connection: { id, n8n_url, n8n_api_key }

// WordPress
connection: { id, wp_url, wp_username, wp_password }
```

### 3. Connection Test

Template tests: `GET {n8n_url}/api/v1/workflows?limit=1` with `X-N8N-API-KEY` header
WordPress tests: `GET {wp_url}/wp-json/wp/v2/posts?per_page=1` with Basic Auth header

Application password spaces are cleaned automatically before storing.

### 4. Encryption Salt

`wp-mcp-saas-salt` (was `n8n-mcp-saas-salt`)

### 5. No Proxy API

Template has `/api/n8n/*` proxy routes. WordPress doesn't need this - all operations go through MCP tool calls at `/mcp`.

### 6. No AI/Bot Connections

Template has `ai_connections` and `bot_connections`. Not carried over (n8n-specific).

---

## 24 MCP Tools

| Category | Tools |
|---|---|
| Posts (5) | `wp_get_posts`, `wp_get_post`, `wp_create_post`, `wp_update_post`, `wp_delete_post` |
| Pages (4) | `wp_get_pages`, `wp_create_page`, `wp_update_page`, `wp_delete_page` |
| Media (4) | `wp_get_media`, `wp_get_media_item`, `wp_upload_media_from_url`, `wp_upload_media_from_base64` |
| Categories (4) | `wp_get_categories`, `wp_get_category`, `wp_create_category`, `wp_delete_category` |
| Tags (2) | `wp_get_tags`, `wp_create_tag` |
| Comments (4) | `wp_get_comments`, `wp_approve_comment`, `wp_spam_comment`, `wp_delete_comment` |
| Storage (1) | `upload_to_imgbb` |

---

## Database Schema (7 tables)

| Table | Purpose |
|---|---|
| `users` | Email/password or OAuth users with plan + admin flag |
| `wp_connections` | Encrypted WordPress credentials per user |
| `api_keys` | SaaS API keys (hashed, linked to connection) |
| `usage_logs` | Per-request logging (tool, status, response time) |
| `usage_monthly` | Aggregated monthly counts per user |
| `plans` | Plan definitions (free/starter/pro/enterprise) |
| `admin_logs` | Admin action audit trail |

Default plans:

| Plan | Requests/mo | Connections | Price |
|---|---|---|---|
| Free | 100 | 1 | $0 |
| Starter | 1,000 | 3 | $9.99 |
| Pro | 10,000 | 10 | $29.99 |
| Enterprise | 100,000 | Unlimited | $99.99 |

---

## API Endpoints

### Public
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login (returns JWT)
- `GET /api/auth/oauth/providers` - List OAuth providers
- `GET /api/auth/oauth/{github|google}` - Start OAuth
- `GET /api/auth/oauth/{github|google}/callback` - OAuth callback
- `GET /api/plans` - Pricing plans
- `POST /api/webhooks/stripe` - Stripe webhook

### Authenticated (JWT)
- `GET /api/user/profile` - Current user
- `PUT /api/user/password` - Change password
- `DELETE /api/user` - Delete account
- `GET /api/connections` - List WordPress connections
- `POST /api/connections` - Create connection (tests WP, generates API key)
- `DELETE /api/connections/:id` - Delete connection
- `POST /api/connections/:id/api-keys` - Generate API key
- `DELETE /api/api-keys/:id` - Revoke API key
- `GET /api/usage` - Usage stats
- `POST /api/billing/checkout` - Stripe checkout
- `POST /api/billing/portal` - Stripe billing portal

### Admin (JWT + is_admin=1)
- `GET /api/admin/stats` - Dashboard stats
- `GET /api/admin/users` - List/search users
- `GET /api/admin/users/:id` - User detail
- `PUT /api/admin/users/:id/plan` - Change plan
- `PUT /api/admin/users/:id/status` - Suspend/activate
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/analytics/usage` - Usage timeseries
- `GET /api/admin/analytics/tools` - Top tools
- `GET /api/admin/analytics/top-users` - Top users
- `GET /api/admin/revenue/overview` - MRR + plan distribution
- `GET /api/admin/health/errors` - Recent errors
- `GET /api/admin/health/error-trend` - Error trend

### MCP (API key)
- `POST /mcp` - JSON-RPC 2.0 (Bearer saas_xxx)

---

## Config

### wrangler.toml Changes
- KV binding: `RATE_LIMIT` -> `RATE_LIMIT_KV` (matching Env type)
- Removed old tier limit vars (now in `plans` table)

### Secrets (wrangler secret put)

| Secret | Required | Purpose |
|---|---|---|
| `JWT_SECRET` | Yes | JWT signing |
| `ENCRYPTION_KEY` | Yes | AES-GCM credential encryption |
| `WORDPRESS_URL` | No | Default WP URL (single-tenant) |
| `WORDPRESS_USERNAME` | No | Default WP username |
| `WORDPRESS_APP_PASSWORD` | No | Default WP app password |
| `IMGBB_API_KEY` | No | ImgBB image hosting |
| `GITHUB_CLIENT_ID` | No | GitHub OAuth |
| `GITHUB_CLIENT_SECRET` | No | GitHub OAuth |
| `GOOGLE_CLIENT_ID` | No | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth |
| `STRIPE_SECRET_KEY` | No | Stripe billing |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook |
| `STRIPE_PRICE_STARTER` | No | Stripe price ID |
| `STRIPE_PRICE_PRO` | No | Stripe price ID |
| `STRIPE_PRICE_ENTERPRISE` | No | Stripe price ID |

---

## Completed Cleanup

- [x] Removed enterprise pages (Team) from dashboard
- [x] Removed business tier, aligned all pricing to schema.sql (free/starter/pro/enterprise)
- [x] Replaced 6 old migrations with single clean migration matching schema.sql
- [x] Deleted `src-old/` backup directory
- [x] Fixed all dashboard API endpoints to match backend routes
- [x] Fixed useAuth to use correct response shape and endpoints
- [x] Added `api.put()` method to dashboard API utility

---

## Known Gaps

### ApiKeys Page Architecture Mismatch

Dashboard treats API keys as standalone (`/api/keys`), but backend requires:
1. Create connection first: `POST /api/connections`
2. Generate API key per connection: `POST /api/connections/:id/api-keys`
3. Delete API key: `DELETE /api/api-keys/:id` (this one works)

The ApiKeys page needs rework to support the connection-based flow.

### Missing Backend Endpoints

These dashboard features have no backend support yet (pages show empty state):
- Analytics charts (request volume, response time distribution, tool usage, errors by type)
- Usage logs (detailed per-request log entries)
- Notification preferences (save/load)
- Profile update (name field)

---

## Next Steps

1. `wrangler d1 execute wordpress-mcp-db --file=schema.sql` - Deploy schema
2. `wrangler secret put JWT_SECRET` + `ENCRYPTION_KEY` - Set required secrets
3. `npx wrangler dev` -> `curl http://localhost:8787/` - Test locally
4. Send `tools/list` to `/mcp` - Verify 24 tools
5. Rework ApiKeys page to support connection-based API key flow

---

## Critical Notes

- **Application Password**: WordPress shows with spaces, must remove before use. `wp-client.ts` handles this automatically.
- **ENCRYPTION_KEY**: Never change after first use - breaks all stored credentials.
- **TypeScript**: Strict mode enabled, `npx tsc --noEmit` must pass clean.
- **SSRF Protection**: `wp-client.ts` blocks requests to localhost, private IPs, and cloud metadata endpoints.
