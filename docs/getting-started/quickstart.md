# Quickstart Guide

Get started with WordPress MCP in under 5 minutes.

## Prerequisites

- A WordPress site with REST API enabled
- An Application Password (WordPress 5.6+)
- An MCP-compatible client (Claude, Cursor, etc.)

## Step 1: Create an Account

1. Go to [wordpress-mcp.com/register](https://wordpress-mcp.com/register)
2. Sign up with email or OAuth (Google/GitHub)
3. Verify your email address

## Step 2: Generate an API Key

1. Navigate to **Dashboard > API Keys**
2. Click **Create API Key**
3. Enter a name (e.g., "Production")
4. Copy your key immediately - you won't see it again!

```
wp_mcp_live_a1b2c3d4e5f6g7h8i9j0...
```

## Step 3: Get Your WordPress Application Password

1. Log into your WordPress admin
2. Go to **Users > Profile**
3. Scroll to **Application Passwords**
4. Enter a name (e.g., "MCP Integration")
5. Click **Add New Application Password**
6. Copy the password (remove spaces)

## Step 4: Configure Your MCP Client

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "wordpress": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-remote", "https://api.wordpress-mcp.com/mcp"],
      "env": {
        "MCP_HEADERS": "Authorization=Bearer YOUR_API_KEY,x-wordpress-url=https://your-site.com,x-wordpress-username=admin,x-wordpress-password=YOUR_APP_PASSWORD"
      }
    }
  }
}
```

### Cursor IDE

Add to Cursor MCP settings:

```json
{
  "mcp": {
    "servers": {
      "wordpress": {
        "url": "https://api.wordpress-mcp.com/mcp",
        "headers": {
          "Authorization": "Bearer YOUR_API_KEY",
          "x-wordpress-url": "https://your-site.com",
          "x-wordpress-username": "admin",
          "x-wordpress-password": "YOUR_APP_PASSWORD"
        }
      }
    }
  }
}
```

## Step 5: Test the Connection

Restart your MCP client and try:

> "List my recent WordPress posts"

The AI should use `wp_get_posts` to fetch your posts!

## Available Tools

| Category | Tools |
|----------|-------|
| Posts | `wp_get_posts`, `wp_create_post`, `wp_update_post`, `wp_delete_post` |
| Pages | `wp_get_pages`, `wp_create_page`, `wp_update_page`, `wp_delete_page` |
| Media | `wp_get_media`, `wp_upload_media_from_url`, `wp_upload_media_from_base64` |
| Categories | `wp_get_categories`, `wp_create_category` |
| Tags | `wp_get_tags`, `wp_create_tag` |
| Comments | `wp_get_comments`, `wp_approve_comment`, `wp_delete_comment` |

## Next Steps

- [View all tools documentation](../tools/overview.md)
- [Set up webhooks](../guides/webhooks.md)
- [Configure team access](../guides/teams.md)
- [Upgrade your plan](https://wordpress-mcp.com/dashboard/billing)

## Troubleshooting

### 401 Unauthorized

- Check your API key is correct
- Verify WordPress credentials (username + app password)
- Ensure app password has no spaces

### 403 Forbidden

- Check your WordPress user has appropriate permissions
- Verify the REST API is enabled on your WordPress site

### Rate Limited

- Free tier: 10 requests/minute
- Upgrade for higher limits

## Support

- **Documentation**: [docs.wordpress-mcp.com](https://docs.wordpress-mcp.com)
- **GitHub Issues**: [github.com/wordpress-mcp/issues](https://github.com/wordpress-mcp/issues)
- **Email**: support@wordpress-mcp.com (Starter+)
