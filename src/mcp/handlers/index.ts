/**
 * MCP Tool Handlers Router
 */

import { Env } from '../../index';
import { getCredentials } from '../../wordpress/auth';
import { WordPressClient } from '../../wordpress/client';
import { MCPError, MCPErrorCodes } from '../../utils/errors';

// Import handlers
import {
  handleGetPosts,
  handleGetPost,
  handleCreatePost,
  handleUpdatePost,
  handleDeletePost,
} from './posts';
import {
  handleGetPages,
  handleCreatePage,
  handleUpdatePage,
  handleDeletePage,
} from './pages';
import {
  handleGetMedia,
  handleGetMediaItem,
  handleUploadMediaFromUrl,
  handleUploadMediaFromBase64,
} from './media';
import {
  handleUploadToImgBB,
} from './storage';
import {
  handleGetCategories,
  handleGetCategory,
  handleCreateCategory,
  handleDeleteCategory,
} from './categories';
import {
  handleGetTags,
  handleCreateTag,
} from './tags';
import {
  handleGetComments,
  handleApproveComment,
  handleSpamComment,
  handleDeleteComment,
} from './comments';

/**
 * Route tool calls to appropriate handler
 */
export async function callTool(
  toolName: string,
  args: any,
  request: Request,
  env: Env
): Promise<any> {
  // Storage tools (multi-tenant support)
  if (toolName === 'upload_to_imgbb') {
    return handleUploadToImgBB(args, request, env);
  }

  // Get WordPress credentials and create client
  const credentials = getCredentials(request, env);
  const client = new WordPressClient(credentials);

  // Route to handler
  switch (toolName) {
    // Posts
    case 'wp_get_posts':
      return handleGetPosts(args, client);
    case 'wp_get_post':
      return handleGetPost(args, client);
    case 'wp_create_post':
      return handleCreatePost(args, client);
    case 'wp_update_post':
      return handleUpdatePost(args, client);
    case 'wp_delete_post':
      return handleDeletePost(args, client);

    // Pages
    case 'wp_get_pages':
      return handleGetPages(args, client);
    case 'wp_create_page':
      return handleCreatePage(args, client);
    case 'wp_update_page':
      return handleUpdatePage(args, client);
    case 'wp_delete_page':
      return handleDeletePage(args, client);

    // Media
    case 'wp_get_media':
      return handleGetMedia(args, client);
    case 'wp_get_media_item':
      return handleGetMediaItem(args, client);
    case 'wp_upload_media_from_url':
      return handleUploadMediaFromUrl(args, client);
    case 'wp_upload_media_from_base64':
      return handleUploadMediaFromBase64(args, client);

    // Categories
    case 'wp_get_categories':
      return handleGetCategories(args, client);
    case 'wp_get_category':
      return handleGetCategory(args, client);
    case 'wp_create_category':
      return handleCreateCategory(args, client);
    case 'wp_delete_category':
      return handleDeleteCategory(args, client);

    // Tags
    case 'wp_get_tags':
      return handleGetTags(args, client);
    case 'wp_create_tag':
      return handleCreateTag(args, client);

    // Comments
    case 'wp_get_comments':
      return handleGetComments(args, client);
    case 'wp_approve_comment':
      return handleApproveComment(args, client);
    case 'wp_spam_comment':
      return handleSpamComment(args, client);
    case 'wp_delete_comment':
      return handleDeleteComment(args, client);

    default:
      throw new MCPError(
        MCPErrorCodes.TOOL_NOT_FOUND,
        `Unknown tool: ${toolName}`
      );
  }
}
