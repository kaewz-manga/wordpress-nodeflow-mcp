/**
 * WordPress Authentication Utilities
 */

import { Env } from '../index';
import { MCPError, MCPErrorCodes } from '../utils/errors';
import { WordPressCredentials } from './types';

/**
 * Remove spaces from WordPress Application Password
 * WordPress displays passwords with spaces for readability,
 * but HTTP Basic Auth doesn't support spaces
 */
function cleanApplicationPassword(password: string): string {
  return password.replace(/\s+/g, '');
}

/**
 * Create HTTP Basic Authentication header
 */
export function createAuthHeader(username: string, password: string): string {
  const cleanPassword = cleanApplicationPassword(password);
  const credentials = `${username}:${cleanPassword}`;
  const encoded = btoa(credentials);
  return `Basic ${encoded}`;
}

/**
 * Get WordPress credentials from request headers or environment
 * Priority: Headers (multi-tenant) > Environment (single-tenant)
 */
export function getCredentials(request: Request, env: Env): WordPressCredentials {
  // Check headers first (multi-tenant mode)
  const headerUrl = request.headers.get('x-wordpress-url');
  const headerUsername = request.headers.get('x-wordpress-username');
  const headerPassword = request.headers.get('x-wordpress-password');

  if (headerUrl && headerUsername && headerPassword) {
    return {
      url: headerUrl.trim(),
      username: headerUsername.trim(),
      password: headerPassword.trim(),
    };
  }

  // Fallback to environment variables (single-tenant mode)
  if (env.WORDPRESS_URL && env.WORDPRESS_USERNAME && env.WORDPRESS_APP_PASSWORD) {
    return {
      url: env.WORDPRESS_URL.trim(),
      username: env.WORDPRESS_USERNAME.trim(),
      password: env.WORDPRESS_APP_PASSWORD.trim(),
    };
  }

  // No credentials found
  throw new MCPError(
    MCPErrorCodes.NO_CREDENTIALS,
    'No WordPress credentials provided. Set environment variables or use x-wordpress-* headers.'
  );
}

/**
 * Validate WordPress URL format
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
    throw new MCPError(
      MCPErrorCodes.INVALID_CREDENTIALS,
      `Invalid WordPress URL: ${url}`
    );
  }
}
