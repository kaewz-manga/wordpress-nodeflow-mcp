# ImgBB Upload Tool - Feature Summary

**Added**: 2026-01-26
**Version**: 1.2.0
**Tool**: `upload_to_imgbb`

---

## What Was Added

### New Tool: `upload_to_imgbb`

**Purpose**: Upload images to ImgBB and get public URLs instantly

**Replaces n8n Workflow**:
```
Before (4 nodes):
Download → Extract → HTTP Request → Code

After (2 nodes):
Download → MCP upload_to_imgbb
```

---

## Files Created/Modified

### New Files (3)
1. **`src/storage/imgbb.ts`** - ImgBB client implementation
2. **`src/mcp/handlers/storage.ts`** - Storage tools handlers
3. **`IMGBB_USAGE.md`** - Complete usage guide
4. **`examples/n8n-imgbb-wordpress-example.json`** - n8n workflow example

### Modified Files (4)
1. **`src/mcp/tools.ts`** - Added storageTools array
2. **`src/mcp/handlers/index.ts`** - Added storage route
3. **`README.md`** - Updated features (13→14 tools)
4. **`CLAUDE.md`** - Updated tools count

---

## How It Works

### Tool Signature

```typescript
upload_to_imgbb({
  base64: string,      // Required: Base64 image data
  apiKey: string,      // Required: ImgBB API key
  name?: string,       // Optional: Image name
  expiration?: number  // Optional: Auto-delete after N seconds
})
```

### Response

```json
{
  "originalContentUrl": "https://i.ibb.co/abc123/image.png",
  "previewImageUrl": "https://i.ibb.co/abc123/image.png",
  "displayUrl": "https://ibb.co/abc123",
  "deleteUrl": "https://ibb.co/abc123/xyz789"
}
```

---

## Usage in n8n

### Option 1: ImgBB Only

```json
{
  "method": "tools/call",
  "params": {
    "name": "upload_to_imgbb",
    "arguments": {
      "base64": "{{ $binary.data.toString('base64') }}",
      "apiKey": "{{ $credentials.imgbb.apiKey }}"
    }
  }
}
```

### Option 2: ImgBB → WordPress

```javascript
// Step 1: Upload to ImgBB
upload_to_imgbb → get originalContentUrl

// Step 2: Upload to WordPress
wp_upload_media_from_url({
  url: originalContentUrl
})
```

**Benefits**:
- Fast CDN (ImgBB)
- Permanent storage (WordPress)
- Best of both worlds

---

## Comparison vs Original Workflow

### Your Original n8n Nodes

```json
{
  "nodes": [
    {
      "name": "Download file",
      "type": "n8n-nodes-base.googleDrive"
    },
    {
      "name": "Extract from File",
      "type": "n8n-nodes-base.extractFromFile"
    },
    {
      "name": "HTTP Request",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "https://api.imgbb.com/1/upload",
        "contentType": "multipart-form-data",
        "bodyParameters": {
          "parameters": [
            { "name": "key", "value": "={{ $json.key }}" },
            { "name": "image", "value": "={{ $json.image }}" }
          ]
        }
      }
    },
    {
      "name": "สร้าง URL สำหรับรูปลูกค้า",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "return [{ json: { originalContentUrl: $json.data.url, previewImageUrl: $json.data.thumb.url } }];"
      }
    }
  ]
}
```

### With MCP Tool

```json
{
  "nodes": [
    {
      "name": "Download file",
      "type": "n8n-nodes-base.googleDrive"
    },
    {
      "name": "MCP - Upload to ImgBB",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "https://wordpress-mcp.nodeflow.workers.dev/mcp",
        "jsonBody": "{ \"method\": \"tools/call\", \"params\": { \"name\": \"upload_to_imgbb\", \"arguments\": { \"base64\": \"{{ $binary.data.toString('base64') }}\", \"apiKey\": \"{{ $credentials.imgbb.apiKey }}\" } } }"
      }
    }
  ]
}
```

**Reduced**: 4 nodes → 2 nodes (50% reduction)

---

## Benefits

### For n8n Users

1. **Fewer Nodes**: 4 → 2 (50% reduction)
2. **No Manual Form-Data**: MCP handles it
3. **Built-in Error Handling**: Automatic validation
4. **Reusable**: Use in any workflow
5. **Cleaner Code**: No manual JSON extraction

### Technical

1. **Type-Safe**: TypeScript validation
2. **Error Messages**: Clear error reporting
3. **Stateless**: No memory leaks
4. **Fast**: Cloudflare Workers edge deployment

---

## ImgBB API Features

### Free Tier
- ✅ **File size**: 32MB per image
- ✅ **Bandwidth**: Unlimited
- ✅ **Storage**: Unlimited
- ✅ **Formats**: JPG, PNG, BMP, GIF, WebP, HEIC, PDF

### Expiration
- **Min**: 60 seconds
- **Max**: 15552000 seconds (180 days)
- **Default**: Permanent (no expiration)

### URLs Returned
- `originalContentUrl` - Direct image URL
- `previewImageUrl` - Thumbnail URL
- `displayUrl` - ImgBB page
- `deleteUrl` - Delete link

---

## Security

### API Key Handling

**✅ Correct** (Parameter-based):
```json
{
  "arguments": {
    "apiKey": "{{ $credentials.imgbb.apiKey }}"
  }
}
```

**❌ Wrong** (Hard-coded):
```json
{
  "arguments": {
    "apiKey": "a1b2c3d4..."
  }
}
```

### Benefits of Parameter-based
- No hard-coded keys
- n8n credentials management
- Easy key rotation
- No git commits

---

## Error Handling

### Common Errors

**Invalid API Key**:
```json
{
  "error": {
    "code": -32003,
    "message": "ImgBB upload failed: Invalid API key"
  }
}
```

**Image Too Large**:
```json
{
  "error": {
    "code": -32003,
    "message": "ImgBB upload failed: Image size exceeds 32MB"
  }
}
```

**Invalid Base64**:
```json
{
  "error": {
    "code": -32005,
    "message": "base64 is required and must be a non-empty string"
  }
}
```

---

## Testing

### Test with API Key

**File**: `test-imgbb-upload.json`

```bash
# Edit file and add your API key
# Then test:
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d @test-imgbb-upload.json
```

### Expected Response

```json
{
  "jsonrpc": "2.0",
  "id": 30,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\n  \"originalContentUrl\": \"https://i.ibb.co/...\",\n  \"previewImageUrl\": \"https://i.ibb.co/...\",\n  \"displayUrl\": \"https://ibb.co/...\",\n  \"deleteUrl\": \"https://ibb.co/.../...\"\n}"
      }
    ]
  }
}
```

---

## Use Cases

### 1. LINE Bot Image Storage

**Workflow**:
```
LINE Webhook (receive image) →
Download binary →
upload_to_imgbb →
Send originalContentUrl back to user
```

**Benefit**: Fast CDN delivery for LINE users

### 2. Temporary Preview Links

**Workflow**:
```
Upload with expiration: 3600 (1 hour) →
Share previewImageUrl →
Auto-deletes after 1 hour
```

**Benefit**: No storage cleanup needed

### 3. WordPress + ImgBB Dual Storage

**Workflow**:
```
upload_to_imgbb → get URL →
wp_upload_media_from_url → WordPress
```

**Benefit**:
- Fast (ImgBB CDN)
- Permanent (WordPress)
- Backup (2 locations)

---

## Next Steps

### Get ImgBB API Key

1. Go to https://api.imgbb.com/
2. Sign up / Login
3. Click "Get API Key"
4. Copy your key (32 characters)

### Test Locally

```bash
# Start server
npm run dev

# Edit test-imgbb-upload.json with your API key
# Run test
curl -X POST http://localhost:8787/mcp \
  -d @test-imgbb-upload.json
```

### Deploy to Production

```bash
npm run deploy
```

### Update n8n Workflows

1. Import `examples/n8n-imgbb-wordpress-example.json`
2. Update credentials
3. Test workflow
4. Replace old 4-node workflow with new 2-node version

---

## Future Enhancements

### Possible Additions

1. **Other Image Hosts**: Imgur, Cloudinary, etc.
2. **Batch Upload**: Multiple images at once
3. **Image Optimization**: Auto-resize/compress
4. **CDN Selection**: Choose CDN by region

---

## Documentation

- **Full Guide**: `IMGBB_USAGE.md`
- **n8n Example**: `examples/n8n-imgbb-wordpress-example.json`
- **Test File**: `test-imgbb-upload.json`
- **API Docs**: https://api.imgbb.com/

---

**Status**: ✅ **READY FOR USE**

**Tools Count**: 12 → 13 → **14 tools**

**Total Features**:
- Posts: 5 tools
- Pages: 4 tools
- Media: 4 tools
- Storage: 1 tool
