/**
 * WordPress Posts Tool Handlers
 */

import { WordPressClient } from '../../wordpress/client';
import { MCPError, MCPErrorCodes } from '../../utils/errors';
import {
  validateRequiredString,
  validateOptionalString,
  validateEnum,
  validateNumber,
  validateRequiredNumber,
  validateBoolean,
} from '../../utils/validation';

// Type definitions for handler arguments
interface GetPostsArgs {
  per_page?: number;
  page?: number;
  status?: string;
  search?: string;
}

interface GetPostArgs {
  id: number;
}

interface CreatePostArgs {
  title: string;
  content: string;
  status?: string;
  excerpt?: string;
  featured_media?: number;
}

interface UpdatePostArgs {
  id: number;
  title?: string;
  content?: string;
  status?: string;
  excerpt?: string;
  featured_media?: number;
}

interface DeletePostArgs {
  id: number;
  force?: boolean;
}

const POST_STATUSES = ['publish', 'draft', 'pending', 'private'] as const;
const POST_FILTER_STATUSES = ['publish', 'draft', 'pending', 'private', 'trash'] as const;

export async function handleGetPosts(args: GetPostsArgs, client: WordPressClient) {
  const per_page = validateNumber(args.per_page, 'per_page') || 10;
  const page = validateNumber(args.page, 'page') || 1;
  const status = validateOptionalString(args.status, 'status');
  const search = validateOptionalString(args.search, 'search');

  // Validate status if provided
  if (status && !POST_FILTER_STATUSES.includes(status as typeof POST_FILTER_STATUSES[number])) {
    throw new MCPError(
      MCPErrorCodes.VALIDATION_ERROR,
      `Invalid status. Must be one of: ${POST_FILTER_STATUSES.join(', ')}`
    );
  }

  const posts = await client.getPosts({
    per_page,
    page,
    status,
    search,
  });

  return {
    count: posts.length,
    posts: posts.map((post) => ({
      id: post.id,
      title: post.title.rendered,
      link: post.link,
      status: post.status,
      date: post.date,
      excerpt: post.excerpt.rendered,
    })),
  };
}

export async function handleGetPost(args: GetPostArgs, client: WordPressClient) {
  const id = validateRequiredNumber(args.id, 'id');
  const post = await client.getPost(id);

  return {
    id: post.id,
    title: post.title.rendered,
    content: post.content.rendered,
    link: post.link,
    status: post.status,
    date: post.date,
    modified: post.modified,
    author: post.author,
    featured_media: post.featured_media,
    excerpt: post.excerpt.rendered,
  };
}

export async function handleCreatePost(args: CreatePostArgs, client: WordPressClient) {
  const title = validateRequiredString(args.title, 'title');
  const content = validateRequiredString(args.content, 'content');
  const status = validateEnum(args.status, 'status', POST_STATUSES, 'draft');
  const excerpt = validateOptionalString(args.excerpt, 'excerpt');
  const featured_media = validateNumber(args.featured_media, 'featured_media');

  const post = await client.createPost({
    title,
    content,
    status,
    excerpt,
    featured_media,
  });

  return {
    id: post.id,
    title: post.title.rendered,
    link: post.link,
    status: post.status,
    date: post.date,
  };
}

export async function handleUpdatePost(args: UpdatePostArgs, client: WordPressClient) {
  const id = validateRequiredNumber(args.id, 'id');
  const title = validateOptionalString(args.title, 'title');
  const content = validateOptionalString(args.content, 'content');
  const status = args.status
    ? validateEnum(args.status, 'status', POST_STATUSES)
    : undefined;
  const excerpt = validateOptionalString(args.excerpt, 'excerpt');
  const featured_media = validateNumber(args.featured_media, 'featured_media');

  const post = await client.updatePost(id, {
    title,
    content,
    status,
    excerpt,
    featured_media,
  });

  return {
    id: post.id,
    title: post.title.rendered,
    link: post.link,
    status: post.status,
    modified: post.modified,
  };
}

export async function handleDeletePost(args: DeletePostArgs, client: WordPressClient) {
  const id = validateRequiredNumber(args.id, 'id');
  const force = validateBoolean(args.force, 'force', false);

  const result = await client.deletePost(id, force);

  return {
    success: true,
    id: result.previous?.id || id,
    deleted: result.deleted || false,
    previous: result.previous
      ? {
          title: result.previous.title?.rendered,
          status: result.previous.status,
        }
      : undefined,
  };
}
