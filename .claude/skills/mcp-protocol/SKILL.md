---
name: mcp-protocol
description: MCP JSON-RPC 2.0 protocol reference for WordPress tools
user-invocable: false
---

# MCP Protocol Reference — WordPress

## Overview

MCP (Model Context Protocol) uses JSON-RPC 2.0 over HTTP.

- **Endpoint**: `POST /mcp`
- **Content-Type**: `application/json`
- **Auth**: Via headers (multi-tenant) or env (single-tenant)

## Authentication Headers

For multi-tenant mode, send credentials per request:

```
x-wordpress-url: https://wp.example.com
x-wordpress-username: admin
x-wordpress-password: ApplicationPasswordNoSpaces
```

## Standard Methods

### tools/list
```json
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "id": 1
}
```

Response:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "tools": [
      {
        "name": "wp_get_posts",
        "description": "List WordPress posts",
        "inputSchema": { ... }
      }
    ]
  },
  "id": 1
}
```

### tools/call
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "wp_get_posts",
    "arguments": { "per_page": 10 }
  },
  "id": 2
}
```

Response:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"count\": 10, \"posts\": [...]}"
      }
    ]
  },
  "id": 2
}
```

## Error Codes

### Standard JSON-RPC
| Code | Meaning |
|------|---------|
| -32700 | Parse error |
| -32600 | Invalid request |
| -32601 | Method not found |
| -32602 | Invalid params |
| -32603 | Internal error |

### Custom MCP Errors
| Code | Meaning |
|------|---------|
| -32001 | No credentials provided |
| -32002 | Invalid credentials |
| -32003 | WordPress API error |
| -32004 | Tool not found |
| -32005 | Validation error |

## Tool Schema Pattern

```typescript
{
  name: "wp_create_post",
  description: "Create a new WordPress post",
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Post title" },
      content: { type: "string", description: "Post content (HTML)" },
      status: {
        type: "string",
        enum: ["draft", "publish", "pending", "private"],
        description: "Post status (default: draft)"
      }
    },
    required: ["title", "content"]
  }
}
```

## Content Types

```typescript
type Content =
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mimeType: string }
  | { type: 'resource'; resource: { uri: string; text: string } };
```
