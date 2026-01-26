# wordpress-nodeflow-mcp

Cloudflare Workers MCP server for WordPress REST API - serverless, auto-scaling, zero memory leaks.

## Features

- **24 Tools**: Posts, Pages, Media, Categories, Tags, Comments, and Image Storage
- **Serverless**: Runs on Cloudflare Workers (300+ edge locations)
- **Auto-scaling**: Handles 100,000 requests/day (free tier)
- **Zero Memory Leaks**: Stateless architecture, no long-running processes
- **Multi-tenant**: Support multiple WordPress sites via headers
- **MCP Protocol**: JSON-RPC 2.0 over HTTP
- **n8n Integration**: Direct HTTP API calls
- **Claude Desktop**: Via supergateway (stdio transport)

## Available Tools

### Posts (5 tools)
- `wp_get_posts` - List posts with filtering
- `wp_get_post` - Get single post by ID
- `wp_create_post` - Create new post
- `wp_update_post` - Update existing post
- `wp_delete_post` - Delete post

### Pages (4 tools)
- `wp_get_pages` - List pages
- `wp_create_page` - Create new page
- `wp_update_page` - Update existing page
- `wp_delete_page` - Delete page

### Media (4 tools)
- `wp_get_media` - List media items
- `wp_get_media_item` - Get single media item
- `wp_upload_media_from_url` - Upload media from URL
- `wp_upload_media_from_base64` - Upload media from base64 (n8n binary data)

### Categories (4 tools)
- `wp_get_categories` - List categories
- `wp_get_category` - Get single category by ID
- `wp_create_category` - Create new category
- `wp_delete_category` - Delete category

### Tags (2 tools)
- `wp_get_tags` - List tags
- `wp_create_tag` - Create new tag

### Comments (4 tools)
- `wp_get_comments` - List comments with filtering
- `wp_approve_comment` - Approve pending comment
- `wp_spam_comment` - Mark comment as spam
- `wp_delete_comment` - Delete comment

### Storage (1 tool)
- `upload_to_imgbb` - Upload image to ImgBB, get public URLs (requires API key)

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/<username>/wordpress-nodeflow-mcp.git
cd wordpress-nodeflow-mcp
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Credentials

Create `.dev.vars` for local development:

```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` and set your WordPress credentials:

```env
WORDPRESS_URL=https://your-wordpress-site.com
WORDPRESS_USERNAME=your_username
WORDPRESS_APP_PASSWORD=yourAppPasswordWithoutSpaces
```

**CRITICAL**: WordPress Application Password format:
- WordPress UI shows: `cUAn CKZ1 u5DN IkpS bMra FCWL` (with spaces)
- You must use: `cUAnCKZ1u5DNIkpSbMraFCWL` (without spaces)

### 4. Run Locally

```bash
npm run dev
```

Server runs at `http://localhost:8787`

### 5. Deploy to Cloudflare Workers

Set production secrets:

```bash
wrangler secret put WORDPRESS_URL
wrangler secret put WORDPRESS_USERNAME
wrangler secret put WORDPRESS_APP_PASSWORD
```

Deploy:

```bash
npm run deploy
```

## 🖥️ Claude Desktop Integration

**See full guide**: [CLAUDE_DESKTOP.md](CLAUDE_DESKTOP.md)

**Quick Setup**:

1. **Start local server** (or use production URL)
```bash
npm run dev  # Runs on http://localhost:8789
```

2. **Configure Claude Desktop**

Edit config file:
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

Add this:
```json
{
  "mcpServers": {
    "wordpress": {
      "command": "npx",
      "args": [
        "-y",
        "@anthropic-ai/supergateway",
        "--stdio",
        "http://localhost:8789/mcp",
        "--headers",
        "x-wordpress-url=https://your-wordpress-site.com",
        "--headers",
        "x-wordpress-username=YOUR_USERNAME",
        "--headers",
        "x-wordpress-password=YOUR_APP_PASSWORD_WITHOUT_SPACES"
      ]
    }
  }
}
```

3. **Restart Claude Desktop**

4. **Test**: Ask Claude to "List all WordPress tools"

**For production**: Replace `http://localhost:8789/mcp` with `https://wordpress-mcp.nodeflow.workers.dev/mcp`

## Usage

### Single-Tenant Mode (Environment Variables)

Set secrets via `wrangler secret put` or `.dev.vars`:

```bash
curl -X POST https://wordpress-mcp.nodeflow.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "wp_get_posts",
      "arguments": { "per_page": 5 }
    }
  }'
```

### Multi-Tenant Mode (HTTP Headers)

Pass credentials via headers (overrides environment):

```bash
curl -X POST https://wordpress-mcp.nodeflow.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -H "x-wordpress-url: https://wp.missmanga.org" \
  -H "x-wordpress-username: kaewz" \
  -H "x-wordpress-password: cUAnCKZ1u5DNIkpSbMraFCWL" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "wp_create_post",
      "arguments": {
        "title": "Test Post",
        "content": "This is a test post from MCP",
        "status": "draft"
      }
    }
  }'
```

## MCP Protocol

### 1. Initialize

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05"
  }
}
```

### 2. List Tools

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list",
  "params": {}
}
```

### 3. Call Tool

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "wp_get_posts",
    "arguments": {
      "per_page": 10,
      "status": "publish"
    }
  }
}
```

## Integration with n8n

1. Add **HTTP Request** node
2. Set **Method**: `POST`
3. Set **URL**: `https://wordpress-mcp.nodeflow.workers.dev/mcp`
4. Set **Headers** (multi-tenant):
   - `Content-Type: application/json`
   - `x-wordpress-url: https://your-site.com`
   - `x-wordpress-username: your_username`
   - `x-wordpress-password: yourAppPasswordWithoutSpaces`
5. Set **Body** (JSON):
   ```json
   {
     "jsonrpc": "2.0",
     "id": 1,
     "method": "tools/call",
     "params": {
       "name": "wp_create_post",
       "arguments": {
         "title": "{{$json.title}}",
         "content": "{{$json.content}}",
         "status": "draft"
       }
     }
   }
   ```

## WordPress Setup

### 1. Create Application Password

1. Go to WordPress Admin → Users → Profile
2. Scroll to **Application Passwords**
3. Enter name (e.g., "MCP Server")
4. Click **Add New Application Password**
5. Copy password and **remove all spaces**

### 2. Enable REST API

WordPress REST API is enabled by default. Test it:

```bash
curl https://your-site.com/wp-json/wp/v2/posts
```

## Architecture

```
n8n Workflow
    ↓ HTTP POST
Cloudflare Workers (wordpress-nodeflow-mcp)
    ↓ JSON-RPC 2.0
MCP Server (index.ts)
    ↓ Tool Routing
WordPress Client (client.ts)
    ↓ HTTP Basic Auth
WordPress REST API
    ↓
WordPress Database
```

## Development

### Type Check

```bash
npm run type-check
```

### Run Tests

```bash
npm test
```

### Watch Mode

```bash
npm run test:watch
```

## Troubleshooting

### 401 Unauthorized

**Problem**: All write operations (POST/PUT/DELETE) fail with 401

**Solution**: Remove spaces from Application Password
- ❌ Wrong: `cUAn CKZ1 u5DN IkpS bMra FCWL`
- ✅ Correct: `cUAnCKZ1u5DNIkpSbMraFCWL`

### CORS Errors

**Solution**: MCP server includes CORS headers by default. Check `ALLOWED_ORIGINS` in wrangler.toml

### Tools Not Found

**Solution**: Call `tools/list` first to verify available tools

## License

MIT License - see [LICENSE](LICENSE) file

## Contributing

Contributions welcome! Please open issues or pull requests.

## Links

- **GitHub**: https://github.com/<username>/wordpress-nodeflow-mcp
- **Cloudflare Workers**: https://workers.cloudflare.com/
- **WordPress REST API**: https://developer.wordpress.org/rest-api/
- **MCP Protocol**: https://modelcontextprotocol.io/
