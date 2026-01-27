/**
 * Comments Tools Handlers
 */

import { WordPressClient } from '../../wordpress/client';
import {
  validateNumber,
  validateRequiredNumber,
  validateOptionalString,
  validateBoolean,
} from '../../utils/validation';

// Type definitions for handler arguments
interface GetCommentsArgs {
  per_page?: number;
  page?: number;
  post?: number;
  status?: string;
}

interface CommentIdArgs {
  id: number;
}

interface DeleteCommentArgs {
  id: number;
  force?: boolean;
}

export async function handleGetComments(args: GetCommentsArgs, client: WordPressClient) {
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

export async function handleApproveComment(args: CommentIdArgs, client: WordPressClient) {
  const id = validateRequiredNumber(args.id, 'id');
  const comment = await client.updateCommentStatus(id, 'approved');

  return {
    success: true,
    id: comment.id,
    status: comment.status,
    post: comment.post,
    author_name: comment.author_name,
  };
}

export async function handleSpamComment(args: CommentIdArgs, client: WordPressClient) {
  const id = validateRequiredNumber(args.id, 'id');
  const comment = await client.updateCommentStatus(id, 'spam');

  return {
    success: true,
    id: comment.id,
    status: comment.status,
    post: comment.post,
    author_name: comment.author_name,
  };
}

export async function handleDeleteComment(args: DeleteCommentArgs, client: WordPressClient) {
  const id = validateRequiredNumber(args.id, 'id');
  const force = validateBoolean(args.force, 'force', false);

  const result = await client.deleteComment(id, force);

  return {
    success: result.deleted,
    id,
    deleted: result.deleted,
    author_name: result.previous.author_name,
  };
}
