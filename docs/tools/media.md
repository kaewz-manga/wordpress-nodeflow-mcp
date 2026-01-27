# Media Tools

Tools for managing WordPress media library.

## wp_get_media

Get media items from the library.

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| per_page | number | No | 10 | Number of items per request (1-100) |
| page | number | No | 1 | Page number for pagination |
| media_type | string | No | - | Filter by type: image, video, audio, application |
| mime_type | string | No | - | Filter by MIME type: image/jpeg, image/png, etc. |
| search | string | No | - | Search by title or caption |

### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "wp_get_media",
    "arguments": {
      "media_type": "image",
      "per_page": 20
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
      "text": "{\"count\":5,\"media\":[{\"id\":100,\"title\":\"hero-image\",\"source_url\":\"https://example.com/wp-content/uploads/2026/01/hero-image.jpg\",\"media_type\":\"image\",\"mime_type\":\"image/jpeg\",\"alt_text\":\"Hero banner\",\"date\":\"2026-01-20T10:00:00\"}]}"
    }]
  }
}
```

## wp_get_media_item

Get a single media item by ID.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | number | Yes | The media item ID |

### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "wp_get_media_item",
    "arguments": {
      "id": 100
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
      "text": "{\"id\":100,\"title\":\"hero-image\",\"source_url\":\"https://example.com/wp-content/uploads/2026/01/hero-image.jpg\",\"media_type\":\"image\",\"mime_type\":\"image/jpeg\",\"alt_text\":\"Hero banner\",\"caption\":\"Our main hero image\",\"description\":\"Full-width hero banner for homepage\",\"date\":\"2026-01-20T10:00:00\",\"media_details\":{\"width\":1920,\"height\":1080,\"file\":\"2026/01/hero-image.jpg\",\"sizes\":{\"thumbnail\":{\"width\":150,\"height\":150,\"source_url\":\"https://example.com/wp-content/uploads/2026/01/hero-image-150x150.jpg\"},\"medium\":{\"width\":300,\"height\":169,\"source_url\":\"https://example.com/wp-content/uploads/2026/01/hero-image-300x169.jpg\"}}}}"
    }]
  }
}
```

## wp_upload_media_from_url

Upload media from an external URL.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| url | string | Yes | URL of the file to upload |
| title | string | No | Title for the media item |
| alt_text | string | No | Alt text for images (SEO) |
| caption | string | No | Caption text |
| description | string | No | Description text |

### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "wp_upload_media_from_url",
    "arguments": {
      "url": "https://images.unsplash.com/photo-example.jpg",
      "title": "Mountain Landscape",
      "alt_text": "Beautiful mountain landscape at sunset"
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
      "text": "{\"id\":105,\"title\":\"Mountain Landscape\",\"source_url\":\"https://example.com/wp-content/uploads/2026/01/mountain-landscape.jpg\",\"media_type\":\"image\",\"mime_type\":\"image/jpeg\"}"
    }]
  }
}
```

## wp_upload_media_from_base64

Upload media from base64-encoded data.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| base64 | string | Yes | Base64-encoded file data |
| fileName | string | Yes | File name with extension |
| mimeType | string | Yes | MIME type (image/jpeg, image/png, etc.) |
| title | string | No | Title for the media item |
| alt_text | string | No | Alt text for images |
| caption | string | No | Caption text |

### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "wp_upload_media_from_base64",
    "arguments": {
      "base64": "/9j/4AAQSkZJRgABAQEASABIAAD...",
      "fileName": "logo.png",
      "mimeType": "image/png",
      "title": "Company Logo",
      "alt_text": "Company logo"
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
      "text": "{\"id\":106,\"title\":\"Company Logo\",\"source_url\":\"https://example.com/wp-content/uploads/2026/01/logo.png\",\"media_type\":\"image\",\"mime_type\":\"image/png\"}"
    }]
  }
}
```

## Use Cases

### Create Post with Featured Image

```javascript
// Upload image first
const media = await client.callTool('wp_upload_media_from_url', {
  url: 'https://example.com/images/featured.jpg',
  title: 'Featured Image for Blog Post',
  alt_text: 'Blog post featured image'
});

// Create post with featured image
const post = await client.callTool('wp_create_post', {
  title: 'New Blog Post',
  content: '<p>Post content here...</p>',
  status: 'publish',
  featured_media: media.id
});
```

### Bulk Upload Images

```javascript
const imageUrls = [
  'https://example.com/image1.jpg',
  'https://example.com/image2.jpg',
  'https://example.com/image3.jpg'
];

const uploadedMedia = [];

for (const url of imageUrls) {
  const media = await client.callTool('wp_upload_media_from_url', { url });
  uploadedMedia.push(media);
}
```

### Upload Generated Image (Base64)

```javascript
// For AI-generated images or canvas exports
const canvas = document.getElementById('myCanvas');
const base64 = canvas.toDataURL('image/png').split(',')[1];

const media = await client.callTool('wp_upload_media_from_base64', {
  base64: base64,
  fileName: 'generated-image.png',
  mimeType: 'image/png',
  title: 'AI Generated Art',
  alt_text: 'An AI-generated artwork'
});
```

## Supported MIME Types

| Type | Extensions | MIME Type |
|------|------------|-----------|
| Images | jpg, jpeg | image/jpeg |
| | png | image/png |
| | gif | image/gif |
| | webp | image/webp |
| | svg | image/svg+xml |
| Documents | pdf | application/pdf |
| | doc | application/msword |
| | docx | application/vnd.openxmlformats-officedocument.wordprocessingml.document |
| Audio | mp3 | audio/mpeg |
| | wav | audio/wav |
| | ogg | audio/ogg |
| Video | mp4 | video/mp4 |
| | webm | video/webm |
| | mov | video/quicktime |

## Best Practices

1. **Always include alt text** for images (SEO and accessibility)
2. **Use descriptive titles** for easier media library management
3. **Optimize images** before uploading to reduce storage and bandwidth
4. **Use appropriate MIME types** to ensure proper file handling
5. **Handle upload failures** gracefully with retry logic
