/**
 * WordPress Posts Tool Handlers
 */

import { WordPressClient } from '../../wordpress/client';
import {
  validateRequiredString,
  validateOptionalString,
  validateEnum,
  validateNumber,
  validateBoolean,
} from '../../utils/validation';

const POST_STATUSES = ['publish', 'draft', 'pending', 'private'] as const;
const POST_FILTER_STATUSES = ['publish', 'draft', 'pending', 'private', 'trash'] as const;

export async function handleGetPosts(args: any, client: WordPressClient) {
  const per_page = validateNumber(args.per_page, 'per_page') || 10;
  const page = validateNumber(args.page, 'page') || 1;
  const status = validateOptionalString(args.status, 'status');
  const search = validateOptionalString(args.search, 'search');

  // Validate status if provided
  if (status && !POST_FILTER_STATUSES.includes(status as any)) {
    throw new Error(`Invalid status. Must be one of: ${POST_FILTER_STATUSES.join(', ')}`);
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

export async function handleGetPost(args: any, client: WordPressClient) {
  const id = validateNumber(args.id, 'id', true);

  if (!id) {
    throw new Error('Post ID is required');
  }

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

export async function handleCreatePost(args: any, client: WordPressClient) {
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

export async function handleUpdatePost(args: any, client: WordPressClient) {
  const id = validateNumber(args.id, 'id', true);

  if (!id) {
    throw new Error('Post ID is required');
  }

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

export async function handleDeletePost(args: any, client: WordPressClient) {
  const id = validateNumber(args.id, 'id', true);

  if (!id) {
    throw new Error('Post ID is required');
  }

  const force = validateBoolean(args.force, 'force', false);

  const result = await client.deletePost(id, force);

  return {
    success: true,
    id: result.id || id,
    deleted: result.deleted || false,
    previous: result.previous
      ? {
          title: result.previous.title?.rendered,
          status: result.previous.status,
        }
      : undefined,
  };
}
