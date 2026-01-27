/**
 * API Key Service
 * Generate, hash, and validate API keys
 */

import { GeneratedApiKey, ApiKey } from './types';

// =============================================================================
// Constants
// =============================================================================

const API_KEY_PREFIX = 'wp_mcp';
const API_KEY_LENGTH = 32;  // Random part length

// =============================================================================
// Key Generation
// =============================================================================

/**
 * Generate a cryptographically secure random string
 */
function generateRandomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues)
    .map((v) => chars[v % chars.length])
    .join('');
}

/**
 * Generate a new API key
 * Format: wp_mcp_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 */
export async function generateApiKey(environment: 'live' | 'test' = 'live'): Promise<GeneratedApiKey> {
  const randomPart = generateRandomString(API_KEY_LENGTH);
  const key = `${API_KEY_PREFIX}_${environment}_${randomPart}`;
  const keyPrefix = `${API_KEY_PREFIX}_${environment}_${randomPart.substring(0, 8)}`;
  const keyHash = await hashApiKey(key);

  return {
    key,
    keyPrefix,
    keyHash,
  };
}

/**
 * Hash an API key using SHA-256
 */
export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// =============================================================================
// Key Validation
// =============================================================================

/**
 * Validate API key format
 */
export function isValidApiKeyFormat(key: string): boolean {
  // Format: wp_mcp_{live|test}_{32 chars}
  const pattern = /^wp_mcp_(live|test)_[a-z0-9]{32}$/;
  return pattern.test(key);
}

/**
 * Extract environment from API key
 */
export function getApiKeyEnvironment(key: string): 'live' | 'test' | null {
  const match = key.match(/^wp_mcp_(live|test)_/);
  return match ? (match[1] as 'live' | 'test') : null;
}

// =============================================================================
// Database Operations
// =============================================================================

/**
 * Find API key by hash
 */
export async function findApiKeyByHash(
  db: D1Database,
  keyHash: string
): Promise<ApiKey | null> {
  const result = await db
    .prepare('SELECT * FROM api_keys WHERE key_hash = ? AND is_active = 1')
    .bind(keyHash)
    .first<ApiKey>();
  return result;
}

/**
 * Find API key by key (hashes and looks up)
 */
export async function findApiKeyByKey(
  db: D1Database,
  key: string
): Promise<ApiKey | null> {
  if (!isValidApiKeyFormat(key)) {
    return null;
  }
  const keyHash = await hashApiKey(key);
  return findApiKeyByHash(db, keyHash);
}

/**
 * Create a new API key for a customer
 */
export async function createApiKey(
  db: D1Database,
  customerId: string,
  name: string = 'Default',
  environment: 'live' | 'test' = 'live'
): Promise<{ apiKey: ApiKey; fullKey: string }> {
  const { key, keyPrefix, keyHash } = await generateApiKey(environment);
  const id = crypto.randomUUID();

  await db
    .prepare(
      `INSERT INTO api_keys (id, customer_id, key_hash, key_prefix, name, permissions, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))`
    )
    .bind(id, customerId, keyHash, keyPrefix, name, '["*"]')
    .run();

  const apiKey = await db
    .prepare('SELECT * FROM api_keys WHERE id = ?')
    .bind(id)
    .first<ApiKey>();

  return {
    apiKey: apiKey!,
    fullKey: key,  // Only returned once, not stored
  };
}

/**
 * List API keys for a customer (without hash)
 */
export async function listApiKeys(
  db: D1Database,
  customerId: string
): Promise<Omit<ApiKey, 'key_hash'>[]> {
  const results = await db
    .prepare(
      `SELECT id, customer_id, key_prefix, name, permissions, is_active, last_used_at, created_at, expires_at
       FROM api_keys WHERE customer_id = ? ORDER BY created_at DESC`
    )
    .bind(customerId)
    .all<Omit<ApiKey, 'key_hash'>>();
  return results.results;
}

/**
 * Revoke (deactivate) an API key
 */
export async function revokeApiKey(
  db: D1Database,
  apiKeyId: string,
  customerId: string
): Promise<boolean> {
  const result = await db
    .prepare('UPDATE api_keys SET is_active = 0 WHERE id = ? AND customer_id = ?')
    .bind(apiKeyId, customerId)
    .run();
  return result.meta.changes > 0;
}

/**
 * Update last used timestamp
 */
export async function updateApiKeyLastUsed(
  db: D1Database,
  apiKeyId: string
): Promise<void> {
  await db
    .prepare("UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?")
    .bind(apiKeyId)
    .run();
}

/**
 * Delete an API key permanently
 */
export async function deleteApiKey(
  db: D1Database,
  apiKeyId: string,
  customerId: string
): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM api_keys WHERE id = ? AND customer_id = ?')
    .bind(apiKeyId, customerId)
    .run();
  return result.meta.changes > 0;
}
