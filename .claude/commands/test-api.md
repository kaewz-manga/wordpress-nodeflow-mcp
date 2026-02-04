---
description: Test WordPress MCP API endpoints with curl
---

# Test wordpress-nodeflow-mcp API

## Health Check

```bash
# Local
curl http://localhost:8789/health

# Production
curl https://wordpress-mcp.nodeflow.workers.dev/health
```

Expected: `{"status":"ok"}`

## List Tools

```bash
curl -X POST http://localhost:8789/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

Expected: 13 tools listed

## WordPress Operations (with credentials)

### Get Posts
```bash
curl -X POST http://localhost:8789/mcp \
  -H "Content-Type: application/json" \
  -H "x-wordpress-url: https://wp.example.com" \
  -H "x-wordpress-username: admin" \
  -H "x-wordpress-password: AppPasswordNoSpaces" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"wp_get_posts","arguments":{"per_page":5}},"id":2}'
```

### Create Post
```bash
curl -X POST http://localhost:8789/mcp \
  -H "Content-Type: application/json" \
  -H "x-wordpress-url: https://wp.example.com" \
  -H "x-wordpress-username: admin" \
  -H "x-wordpress-password: AppPasswordNoSpaces" \
  -d '{
    "jsonrpc":"2.0",
    "method":"tools/call",
    "params":{
      "name":"wp_create_post",
      "arguments":{
        "title":"Test Post",
        "content":"<p>Test content</p>",
        "status":"draft"
      }
    },
    "id":3
  }'
```

### Get Media
```bash
curl -X POST http://localhost:8789/mcp \
  -H "Content-Type: application/json" \
  -H "x-wordpress-url: https://wp.example.com" \
  -H "x-wordpress-username: admin" \
  -H "x-wordpress-password: AppPasswordNoSpaces" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"wp_get_media"},"id":4}'
```

## Error Cases

### Missing Credentials
```bash
curl -X POST http://localhost:8789/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"wp_get_posts"},"id":1}'
```
Expected: Error -32001

### Password with Spaces (Common Mistake)
```bash
curl -X POST http://localhost:8789/mcp \
  -H "Content-Type: application/json" \
  -H "x-wordpress-url: https://wp.example.com" \
  -H "x-wordpress-username: admin" \
  -H "x-wordpress-password: cUAn CKZ1 u5DN" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"wp_get_posts"},"id":1}'
```
Expected: Error -32002 (spaces should be removed!)

### Missing Required Argument
```bash
curl -X POST http://localhost:8789/mcp \
  -H "Content-Type: application/json" \
  -H "x-wordpress-url: https://wp.example.com" \
  -H "x-wordpress-username: admin" \
  -H "x-wordpress-password: AppPassword" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"wp_create_post","arguments":{}},"id":1}'
```
Expected: Error -32005 (title required)
