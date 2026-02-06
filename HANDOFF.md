# Handoff: wordpress-nodeflow-mcp

**Date**: 2026-02-06
**Branch**: `main`
**Last Commit**: `11e4943` (Privacy, Terms, FAQ, Status, Admin pages)
**Template**: `n8n-management-mcp` (same parent directory)

---

## What Was Done

Refactored from deep nested modules (58 files, ~13,800 lines) to flat SaaS structure (10 files, ~4,600 lines) matching the `n8n-management-mcp` template. Removed all enterprise features.

**Latest changes**:
1. **Dark theme UI upgrade** (`79da1aa`) - Migrated entire dashboard from light to dark theme (n2f-* color system, blue #3b82f6 accent). Merged Header+Sidebar into unified Layout with mobile drawer. 18 files changed.
2. **New pages** (`11e4943`) - Added Privacy, Terms, FAQ, Status (public) + Admin Overview/Users/Analytics/Revenue/Health (admin-only) with AdminLayout/AdminRoute components. 14 files, +2010 lines.

---

## Production Deployment ✅

**Worker URL**: `https://wordpress-nodeflow-mcp.suphakitm99.workers.dev`
**Dashboard URL**: `https://wordpress-mcp-dashboard.pages.dev`

### Cloudflare Resources

| Resource | ID / URL |
|----------|-----|
| D1 Database | `654eed68-9519-4179-bc53-6c10da500a41` |
| KV Namespace | `767e51e45f5341cca170bd867f4c9118` |
| Pages Project | `wordpress-mcp-dashboard` |

### Secrets Set

- `JWT_SECRET` ✅
- `ENCRYPTION_KEY` ✅
- `GITHUB_CLIENT_ID` ✅
- `GITHUB_CLIENT_SECRET` ✅
- `GOOGLE_CLIENT_ID` ✅
- `GOOGLE_CLIENT_SECRET` ✅

### Verified Endpoints

| Test | Status |
|------|--------|
| `GET /` | ✅ Server status |
| `POST /api/auth/register` | ✅ User creation |
| `POST /api/auth/login` | ✅ JWT token |
| `GET /api/auth/oauth/github` | ✅ GitHub OAuth |
| `GET /api/auth/oauth/google` | ✅ Google OAuth |
| `POST /api/connections` | ✅ API key `n2f_xxx` + optional ImgBB key |
| `GET /api/connections` | ✅ Includes `has_imgbb_key` flag |
| `GET /api/analytics` | ✅ User analytics |
| `GET /api/usage/logs` | ✅ Usage logs |
| `POST /mcp` tools/list | ✅ 24 tools |
| `POST /mcp` wp_get_posts | ✅ Real WordPress data |

---

## Dashboard Dark Theme ✅

### Before vs After

| | Before | After |
|---|---|---|
| **Theme** | Light (white bg, gray borders) | Dark (n2f-* color system) |
| **Accent** | Sky blue (#0284c7) | Blue (#3b82f6) |
| **Layout** | Separate Header.tsx + Sidebar.tsx | Unified Layout.tsx with mobile drawer |
| **Components** | Basic Tailwind classes | Reusable `.btn-primary`, `.card`, `.input` |
| **Admin nav** | None | Admin Panel link (visible to is_admin users) |

### Color System (tailwind.config.js)

| Token | Value | Usage |
|---|---|---|
| `n2f-bg` | `#050508` | Page background |
| `n2f-card` | `#0a0b0e` | Card surfaces |
| `n2f-elevated` | `#12141a` | Elevated surfaces, inputs |
| `n2f-accent` | `#3b82f6` | Primary accent (blue) |
| `n2f-text` | `#f9fafb` | Primary text |
| `n2f-text-secondary` | `#9ca3af` | Secondary text |
| `n2f-text-muted` | `#6b7280` | Muted text |
| `n2f-border` | `#1f2937` | Borders |

### Files Changed (18 files)

| Action | Files |
|---|---|
| **Added** | `tailwind.config.js` (n2f colors) |
| **Rewritten** | `index.css` (dark theme classes), `Layout.tsx` (unified sidebar) |
| **Deleted** | `Header.tsx`, `Sidebar.tsx` (merged into Layout) |
| **Updated** | All 13 page files + `App.tsx` + `format.ts` |

---

## New Pages ✅

### Public Pages (no auth required)

| Route | Page | Description |
|---|---|---|
| `/privacy` | Privacy.tsx | Privacy policy with WordPress-specific data collection info |
| `/terms` | Terms.tsx | Terms of service with AI agent responsibility clause |
| `/faq` | FAQ.tsx | 5 categories, searchable, accordion UI |
| `/status` | Status.tsx | Live health check (pings `/api/plans`), 90-day uptime bar |

### Admin Pages (requires is_admin=1)

| Route | Page | API Endpoint |
|---|---|---|
| `/admin` | AdminOverview.tsx | `GET /api/admin/stats` |
| `/admin/users` | AdminUsers.tsx | `GET /api/admin/users` + plan/status/delete actions |
| `/admin/analytics` | AdminAnalytics.tsx | `GET /api/admin/analytics/usage,tools,top-users` |
| `/admin/revenue` | AdminRevenue.tsx | `GET /api/admin/revenue/overview` |
| `/admin/health` | AdminHealth.tsx | `GET /api/admin/health/errors,error-trend` |

### Components Added

| File | Purpose |
|---|---|
| `AdminLayout.tsx` | Admin sidebar with 5 nav items + Back to Dashboard link |
| `AdminRoute.tsx` | Route guard: redirects non-admin to `/dashboard`, unauthenticated to `/login` |

---

## ImgBB Per-User API Key ✅

### Before vs After

| | Before | After |
|---|---|---|
| **Key source** | `env.IMGBB_API_KEY` (server-wide) or `args.apiKey` (per-call) | `wp_connections.imgbb_api_key_encrypted` (per-user) |
| **Who provides key** | Server owner | Each user |
| **Storage** | Plain text in env | AES-GCM encrypted in D1 |
| **Tool argument** | `apiKey` (optional) | Removed |

### How It Works

```
1. User creates connection → provides ImgBB API key (optional field)
2. Key encrypted with AES-GCM → stored in wp_connections.imgbb_api_key_encrypted
3. On MCP call → authenticateMcpRequest() decrypts key → passes via AuthContext
4. upload_to_imgbb handler reads key from context.connection.imgbb_api_key
5. If no key configured → returns error "ImgBB API key not configured"
```

### Files Changed

| File | Change |
|------|--------|
| `schema.sql` | Added `imgbb_api_key_encrypted TEXT` to `wp_connections` |
| `migrations/0002_add_imgbb_api_key.sql` | ALTER TABLE for production D1 (already applied) |
| `src/saas-types.ts` | Added to `WordPressConnection`, `AuthContext`, `CreateConnectionRequest`; removed `IMGBB_API_KEY` from `Env` |
| `src/db.ts` | `createConnection()` accepts `imgbbApiKeyEncrypted` param |
| `src/auth.ts` | `handleCreateConnection()` encrypts + stores ImgBB key; `authenticateMcpRequest()` decrypts + passes in context |
| `src/index.ts` | `POST /api/connections` passes `imgbb_api_key`; `handleToolCall()` uses context key; `GET /api/connections` returns `has_imgbb_key` |
| `src/tools.ts` | Removed `apiKey` argument from `upload_to_imgbb` |
| `dashboard/src/pages/ApiKeys.tsx` | Added ImgBB API Key input field + purple "ImgBB" badge on connections |

### Migration

```bash
# Already applied to production:
wrangler d1 execute wordpress-mcp-db --remote --file=./migrations/0002_add_imgbb_api_key.sql
```

---

## GitHub OAuth Setup ✅

### Configuration

**GitHub OAuth App Settings**:
- Application name: `WordPress MCP Dashboard`
- Homepage URL: `https://wordpress-mcp-dashboard.pages.dev`
- Authorization callback URL: `https://wordpress-nodeflow-mcp.suphakitm99.workers.dev/api/auth/oauth/github/callback`

### OAuth Flow

```
1. User clicks "GitHub" on login page
2. Dashboard calls: GET /api/auth/oauth/github?redirect_uri=https://dashboard/auth/callback
3. Worker returns GitHub authorize URL (with worker callback as redirect_uri)
4. User authenticates on GitHub
5. GitHub redirects to: /api/auth/oauth/github/callback?code=xxx&state=xxx
6. Worker exchanges code for token, creates/finds user
7. Worker redirects to: https://dashboard/auth/callback?token=xxx
8. Dashboard saves token, redirects to /dashboard
```

### Key Files

- `src/index.ts` - OAuth initiate + callback handlers
- `src/oauth.ts` - GitHub/Google OAuth helpers
- `dashboard/src/pages/Login.tsx` - GitHub + Google login buttons
- `dashboard/src/pages/AuthCallback.tsx` - Token handler

---

## Google OAuth Setup ✅

### Configuration

**Google Cloud Console Settings**:
- Application name: `WordPress MCP Dashboard`
- Authorized JavaScript origins: `https://wordpress-mcp-dashboard.pages.dev`
- Authorized redirect URI: `https://wordpress-nodeflow-mcp.suphakitm99.workers.dev/api/auth/oauth/google/callback`

### OAuth Flow

Same as GitHub - worker handles callback and redirects to dashboard with token.

---

## CI/CD ✅

### GitHub Actions

| Workflow | File | Trigger | Steps |
|----------|------|---------|-------|
| **CI** | `.github/workflows/ci.yml` | push/PR to main | type-check → test |
| **Deploy** | `.github/workflows/deploy.yml` | push to main (excl. md/tests/dashboard) | type-check → test → deploy worker |

### Test Status

- 3 test files, 49 tests, all passing
- `tests/tools.test.ts` (14 tests)
- `tests/wp-client.test.ts` (16 tests)
- `tests/crypto-utils.test.ts` (19 tests)

---

## File Structure

```
src/
├── index.ts          (~1060 lines) - Main router, API routes, MCP handler
├── tools.ts          (~610 lines)  - 24 MCP tool definitions
├── db.ts             (~720 lines)  - All D1 database operations
├── auth.ts           (~575 lines)  - Register, login, API key auth, connections
├── wp-client.ts      (~525 lines)  - WordPress REST API + ImgBB client
├── saas-types.ts     (~415 lines)  - All TypeScript interfaces
├── oauth.ts          (~329 lines)  - GitHub + Google OAuth flows
├── crypto-utils.ts   (~306 lines)  - PBKDF2, AES-GCM, JWT, API keys
├── stripe.ts         (~286 lines)  - Checkout, portal, webhooks
└── types.ts          (~20 lines)   - Base MCP types

dashboard/src/
├── components/
│   ├── Layout.tsx          - Unified sidebar + mobile drawer (dark theme)
│   ├── AdminLayout.tsx     - Admin panel sidebar layout
│   └── AdminRoute.tsx      - Admin route guard (is_admin check)
├── pages/
│   ├── Landing.tsx         - Public landing page (dark theme)
│   ├── Login.tsx           - Email + GitHub + Google OAuth login
│   ├── Register.tsx        - Account registration
│   ├── AuthCallback.tsx    - OAuth callback handler
│   ├── Dashboard.tsx       - Overview stats + charts
│   ├── ApiKeys.tsx         - Connections + API keys + ImgBB key
│   ├── Usage.tsx           - Request logs + filtering
│   ├── Analytics.tsx       - Charts (recharts)
│   ├── Billing.tsx         - Stripe plans + invoices
│   ├── Settings.tsx        - Profile, password, 2FA, notifications
│   ├── Docs.tsx            - Documentation viewer
│   ├── Privacy.tsx         - Privacy policy (WordPress-specific)
│   ├── Terms.tsx           - Terms of service
│   ├── FAQ.tsx             - FAQ with search + accordion
│   ├── Status.tsx          - System status (live health check)
│   └── admin/
│       ├── AdminOverview.tsx   - Admin dashboard stats
│       ├── AdminUsers.tsx      - User management (search, plan, suspend)
│       ├── AdminAnalytics.tsx  - Usage timeseries + top tools/users
│       ├── AdminRevenue.tsx    - MRR + plan distribution
│       └── AdminHealth.tsx     - Error trend + recent errors
├── hooks/
│   └── useAuth.tsx         - Auth context with setUser
├── utils/
│   ├── api.ts              - API client with JWT auth
│   └── format.ts           - Tier labels + colors
└── styles/
    └── index.css           - Dark theme component classes (btn, card, input)

migrations/
├── 0001_initial_schema.sql - 7 tables
└── 0002_add_imgbb_api_key.sql - Add imgbb_api_key_encrypted column

schema.sql            (~150 lines)  - D1 database schema (7 tables)
wrangler.toml                      - D1 + KV bindings

.github/workflows/
├── ci.yml            - CI: type-check + test
└── deploy.yml        - Deploy: type-check + test + wrangler deploy
```

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
| Storage (1) | `upload_to_imgbb` (uses per-user ImgBB API key from connection) |

---

## Database Schema (7 tables)

| Table | Purpose |
|---|---|
| `users` | Email/password or OAuth users with plan + admin flag + name |
| `wp_connections` | Encrypted WordPress credentials + ImgBB API key per user |
| `api_keys` | SaaS API keys (hashed, linked to connection) |
| `usage_logs` | Per-request logging (tool, status, response time) |
| `usage_monthly` | Aggregated monthly counts per user |
| `plans` | Plan definitions (free/starter/pro/enterprise) |
| `admin_logs` | Admin action audit trail |

### wp_connections columns

```sql
id, user_id, name, wp_url,
wp_username_encrypted, wp_password_encrypted, imgbb_api_key_encrypted,
status, last_tested_at, created_at, updated_at
```

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
- `GET /api/user/profile` - Current user (includes name)
- `PUT /api/user/profile` - Update user name
- `PUT /api/user/password` - Change password
- `DELETE /api/user` - Delete account
- `GET /api/connections` - List connections (includes `has_imgbb_key`)
- `POST /api/connections` - Create connection (accepts optional `imgbb_api_key`)
- `DELETE /api/connections/:id` - Delete connection
- `POST /api/connections/:id/api-keys` - Generate API key
- `DELETE /api/api-keys/:id` - Revoke API key
- `GET /api/usage` - Usage stats
- `GET /api/usage/logs` - Detailed per-request logs
- `GET /api/analytics` - User analytics
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
- `POST /mcp` - JSON-RPC 2.0 (Bearer n2f_xxx)

---

## Config

### wrangler.toml
- `workers_dev = true` - Enable workers.dev subdomain
- KV binding: `RATE_LIMIT_KV`
- D1 binding: `DB`

### Secrets (wrangler secret put)

| Secret | Required | Purpose |
|---|---|---|
| `JWT_SECRET` | Yes | JWT signing |
| `ENCRYPTION_KEY` | Yes | AES-GCM credential encryption |
| `GITHUB_CLIENT_ID` | For OAuth | GitHub OAuth |
| `GITHUB_CLIENT_SECRET` | For OAuth | GitHub OAuth |
| `GOOGLE_CLIENT_ID` | For OAuth | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | For OAuth | Google OAuth |
| `WORDPRESS_URL` | No | Default WP URL (single-tenant) |
| `WORDPRESS_USERNAME` | No | Default WP username |
| `WORDPRESS_APP_PASSWORD` | No | Default WP app password |
| `STRIPE_SECRET_KEY` | No | Stripe billing |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook |

**Note**: `IMGBB_API_KEY` removed from server secrets — each user provides their own key via connection settings.

---

## Completed

- [x] Refactored to flat SaaS structure
- [x] Deployed Worker to production
- [x] Deployed Dashboard to Cloudflare Pages
- [x] Set up D1 database with schema
- [x] API key prefix standardized to `n2f_`
- [x] Added analytics and usage logs endpoints
- [x] Added user profile name field
- [x] **GitHub OAuth working** ✅
- [x] **Google OAuth working** ✅
- [x] Dashboard GitHub + Google login buttons
- [x] AuthCallback page for OAuth token handling
- [x] **ImgBB per-user API key** ✅ (migration applied, deployed)
- [x] **CI/CD pipelines** ✅ (ci.yml + deploy.yml, 49 tests passing)
- [x] **Dark theme UI** ✅ (`79da1aa`) - n2f-* color system, blue accent (#3b82f6), unified Layout
- [x] **Public pages** ✅ (`11e4943`) - Privacy, Terms, FAQ (search+accordion), Status (live health check)
- [x] **Admin panel** ✅ (`11e4943`) - Overview, Users, Analytics, Revenue, Health with AdminLayout/AdminRoute

---

## Next Steps

1. ~~Deploy schema to D1~~ ✅ Done
2. ~~Set secrets (JWT_SECRET, ENCRYPTION_KEY)~~ ✅ Done
3. ~~Test locally~~ ✅ Done
4. ~~Verify 24 MCP tools~~ ✅ Done
5. ~~Rework ApiKeys page~~ ✅ Done
6. ~~Deploy Worker to production~~ ✅ Done
7. ~~Deploy Dashboard to Cloudflare Pages~~ ✅ Done
8. ~~Add missing backend endpoints~~ ✅ Done
9. ~~Set up GitHub OAuth~~ ✅ Done
10. ~~Set up Google OAuth~~ ✅ Done
11. ~~ImgBB per-user API key~~ ✅ Done
12. ~~Dark theme UI upgrade~~ ✅ Done
13. ~~Add Privacy, Terms, FAQ, Status pages~~ ✅ Done
14. ~~Add Admin panel (Overview, Users, Analytics, Revenue, Health)~~ ✅ Done
15. Set up Stripe billing (optional)
16. Add notification preferences endpoint (optional)
17. Add PUT /api/connections/:id to update existing connection (e.g., add ImgBB key later)

---

## Critical Notes

- **API Key Prefix**: Changed from `saas_` to `n2f_` (Node2Flow brand). All new keys will be `n2f_xxx`.
- **Application Password**: WordPress shows with spaces, must remove before use. `auth.ts` handles this automatically.
- **ENCRYPTION_KEY**: Never change after first use - breaks all stored credentials.
- **TypeScript**: Strict mode enabled, `npx tsc --noEmit` must pass clean.
- **SSRF Protection**: `wp-client.ts` blocks requests to localhost, private IPs, and cloud metadata endpoints.
- **OAuth Secrets**: Must use `wrangler secret put`, NOT Cloudflare Dashboard.
- **OAuth Callbacks**: Must point to Worker (`/api/auth/oauth/{provider}/callback`), NOT Dashboard.
- **ImgBB Key**: Per-user, stored encrypted in `wp_connections`. No server-wide key needed.
- **KV Cache**: API key auth cached 1 hour in KV. If user updates ImgBB key, cache must expire first (or clear manually).
- **Dashboard Theme**: Dark theme with n2f-* colors (blue accent #3b82f6). All pages use `.card`, `.btn-primary`, `.input` classes from `index.css`.
- **Admin Access**: Admin pages at `/admin/*` require `is_admin=1` on user record. AdminRoute component handles guard.
