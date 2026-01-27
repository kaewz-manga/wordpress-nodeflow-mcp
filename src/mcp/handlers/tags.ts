/**
 * Tags Tools Handlers
 */

import { WordPressClient } from '../../wordpress/client';
import {
  validateRequiredString,
  validateOptionalString,
  validateNumber,
} from '../../utils/validation';

// Type definitions for handler arguments
interface GetTagsArgs {
  per_page?: number;
  page?: number;
  search?: string;
}

interface CreateTagArgs {
  name: string;
  description?: string;
  slug?: string;
}

export async function handleGetTags(args: GetTagsArgs, client: WordPressClient) {
  const perPage = validateNumber(args.per_page, 'per_page', false) || 10;
  const page = validateNumber(args.page, 'page', false) || 1;
  const search = validateOptionalString(args.search, 'search');

  const tags = await client.getTags({
    per_page: perPage,
    page,
    search,
  });

  return {
    count: tags.length,
    tags: tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      description: tag.description,
      count: tag.count,
      link: tag.link,
    })),
  };
}

export async function handleCreateTag(args: CreateTagArgs, client: WordPressClient) {
  const name = validateRequiredString(args.name, 'name');
  const description = validateOptionalString(args.description, 'description');
  const slug = validateOptionalString(args.slug, 'slug');

  const tag = await client.createTag({
    name,
    description,
    slug,
  });

  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    description: tag.description,
    count: tag.count,
    link: tag.link,
  };
}
