/**
 * Comments Tools Handlers
 */

import { WordPressClient } from '../../wordpress/client';
import {
  validateNumber,
  validateOptionalString,
  validateEnum,
  validateBoolean,
} from '../../utils/validation';

const COMMENT_STATUSES = ['approved', 'pending', 'spam', 'trash'];

export async function handleGetComments(args: any, client: WordPressClient) {
  const perPage = validateNumber(args.per_page, 'per_page', false) || 10;
  const page = validateNumber(args.page, 'page', false) || 1;
  const post = validateNumber(args.post, 'post', false);
  const status = validateOptionalString(args.status, 'status');

  const comments = await client.getComments({
    per_page: perPage,
    page,
    post,
    status,
  });

  return {
    count: comments.length,
    comments: comments.map((comment) => ({
      id: comment.id,
      post: comment.post,
      author_name: comment.author_name,
      author_url: comment.author_url,
      date: comment.date,
      content: comment.content.rendered,
      status: comment.status,
      link: comment.link,
    })),
  };
}

export async function handleApproveComment(args: any, client: WordPressClient) {
  const id = validateNumber(args.id, 'id', true);

  const comment = await client.updateCommentStatus(id, 'approved');

  return {
    success: true,
    id: comment.id,
    status: comment.status,
    post: comment.post,
    author_name: comment.author_name,
  };
}

export async function handleSpamComment(args: any, client: WordPressClient) {
  const id = validateNumber(args.id, 'id', true);

  const comment = await client.updateCommentStatus(id, 'spam');

  return {
    success: true,
    id: comment.id,
    status: comment.status,
    post: comment.post,
    author_name: comment.author_name,
  };
}

export async function handleDeleteComment(args: any, client: WordPressClient) {
  const id = validateNumber(args.id, 'id', true);
  const force = validateBoolean(args.force, 'force', false);

  const result = await client.deleteComment(id, force);

  return {
    success: result.deleted,
    id,
    deleted: result.deleted,
    author_name: result.previous.author_name,
  };
}
