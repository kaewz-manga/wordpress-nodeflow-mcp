# Posts Tools

Manage WordPress posts programmatically.

## wp_get_posts

Retrieve a list of posts with optional filters.

### Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `per_page` | number | No | 10 | Posts per page (1-100) |
| `page` | number | No | 1 | Page number |
| `status` | string | No | publish | Filter by status |
| `search` | string | No | - | Search term |
| `categories` | array | No | - | Filter by category IDs |
| `tags` | array | No | - | Filter by tag IDs |
| `orderby` | string | No | date | Order by field |
| `order` | string | No | desc | Order direction (asc/desc) |

### Example

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "wp_get_posts",
    "arguments": {
      "per_page": 5,
      "status": "publish",
      "orderby": "date",
      "order": "desc"
    }
  }
}
```

### Response

```json
{
  "count": 5,
  "posts": [
    {
      "id": 123,
      "title": "My First Post",
      "content": "<p>Hello World!</p>",
      "excerpt": "Hello World!",
      "status": "publish",
      "link": "https://example.com/my-first-post/",
      "date": "2026-01-27T10:00:00",
      "modified": "2026-01-27T12:00:00",
      "author": 1,
      "featured_media": 456
    }
  ]
}
```

---

## wp_get_post

Get a single post by ID.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | number | Yes | Post ID |

### Example

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "wp_get_post",
    "arguments": {
      "id": 123
    }
  }
}
```

---

## wp_create_post

Create a new WordPress post.

### Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | string | Yes | - | Post title |
| `content` | string | Yes | - | Post content (HTML) |
| `status` | string | No | draft | Post status |
| `excerpt` | string | No | - | Post excerpt |
| `featured_media` | number | No | - | Featured image ID |
| `categories` | array | No | - | Category IDs |
| `tags` | array | No | - | Tag IDs |
| `slug` | string | No | - | URL slug |
| `author` | number | No | - | Author user ID |

### Status Values

- `draft` - Save as draft
- `publish` - Publish immediately
- `pending` - Submit for review
- `private` - Private post
- `future` - Schedule for future (requires `date`)

### Example

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "wp_create_post",
    "arguments": {
      "title": "My New Post",
      "content": "<h2>Introduction</h2><p>This is my new post content.</p>",
      "status": "draft",
      "excerpt": "A brief summary of the post",
      "categories": [1, 5],
      "tags": [10, 20]
    }
  }
}
```

### Response

```json
{
  "id": 124,
  "title": "My New Post",
  "link": "https://example.com/?p=124",
  "status": "draft"
}
```

---

## wp_update_post

Update an existing post.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | number | Yes | Post ID to update |
| `title` | string | No | New title |
| `content` | string | No | New content |
| `status` | string | No | New status |
| `excerpt` | string | No | New excerpt |
| `featured_media` | number | No | New featured image ID |
| `categories` | array | No | New category IDs |
| `tags` | array | No | New tag IDs |

### Example

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "wp_update_post",
    "arguments": {
      "id": 123,
      "title": "Updated Post Title",
      "status": "publish"
    }
  }
}
```

---

## wp_delete_post

Delete a post by ID.

### Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `id` | number | Yes | - | Post ID to delete |
| `force` | boolean | No | false | Skip trash and delete permanently |

### Example

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "wp_delete_post",
    "arguments": {
      "id": 123,
      "force": false
    }
  }
}
```

### Response

```json
{
  "success": true,
  "id": 123,
  "deleted": true
}
```

---

## Common Use Cases

### Publish a Draft

```json
{
  "name": "wp_update_post",
  "arguments": {
    "id": 123,
    "status": "publish"
  }
}
```

### Search Posts

```json
{
  "name": "wp_get_posts",
  "arguments": {
    "search": "wordpress tutorial",
    "per_page": 10
  }
}
```

### Get Posts by Category

```json
{
  "name": "wp_get_posts",
  "arguments": {
    "categories": [5],
    "status": "publish"
  }
}
```

### Bulk Create Posts

Call `wp_create_post` multiple times:

```javascript
const posts = [
  { title: "Post 1", content: "Content 1" },
  { title: "Post 2", content: "Content 2" },
];

for (const post of posts) {
  await mcp.call("wp_create_post", post);
}
```
