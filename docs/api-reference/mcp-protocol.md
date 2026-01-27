# MCP Protocol Reference

WordPress MCP implements the Model Context Protocol (MCP) over JSON-RPC 2.0.

## Base URL

```
Production: https://api.wordpress-mcp.com/mcp
```

## Authentication

Include your API key in the Authorization header:

```
Authorization: Bearer wp_mcp_live_xxxx
```

## WordPress Credentials

Provide WordPress credentials via headers:

```
x-wordpress-url: https://your-wordpress-site.com
x-wordpress-username: your_username
x-wordpress-password: your_app_password
```

## Request Format

All requests use JSON-RPC 2.0:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "method_name",
  "params": {}
}
```

## Methods

### initialize

Initialize the MCP session.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "your-client",
      "version": "1.0.0"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {}
    },
    "serverInfo": {
      "name": "wordpress-mcp",
      "version": "1.0.0"
    }
  }
}
```

### tools/list

List available tools.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "wp_get_posts",
        "description": "Get WordPress posts with optional filters",
        "inputSchema": {
          "type": "object",
          "properties": {
            "per_page": {
              "type": "number",
              "description": "Number of posts to return"
            }
          }
        }
      }
    ]
  }
}
```

### tools/call

Execute a tool.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "wp_get_posts",
    "arguments": {
      "per_page": 5
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"count\":5,\"posts\":[...]}"
      }
    ]
  }
}
```

## Error Responses

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32602,
    "message": "Invalid params: title is required",
    "data": {
      "field": "title"
    }
  }
}
```

### Error Codes

| Code | Name | Description |
|------|------|-------------|
| -32700 | Parse Error | Invalid JSON |
| -32600 | Invalid Request | Invalid JSON-RPC structure |
| -32601 | Method Not Found | Unknown method |
| -32602 | Invalid Params | Invalid method parameters |
| -32603 | Internal Error | Server error |
| -32001 | No Credentials | Missing WordPress credentials |
| -32002 | Invalid Credentials | Invalid WordPress credentials |
| -32003 | WordPress Error | WordPress API error |
| -32004 | Tool Not Found | Unknown tool name |
| -32005 | Validation Error | Input validation failed |

## HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request (parse error) |
| 401 | Unauthorized (missing/invalid API key) |
| 429 | Rate Limited |
| 500 | Internal Server Error |

## Rate Limiting Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706360400
```

When rate limited (429):
```
Retry-After: 60
```

## Example: Complete Request

```bash
curl -X POST https://api.wordpress-mcp.com/mcp \
  -H "Authorization: Bearer wp_mcp_live_xxxx" \
  -H "Content-Type: application/json" \
  -H "x-wordpress-url: https://example.com" \
  -H "x-wordpress-username: admin" \
  -H "x-wordpress-password: xxxx xxxx xxxx xxxx" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "wp_create_post",
      "arguments": {
        "title": "Hello from MCP",
        "content": "<p>This post was created via MCP!</p>",
        "status": "draft"
      }
    }
  }'
```

## SDKs

### JavaScript/TypeScript

```javascript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

const client = new Client({
  name: 'my-app',
  version: '1.0.0'
});

await client.connect({
  url: 'https://api.wordpress-mcp.com/mcp',
  headers: {
    'Authorization': 'Bearer wp_mcp_live_xxxx',
    'x-wordpress-url': 'https://example.com',
    'x-wordpress-username': 'admin',
    'x-wordpress-password': 'xxxx'
  }
});

const result = await client.callTool('wp_get_posts', { per_page: 5 });
console.log(result);
```

### Python

```python
import httpx

def call_mcp(method, params):
    response = httpx.post(
        'https://api.wordpress-mcp.com/mcp',
        headers={
            'Authorization': 'Bearer wp_mcp_live_xxxx',
            'x-wordpress-url': 'https://example.com',
            'x-wordpress-username': 'admin',
            'x-wordpress-password': 'xxxx'
        },
        json={
            'jsonrpc': '2.0',
            'id': 1,
            'method': method,
            'params': params
        }
    )
    return response.json()

# List tools
tools = call_mcp('tools/list', {})

# Create post
result = call_mcp('tools/call', {
    'name': 'wp_create_post',
    'arguments': {
        'title': 'Hello from Python',
        'content': '<p>Created with Python!</p>',
        'status': 'draft'
    }
})
```
