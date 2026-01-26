/**
 * WordPress REST API Client
 */

import { MCPError, MCPErrorCodes } from '../utils/errors';
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
   * Make a WordPress REST API request
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/wp-json/wp/v2${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorData: WPErrorResponse;
      try {
        errorData = await response.json();
      } catch {
        throw new MCPError(
          MCPErrorCodes.WORDPRESS_API_ERROR,
          `WordPress API error: ${response.status} ${response.statusText}`
        );
      }

      throw new MCPError(
        MCPErrorCodes.WORDPRESS_API_ERROR,
        `WordPress API error: ${errorData.message}`,
        errorData
      );
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
    const queryParams = new URLSearchParams();
    if (params.per_page) queryParams.set('per_page', String(params.per_page));
    if (params.page) queryParams.set('page', String(params.page));
    if (params.status) queryParams.set('status', params.status);
    if (params.search) queryParams.set('search', params.search);

    const query = queryParams.toString();
    return this.makeRequest<WPPost[]>(`/posts${query ? `?${query}` : ''}`);
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

  async deletePost(id: number, force: boolean = false): Promise<any> {
    const queryParams = new URLSearchParams();
    if (force) queryParams.set('force', 'true');

    const query = queryParams.toString();
    return this.makeRequest(`/posts/${id}${query ? `?${query}` : ''}`, {
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
    const queryParams = new URLSearchParams();
    if (params.per_page) queryParams.set('per_page', String(params.per_page));
    if (params.page) queryParams.set('page', String(params.page));
    if (params.search) queryParams.set('search', params.search);

    const query = queryParams.toString();
    return this.makeRequest<WPPage[]>(`/pages${query ? `?${query}` : ''}`);
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

  async deletePage(id: number, force: boolean = false): Promise<any> {
    const queryParams = new URLSearchParams();
    if (force) queryParams.set('force', 'true');

    const query = queryParams.toString();
    return this.makeRequest(`/pages/${id}${query ? `?${query}` : ''}`, {
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
    const queryParams = new URLSearchParams();
    if (params.per_page) queryParams.set('per_page', String(params.per_page));
    if (params.page) queryParams.set('page', String(params.page));
    if (params.media_type) queryParams.set('media_type', params.media_type);

    const query = queryParams.toString();
    return this.makeRequest<WPMedia[]>(`/media${query ? `?${query}` : ''}`);
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
    // Fetch the media file from URL
    const mediaResponse = await fetch(params.url);
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

    // Upload to WordPress
    const uploadUrl = `${this.baseUrl}/wp-json/wp/v2/media`;
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
      },
      body: formData,
    });

    if (!response.ok) {
      let errorData: WPErrorResponse;
      try {
        errorData = await response.json();
      } catch {
        throw new MCPError(
          MCPErrorCodes.WORDPRESS_API_ERROR,
          `Media upload failed: ${response.status} ${response.statusText}`
        );
      }

      throw new MCPError(
        MCPErrorCodes.WORDPRESS_API_ERROR,
        `Media upload failed: ${errorData.message}`,
        errorData
      );
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

    // Upload to WordPress
    const uploadUrl = `${this.baseUrl}/wp-json/wp/v2/media`;
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
      },
      body: formData,
    });

    if (!response.ok) {
      let errorData: WPErrorResponse;
      try {
        errorData = await response.json();
      } catch {
        throw new MCPError(
          MCPErrorCodes.WORDPRESS_API_ERROR,
          `Media upload failed: ${response.status} ${response.statusText}`
        );
      }

      throw new MCPError(
        MCPErrorCodes.WORDPRESS_API_ERROR,
        `Media upload failed: ${errorData.message}`,
        errorData
      );
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
    const queryParams = new URLSearchParams();
    if (params.per_page) queryParams.set('per_page', String(params.per_page));
    if (params.page) queryParams.set('page', String(params.page));
    if (params.search) queryParams.set('search', params.search);

    const query = queryParams.toString();
    return this.makeRequest<WPCategory[]>(`/categories${query ? `?${query}` : ''}`);
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
    const queryParams = new URLSearchParams();
    if (force) queryParams.set('force', 'true');

    const query = queryParams.toString();
    return this.makeRequest(`/categories/${id}${query ? `?${query}` : ''}`, {
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
    const queryParams = new URLSearchParams();
    if (params.per_page) queryParams.set('per_page', String(params.per_page));
    if (params.page) queryParams.set('page', String(params.page));
    if (params.search) queryParams.set('search', params.search);

    const query = queryParams.toString();
    return this.makeRequest<WPTag[]>(`/tags${query ? `?${query}` : ''}`);
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
    const queryParams = new URLSearchParams();
    if (params.per_page) queryParams.set('per_page', String(params.per_page));
    if (params.page) queryParams.set('page', String(params.page));
    if (params.post) queryParams.set('post', String(params.post));
    if (params.status) queryParams.set('status', params.status);

    const query = queryParams.toString();
    return this.makeRequest<WPComment[]>(`/comments${query ? `?${query}` : ''}`);
  }

  async updateCommentStatus(id: number, status: 'approved' | 'pending' | 'spam' | 'trash'): Promise<WPComment> {
    return this.makeRequest<WPComment>(`/comments/${id}`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  }

  async deleteComment(id: number, force: boolean = false): Promise<{ deleted: boolean; previous: WPComment }> {
    const queryParams = new URLSearchParams();
    if (force) queryParams.set('force', 'true');

    const query = queryParams.toString();
    return this.makeRequest(`/comments/${id}${query ? `?${query}` : ''}`, {
      method: 'DELETE',
    });
  }
}
