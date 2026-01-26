/**
 * ImgBB Storage Client
 * Upload images to ImgBB and get public URLs
 */

import { MCPError, MCPErrorCodes } from '../utils/errors';

export interface ImgBBUploadResponse {
  data: {
    url: string;
    display_url: string;
    thumb: {
      url: string;
    };
    medium?: {
      url: string;
    };
    delete_url: string;
  };
  success: boolean;
  status: number;
}

export interface ImgBBUploadResult {
  originalContentUrl: string;
  previewImageUrl: string;
  displayUrl: string;
  deleteUrl: string;
}

export class ImgBBClient {
  private apiKey: string;
  private baseUrl = 'https://api.imgbb.com/1';

  constructor(apiKey: string) {
    this.apiKey = apiKey.trim();
  }

  /**
   * Upload image to ImgBB from base64 data
   */
  async uploadFromBase64(params: {
    base64: string;
    name?: string;
    expiration?: number; // seconds (60-15552000)
  }): Promise<ImgBBUploadResult> {
    // Remove data URI prefix if present
    const base64Data = params.base64.replace(/^data:image\/[^;]+;base64,/, '');

    // Create form data
    const formData = new FormData();
    formData.append('key', this.apiKey);
    formData.append('image', base64Data);
    if (params.name) formData.append('name', params.name);
    if (params.expiration) formData.append('expiration', String(params.expiration));

    // Upload to ImgBB
    const response = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      let errorData: any;
      try {
        errorData = await response.json();
      } catch {
        throw new MCPError(
          MCPErrorCodes.WORDPRESS_API_ERROR,
          `ImgBB upload failed: ${response.status} ${response.statusText}`
        );
      }

      throw new MCPError(
        MCPErrorCodes.WORDPRESS_API_ERROR,
        `ImgBB upload failed: ${errorData.error?.message || 'Unknown error'}`,
        errorData
      );
    }

    const data: ImgBBUploadResponse = await response.json();

    if (!data.success) {
      throw new MCPError(
        MCPErrorCodes.WORDPRESS_API_ERROR,
        'ImgBB upload failed: API returned success=false'
      );
    }

    return {
      originalContentUrl: data.data.url,
      previewImageUrl: data.data.thumb.url,
      displayUrl: data.data.display_url,
      deleteUrl: data.data.delete_url,
    };
  }
}
