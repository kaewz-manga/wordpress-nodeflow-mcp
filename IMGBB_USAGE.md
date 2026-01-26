# ImgBB Upload Tool Usage Guide

## Overview

Tool `upload_to_imgbb` allows you to upload images to ImgBB and get public URLs instantly - perfect for n8n workflows.

---

## Get ImgBB API Key

### Step 1: Sign Up
1. Go to https://imgbb.com/
2. Click **Sign Up** (top right)
3. Create account (email + password)

### Step 2: Get API Key
1. Go to https://api.imgbb.com/
2. Login with your ImgBB account
3. Click **Get API Key**
4. Copy your API key (32 characters)

**Example**: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

---

## Usage Examples

### Example 1: Simple Upload (curl)

```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "upload_to_imgbb",
      "arguments": {
        "base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "apiKey": "YOUR_IMGBB_API_KEY"
      }
    }
  }'
```

**Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\n  \"originalContentUrl\": \"https://i.ibb.co/abc123/image.png\",\n  \"previewImageUrl\": \"https://i.ibb.co/abc123/image.png\",\n  \"displayUrl\": \"https://ibb.co/abc123\",\n  \"deleteUrl\": \"https://ibb.co/abc123/xyz789\"\n}"
      }
    ]
  }
}
```

### Example 2: Upload with Expiration

```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "upload_to_imgbb",
      "arguments": {
        "base64": "...",
        "apiKey": "YOUR_API_KEY",
        "name": "temporary-image",
        "expiration": 3600
      }
    }
  }'
```

**Expiration**: 3600 seconds (1 hour) - image will auto-delete

---

## n8n Workflow

### Option 1: ImgBB Only (Simple)

```
Download Image → Convert to Binary → MCP upload_to_imgbb → Extract URLs
```

**MCP Node Configuration**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "upload_to_imgbb",
    "arguments": {
      "base64": "{{ $binary.data.toString('base64') }}",
      "apiKey": "{{ $node['ImgBB Credentials'].json.apiKey }}",
      "name": "image-{{ $now.toFormat('yyyyMMdd-HHmmss') }}"
    }
  }
}
```

**Extract URLs** (Code node):
```javascript
const result = JSON.parse($json.result.content[0].text);
return {
  originalContentUrl: result.originalContentUrl,
  previewImageUrl: result.previewImageUrl
};
```

### Option 2: ImgBB → WordPress (Complete)

```
Download Image → Convert to Binary →
MCP upload_to_imgbb → Extract URL →
MCP wp_upload_media_from_url → WordPress
```

**Benefit**: Image stored in both ImgBB (fast CDN) and WordPress (permanent)

**Workflow File**: `examples/n8n-imgbb-wordpress-example.json`

---

## Comparison: Original n8n Workflow vs MCP

### Original (Your Workflow)

```
Download file (Google Drive) →
Extract from File →
HTTP Request (ImgBB) →
Code (extract URLs)
```

**Issues**:
- Need to manage API key in n8n
- Manual form-data construction
- Multiple error handling

### With MCP

```
Download file →
Convert to Binary →
MCP upload_to_imgbb →
Extract URLs
```

**Benefits**:
- ✅ Simplified workflow (fewer nodes)
- ✅ API key passed as parameter
- ✅ Error handling built-in
- ✅ Reusable across workflows

---

## Return Values

### Success Response

```json
{
  "originalContentUrl": "https://i.ibb.co/abc123/image.png",
  "previewImageUrl": "https://i.ibb.co/abc123/image.png",
  "displayUrl": "https://ibb.co/abc123",
  "deleteUrl": "https://ibb.co/abc123/xyz789"
}
```

**Field Descriptions**:
- `originalContentUrl` - Direct image URL (for embedding)
- `previewImageUrl` - Thumbnail URL
- `displayUrl` - ImgBB page URL (for sharing)
- `deleteUrl` - Delete link (save for later removal)

### Error Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32003,
    "message": "ImgBB upload failed: Invalid API key"
  }
}
```

**Common Errors**:
- Invalid API key
- Base64 format error
- Image too large (32MB limit)
- Rate limit exceeded (free tier)

---

## ImgBB Limitations

### Free Tier
- **File size**: 32MB per image
- **Bandwidth**: Unlimited
- **Storage**: Unlimited
- **Rate limit**: Not officially documented
- **Expiration**: Optional (60s - 15552000s / 180 days)

### Supported Formats
- JPG, PNG, BMP, GIF, WebP, HEIC, PDF

### Best Practices
1. **For temporary files**: Use `expiration` parameter
2. **For permanent**: Don't set expiration
3. **Keep delete URL**: Save if you need to remove later
4. **Optimize images**: Compress before upload to save bandwidth

---

## Use Cases

### 1. LINE Bot Image Storage

```javascript
// n8n workflow: Receive image from LINE
// Upload to ImgBB
// Send originalContentUrl back to LINE user
```

### 2. WordPress Post with External Images

```javascript
// Upload to ImgBB first (fast CDN)
// Then upload to WordPress (permanent storage)
// Use ImgBB URL in post content for better performance
```

### 3. Temporary Preview Links

```javascript
// Upload with 3600s expiration
// Share previewImageUrl for 1-hour preview
// Auto-deletes after expiration
```

---

## Troubleshooting

### Error: "Invalid API key"

**Solution**:
1. Check API key is correct (32 characters)
2. Verify key from https://api.imgbb.com/

### Error: "Failed to fetch image"

**Solution**:
1. Check base64 data is valid
2. Remove `data:image/...;base64,` prefix if present
3. Ensure image size < 32MB

### Error: "Rate limit exceeded"

**Solution**:
1. Wait a few minutes
2. Consider upgrading ImgBB plan
3. Cache URLs instead of re-uploading

---

## Security Notes

### API Key Protection

**❌ Don't**:
- Hard-code API key in workflow
- Commit API key to git
- Share API key publicly

**✅ Do**:
- Pass API key as parameter from credentials node
- Store in n8n credentials
- Use environment variables

### Example: n8n Credentials Setup

1. Create new Credential (type: HTTP Header Auth)
2. Add header: `x-imgbb-api-key: YOUR_KEY`
3. Reference in workflow: `{{ $credentials.imgbb.apiKey }}`

---

## Migration from Current Workflow

### Current Workflow (4 nodes):
```
1. Download file (Google Drive)
2. Extract from File
3. HTTP Request (ImgBB API)
4. Code (extract URLs)
```

### New Workflow (2 nodes):
```
1. Download file (Google Drive)
2. MCP upload_to_imgbb
```

**Changes Required**:
1. Remove "Extract from File" node
2. Replace "HTTP Request" with MCP call
3. Remove "Code" node (URLs already extracted)
4. Update API key reference

---

## FAQ

**Q: Can I upload from URL instead of base64?**
A: ImgBB API requires base64 or file upload. Use `wp_upload_media_from_url` instead.

**Q: Is ImgBB free forever?**
A: Yes, free tier has unlimited storage and bandwidth.

**Q: Can I delete uploaded images?**
A: Yes, use the `deleteUrl` from response.

**Q: What if ImgBB is down?**
A: Use fallback: upload to WordPress directly with `wp_upload_media_from_base64`.

**Q: Can I use other image hosts?**
A: Yes, contact us to add support for other services (Imgur, Cloudinary, etc.)

---

**Tool Version**: 1.2.0
**Last Updated**: 2026-01-26
**ImgBB API Docs**: https://api.imgbb.com/
