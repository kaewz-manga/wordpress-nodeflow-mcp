# WordPress MCP SaaS - Business & Technical Plan

> Multi-tenant MCP Server for WordPress REST API

---

## Executive Summary

**Product**: WordPress MCP API Gateway
**Type**: B2B SaaS (API-as-a-Service)
**Target Market**: Developers, Automation specialists, AI enthusiasts
**Deployment**: Cloudflare Workers (Serverless)
**Protocol**: MCP (Model Context Protocol) over JSON-RPC 2.0

---

## 1. Product Overview

### 1.1 What We Offer

A managed MCP server that connects any MCP-compatible AI client to WordPress sites:

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   MCP Clients   │     │   WordPress MCP      │     │   Customer's    │
│                 │────▶│   API Gateway        │────▶│   WordPress     │
│ - Claude        │     │   (Our SaaS)         │     │   Sites         │
│ - Cursor        │     │                      │     │                 │
│ - Any MCP client│     │ - Authentication     │     │ - Posts/Pages   │
│                 │     │ - Rate Limiting      │     │ - Media         │
└─────────────────┘     │ - Usage Tracking     │     │ - Categories    │
                        │ - Multi-tenant       │     │ - Comments      │
                        └──────────────────────┘     └─────────────────┘
```

### 1.2 Key Value Propositions

| For Technical Users | For Non-Technical Users |
|---------------------|------------------------|
| Zero infrastructure setup | No coding required |
| Works with any MCP client | Simple API key setup |
| Self-service API keys | Pre-built WordPress tools |
| Transparent usage metrics | Pay-as-you-go pricing |

### 1.3 Competitive Advantages

1. **Client Agnostic** - Works with Claude, Cursor, or any MCP client
2. **Serverless** - No server management, auto-scaling
3. **Multi-tenant** - Customers use their own WordPress sites
4. **Low Latency** - Cloudflare edge network (300+ locations)

---

## 2. Target Market

### 2.1 Primary Audience (Technical Users)

| Segment | Use Cases | Pain Points We Solve |
|---------|-----------|---------------------|
| **Developers** | Automate WordPress with AI | No need to build MCP server |
| **DevOps/SRE** | Content management automation | Zero infrastructure overhead |
| **AI Enthusiasts** | Experiment with MCP protocol | Ready-to-use WordPress tools |
| **Agencies** | Multi-site management | Multi-tenant support |

### 2.2 Secondary Audience (Non-Technical Users)

| Segment | Use Cases | Pain Points We Solve |
|---------|-----------|---------------------|
| **Content Creators** | AI-assisted content publishing | No coding needed |
| **Bloggers** | Bulk content management | Simple setup process |
| **Small Business** | Automate blog updates | Affordable pricing |

### 2.3 Market Size Estimate

```
WordPress market share: ~43% of all websites
Estimated WordPress sites: 800+ million
Target segment (AI-interested): ~0.01%
Addressable market: ~80,000 potential users
Initial target: 100-500 users (Year 1)
```

---

## 3. Pricing Strategy

### 3.1 Pricing Tiers

| Tier | Price | Requests/Month | Rate Limit | Support |
|------|-------|----------------|------------|---------|
| **Free** | $0 | 1,000 | 10 req/min | Community |
| **Starter** | $9/mo | 10,000 | 30 req/min | Email |
| **Pro** | $29/mo | 50,000 | 100 req/min | Priority |
| **Business** | $99/mo | 200,000 | 300 req/min | Dedicated |
| **Enterprise** | Custom | Unlimited | Custom | SLA |

### 3.2 Overage Pricing

| Tier | Overage Rate |
|------|--------------|
| Starter | $0.002/request |
| Pro | $0.001/request |
| Business | $0.0005/request |

### 3.3 Revenue Projections (Year 1)

```
Conservative Estimate:
- 50 Free users (convert 10% to paid)
- 30 Starter ($9) = $270/mo
- 15 Pro ($29) = $435/mo
- 5 Business ($99) = $495/mo

Monthly Revenue: ~$1,200
Annual Revenue: ~$14,400

Growth Estimate (Year 2):
- 200 Starter = $1,800/mo
- 80 Pro = $2,320/mo
- 20 Business = $1,980/mo

Monthly Revenue: ~$6,100
Annual Revenue: ~$73,200
```

---

## 4. Technical Architecture

### 4.1 Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Workers                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              wordpress-nodeflow-mcp                  │    │
│  │                                                      │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │    │
│  │  │  Router  │─▶│   MCP    │─▶│  Tool Handlers   │   │    │
│  │  │(index.ts)│  │ Server   │  │  - Posts         │   │    │
│  │  └──────────┘  └──────────┘  │  - Pages         │   │    │
│  │                              │  - Media         │   │    │
│  │                              │  - Categories    │   │    │
│  │                              │  - Tags          │   │    │
│  │                              │  - Comments      │   │    │
│  │                              └────────┬─────────┘   │    │
│  │                                       │             │    │
│  │                              ┌────────▼─────────┐   │    │
│  │                              │ WordPress Client │   │    │
│  │                              │  (REST API)      │   │    │
│  │                              └──────────────────┘   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    Customer's WordPress Site
```

### 4.2 SaaS Architecture (To Be Built)

```
┌─────────────────────────────────────────────────────────────────────┐
│                       Cloudflare Platform                            │
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │   Workers KV    │  │  Cloudflare D1  │  │   Workers (MCP)     │  │
│  │                 │  │   (SQLite)      │  │                     │  │
│  │ - Rate limits   │  │                 │  │ ┌─────────────────┐ │  │
│  │ - Cache         │  │ - Customers     │  │ │ Auth Middleware │ │  │
│  │ - Sessions      │  │ - API Keys      │  │ └────────┬────────┘ │  │
│  │                 │  │ - Subscriptions │  │          │          │  │
│  └────────┬────────┘  │ - Usage Logs    │  │ ┌────────▼────────┐ │  │
│           │           │                 │  │ │ Rate Limiter    │ │  │
│           │           └────────┬────────┘  │ └────────┬────────┘ │  │
│           │                    │           │          │          │  │
│           └────────────────────┼───────────┼──────────┘          │  │
│                                │           │                     │  │
│                                │           │ ┌────────▼────────┐ │  │
│                                │           │ │  MCP Server     │ │  │
│                                │           │ └────────┬────────┘ │  │
│                                │           │          │          │  │
│                                │           │ ┌────────▼────────┐ │  │
│                                │           │ │ Usage Tracker   │ │  │
│                                │           │ └─────────────────┘ │  │
│                                │           └─────────────────────┘  │
│                                │                                    │
│  ┌─────────────────────────────┴────────────────────────────────┐  │
│  │                    Cloudflare Pages                           │  │
│  │                    (Dashboard Frontend)                       │  │
│  │                                                               │  │
│  │  - Customer registration/login                                │  │
│  │  - API key management                                         │  │
│  │  - Usage statistics                                           │  │
│  │  - Billing & subscription                                     │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.3 Database Schema (Cloudflare D1)

```sql
-- Customers table
CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT NOT NULL,
  tier TEXT DEFAULT 'free',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- API Keys table
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  key_hash TEXT UNIQUE NOT NULL,
  key_prefix TEXT NOT NULL,  -- First 8 chars for display
  name TEXT,
  permissions TEXT DEFAULT '["*"]',  -- JSON array
  is_active BOOLEAN DEFAULT 1,
  last_used_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Subscriptions table
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  customer_id TEXT UNIQUE NOT NULL,
  tier TEXT NOT NULL,
  status TEXT DEFAULT 'active',  -- active, cancelled, expired
  requests_limit INTEGER NOT NULL,
  requests_used INTEGER DEFAULT 0,
  rate_limit INTEGER NOT NULL,  -- requests per minute
  billing_cycle_start DATETIME,
  billing_cycle_end DATETIME,
  stripe_subscription_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Usage Logs table (for analytics)
CREATE TABLE usage_logs (
  id TEXT PRIMARY KEY,
  api_key_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  wordpress_url TEXT,
  status_code INTEGER,
  response_time_ms INTEGER,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Daily Usage Summary (for billing)
CREATE TABLE usage_daily (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  date DATE NOT NULL,
  requests_count INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  UNIQUE(customer_id, date),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Indexes
CREATE INDEX idx_api_keys_customer ON api_keys(customer_id);
CREATE INDEX idx_usage_logs_customer ON usage_logs(customer_id);
CREATE INDEX idx_usage_logs_created ON usage_logs(created_at);
CREATE INDEX idx_usage_daily_customer_date ON usage_daily(customer_id, date);
```

### 4.4 API Key Format

```
Format: wp_mcp_{environment}_{random_string}

Examples:
- wp_mcp_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
- wp_mcp_test_x9y8z7w6v5u4t3s2r1q0p9o8n7m6l5k4

Storage:
- Database stores: SHA-256 hash of full key
- Display shows: wp_mcp_live_a1b2c3d4... (prefix + first 8 chars)
```

---

## 5. Feature Roadmap

### 5.1 Phase 1: MVP (Current)

| Feature | Status | Description |
|---------|--------|-------------|
| MCP Server | ✅ Done | JSON-RPC 2.0 over HTTP |
| WordPress Tools | ✅ Done | 24 tools (posts, pages, media, etc.) |
| Multi-tenant Auth | ✅ Done | Via HTTP headers |
| SSRF Protection | ✅ Done | URL validation |
| Request Timeout | ✅ Done | 30s timeout |

### 5.2 Phase 2: SaaS Foundation (Next)

| Feature | Priority | Effort | Description |
|---------|----------|--------|-------------|
| API Key System | High | 2 weeks | Generate, validate, revoke API keys |
| Rate Limiting | High | 1 week | Per-tier rate limits using KV |
| Usage Tracking | High | 1 week | Log requests to D1 |
| Database Setup | High | 1 week | D1 schema + migrations |
| Basic Dashboard | Medium | 2 weeks | API key management UI |

### 5.3 Phase 3: Monetization

| Feature | Priority | Effort | Description |
|---------|----------|--------|-------------|
| Stripe Integration | High | 2 weeks | Payment processing |
| Subscription Management | High | 1 week | Tier upgrades/downgrades |
| Usage Billing | Medium | 1 week | Overage charges |
| Invoice Generation | Medium | 1 week | Monthly invoices |

### 5.4 Phase 4: Growth

| Feature | Priority | Effort | Description |
|---------|----------|--------|-------------|
| Analytics Dashboard | Medium | 2 weeks | Usage charts, trends |
| Webhooks | Medium | 1 week | Event notifications |
| Team Management | Low | 2 weeks | Multiple users per account |
| Custom Domains | Low | 1 week | Bring your own domain |
| Audit Logs | Low | 1 week | Activity history |

### 5.5 Phase 5: Enterprise

| Feature | Priority | Effort | Description |
|---------|----------|--------|-------------|
| SSO/SAML | Low | 2 weeks | Enterprise authentication |
| SLA Dashboard | Low | 1 week | Uptime monitoring |
| Dedicated Instances | Low | 2 weeks | Isolated deployments |
| Priority Support | Low | Ongoing | Dedicated support channel |

---

## 6. Implementation Plan

### 6.1 Sprint 1: API Key System (2 weeks)

```
Week 1:
├── Day 1-2: Setup D1 database + schema
├── Day 3-4: API key generation service
└── Day 5: API key validation middleware

Week 2:
├── Day 1-2: Rate limiting with KV
├── Day 3-4: Usage tracking
└── Day 5: Testing + bug fixes
```

**Deliverables:**
- [ ] D1 database with schema
- [ ] API key generation endpoint
- [ ] Auth middleware for MCP server
- [ ] Rate limiter middleware
- [ ] Usage logging

### 6.2 Sprint 2: Basic Dashboard (2 weeks)

```
Week 1:
├── Day 1-2: Setup Cloudflare Pages
├── Day 3-4: Customer registration/login
└── Day 5: Session management

Week 2:
├── Day 1-2: API key management UI
├── Day 3-4: Usage display
└── Day 5: Testing + polish
```

**Deliverables:**
- [ ] Landing page
- [ ] Registration/Login flow
- [ ] API key create/list/revoke
- [ ] Basic usage stats

### 6.3 Sprint 3: Payments (2 weeks)

```
Week 1:
├── Day 1-2: Stripe account setup
├── Day 3-4: Checkout integration
└── Day 5: Webhook handlers

Week 2:
├── Day 1-2: Subscription management
├── Day 3-4: Billing portal
└── Day 5: Testing all payment flows
```

**Deliverables:**
- [ ] Stripe checkout
- [ ] Subscription creation
- [ ] Plan upgrades/downgrades
- [ ] Cancellation flow

---

## 7. Cost Analysis

### 7.1 Infrastructure Costs (Cloudflare)

| Service | Free Tier | Paid Estimate |
|---------|-----------|---------------|
| Workers | 100K req/day | $5/mo (10M req) |
| KV | 100K reads/day | $0.50/mo |
| D1 | 5M rows read/day | $0.75/mo |
| Pages | Unlimited | $0 |
| **Total** | **$0** | **~$6.25/mo** |

### 7.2 Third-Party Services

| Service | Cost | Purpose |
|---------|------|---------|
| Stripe | 2.9% + $0.30 | Payment processing |
| Domain | $12/year | Custom domain |
| Email (Resend) | $0-20/mo | Transactional emails |
| **Total** | **~$20/mo** | |

### 7.3 Break-Even Analysis

```
Fixed Costs: ~$26/mo
Variable Costs: 2.9% + $0.30 per transaction

Break-even:
- 3 Starter customers ($27/mo revenue)
- OR 1 Pro customer ($29/mo revenue)

Profitable at:
- 10 paying customers (~$150/mo revenue)
```

---

## 8. Marketing Strategy

### 8.1 Launch Channels

| Channel | Strategy | Cost |
|---------|----------|------|
| **GitHub** | Open-source core, premium features | $0 |
| **Product Hunt** | Launch announcement | $0 |
| **Twitter/X** | Developer community engagement | $0 |
| **Dev.to/Medium** | Technical blog posts | $0 |
| **YouTube** | Tutorial videos | $0 |
| **Reddit** | r/wordpress, r/webdev, r/ChatGPT | $0 |

### 8.2 Content Strategy

1. **Documentation** - Comprehensive setup guides
2. **Tutorials** - "How to automate WordPress with AI"
3. **Use Cases** - Real-world examples
4. **Comparisons** - vs. manual API integration

### 8.3 Launch Timeline

```
Week 1-2: Soft launch (invite-only beta)
Week 3-4: Public beta (free tier only)
Week 5-6: Product Hunt launch
Week 7+: Paid tiers available
```

---

## 9. Success Metrics

### 9.1 Key Performance Indicators (KPIs)

| Metric | Target (Month 3) | Target (Month 12) |
|--------|------------------|-------------------|
| Total Signups | 100 | 500 |
| Paid Customers | 10 | 50 |
| Monthly Revenue | $200 | $1,200 |
| Churn Rate | <10% | <5% |
| API Uptime | 99.5% | 99.9% |

### 9.2 Tracking Dashboard

```
Daily:
- New signups
- API requests
- Error rate
- Response time (p50, p95, p99)

Weekly:
- Active users
- Feature usage
- Support tickets

Monthly:
- Revenue
- Churn
- NPS score
```

---

## 10. Risk Analysis

### 10.1 Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Cloudflare outage | High | Low | Multi-region backup plan |
| WordPress API changes | Medium | Low | Version pinning, monitoring |
| Security breach | High | Low | Regular audits, encryption |
| Scalability issues | Medium | Medium | Load testing, caching |

### 10.2 Business Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Low adoption | High | Medium | Free tier, marketing |
| Competition | Medium | Medium | Unique features, support |
| Pricing too high | Medium | Medium | Usage-based options |
| Support overwhelm | Medium | Low | Documentation, automation |

---

## 11. Legal & Compliance

### 11.1 Requirements

- [ ] Terms of Service
- [ ] Privacy Policy
- [ ] GDPR compliance (EU customers)
- [ ] Data Processing Agreement
- [ ] Acceptable Use Policy

### 11.2 Data Handling

```
Data We Store:
- Customer email, name
- API keys (hashed)
- Usage logs (anonymized WordPress URLs optional)
- Payment info (via Stripe, not stored by us)

Data We Don't Store:
- WordPress credentials (passed through, never stored)
- WordPress content (passed through)
- Customer's user data
```

---

## 12. Support Plan

### 12.1 Support Channels

| Tier | Channels | Response Time |
|------|----------|---------------|
| Free | GitHub Issues, Docs | Best effort |
| Starter | Email | 48 hours |
| Pro | Email, Discord | 24 hours |
| Business | Email, Discord, Video call | 4 hours |
| Enterprise | Dedicated Slack, Phone | 1 hour |

### 12.2 Documentation Structure

```
docs/
├── getting-started/
│   ├── quickstart.md
│   ├── api-keys.md
│   └── mcp-clients.md
├── tools/
│   ├── posts.md
│   ├── pages.md
│   ├── media.md
│   └── ...
├── guides/
│   ├── claude-setup.md
│   ├── cursor-setup.md
│   └── automation-examples.md
├── api-reference/
│   └── mcp-protocol.md
└── billing/
    ├── pricing.md
    └── faq.md
```

---

## Appendix A: Technical Specifications

### A.1 Current Tools (24 total)

| Category | Tools | Count |
|----------|-------|-------|
| Posts | get, get_single, create, update, delete | 5 |
| Pages | get, create, update, delete | 4 |
| Media | get, get_single, upload_url, upload_base64 | 4 |
| Categories | get, get_single, create, delete | 4 |
| Tags | get, create | 2 |
| Comments | get, approve, spam, delete | 4 |
| Storage | upload_to_imgbb | 1 |

### A.2 API Endpoints

```
Production URL: https://wordpress-mcp.nodeflow.workers.dev

Endpoints:
- GET  /health          - Health check
- GET  /                - Server info
- POST /mcp             - MCP JSON-RPC endpoint

Headers (Multi-tenant):
- x-wordpress-url       - WordPress site URL
- x-wordpress-username  - WordPress username
- x-wordpress-password  - Application password

Headers (SaaS - Future):
- Authorization: Bearer wp_mcp_live_xxxxx
```

### A.3 Error Codes

| Code | Name | Description |
|------|------|-------------|
| -32700 | Parse Error | Invalid JSON |
| -32600 | Invalid Request | Invalid JSON-RPC |
| -32601 | Method Not Found | Unknown method |
| -32602 | Invalid Params | Missing/invalid params |
| -32603 | Internal Error | Server error |
| -32001 | No Credentials | Missing auth |
| -32002 | Invalid Credentials | Bad auth |
| -32003 | WordPress API Error | WP API failed |
| -32004 | Tool Not Found | Unknown tool |
| -32005 | Validation Error | Invalid input |

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **MCP** | Model Context Protocol - Anthropic's protocol for AI-tool integration |
| **JSON-RPC** | Remote procedure call protocol using JSON |
| **Multi-tenant** | Single instance serving multiple customers |
| **Workers** | Cloudflare's serverless compute platform |
| **KV** | Cloudflare's key-value storage |
| **D1** | Cloudflare's serverless SQLite database |

---

*Document Version: 1.0*
*Last Updated: 2026-01-27*
*Author: Claude Code*
