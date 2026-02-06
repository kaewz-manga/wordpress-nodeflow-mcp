import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap,
  Code,
  Terminal,
  Copy,
  Check,
  ChevronRight,
  Search,
} from 'lucide-react';

const docs = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Zap,
    sections: [
      {
        id: 'quickstart',
        title: 'Quickstart',
        content: `
# Quickstart Guide

Get started with WordPress MCP in under 5 minutes.

## 1. Create an Account

Sign up for a free account at [wordpress-mcp.com/register](/register).

## 2. Generate an API Key

1. Go to **Dashboard > API Keys**
2. Click **Create API Key**
3. Copy your key - you'll only see it once!

## 3. Configure Your MCP Client

Add the following configuration to your MCP client:

\`\`\`json
{
  "mcpServers": {
    "wordpress": {
      "url": "https://api.wordpress-mcp.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY",
        "x-wordpress-url": "https://your-wordpress-site.com",
        "x-wordpress-username": "your_username",
        "x-wordpress-password": "your_app_password"
      }
    }
  }
}
\`\`\`

## 4. Start Using WordPress Tools

You can now use WordPress tools in your AI conversations:

- \`wp_get_posts\` - Get all posts
- \`wp_create_post\` - Create a new post
- \`wp_upload_media\` - Upload media files
- And 21 more tools!

## Next Steps

- [View all available tools](#tools)
- [Manage your API keys](#api-keys)
- [View usage analytics](#usage)
        `,
      },
      {
        id: 'api-keys',
        title: 'API Keys',
        content: `
# API Key Management

Learn how to create, manage, and secure your API keys.

## Creating an API Key

1. Navigate to **Dashboard > API Keys**
2. Click **Create API Key**
3. Enter a descriptive name (e.g., "Production", "Development")
4. Copy your key immediately - it won't be shown again!

## Using Your API Key

Include your API key in the \`Authorization\` header:

\`\`\`bash
curl -X POST https://api.wordpress-mcp.com/mcp \\
  -H "Authorization: Bearer wp_mcp_live_xxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
\`\`\`

## Key Security Best Practices

- **Never commit keys to version control**
- Use environment variables to store keys
- Rotate keys periodically
- Create separate keys for development and production
- Revoke unused keys immediately

## Rate Limits

| Tier | Rate Limit |
|------|------------|
| Free | 100 req/mo |
| Starter | 1,000 req/mo |
| Pro | 10,000 req/mo |
| Enterprise | 100,000 req/mo |
        `,
      },
    ],
  },
  {
    id: 'tools',
    title: 'WordPress Tools',
    icon: Terminal,
    sections: [
      {
        id: 'posts',
        title: 'Posts',
        content: `
# Posts Tools

Manage WordPress posts programmatically.

## wp_get_posts

Get a list of posts with optional filters.

**Parameters:**
- \`per_page\` (optional): Number of posts to return (default: 10)
- \`page\` (optional): Page number for pagination
- \`status\` (optional): Filter by status (draft, publish, pending)
- \`search\` (optional): Search term

**Example:**
\`\`\`json
{
  "method": "tools/call",
  "params": {
    "name": "wp_get_posts",
    "arguments": {
      "per_page": 5,
      "status": "publish"
    }
  }
}
\`\`\`

## wp_create_post

Create a new WordPress post.

**Parameters:**
- \`title\` (required): Post title
- \`content\` (required): Post content (HTML supported)
- \`status\` (optional): Post status (draft, publish, pending)
- \`excerpt\` (optional): Post excerpt
- \`featured_media\` (optional): Media ID for featured image

**Example:**
\`\`\`json
{
  "method": "tools/call",
  "params": {
    "name": "wp_create_post",
    "arguments": {
      "title": "My New Post",
      "content": "<p>Hello World!</p>",
      "status": "draft"
    }
  }
}
\`\`\`

## wp_update_post

Update an existing post.

## wp_delete_post

Delete a post by ID.
        `,
      },
      {
        id: 'media',
        title: 'Media',
        content: `
# Media Tools

Upload and manage WordPress media files.

## wp_upload_media_from_url

Upload media from a URL.

**Parameters:**
- \`url\` (required): URL of the media file
- \`title\` (optional): Media title
- \`alt_text\` (optional): Alt text for accessibility
- \`caption\` (optional): Media caption

## wp_upload_media_from_base64

Upload media from base64-encoded data.

**Parameters:**
- \`base64\` (required): Base64-encoded file data
- \`fileName\` (required): File name with extension
- \`mimeType\` (required): MIME type (e.g., "image/png")

## wp_get_media

Get a list of media items.

## wp_get_media_item

Get a single media item by ID.
        `,
      },
    ],
  },
  {
    id: 'clients',
    title: 'MCP Clients',
    icon: Code,
    sections: [
      {
        id: 'claude',
        title: 'Claude Desktop',
        content: `
# Claude Desktop Setup

Configure WordPress MCP for Claude Desktop.

## Configuration File Location

- **macOS**: \`~/Library/Application Support/Claude/claude_desktop_config.json\`
- **Windows**: \`%APPDATA%/Claude/claude_desktop_config.json\`

## Configuration

\`\`\`json
{
  "mcpServers": {
    "wordpress": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-remote", "https://api.wordpress-mcp.com/mcp"],
      "env": {
        "MCP_HEADERS": "Authorization=Bearer YOUR_API_KEY,x-wordpress-url=https://your-site.com,x-wordpress-username=admin,x-wordpress-password=APP_PASSWORD"
      }
    }
  }
}
\`\`\`

## Verify Connection

After restarting Claude Desktop, you should see "wordpress" in the available tools list.
        `,
      },
      {
        id: 'cursor',
        title: 'Cursor',
        content: `
# Cursor IDE Setup

Configure WordPress MCP for Cursor IDE.

## Configuration

Open Cursor Settings and add the MCP server configuration.

\`\`\`json
{
  "mcp": {
    "servers": {
      "wordpress": {
        "url": "https://api.wordpress-mcp.com/mcp",
        "headers": {
          "Authorization": "Bearer YOUR_API_KEY"
        }
      }
    }
  }
}
\`\`\`

## Usage

Use the \`@wordpress\` mention in Cursor chat to access WordPress tools.
        `,
      },
    ],
  },
];

export default function Docs() {
  const [activeDoc, setActiveDoc] = useState(docs[0].id);
  const [activeSection, setActiveSection] = useState(docs[0].sections[0].id);
  const [search, setSearch] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const currentDoc = docs.find((d) => d.id === activeDoc)!;
  const currentSection = currentDoc.sections.find((s) => s.id === activeSection)!;

  function copyCode(code: string, id: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  function renderContent(content: string) {
    const lines = content.trim().split('\n');
    const elements: JSX.Element[] = [];
    let inCodeBlock = false;
    let codeContent = '';
    let codeId = 0;

    lines.forEach((line, index) => {
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          const id = `code-${codeId++}`;
          elements.push(
            <div key={id} className="relative group my-4">
              <pre className="bg-black text-green-400 p-4 rounded-lg overflow-x-auto text-sm border border-n2f-border">
                <code>{codeContent.trim()}</code>
              </pre>
              <button
                onClick={() => copyCode(codeContent.trim(), id)}
                className="absolute top-2 right-2 p-2 bg-n2f-elevated rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {copiedCode === id ? (
                  <Check className="h-4 w-4 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4 text-n2f-text-muted" />
                )}
              </button>
            </div>
          );
          codeContent = '';
        }
        inCodeBlock = !inCodeBlock;
      } else if (inCodeBlock) {
        codeContent += line + '\n';
      } else if (line.startsWith('# ')) {
        elements.push(
          <h1 key={index} className="text-3xl font-bold text-n2f-text mb-4 mt-8 first:mt-0">
            {line.slice(2)}
          </h1>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={index} className="text-xl font-semibold text-n2f-text mb-3 mt-6">
            {line.slice(3)}
          </h2>
        );
      } else if (line.startsWith('**') && line.endsWith('**')) {
        elements.push(
          <p key={index} className="font-semibold text-n2f-text mb-2">
            {line.slice(2, -2)}
          </p>
        );
      } else if (line.startsWith('- ')) {
        elements.push(
          <li key={index} className="ml-4 text-n2f-text-secondary mb-1">
            {line.slice(2).replace(/`([^`]+)`/g, '<code class="bg-n2f-elevated px-1 rounded text-sm text-n2f-accent">$1</code>')}
          </li>
        );
      } else if (line.startsWith('|')) {
        // Skip table rows for now
      } else if (line.trim()) {
        elements.push(
          <p
            key={index}
            className="text-n2f-text-secondary mb-4"
            dangerouslySetInnerHTML={{
              __html: line
                .replace(/`([^`]+)`/g, '<code class="bg-n2f-elevated px-1.5 py-0.5 rounded text-sm text-n2f-accent">$1</code>')
                .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-n2f-accent hover:text-blue-300">$1</a>')
                .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-n2f-text">$1</strong>'),
            }}
          />
        );
      }
    });

    return elements;
  }

  return (
    <div className="min-h-screen bg-n2f-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-n2f-card border-b border-n2f-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2">
                <div className="bg-n2f-accent p-1.5 rounded-lg">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-n2f-text">WP MCP Docs</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-n2f-text-muted" />
                <input
                  type="text"
                  placeholder="Search docs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input pl-9 py-1.5 w-64"
                />
              </div>
              <Link to="/dashboard" className="btn btn-primary">
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 border-r border-n2f-border min-h-[calc(100vh-64px)] sticky top-16 overflow-y-auto">
          <nav className="p-4 space-y-6">
            {docs.map((doc) => (
              <div key={doc.id}>
                <button
                  onClick={() => {
                    setActiveDoc(doc.id);
                    setActiveSection(doc.sections[0].id);
                  }}
                  className={`flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeDoc === doc.id
                      ? 'bg-n2f-accent/10 text-n2f-accent'
                      : 'text-n2f-text-secondary hover:bg-n2f-elevated'
                  }`}
                >
                  <doc.icon className="h-4 w-4 mr-2" />
                  {doc.title}
                </button>
                {activeDoc === doc.id && (
                  <div className="mt-1 ml-6 space-y-1">
                    {doc.sections.map((section) => (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`flex items-center w-full px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          activeSection === section.id
                            ? 'text-n2f-accent bg-n2f-accent/10'
                            : 'text-n2f-text-muted hover:text-n2f-text-secondary'
                        }`}
                      >
                        <ChevronRight className={`h-3 w-3 mr-1 transition-transform ${activeSection === section.id ? 'rotate-90' : ''}`} />
                        {section.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 p-8">
          <div className="max-w-3xl">
            <div className="mb-6">
              <nav className="flex items-center text-sm text-n2f-text-muted">
                <span>{currentDoc.title}</span>
                <ChevronRight className="h-4 w-4 mx-2" />
                <span className="text-n2f-text">{currentSection.title}</span>
              </nav>
            </div>

            <article className="max-w-none">
              {renderContent(currentSection.content)}
            </article>
          </div>
        </main>
      </div>
    </div>
  );
}
