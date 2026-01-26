/**
 * WordPress Pages Tool Handlers
 */

import { WordPressClient } from '../../wordpress/client';
import {
  validateRequiredString,
  validateOptionalString,
  validateEnum,
  validateNumber,
  validateBoolean,
} from '../../utils/validation';

const PAGE_STATUSES = ['publish', 'draft', 'pending', 'private'] as const;

export async function handleGetPages(args: any, client: WordPressClient) {
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
    pages: pages.map((page) => ({
      id: page.id,
      title: page.title.rendered,
      link: page.link,
      status: page.status,
      date: page.date,
    })),
  };
}

export async function handleCreatePage(args: any, client: WordPressClient) {
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

export async function handleUpdatePage(args: any, client: WordPressClient) {
  const id = validateNumber(args.id, 'id', true);

  if (!id) {
    throw new Error('Page ID is required');
  }

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

export async function handleDeletePage(args: any, client: WordPressClient) {
  const id = validateNumber(args.id, 'id', true);

  if (!id) {
    throw new Error('Page ID is required');
  }

  const force = validateBoolean(args.force, 'force', false);

  const result = await client.deletePage(id, force);

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
