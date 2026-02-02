import { describe, it, expect } from 'vitest';
import {
  postsTools,
  pagesTools,
  mediaTools,
  categoriesTools,
  tagsTools,
  commentsTools,
  storageTools,
  allTools,
  getToolByName,
} from '../src/tools';

describe('Tool Categories', () => {
  it('should have 5 posts tools', () => expect(postsTools).toHaveLength(5));
  it('should have 4 pages tools', () => expect(pagesTools).toHaveLength(4));
  it('should have 4 media tools', () => expect(mediaTools).toHaveLength(4));
  it('should have 4 categories tools', () => expect(categoriesTools).toHaveLength(4));
  it('should have 2 tags tools', () => expect(tagsTools).toHaveLength(2));
  it('should have 4 comments tools', () => expect(commentsTools).toHaveLength(4));
  it('should have 1 storage tool', () => expect(storageTools).toHaveLength(1));
  it('should have 24 total tools', () => expect(allTools).toHaveLength(24));
});

describe('Tool Structure', () => {
  it('all tools should have name, description, and inputSchema', () => {
    for (const tool of allTools) {
      expect(tool.name, `tool missing name`).toBeTruthy();
      expect(tool.description, `${tool.name} missing description`).toBeTruthy();
      expect(tool.inputSchema, `${tool.name} missing inputSchema`).toBeTruthy();
      expect(tool.inputSchema.type, `${tool.name} schema type`).toBe('object');
      expect(tool.inputSchema.properties, `${tool.name} missing properties`).toBeTruthy();
    }
  });

  it('should have no duplicate tool names', () => {
    const names = allTools.map(t => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('WordPress tools should start with wp_', () => {
    const wpTools = allTools.filter(t => t.name !== 'upload_to_imgbb');
    for (const tool of wpTools) {
      expect(tool.name).toMatch(/^wp_/);
    }
  });
});

describe('getToolByName', () => {
  it('should find existing tool', () => {
    const tool = getToolByName('wp_get_posts');
    expect(tool).toBeDefined();
    expect(tool!.name).toBe('wp_get_posts');
  });

  it('should return undefined for non-existent tool', () => {
    expect(getToolByName('non_existent')).toBeUndefined();
  });

  it('should find imgbb tool', () => {
    expect(getToolByName('upload_to_imgbb')).toBeDefined();
  });
});
