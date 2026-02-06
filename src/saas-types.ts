/**
 * SaaS Platform - Type Definitions
 * Adapted from n8n-management-mcp template for WordPress MCP
 */

// ============================================
// Database Entities
// ============================================

export interface User {
  id: string;
  email: string;
  password_hash: string;
  oauth_provider?: string | null;
  oauth_id?: string | null;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  status: 'active' | 'suspended' | 'deleted';
  stripe_customer_id: string | null;
  is_admin?: number;
  created_at: string;
  updated_at: string;
}

export interface WordPressConnection {
  id: string;
  user_id: string;
  name: string;
  wp_url: string;
  wp_username_encrypted: string;
  wp_password_encrypted: string;
  imgbb_api_key_encrypted: string | null;
  status: 'active' | 'inactive' | 'error';
  last_tested_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  connection_id: string;
  key_hash: string;
  key_prefix: string;
  name: string;
  status: 'active' | 'revoked';
  last_used_at: string | null;
  created_at: string;
}

export interface UsageLog {
  id: string;
  user_id: string;
  api_key_id: string;
  connection_id: string;
  tool_name: string;
  status: 'success' | 'error' | 'rate_limited';
  response_time_ms: number | null;
  error_message: string | null;
  created_at: string;
}

export interface UsageMonthly {
  id: string;
  user_id: string;
  year_month: string;
  request_count: number;
  success_count: number;
  error_count: number;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  name: string;
  monthly_request_limit: number;
  max_connections: number;
  price_monthly: number;
  features: string; // JSON string
  is_active: number;
  created_at: string;
}

// ============================================
// WordPress REST API Types
// ============================================

export interface WordPressCredentials {
  url: string;
  username: string;
  password: string;
}

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
  title: { rendered: string };
  content: { rendered: string; protected: boolean };
  excerpt: { rendered: string; protected: boolean };
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
  title: { rendered: string };
  content: { rendered: string; protected: boolean };
  author: number;
  featured_media: number;
  parent: number;
  menu_order: number;
  comment_status: string;
  ping_status: string;
  template: string;
}

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
  title: { rendered: string };
  author: number;
  caption: { rendered: string };
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

export interface WPComment {
  id: number;
  post: number;
  parent: number;
  author: number;
  author_name: string;
  author_url: string;
  date: string;
  date_gmt: string;
  content: { rendered: string };
  link: string;
  status: 'approved' | 'pending' | 'spam' | 'trash';
  type: string;
  author_avatar_urls: Record<string, string>;
}

export interface CreatePostData {
  title: string;
  content: string;
  status?: 'publish' | 'draft' | 'pending' | 'private';
  excerpt?: string;
  featured_media?: number;
}

export interface UpdatePostData {
  title?: string;
  content?: string;
  status?: 'publish' | 'draft' | 'pending' | 'private';
  excerpt?: string;
  featured_media?: number;
}

export interface CreatePageData {
  title: string;
  content: string;
  status?: 'publish' | 'draft' | 'pending' | 'private';
}

export interface UpdatePageData {
  title?: string;
  content?: string;
  status?: 'publish' | 'draft' | 'pending' | 'private';
}

export interface CreateCategoryData {
  name: string;
  description?: string;
  slug?: string;
  parent?: number;
}

export interface CreateTagData {
  name: string;
  description?: string;
  slug?: string;
}

export interface WPErrorResponse {
  code: string;
  message: string;
  data?: { status: number; params?: Record<string, any> };
}

// ============================================
// ImgBB Types
// ============================================

export interface ImgBBUploadResponse {
  data: {
    url: string;
    display_url: string;
    thumb: { url: string };
    medium?: { url: string };
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

// ============================================
// API Request/Response Types
// ============================================

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: { id: string; email: string; plan: string };
  error?: string;
}

export interface CreateConnectionRequest {
  name: string;
  wp_url: string;
  wp_username: string;
  wp_password: string;
  imgbb_api_key?: string;
}

export interface ConnectionResponse {
  id: string;
  name: string;
  wp_url: string;
  status: string;
  api_key?: string;
  api_key_prefix?: string;
  created_at: string;
}

export interface UsageResponse {
  plan: string;
  limit: number;
  used: number;
  remaining: number;
  reset_at: string;
  connections: number;
  max_connections: number;
}

// ============================================
// Auth Context (passed through middleware)
// ============================================

export interface AuthContext {
  user: {
    id: string;
    email: string;
    plan: 'free' | 'starter' | 'pro' | 'enterprise';
  };
  connection: {
    id: string;
    wp_url: string;
    wp_username: string;
    wp_password: string; // Decrypted
    imgbb_api_key: string | null; // Decrypted
  };
  apiKey: {
    id: string;
  };
  usage: {
    current: number;
    limit: number;
    remaining: number;
  };
}

// ============================================
// Cloudflare Workers Environment
// ============================================

export interface Env {
  // D1 Database
  DB: D1Database;

  // KV Namespace for rate limiting cache
  RATE_LIMIT_KV: KVNamespace;

  // Secrets
  JWT_SECRET: string;
  ENCRYPTION_KEY: string;

  // WordPress (single-tenant fallback)
  WORDPRESS_URL?: string;
  WORDPRESS_USERNAME?: string;
  WORDPRESS_APP_PASSWORD?: string;

  // OAuth - GitHub
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;

  // OAuth - Google
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;

  // App URL (for OAuth redirect)
  APP_URL?: string;

  // Stripe Billing
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_STARTER?: string;
  STRIPE_PRICE_PRO?: string;
  STRIPE_PRICE_ENTERPRISE?: string;

  // Optional
  ENVIRONMENT?: 'development' | 'staging' | 'production';
}

// ============================================
// API Response Wrapper
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    request_id: string;
    timestamp: string;
  };
}

// ============================================
// Rate Limit Info (for response headers)
// ============================================

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: string;
}
