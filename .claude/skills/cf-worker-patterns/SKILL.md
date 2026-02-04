---
name: cf-worker-patterns
description: Cloudflare Worker patterns for D1 database, KV storage, and Workers runtime
user-invocable: false
---

# Cloudflare Worker Patterns

## Request Handling

### Basic Handler
```typescript
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case '/health':
        return new Response(JSON.stringify({ status: 'ok' }), {
          headers: { 'Content-Type': 'application/json' }
        });

      case '/mcp':
        return handleMCP(request, env);

      default:
        return new Response('Not Found', { status: 404 });
    }
  }
};
```

### CORS Handling
```typescript
function corsHeaders(origin: string): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-wordpress-url, x-wordpress-username, x-wordpress-password'
  };
}

// Handle preflight
if (request.method === 'OPTIONS') {
  return new Response(null, { headers: corsHeaders('*') });
}
```

## D1 Database

### Env Binding (wrangler.toml)
```toml
[[d1_databases]]
binding = "DB"
database_name = "wordpress-mcp-db"
database_id = "xxx-xxx-xxx"
```

### Queries
```typescript
// Select
const result = await env.DB.prepare(
  'SELECT * FROM users WHERE id = ?'
).bind(userId).first();

// Insert
const result = await env.DB.prepare(
  'INSERT INTO users (name, email) VALUES (?, ?)'
).bind(name, email).run();

// Update
const result = await env.DB.prepare(
  'UPDATE users SET name = ? WHERE id = ?'
).bind(name, id).run();

// Delete
const result = await env.DB.prepare(
  'DELETE FROM users WHERE id = ?'
).bind(id).run();
```

### Batch Queries
```typescript
const results = await env.DB.batch([
  env.DB.prepare('INSERT INTO logs (action) VALUES (?)').bind('start'),
  env.DB.prepare('UPDATE users SET last_active = ?').bind(Date.now()),
]);
```

## KV Storage

### Env Binding (wrangler.toml)
```toml
[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "xxx"
```

### Operations
```typescript
// Get
const value = await env.RATE_LIMIT_KV.get('key');
const json = await env.RATE_LIMIT_KV.get('key', { type: 'json' });

// Put (with TTL)
await env.RATE_LIMIT_KV.put('key', 'value', {
  expirationTtl: 60  // 60 seconds
});

// Delete
await env.RATE_LIMIT_KV.delete('key');
```

### Rate Limiting Pattern
```typescript
async function checkRateLimit(env: Env, key: string, limit: number, window: number): Promise<boolean> {
  const current = await env.RATE_LIMIT_KV.get(key, { type: 'json' }) as { count: number } | null;

  if (!current) {
    await env.RATE_LIMIT_KV.put(key, JSON.stringify({ count: 1 }), {
      expirationTtl: window
    });
    return true;
  }

  if (current.count >= limit) {
    return false;  // Rate limited
  }

  await env.RATE_LIMIT_KV.put(key, JSON.stringify({ count: current.count + 1 }), {
    expirationTtl: window
  });
  return true;
}
```

## Environment Variables

### Types (src/types.ts)
```typescript
interface Env {
  // D1
  DB: D1Database;

  // KV
  RATE_LIMIT_KV: KVNamespace;

  // Secrets
  WORDPRESS_URL: string;
  WORDPRESS_USERNAME: string;
  WORDPRESS_APP_PASSWORD: string;

  // Variables
  ALLOWED_ORIGINS: string;
  ENVIRONMENT: string;
}
```

### Access Secrets
```bash
# Set secret
wrangler secret put WORDPRESS_APP_PASSWORD

# Use in code
const password = env.WORDPRESS_APP_PASSWORD;
```

## Response Helpers

```typescript
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function errorResponse(message: string, status = 500): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

## Worker Limits

| Resource | Free | Paid |
|----------|------|------|
| CPU time/request | 10ms | 30s |
| Memory | 128MB | 128MB |
| Request size | 100MB | 500MB |
| Response size | 100MB | 500MB |
| KV reads/day | 100,000 | Unlimited |
| D1 rows read/day | 5M | 50B |
