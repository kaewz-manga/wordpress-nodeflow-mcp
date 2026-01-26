# cURL Examples for wordpress-nodeflow-mcp

## Basic Endpoints

### 1. Root Endpoint
```bash
curl http://localhost:8787/
```

### 2. Health Check
```bash
curl http://localhost:8787/health
```

---

## MCP Protocol

### 1. Initialize
```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05"
    }
  }'
```

### 2. List Tools
```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }'
```

---

## WordPress Posts

### 1. Get Posts
```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "wp_get_posts",
      "arguments": {
        "per_page": 5,
        "status": "publish"
      }
    }
  }'
```

### 2. Get Single Post
```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "wp_get_post",
      "arguments": {
        "id": 1
      }
    }
  }'
```

### 3. Create Post (Draft)
```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "wp_create_post",
      "arguments": {
        "title": "Test Post from MCP",
        "content": "<p>This is a test post created via MCP server.</p>",
        "status": "draft"
      }
    }
  }'
```

### 4. Update Post
```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 6,
    "method": "tools/call",
    "params": {
      "name": "wp_update_post",
      "arguments": {
        "id": 8,
        "title": "Updated Title",
        "status": "publish"
      }
    }
  }'
```

### 5. Delete Post
```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 7,
    "method": "tools/call",
    "params": {
      "name": "wp_delete_post",
      "arguments": {
        "id": 8,
        "force": false
      }
    }
  }'
```

---

## WordPress Pages

### 1. Get Pages
```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 8,
    "method": "tools/call",
    "params": {
      "name": "wp_get_pages",
      "arguments": {
        "per_page": 10
      }
    }
  }'
```

### 2. Create Page
```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 9,
    "method": "tools/call",
    "params": {
      "name": "wp_create_page",
      "arguments": {
        "title": "About Us",
        "content": "<p>This is the about us page.</p>",
        "status": "publish"
      }
    }
  }'
```

---

## WordPress Media

### 1. Get Media
```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 10,
    "method": "tools/call",
    "params": {
      "name": "wp_get_media",
      "arguments": {
        "per_page": 10,
        "media_type": "image"
      }
    }
  }'
```

### 2. Upload Media from URL
```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 11,
    "method": "tools/call",
    "params": {
      "name": "wp_upload_media_from_url",
      "arguments": {
        "url": "https://picsum.photos/800/600",
        "title": "Random Image",
        "alt_text": "A random placeholder image"
      }
    }
  }'
```

### 3. Upload Media from Base64 (n8n Binary Data)
```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 12,
    "method": "tools/call",
    "params": {
      "name": "wp_upload_media_from_base64",
      "arguments": {
        "base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "fileName": "pixel.png",
        "mimeType": "image/png",
        "title": "Test Pixel",
        "alt_text": "A 1x1 pixel image"
      }
    }
  }'
```

---

## Multi-Tenant Mode (Using Headers)

### Create Post with Custom WordPress Site
```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -H "x-wordpress-url: https://your-site.com" \
  -H "x-wordpress-username: your_username" \
  -H "x-wordpress-password: yourAppPasswordWithoutSpaces" \
  -d '{
    "jsonrpc": "2.0",
    "id": 12,
    "method": "tools/call",
    "params": {
      "name": "wp_create_post",
      "arguments": {
        "title": "Multi-tenant Post",
        "content": "Created on a different WordPress site",
        "status": "draft"
      }
    }
  }'
```

---

## PowerShell Examples

### List Tools
```powershell
$body = @{
    jsonrpc = "2.0"
    id = 1
    method = "tools/list"
    params = @{}
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8787/mcp" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body
```

### Create Post
```powershell
$body = @{
    jsonrpc = "2.0"
    id = 2
    method = "tools/call"
    params = @{
        name = "wp_create_post"
        arguments = @{
            title = "Test Post"
            content = "<p>Test content</p>"
            status = "draft"
        }
    }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Uri "http://localhost:8787/mcp" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body
```

---

## Notes

**IMPORTANT**: Application Password Format
- WordPress displays: `aBcD eFgH iJkL mNoP qRsT uVwX` (with spaces)
- You must use: `aBcDeFgHiJkLmNoPqRsTuVwX` (without spaces)

**Local Development**: Use `http://localhost:8787`

**Production**: Use `https://wordpress-mcp.nodeflow.workers.dev`
