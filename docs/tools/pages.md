# Pages Tools

Tools for managing WordPress pages.

## wp_get_pages

Get a list of pages from WordPress.

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| per_page | number | No | 10 | Number of pages per request (1-100) |
| page | number | No | 1 | Page number for pagination |
| status | string | No | "publish" | Filter by status: publish, draft, pending, private |
| search | string | No | - | Search pages by keyword |
| parent | number | No | - | Filter by parent page ID |
| order | string | No | "desc" | Order: asc, desc |
| orderby | string | No | "date" | Order by: date, title, menu_order, id |

### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "wp_get_pages",
    "arguments": {
      "per_page": 10,
      "status": "publish"
    }
  }
}
```

### Example Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{
      "type": "text",
      "text": "{\"count\":3,\"pages\":[{\"id\":10,\"title\":\"About Us\",\"link\":\"https://example.com/about/\",\"status\":\"publish\",\"date\":\"2026-01-15T10:00:00\",\"parent\":0},{\"id\":11,\"title\":\"Contact\",\"link\":\"https://example.com/contact/\",\"status\":\"publish\",\"date\":\"2026-01-16T14:30:00\",\"parent\":0},{\"id\":12,\"title\":\"Privacy Policy\",\"link\":\"https://example.com/privacy-policy/\",\"status\":\"publish\",\"date\":\"2026-01-17T09:00:00\",\"parent\":0}]}"
    }]
  }
}
```

## wp_get_page

Get a single page by ID.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | number | Yes | The page ID |

### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "wp_get_page",
    "arguments": {
      "id": 10
    }
  }
}
```

### Example Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{
      "type": "text",
      "text": "{\"id\":10,\"title\":\"About Us\",\"content\":\"<p>Welcome to our company...</p>\",\"excerpt\":\"Learn about our company\",\"link\":\"https://example.com/about/\",\"status\":\"publish\",\"date\":\"2026-01-15T10:00:00\",\"modified\":\"2026-01-20T15:30:00\",\"parent\":0,\"menu_order\":1,\"template\":\"\"}"
    }]
  }
}
```

## wp_create_page

Create a new WordPress page.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| title | string | Yes | Page title |
| content | string | Yes | Page content (HTML) |
| status | string | No | Status: draft (default), publish, pending, private |
| parent | number | No | Parent page ID for hierarchical pages |
| menu_order | number | No | Order in navigation menus |
| template | string | No | Page template file name |
| featured_media | number | No | Featured image media ID |

### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "wp_create_page",
    "arguments": {
      "title": "Services",
      "content": "<h2>Our Services</h2><p>We offer a wide range of services...</p>",
      "status": "publish",
      "menu_order": 2
    }
  }
}
```

### Example Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{
      "type": "text",
      "text": "{\"id\":15,\"title\":\"Services\",\"link\":\"https://example.com/services/\",\"status\":\"publish\"}"
    }]
  }
}
```

## wp_update_page

Update an existing page.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | number | Yes | Page ID to update |
| title | string | No | New title |
| content | string | No | New content |
| status | string | No | New status |
| parent | number | No | New parent page ID |
| menu_order | number | No | New menu order |
| template | string | No | New template |
| featured_media | number | No | New featured image |

### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "wp_update_page",
    "arguments": {
      "id": 15,
      "title": "Our Services",
      "content": "<h2>Our Services</h2><p>Updated content...</p>"
    }
  }
}
```

## wp_delete_page

Delete a page.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | number | Yes | Page ID to delete |
| force | boolean | No | Skip trash and permanently delete (default: false) |

### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "wp_delete_page",
    "arguments": {
      "id": 15,
      "force": false
    }
  }
}
```

### Example Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{
      "type": "text",
      "text": "{\"success\":true,\"id\":15,\"deleted\":true,\"message\":\"Page moved to trash\"}"
    }]
  }
}
```

## Use Cases

### Build a Site Structure

```javascript
// Create parent page
const about = await client.callTool('wp_create_page', {
  title: 'About',
  content: '<p>About our company</p>',
  status: 'publish',
  menu_order: 1
});

// Create child pages
await client.callTool('wp_create_page', {
  title: 'Our Team',
  content: '<p>Meet our team</p>',
  status: 'publish',
  parent: about.id,
  menu_order: 1
});

await client.callTool('wp_create_page', {
  title: 'Our History',
  content: '<p>Our company history</p>',
  status: 'publish',
  parent: about.id,
  menu_order: 2
});
```

### Bulk Update Pages

```javascript
const pages = await client.callTool('wp_get_pages', {
  status: 'draft',
  per_page: 100
});

for (const page of pages.pages) {
  await client.callTool('wp_update_page', {
    id: page.id,
    status: 'publish'
  });
}
```
