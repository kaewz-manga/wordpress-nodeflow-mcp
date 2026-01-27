/**
 * WordPress REST API Client
 */

import { MCPError, MCPErrorCodes } from '../utils/errors';
import { REQUEST_TIMEOUT_MS, validateExternalUrl } from '../utils/validation';
import { createAuthHeader, validateWordPressUrl } from './auth';
import {
  WordPressCredentials,
  WPPost,
  WPPage,
  WPMedia,
  WPCategory,
  WPTag,
  WPComment,
  CreatePostData,
  UpdatePostData,
  CreatePageData,
  UpdatePageData,
  CreateCategoryData,
  CreateTagData,
  WPErrorResponse,
} from './types';

export class WordPressClient {
  private baseUrl: string;
  private authHeader: string;

  constructor(credentials: WordPressCredentials) {
    this.baseUrl = validateWordPressUrl(credentials.url);
    this.authHeader = createAuthHeader(credentials.username, credentials.password);
  }

  /**
   * Build query string from params object
   */
  private buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        queryParams.set(key, String(value));
      }
    }
    const query = queryParams.toString();
    return query ? `?${query}` : '';
  }

  /**
   * Fetch with timeout support
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs: number = REQUEST_TIMEOUT_MS
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new MCPError(
          MCPErrorCodes.WORDPRESS_API_ERROR,
          `Request timeout after ${timeoutMs}ms`
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Handle error response from WordPress API
   */
  private async handleErrorResponse(response: Response, context: string): Promise<never> {
    let errorData: WPErrorResponse;
    try {
      errorData = await response.json();
    } catch {
      throw new MCPError(
        MCPErrorCodes.WORDPRESS_API_ERROR,
        `${context}: ${response.status} ${response.statusText}`
      );
    }

    throw new MCPError(
      MCPErrorCodes.WORDPRESS_API_ERROR,
      `${context}: ${errorData.message}`,
      errorData
    );
  }

  /**
   * Make a WordPress REST API request
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/wp-json/wp/v2${endpoint}`;

    const response = await this.fetchWithTimeout(url, {
      ...options,
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      await this.handleErrorResponse(response, 'WordPress API error');
    }

    return response.json();
  }

  /**
   * Posts API
   */
  async getPosts(params: {
    per_page?: number;
    page?: number;
    status?: string;
    search?: string;
  } = {}): Promise<WPPost[]> {
    const query = this.buildQueryString(params);
    return this.makeRequest<WPPost[]>(`/posts${query}`);
  }

  async getPost(id: number): Promise<WPPost> {
    return this.makeRequest<WPPost>(`/posts/${id}`);
  }

  async createPost(data: CreatePostData): Promise<WPPost> {
    return this.makeRequest<WPPost>('/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePost(id: number, data: UpdatePostData): Promise<WPPost> {
    return this.makeRequest<WPPost>(`/posts/${id}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deletePost(id: number, force: boolean = false): Promise<{ deleted: boolean; previous: WPPost }> {
    const query = this.buildQueryString({ force: force || undefined });
    return this.makeRequest(`/posts/${id}${query}`, {
      method: 'DELETE',
    });
  }

  /**
   * Pages API
   */
  async getPages(params: {
    per_page?: number;
    page?: number;
    search?: string;
  } = {}): Promise<WPPage[]> {
    const query = this.buildQueryString(params);
    return this.makeRequest<WPPage[]>(`/pages${query}`);
  }

  async createPage(data: CreatePageData): Promise<WPPage> {
    return this.makeRequest<WPPage>('/pages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePage(id: number, data: UpdatePageData): Promise<WPPage> {
    return this.makeRequest<WPPage>(`/pages/${id}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deletePage(id: number, force: boolean = false): Promise<{ deleted: boolean; previous: WPPage }> {
    const query = this.buildQueryString({ force: force || undefined });
    return this.makeRequest(`/pages/${id}${query}`, {
      method: 'DELETE',
    });
  }

  /**
   * Media API
   */
  async getMedia(params: {
    per_page?: number;
    page?: number;
    media_type?: string;
  } = {}): Promise<WPMedia[]> {
    const query = this.buildQueryString(params);
    return this.makeRequest<WPMedia[]>(`/media${query}`);
  }

  async getMediaItem(id: number): Promise<WPMedia> {
    return this.makeRequest<WPMedia>(`/media/${id}`);
  }

  async uploadMediaFromUrl(params: {
    url: string;
    title?: string;
    alt_text?: string;
    caption?: string;
  }): Promise<WPMedia> {
    // Validate URL for SSRF protection
    validateExternalUrl(params.url, 'url');

    // Fetch the media file from URL with timeout
    const mediaResponse = await this.fetchWithTimeout(params.url);
    if (!mediaResponse.ok) {
      throw new MCPError(
        MCPErrorCodes.WORDPRESS_API_ERROR,
        `Failed to fetch media from URL: ${params.url}`
      );
    }

    const mediaBlob = await mediaResponse.blob();
    const filename = params.url.split('/').pop() || 'upload';

    // Create form data
    const formData = new FormData();
    formData.append('file', mediaBlob, filename);
    if (params.title) formData.append('title', params.title);
    if (params.alt_text) formData.append('alt_text', params.alt_text);
    if (params.caption) formData.append('caption', params.caption);

    // Upload to WordPress with timeout
    const uploadUrl = `${this.baseUrl}/wp-json/wp/v2/media`;
    const response = await this.fetchWithTimeout(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
      },
      body: formData,
    });

    if (!response.ok) {
      await this.handleErrorResponse(response, 'Media upload failed');
    }

    return response.json();
  }

  async uploadMediaFromBase64(params: {
    base64: string;
    fileName: string;
    mimeType: string;
    title?: string;
    alt_text?: string;
    caption?: string;
  }): Promise<WPMedia> {
    // Convert base64 to blob
    const base64Data = params.base64.replace(/^data:[^;]+;base64,/, '');
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: params.mimeType });

    // Create form data
    const formData = new FormData();
    formData.append('file', blob, params.fileName);
    if (params.title) formData.append('title', params.title);
    if (params.alt_text) formData.append('alt_text', params.alt_text);
    if (params.caption) formData.append('caption', params.caption);

    // Upload to WordPress with timeout
    const uploadUrl = `${this.baseUrl}/wp-json/wp/v2/media`;
    const response = await this.fetchWithTimeout(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
      },
      body: formData,
    });

    if (!response.ok) {
      await this.handleErrorResponse(response, 'Media upload failed');
    }

    return response.json();
  }

  /**
   * Categories API
   */
  async getCategories(params: {
    per_page?: number;
    page?: number;
    search?: string;
  } = {}): Promise<WPCategory[]> {
    const query = this.buildQueryString(params);
    return this.makeRequest<WPCategory[]>(`/categories${query}`);
  }

  async getCategory(id: number): Promise<WPCategory> {
    return this.makeRequest<WPCategory>(`/categories/${id}`);
  }

  async createCategory(data: CreateCategoryData): Promise<WPCategory> {
    return this.makeRequest<WPCategory>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(id: number, force: boolean = false): Promise<{ deleted: boolean; previous: WPCategory }> {
    const query = this.buildQueryString({ force: force || undefined });
    return this.makeRequest(`/categories/${id}${query}`, {
      method: 'DELETE',
    });
  }

  /**
   * Tags API
   */
  async getTags(params: {
    per_page?: number;
    page?: number;
    search?: string;
  } = {}): Promise<WPTag[]> {
    const query = this.buildQueryString(params);
    return this.makeRequest<WPTag[]>(`/tags${query}`);
  }

  async createTag(data: CreateTagData): Promise<WPTag> {
    return this.makeRequest<WPTag>('/tags', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Comments API
   */
  async getComments(params: {
    per_page?: number;
    page?: number;
    post?: number;
    status?: string;
  } = {}): Promise<WPComment[]> {
    const query = this.buildQueryString(params);
    return this.makeRequest<WPComment[]>(`/comments${query}`);
  }

  async updateCommentStatus(id: number, status: 'approved' | 'pending' | 'spam' | 'trash'): Promise<WPComment> {
    return this.makeRequest<WPComment>(`/comments/${id}`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  }

  async deleteComment(id: number, force: boolean = false): Promise<{ deleted: boolean; previous: WPComment }> {
    const query = this.buildQueryString({ force: force || undefined });
    return this.makeRequest(`/comments/${id}${query}`, {
      method: 'DELETE',
    });
  }
}
