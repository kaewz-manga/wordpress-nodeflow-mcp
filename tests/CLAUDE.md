# Testing Guide

> Test patterns for WordPress MCP.

---

## Test Framework

- **Vitest** — Test runner
- **Miniflare** — Cloudflare Workers simulator

---

## Run Tests

```bash
npm test                    # All tests
npm test -- auth.test.ts    # Specific file
npm test -- --watch         # Watch mode
npm test -- --coverage      # With coverage
```

---

## Test Files

| File | Tests |
|------|-------|
| `tests/auth.test.ts` | Auth endpoints, JWT, API keys |
| `tests/mcp.test.ts` | MCP protocol, WordPress tools |
| `tests/wordpress.test.ts` | WordPress API client |
| `tests/crypto.test.ts` | Encryption, hashing |

---

## Testing MCP

```typescript
describe('MCP Protocol', () => {
  it('should list tools', async () => {
    const response = await worker.fetch('/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
      }),
    });

    const data = await response.json();
    expect(data.result.tools).toHaveLength(13);
  });
});
```

---

## Testing WordPress Tools

```typescript
describe('WordPress Tools', () => {
  it('should get posts', async () => {
    const response = await callMcpTool('wp_get_posts', {
      per_page: 5
    });

    expect(response.content[0].type).toBe('text');
    const data = JSON.parse(response.content[0].text);
    expect(data.posts).toBeDefined();
  });

  it('should create post', async () => {
    const response = await callMcpTool('wp_create_post', {
      title: 'Test Post',
      content: '<p>Test content</p>',
      status: 'draft'
    });

    const data = JSON.parse(response.content[0].text);
    expect(data.id).toBeDefined();
    expect(data.status).toBe('draft');
  });
});
```

---

## Mocking WordPress API

```typescript
const mockWordPressApi = {
  getPosts: vi.fn().mockResolvedValue([
    { id: 1, title: { rendered: 'Test' }, status: 'publish' }
  ]),
  createPost: vi.fn().mockResolvedValue({
    id: 2, title: { rendered: 'New Post' }, status: 'draft'
  }),
};
```
