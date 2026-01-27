/**
 * Categories Tools Handlers
 */

import { WordPressClient } from '../../wordpress/client';
import {
  validateRequiredString,
  validateOptionalString,
  validateNumber,
  validateRequiredNumber,
  validateBoolean,
} from '../../utils/validation';

// Type definitions for handler arguments
interface GetCategoriesArgs {
  per_page?: number;
  page?: number;
  search?: string;
}

interface GetCategoryArgs {
  id: number;
}

interface CreateCategoryArgs {
  name: string;
  description?: string;
  slug?: string;
  parent?: number;
}

interface DeleteCategoryArgs {
  id: number;
  force?: boolean;
}

export async function handleGetCategories(args: GetCategoriesArgs, client: WordPressClient) {
  const perPage = validateNumber(args.per_page, 'per_page', false) || 10;
  const page = validateNumber(args.page, 'page', false) || 1;
  const search = validateOptionalString(args.search, 'search');

  const categories = await client.getCategories({
    per_page: perPage,
    page,
    search,
  });

  return {
    count: categories.length,
    categories: categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      count: cat.count,
      parent: cat.parent,
      link: cat.link,
    })),
  };
}

export async function handleGetCategory(args: GetCategoryArgs, client: WordPressClient) {
  const id = validateRequiredNumber(args.id, 'id');
  const category = await client.getCategory(id);

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    count: category.count,
    parent: category.parent,
    link: category.link,
  };
}

export async function handleCreateCategory(args: CreateCategoryArgs, client: WordPressClient) {
  const name = validateRequiredString(args.name, 'name');
  const description = validateOptionalString(args.description, 'description');
  const slug = validateOptionalString(args.slug, 'slug');
  const parent = validateNumber(args.parent, 'parent', false);

  const category = await client.createCategory({
    name,
    description,
    slug,
    parent,
  });

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    count: category.count,
    parent: category.parent,
    link: category.link,
  };
}

export async function handleDeleteCategory(args: DeleteCategoryArgs, client: WordPressClient) {
  const id = validateRequiredNumber(args.id, 'id');
  const force = validateBoolean(args.force, 'force', false);

  const result = await client.deleteCategory(id, force);

  return {
    success: result.deleted,
    id,
    deleted: result.deleted,
    name: result.previous.name,
  };
}
