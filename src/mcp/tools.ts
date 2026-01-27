/**
 * MCP Tool Definitions for WordPress REST API
 */

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * Posts Tools (5)
 */
export const postsTools: MCPTool[] = [
  {
    name: 'wp_get_posts',
    description: 'Get a list of WordPress posts with optional filtering',
    inputSchema: {
      type: 'object',
      properties: {
        per_page: {
          type: 'number',
          description: 'Number of posts per page (default: 10, max: 100)',
          default: 10,
        },
        page: {
          type: 'number',
          description: 'Page number (default: 1)',
          default: 1,
        },
        status: {
          type: 'string',
          enum: ['publish', 'draft', 'pending', 'private', 'trash'],
          description: 'Filter by post status (publish=live, draft=unpublished, pending=awaiting review, private=password protected)',
        },
        search: {
          type: 'string',
          description: 'Search keyword in post title and content',
        },
      },
    },
  },
  {
    name: 'wp_get_post',
    description: 'Get a single WordPress post by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Post ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'wp_create_post',
    description: 'Create a new WordPress post',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Post title',
        },
        content: {
          type: 'string',
          description: 'Post content (HTML)',
        },
        status: {
          type: 'string',
          enum: ['publish', 'draft', 'pending', 'private'],
          description: 'Post status: publish=make live immediately, draft=save for later (default), pending=submit for review, private=require password',
          default: 'draft',
        },
        excerpt: {
          type: 'string',
          description: 'Short summary shown in post listings (optional, auto-generated from content if not provided)',
        },
        featured_media: {
          type: 'number',
          description: 'Featured image media ID (must be existing media item ID from wp_upload_media)',
        },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'wp_update_post',
    description: 'Update an existing WordPress post',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Post ID to update',
        },
        title: {
          type: 'string',
          description: 'Post title',
        },
        content: {
          type: 'string',
          description: 'Post content (HTML)',
        },
        status: {
          type: 'string',
          enum: ['publish', 'draft', 'pending', 'private'],
          description: 'Post status: publish=make live, draft=unpublished, pending=awaiting review, private=password protected',
        },
        excerpt: {
          type: 'string',
          description: 'Short summary shown in post listings',
        },
        featured_media: {
          type: 'number',
          description: 'Featured image media ID (must be existing media item ID)',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'wp_delete_post',
    description: 'Delete a WordPress post',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Post ID to delete',
        },
        force: {
          type: 'boolean',
          description: 'true=permanently delete (cannot undo), false=move to trash (can restore later, default)',
          default: false,
        },
      },
      required: ['id'],
    },
  },
];

/**
 * Pages Tools (4)
 */
export const pagesTools: MCPTool[] = [
  {
    name: 'wp_get_pages',
    description: 'Get a list of WordPress pages',
    inputSchema: {
      type: 'object',
      properties: {
        per_page: {
          type: 'number',
          description: 'Number of pages per page (default: 10, max: 100)',
          default: 10,
        },
        page: {
          type: 'number',
          description: 'Page number (default: 1)',
          default: 1,
        },
        search: {
          type: 'string',
          description: 'Search keyword in page title and content',
        },
      },
    },
  },
  {
    name: 'wp_create_page',
    description: 'Create a new WordPress page',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Page title',
        },
        content: {
          type: 'string',
          description: 'Page content (HTML)',
        },
        status: {
          type: 'string',
          enum: ['publish', 'draft', 'pending', 'private'],
          description: 'Page status: publish=make live immediately, draft=save for later (default), pending=submit for review, private=require password',
          default: 'draft',
        },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'wp_update_page',
    description: 'Update an existing WordPress page',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Page ID to update',
        },
        title: {
          type: 'string',
          description: 'Page title',
        },
        content: {
          type: 'string',
          description: 'Page content (HTML)',
        },
        status: {
          type: 'string',
          enum: ['publish', 'draft', 'pending', 'private'],
          description: 'Page status: publish=make live, draft=unpublished, pending=awaiting review, private=password protected',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'wp_delete_page',
    description: 'Delete a WordPress page',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Page ID to delete',
        },
        force: {
          type: 'boolean',
          description: 'true=permanently delete (cannot undo), false=move to trash (can restore later, default)',
          default: false,
        },
      },
      required: ['id'],
    },
  },
];

/**
 * Media Tools (4)
 */
export const mediaTools: MCPTool[] = [
  {
    name: 'wp_get_media',
    description: 'Get a list of media items from WordPress media library',
    inputSchema: {
      type: 'object',
      properties: {
        per_page: {
          type: 'number',
          description: 'Number of media items per page (default: 10, max: 100)',
          default: 10,
        },
        page: {
          type: 'number',
          description: 'Page number (default: 1)',
          default: 1,
        },
        media_type: {
          type: 'string',
          enum: ['image', 'video', 'audio', 'application'],
          description: 'Filter by media type: image=photos/graphics, video=mp4/mov, audio=mp3/wav, application=pdf/docs',
        },
      },
    },
  },
  {
    name: 'wp_get_media_item',
    description: 'Get a single media item by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Media ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'wp_upload_media_from_url',
    description: 'Upload media to WordPress from a URL',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL of the media file to upload',
        },
        title: {
          type: 'string',
          description: 'Media title',
        },
        alt_text: {
          type: 'string',
          description: 'Alt text for accessibility and SEO (describes image for screen readers)',
        },
        caption: {
          type: 'string',
          description: 'Caption text shown below image when displayed on site',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'wp_upload_media_from_base64',
    description: 'Upload media to WordPress from base64 encoded data (useful for n8n binary data)',
    inputSchema: {
      type: 'object',
      properties: {
        base64: {
          type: 'string',
          description: 'Base64 encoded file data (with or without "data:image/png;base64," prefix)',
        },
        fileName: {
          type: 'string',
          description: 'File name with extension (e.g., "photo.jpg", "document.pdf")',
        },
        mimeType: {
          type: 'string',
          description: 'MIME type matching file extension (e.g., "image/jpeg" for .jpg, "image/png" for .png, "application/pdf" for .pdf)',
        },
        title: {
          type: 'string',
          description: 'Media title',
        },
        alt_text: {
          type: 'string',
          description: 'Alt text for accessibility and SEO (describes image for screen readers)',
        },
        caption: {
          type: 'string',
          description: 'Caption text shown below image when displayed on site',
        },
      },
      required: ['base64', 'fileName', 'mimeType'],
    },
  },
];

/**
 * Categories Tools (4)
 */
export const categoriesTools: MCPTool[] = [
  {
    name: 'wp_get_categories',
    description: 'Get a list of WordPress categories',
    inputSchema: {
      type: 'object',
      properties: {
        per_page: {
          type: 'number',
          description: 'Number of categories per page (default: 10, max: 100)',
          default: 10,
        },
        page: {
          type: 'number',
          description: 'Page number (default: 1)',
          default: 1,
        },
        search: {
          type: 'string',
          description: 'Search keyword in category name',
        },
      },
    },
  },
  {
    name: 'wp_get_category',
    description: 'Get a single category by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Category ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'wp_create_category',
    description: 'Create a new WordPress category',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Category name (e.g., "Technology", "News")',
        },
        description: {
          type: 'string',
          description: 'Category description (optional, used for SEO)',
        },
        slug: {
          type: 'string',
          description: 'URL-friendly slug (optional, auto-generated from name if not provided)',
        },
        parent: {
          type: 'number',
          description: 'Parent category ID for creating subcategory (optional, 0 = top level)',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'wp_delete_category',
    description: 'Delete a WordPress category',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Category ID to delete',
        },
        force: {
          type: 'boolean',
          description: 'true=permanently delete (cannot undo), false=allow recovery (default)',
          default: false,
        },
      },
      required: ['id'],
    },
  },
];

/**
 * Tags Tools (2)
 */
export const tagsTools: MCPTool[] = [
  {
    name: 'wp_get_tags',
    description: 'Get a list of WordPress tags',
    inputSchema: {
      type: 'object',
      properties: {
        per_page: {
          type: 'number',
          description: 'Number of tags per page (default: 10, max: 100)',
          default: 10,
        },
        page: {
          type: 'number',
          description: 'Page number (default: 1)',
          default: 1,
        },
        search: {
          type: 'string',
          description: 'Search keyword in tag name',
        },
      },
    },
  },
  {
    name: 'wp_create_tag',
    description: 'Create a new WordPress tag',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Tag name (e.g., "tutorial", "review")',
        },
        description: {
          type: 'string',
          description: 'Tag description (optional, used for SEO)',
        },
        slug: {
          type: 'string',
          description: 'URL-friendly slug (optional, auto-generated from name if not provided)',
        },
      },
      required: ['name'],
    },
  },
];

/**
 * Comments Tools (4)
 */
export const commentsTools: MCPTool[] = [
  {
    name: 'wp_get_comments',
    description: 'Get a list of WordPress comments with filtering',
    inputSchema: {
      type: 'object',
      properties: {
        per_page: {
          type: 'number',
          description: 'Number of comments per page (default: 10, max: 100)',
          default: 10,
        },
        page: {
          type: 'number',
          description: 'Page number (default: 1)',
          default: 1,
        },
        post: {
          type: 'number',
          description: 'Filter comments by post ID (optional, all posts if not specified)',
        },
        status: {
          type: 'string',
          enum: ['approved', 'pending', 'spam', 'trash'],
          description: 'Filter by comment status: approved=published, pending=awaiting moderation, spam=marked as spam, trash=deleted',
        },
      },
    },
  },
  {
    name: 'wp_approve_comment',
    description: 'Approve a pending comment (make it visible on site)',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Comment ID to approve',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'wp_spam_comment',
    description: 'Mark a comment as spam',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Comment ID to mark as spam',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'wp_delete_comment',
    description: 'Delete a WordPress comment',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Comment ID to delete',
        },
        force: {
          type: 'boolean',
          description: 'true=permanently delete (cannot undo), false=move to trash (can restore later, default)',
          default: false,
        },
      },
      required: ['id'],
    },
  },
];

/**
 * Storage Tools (1)
 */
export const storageTools: MCPTool[] = [
  {
    name: 'upload_to_imgbb',
    description: 'Upload image to ImgBB and get public URLs (supports multi-tenant via header or environment variable)',
    inputSchema: {
      type: 'object',
      properties: {
        base64: {
          type: 'string',
          description: 'Base64 encoded image data (accepts with/without prefix, supports JPG/PNG/GIF/WebP)',
        },
        apiKey: {
          type: 'string',
          description: 'ImgBB API key (optional - can use header x-imgbb-api-key or env IMGBB_API_KEY for multi-tenant)',
        },
        name: {
          type: 'string',
          description: 'Image filename without extension (optional, auto-generated if not provided)',
        },
        expiration: {
          type: 'number',
          description: 'Auto-delete after N seconds (min: 60 = 1 minute, max: 15552000 = 180 days, optional = never expire)',
        },
      },
      required: ['base64'],
    },
  },
];

/**
 * All available tools
 */
export const allTools: MCPTool[] = [
  ...postsTools,
  ...pagesTools,
  ...mediaTools,
  ...categoriesTools,
  ...tagsTools,
  ...commentsTools,
  ...storageTools,
];

/**
 * Get tool by name
 */
export function getToolByName(name: string): MCPTool | undefined {
  return allTools.find((tool) => tool.name === name);
}
