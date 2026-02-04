---
name: wordpress-api
description: WordPress REST API patterns and Application Password authentication
user-invocable: false
---

# WordPress REST API Reference

## Authentication

### Application Password (Recommended)

1. Go to WordPress Admin → Users → Profile
2. Scroll to "Application Passwords"
3. Enter name, click "Add New Application Password"
4. **Copy password and REMOVE ALL SPACES**

```
WordPress shows: cUAn CKZ1 u5DN IkpS bMra FCWL
Must use:       cUAnCKZ1u5DNIkpSbMraFCWL
```

### HTTP Basic Auth

```typescript
const auth = btoa(`${username}:${passwordNoSpaces}`);
fetch(url, {
  headers: {
    'Authorization': `Basic ${auth}`
  }
});
```

## API Endpoints

Base: `https://your-site.com/wp-json/wp/v2`

### Posts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/posts` | List posts |
| GET | `/posts/{id}` | Get single post |
| POST | `/posts` | Create post |
| PUT | `/posts/{id}` | Update post |
| DELETE | `/posts/{id}` | Delete post |

### Pages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/pages` | List pages |
| GET | `/pages/{id}` | Get single page |
| POST | `/pages` | Create page |
| PUT | `/pages/{id}` | Update page |
| DELETE | `/pages/{id}` | Delete page |

### Media
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/media` | List media |
| GET | `/media/{id}` | Get single media |
| POST | `/media` | Upload media |
| DELETE | `/media/{id}` | Delete media |

## Request Parameters

### Pagination
```
?per_page=10&page=1
```

### Filtering
```
?status=publish
?search=keyword
?categories=1,2,3
```

### Ordering
```
?orderby=date&order=desc
```

## Response Format

### Post Object
```json
{
  "id": 123,
  "date": "2024-01-01T12:00:00",
  "title": { "rendered": "Post Title" },
  "content": { "rendered": "<p>Content</p>" },
  "excerpt": { "rendered": "<p>Excerpt</p>" },
  "status": "publish",
  "link": "https://site.com/post-slug/",
  "featured_media": 0
}
```

### Media Object
```json
{
  "id": 456,
  "date": "2024-01-01T12:00:00",
  "title": { "rendered": "Image Title" },
  "source_url": "https://site.com/wp-content/uploads/image.jpg",
  "media_type": "image",
  "mime_type": "image/jpeg"
}
```

## Common Errors

### 401 Unauthorized
- Application Password has spaces → Remove all spaces
- Wrong username → Check username (not email)
- Password revoked → Generate new Application Password

### 403 Forbidden
- User lacks capability → Check user role
- REST API disabled → Check site settings

### 404 Not Found
- Wrong endpoint → Check URL structure
- Post doesn't exist → Verify ID

## Upload Media

### From URL
```typescript
// 1. Fetch image from URL
const response = await fetch(imageUrl);
const blob = await response.blob();

// 2. Upload to WordPress
const formData = new FormData();
formData.append('file', blob, 'filename.jpg');

await fetch(`${wpUrl}/wp-json/wp/v2/media`, {
  method: 'POST',
  headers: { 'Authorization': `Basic ${auth}` },
  body: formData
});
```

### From Base64
```typescript
// 1. Convert base64 to blob
const binary = atob(base64Data);
const bytes = new Uint8Array(binary.length);
for (let i = 0; i < binary.length; i++) {
  bytes[i] = binary.charCodeAt(i);
}
const blob = new Blob([bytes], { type: mimeType });

// 2. Upload to WordPress
const formData = new FormData();
formData.append('file', blob, fileName);
// ... same as above
```
