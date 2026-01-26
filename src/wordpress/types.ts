/**
 * WordPress REST API Type Definitions
 */

export interface WordPressCredentials {
  url: string;
  username: string;
  password: string;
}

/**
 * WordPress Post
 */
export interface WPPost {
  id: number;
  date: string;
  date_gmt: string;
  modified: string;
  modified_gmt: string;
  slug: string;
  status: 'publish' | 'draft' | 'pending' | 'private' | 'trash';
  type: string;
  link: string;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
    protected: boolean;
  };
  excerpt: {
    rendered: string;
    protected: boolean;
  };
  author: number;
  featured_media: number;
  comment_status: string;
  ping_status: string;
  sticky: boolean;
  template: string;
  format: string;
  categories: number[];
  tags: number[];
}

/**
 * WordPress Page
 */
export interface WPPage {
  id: number;
  date: string;
  date_gmt: string;
  modified: string;
  modified_gmt: string;
  slug: string;
  status: 'publish' | 'draft' | 'pending' | 'private' | 'trash';
  type: string;
  link: string;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
    protected: boolean;
  };
  author: number;
  featured_media: number;
  parent: number;
  menu_order: number;
  comment_status: string;
  ping_status: string;
  template: string;
}

/**
 * WordPress Media
 */
export interface WPMedia {
  id: number;
  date: string;
  date_gmt: string;
  modified: string;
  modified_gmt: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: {
    rendered: string;
  };
  author: number;
  caption: {
    rendered: string;
  };
  alt_text: string;
  media_type: 'image' | 'video' | 'audio' | 'application';
  mime_type: string;
  media_details: {
    width?: number;
    height?: number;
    file?: string;
    sizes?: Record<string, any>;
  };
  source_url: string;
}

/**
 * Create Post Data
 */
export interface CreatePostData {
  title: string;
  content: string;
  status?: 'publish' | 'draft' | 'pending' | 'private';
  excerpt?: string;
  featured_media?: number;
}

/**
 * Update Post Data
 */
export interface UpdatePostData {
  title?: string;
  content?: string;
  status?: 'publish' | 'draft' | 'pending' | 'private';
  excerpt?: string;
  featured_media?: number;
}

/**
 * Create Page Data
 */
export interface CreatePageData {
  title: string;
  content: string;
  status?: 'publish' | 'draft' | 'pending' | 'private';
}

/**
 * Update Page Data
 */
export interface UpdatePageData {
  title?: string;
  content?: string;
  status?: 'publish' | 'draft' | 'pending' | 'private';
}

/**
 * WordPress Category
 */
export interface WPCategory {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  taxonomy: string;
  parent: number;
  meta: any[];
}

/**
 * WordPress Tag
 */
export interface WPTag {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  taxonomy: string;
  meta: any[];
}

/**
 * WordPress Comment
 */
export interface WPComment {
  id: number;
  post: number;
  parent: number;
  author: number;
  author_name: string;
  author_url: string;
  date: string;
  date_gmt: string;
  content: {
    rendered: string;
  };
  link: string;
  status: 'approved' | 'pending' | 'spam' | 'trash';
  type: string;
  author_avatar_urls: Record<string, string>;
}

/**
 * Create Category Data
 */
export interface CreateCategoryData {
  name: string;
  description?: string;
  slug?: string;
  parent?: number;
}

/**
 * Create Tag Data
 */
export interface CreateTagData {
  name: string;
  description?: string;
  slug?: string;
}

/**
 * WordPress API Error Response
 */
export interface WPErrorResponse {
  code: string;
  message: string;
  data?: {
    status: number;
    params?: Record<string, any>;
  };
}
