# WordPress Tools Overview

WordPress MCP provides 24 tools for managing your WordPress site programmatically.

## Tools by Category

### Posts (5 tools)

| Tool | Description | Required Args |
|------|-------------|---------------|
| `wp_get_posts` | List posts with filters | - |
| `wp_get_post` | Get single post by ID | `id` |
| `wp_create_post` | Create new post | `title`, `content` |
| `wp_update_post` | Update existing post | `id` |
| `wp_delete_post` | Delete post | `id` |

### Pages (4 tools)

| Tool | Description | Required Args |
|------|-------------|---------------|
| `wp_get_pages` | List pages | - |
| `wp_create_page` | Create new page | `title`, `content` |
| `wp_update_page` | Update existing page | `id` |
| `wp_delete_page` | Delete page | `id` |

### Media (4 tools)

| Tool | Description | Required Args |
|------|-------------|---------------|
| `wp_get_media` | List media items | - |
| `wp_get_media_item` | Get single media item | `id` |
| `wp_upload_media_from_url` | Upload from URL | `url` |
| `wp_upload_media_from_base64` | Upload from base64 | `base64`, `fileName`, `mimeType` |

### Categories (4 tools)

| Tool | Description | Required Args |
|------|-------------|---------------|
| `wp_get_categories` | List categories | - |
| `wp_get_category` | Get single category | `id` |
| `wp_create_category` | Create category | `name` |
| `wp_delete_category` | Delete category | `id` |

### Tags (2 tools)

| Tool | Description | Required Args |
|------|-------------|---------------|
| `wp_get_tags` | List tags | - |
| `wp_create_tag` | Create tag | `name` |

### Comments (4 tools)

| Tool | Description | Required Args |
|------|-------------|---------------|
| `wp_get_comments` | List comments | - |
| `wp_approve_comment` | Approve comment | `id` |
| `wp_spam_comment` | Mark as spam | `id` |
| `wp_delete_comment` | Delete comment | `id` |

### External Storage (1 tool)

| Tool | Description | Required Args |
|------|-------------|---------------|
| `wp_upload_to_imgbb` | Upload to ImgBB | `image` |

## Common Parameters

### Pagination

Most list tools support:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `per_page` | number | 10 | Items per page (max 100) |
| `page` | number | 1 | Page number |

### Status Filters

Post/page tools support:

| Value | Description |
|-------|-------------|
| `publish` | Published content |
| `draft` | Draft content |
| `pending` | Pending review |
| `private` | Private content |
| `trash` | Trashed content |

## Response Format

All tools return JSON-RPC 2.0 responses:

### Success

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"posts\": [...], \"count\": 10}"
      }
    ]
  }
}
```

### Error

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32602,
    "message": "Title is required",
    "data": {"field": "title"}
  }
}
```

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| -32700 | Parse Error | Invalid JSON |
| -32600 | Invalid Request | Invalid JSON-RPC |
| -32601 | Method Not Found | Unknown method |
| -32602 | Invalid Params | Missing/invalid parameters |
| -32603 | Internal Error | Server error |
| -32001 | No Credentials | Missing authentication |
| -32002 | Invalid Credentials | Bad authentication |
| -32003 | WordPress API Error | WordPress returned error |
| -32004 | Tool Not Found | Unknown tool name |
| -32005 | Validation Error | Input validation failed |

## Rate Limits

Requests are rate limited per API key:

| Tier | Limit | Burst |
|------|-------|-------|
| Free | 10/min | 20 |
| Starter | 30/min | 60 |
| Pro | 100/min | 200 |
| Business | 300/min | 500 |

Exceeded limits return HTTP 429 with `Retry-After` header.

## Best Practices

1. **Batch operations**: Use filters to fetch multiple items at once
2. **Cache responses**: Store frequently-accessed data locally
3. **Handle errors**: Check for error responses and retry appropriately
4. **Use pagination**: Don't fetch all items at once
5. **Validate inputs**: Check data before sending to avoid errors
