/**
 * WordPress REST API Client & ImgBB Client
 * Consolidated client for WordPress operations and image hosting.
 * Uses plain Error objects (no MCPError dependency).
 */

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
  ImgBBUploadResponse,
  ImgBBUploadResult,
} from './saas-types';

// ============================================
// Constants
// ============================================

const REQUEST_TIMEOUT_MS = 30000;

const FORBIDDEN_HOSTNAMES = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '169.254.169.254', // AWS metadata
  '169.254.170.2',   // AWS ECS metadata
  'metadata.google.internal', // GCP metadata
];

// ============================================
// Utility Functions
// ============================================

/**
 * Remove spaces from WordPress Application Password.
 * WordPress displays passwords with spaces for readability,
 * but HTTP Basic Auth does not support spaces.
 */
export function cleanApplicationPassword(password: string): string {
  return password.replace(/\s+/g, '');
}

/**
 * Create HTTP Basic Authentication header.
 */
export function createAuthHeader(username: string, password: string): string {
  const cleanPassword = cleanApplicationPassword(password);
  const credentials = `${username}:${cleanPassword}`;
  const encoded = btoa(credentials);
  return `Basic ${encoded}`;
}

/**
 * Validate and clean WordPress URL.
 * Ensures the URL uses http/https and strips trailing slashes.
 */
export function validateWordPressUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol');
    }
    // Remove trailing slash to prevent double slashes in API URLs
    return url.replace(/\/+$/, '');
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid protocol') {
      throw new Error(`Invalid WordPress URL: ${url} - must use http or https`);
    }
    throw new Error(`Invalid WordPress URL: ${url}`);
  }
}

/**
 * Check if hostname is a private/internal IP.
 */
function isPrivateIP(hostname: string): boolean {
  if (hostname.startsWith('10.')) return true;
  if (hostname.startsWith('192.168.')) return true;
  if (hostname.startsWith('172.')) {
    const secondOctet = parseInt(hostname.split('.')[1], 10);
    if (secondOctet >= 16 && secondOctet <= 31) return true;
  }
  if (hostname.startsWith('fc') || hostname.startsWith('fd')) return true;
  if (hostname === '::1') return true;
  return false;
}

/**
 * Validate URL for external fetch (SSRF protection).
 * Ensures the URL uses http/https and does not point to internal addresses.
 */
function validateExternalUrl(url: string, fieldName: string): string {
  try {
    const parsed = new URL(url);

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error(`${fieldName} must use http or https protocol`);
    }

    const hostname = parsed.hostname.toLowerCase();
    if (FORBIDDEN_HOSTNAMES.includes(hostname)) {
      throw new Error(`${fieldName} cannot point to internal/localhost addresses`);
    }

    if (isPrivateIP(hostname)) {
      throw new Error(`${fieldName} cannot point to private IP addresses`);
    }

    return url;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith(fieldName)) {
      throw error;
    }
    throw new Error(`${fieldName} must be a valid URL`);
  }
}

// ============================================
// WordPressClient
// ============================================

export class WordPressClient {
  private baseUrl: string;
  private authHeader: string;

  constructor(credentials: WordPressCredentials) {
    this.baseUrl = validateWordPressUrl(credentials.url);
    this.authHeader = createAuthHeader(credentials.username, credentials.password);
  }

  /**
   * Build query string from params object.
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
   * Fetch with timeout support.
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
        throw new Error(`Request timeout after ${timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Handle error response from WordPress API.
   */
  private async handleErrorResponse(response: Response, context: string): Promise<never> {
    let errorData: WPErrorResponse;
    try {
      errorData = await response.json() as WPErrorResponse;
    } catch {
      throw new Error(`${context}: ${response.status} ${response.statusText}`);
    }

    throw new Error(`${context}: ${errorData.message}`);
  }

  /**
   * Make a WordPress REST API request.
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

    return response.json() as Promise<T>;
  }

  // ------------------------------------------
  // Posts API
  // ------------------------------------------

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

  // ------------------------------------------
  // Pages API
  // ------------------------------------------

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

  // ------------------------------------------
  // Media API
  // ------------------------------------------

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
    // SSRF protection: validate URL scheme and block internal IPs
    validateExternalUrl(params.url, 'url');

    // Fetch the media file from URL with timeout
    const mediaResponse = await this.fetchWithTimeout(params.url);
    if (!mediaResponse.ok) {
      throw new Error(`Failed to fetch media from URL: ${params.url}`);
    }

    const mediaBlob = await mediaResponse.blob();
    const filename = params.url.split('/').pop() || 'upload';

    // Create form data
    const formData = new FormData();
    formData.append('file', mediaBlob, filename);
    if (params.title) formData.append('title', params.title);
    if (params.alt_text) formData.append('alt_text', params.alt_text);
    if (params.caption) formData.append('caption', params.caption);

    // Upload to WordPress (no Content-Type header - FormData sets its own boundary)
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

    return response.json() as Promise<WPMedia>;
  }

  async uploadMediaFromBase64(params: {
    base64: string;
    fileName: string;
    mimeType: string;
    title?: string;
    alt_text?: string;
    caption?: string;
  }): Promise<WPMedia> {
    // Strip data URI prefix if present
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

    // Upload to WordPress (no Content-Type header - FormData sets its own boundary)
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

    return response.json() as Promise<WPMedia>;
  }

  // ------------------------------------------
  // Categories API
  // ------------------------------------------

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

  // ------------------------------------------
  // Tags API
  // ------------------------------------------

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

  // ------------------------------------------
  // Comments API
  // ------------------------------------------

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

// ============================================
// ImgBBClient
// ============================================

export class ImgBBClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Upload an image to ImgBB from base64 data.
   */
  async uploadFromBase64(params: {
    base64: string;
    name?: string;
    expiration?: number;
  }): Promise<ImgBBUploadResult> {
    // Strip data URI prefix if present
    const base64Data = params.base64.replace(/^data:[^;]+;base64,/, '');

    const formData = new FormData();
    formData.append('key', this.apiKey);
    formData.append('image', base64Data);
    if (params.name) formData.append('name', params.name);
    if (params.expiration) formData.append('expiration', String(params.expiration));

    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`ImgBB upload failed: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as ImgBBUploadResponse;

    if (!result.success) {
      throw new Error('ImgBB upload failed: API returned success=false');
    }

    return {
      originalContentUrl: result.data.url,
      previewImageUrl: result.data.thumb?.url || result.data.display_url,
      displayUrl: result.data.display_url,
      deleteUrl: result.data.delete_url,
    };
  }
}
