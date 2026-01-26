# Claude Desktop Integration Guide

> How to use wordpress-nodeflow-mcp with Claude Desktop

---

## 📋 Prerequisites

1. **Claude Desktop** installed
2. **Node.js** installed (for supergateway)
3. **wordpress-nodeflow-mcp** running (local or deployed)

---

## 🚀 Setup Methods

### Method 1: Local Development (Recommended for Testing)

**Step 1: Start local server**
```bash
cd wordpress-nodeflow-mcp
npm run dev
# Server runs on http://localhost:8789
```

**Step 2: Configure Claude Desktop**

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Linux**: `~/.config/Claude/claude_desktop_config.json`

**Add this configuration**:
```json
{
  "mcpServers": {
    "wordpress-local": {
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

**Step 3: Replace credentials**
- `YOUR_USERNAME` → Your WordPress username
- `YOUR_APP_PASSWORD_WITHOUT_SPACES` → Your WordPress Application Password (remove all spaces!)

**Step 4: Restart Claude Desktop**

---

### Method 2: Production (Cloudflare Workers)

**Prerequisites**: Deploy to Cloudflare Workers first

**Configuration**:
```json
{
  "mcpServers": {
    "wordpress-production": {
      "command": "npx",
      "args": [
        "-y",
        "@anthropic-ai/supergateway",
        "--stdio",
        "https://wordpress-mcp.nodeflow.workers.dev/mcp",
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

**Benefits**:
- ✅ No local server needed
- ✅ Works from anywhere
- ✅ Always up-to-date
- ✅ Auto-scaling

---

## 🔐 Multi-Tenant Setup (Multiple WordPress Sites)

**For different WordPress sites**, create separate configs:

```json
{
  "mcpServers": {
    "wp-site-1": {
      "command": "npx",
      "args": [
        "-y",
        "@anthropic-ai/supergateway",
        "--stdio",
        "https://wordpress-mcp.nodeflow.workers.dev/mcp",
        "--headers",
        "x-wordpress-url=https://site1.com",
        "--headers",
        "x-wordpress-username=admin1",
        "--headers",
        "x-wordpress-password=password1"
      ]
    },
    "wp-site-2": {
      "command": "npx",
      "args": [
        "-y",
        "@anthropic-ai/supergateway",
        "--stdio",
        "https://wordpress-mcp.nodeflow.workers.dev/mcp",
        "--headers",
        "x-wordpress-url=https://site2.com",
        "--headers",
        "x-wordpress-username=admin2",
        "--headers",
        "x-wordpress-password=password2"
      ]
    }
  }
}
```

---

## 🧪 Testing Connection

**Step 1: Restart Claude Desktop**

**Step 2: Start new conversation**

**Step 3: Type this message**:
```
List all available tools
```

**Expected Response**:
Claude should show you 24 WordPress tools:
- Posts (5 tools)
- Pages (4 tools)
- Media (4 tools)
- Categories (4 tools)
- Tags (2 tools)
- Comments (4 tools)
- ImgBB (1 tool)

**Step 4: Test a tool**:
```
Get the latest 5 posts from WordPress
```

Claude should call `wp_get_posts` and show you the results.

---

## 🛠️ Troubleshooting

### Issue 1: "MCP server not found"

**Cause**: Config file location wrong or JSON syntax error

**Fix**:
1. Verify config file location (see above paths)
2. Check JSON syntax with https://jsonlint.com/
3. Restart Claude Desktop

### Issue 2: "Connection failed"

**Cause**: Server not running (local) or wrong URL (production)

**Fix (Local)**:
```bash
# Check if server is running
curl http://localhost:8789/health

# Should return: {"status":"healthy",...}
```

**Fix (Production)**:
```bash
# Check if deployed
curl https://wordpress-mcp.nodeflow.workers.dev/health
```

### Issue 3: "401 Unauthorized"

**Cause**: Wrong WordPress credentials or spaces in password

**Fix**:
1. Verify username and password
2. **Remove ALL spaces** from Application Password
3. Example:
   - WordPress shows: `aBcD eFgH iJkL mNoP qRsT uVwX`
   - Use in config: `aBcDeFgHiJkLmNoPqRsTuVwX`

### Issue 4: "Tool not found"

**Cause**: Server version mismatch

**Fix**:
1. Update local server: `git pull && npm install`
2. Or use production URL (always latest)

### Issue 5: Supergateway not installing

**Fix**:
```bash
# Install globally
npm install -g @anthropic-ai/supergateway

# Then use:
"command": "supergateway",
"args": ["--stdio", "http://..."]
```

---

## 📊 Available Tools in Claude Desktop

### Posts (5 tools)
- **wp_get_posts** - List posts with filters
- **wp_get_post** - Get single post
- **wp_create_post** - Create new post
- **wp_update_post** - Update existing post
- **wp_delete_post** - Delete post

### Pages (4 tools)
- **wp_get_pages** - List pages
- **wp_create_page** - Create new page
- **wp_update_page** - Update existing page
- **wp_delete_page** - Delete page

### Media (4 tools)
- **wp_get_media** - List media items
- **wp_get_media_item** - Get single media
- **wp_upload_media_from_url** - Upload from URL
- **wp_upload_media_from_base64** - Upload from base64

### Categories (4 tools)
- **wp_get_categories** - List categories
- **wp_get_category** - Get single category
- **wp_create_category** - Create new category
- **wp_delete_category** - Delete category

### Tags (2 tools)
- **wp_get_tags** - List tags
- **wp_create_tag** - Create new tag

### Comments (4 tools)
- **wp_get_comments** - List comments
- **wp_approve_comment** - Approve pending comment
- **wp_spam_comment** - Mark as spam
- **wp_delete_comment** - Delete comment

### ImgBB (1 tool)
- **upload_to_imgbb** - Upload image to ImgBB

---

## 💡 Usage Examples

### Example 1: Create a Blog Post
```
Create a WordPress post with title "My First Post" and content "Hello World!"
```

Claude will:
1. Call `wp_create_post`
2. Create the post as draft
3. Return the post ID and link

### Example 2: Upload Image
```
Upload this image to WordPress: https://example.com/image.jpg
```

Claude will:
1. Call `wp_upload_media_from_url`
2. Upload to WordPress media library
3. Return media ID and URL

### Example 3: Manage Categories
```
Create a new category called "Technology" and list all categories
```

Claude will:
1. Call `wp_create_category`
2. Call `wp_get_categories`
3. Show you the results

### Example 4: Moderate Comments
```
Show me all pending comments
```

Claude will:
1. Call `wp_get_comments` with status filter
2. Show pending comments
3. You can then ask to approve specific ones

---

## 🔒 Security Notes

1. **Store credentials securely**
   - Config file contains plaintext passwords
   - Protect your Claude config file

2. **Use Application Passwords**
   - Never use your main WordPress password
   - Generate from: WordPress → Users → Profile → Application Passwords

3. **Limit permissions**
   - Create WordPress user with minimum required permissions
   - Use role: Editor or Author (not Administrator)

4. **Multi-tenant isolation**
   - Each config is isolated
   - Different sites can't access each other

---

## 🚀 Next Steps

1. ✅ Configure Claude Desktop
2. ✅ Test connection
3. ✅ Try creating a post
4. 📚 Explore other tools
5. 🎯 Automate your workflow

---

**Questions?** Check the main [README.md](README.md) or [CLAUDE.md](CLAUDE.md)
