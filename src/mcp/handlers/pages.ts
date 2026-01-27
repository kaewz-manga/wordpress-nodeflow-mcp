/**
 * WordPress Pages Tool Handlers
 */

import { WordPressClient } from '../../wordpress/client';
import {
  validateRequiredString,
  validateOptionalString,
  validateEnum,
  validateNumber,
  validateRequiredNumber,
  validateBoolean,
} from '../../utils/validation';

// Type definitions for handler arguments
interface GetPagesArgs {
  per_page?: number;
  page?: number;
  search?: string;
}

interface CreatePageArgs {
  title: string;
  content: string;
  status?: string;
}

interface UpdatePageArgs {
  id: number;
  title?: string;
  content?: string;
  status?: string;
}

interface DeletePageArgs {
  id: number;
  force?: boolean;
}

const PAGE_STATUSES = ['publish', 'draft', 'pending', 'private'] as const;

export async function handleGetPages(args: GetPagesArgs, client: WordPressClient) {
  const per_page = validateNumber(args.per_page, 'per_page') || 10;
  const page = validateNumber(args.page, 'page') || 1;
  const search = validateOptionalString(args.search, 'search');

  const pages = await client.getPages({
    per_page,
    page,
    search,
  });

  return {
    count: pages.length,
    pages: pages.map((p) => ({
      id: p.id,
      title: p.title.rendered,
      link: p.link,
      status: p.status,
      date: p.date,
    })),
  };
}

export async function handleCreatePage(args: CreatePageArgs, client: WordPressClient) {
  const title = validateRequiredString(args.title, 'title');
  const content = validateRequiredString(args.content, 'content');
  const status = validateEnum(args.status, 'status', PAGE_STATUSES, 'draft');

  const page = await client.createPage({
    title,
    content,
    status,
  });

  return {
    id: page.id,
    title: page.title.rendered,
    link: page.link,
    status: page.status,
    date: page.date,
  };
}

export async function handleUpdatePage(args: UpdatePageArgs, client: WordPressClient) {
  const id = validateRequiredNumber(args.id, 'id');
  const title = validateOptionalString(args.title, 'title');
  const content = validateOptionalString(args.content, 'content');
  const status = args.status
    ? validateEnum(args.status, 'status', PAGE_STATUSES)
    : undefined;

  const page = await client.updatePage(id, {
    title,
    content,
    status,
  });

  return {
    id: page.id,
    title: page.title.rendered,
    link: page.link,
    status: page.status,
    modified: page.modified,
  };
}

export async function handleDeletePage(args: DeletePageArgs, client: WordPressClient) {
  const id = validateRequiredNumber(args.id, 'id');
  const force = validateBoolean(args.force, 'force', false);

  const result = await client.deletePage(id, force);

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
