/**
 * API Keys Management Endpoints
 * GET /api/keys - List all API keys
 * POST /api/keys - Create new API key
 * DELETE /api/keys/:id - Revoke API key
 */

import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  deleteApiKey,
} from '../saas/api-keys';
import { verifyAuthToken } from './auth';
import {
  errorResponse,
  successResponse,
  parseJsonBody,
} from './utils';

// =============================================================================
// Types
// =============================================================================

interface CreateKeyRequest {
  name?: string;
  environment?: 'live' | 'test';
}

// =============================================================================
// Handlers
// =============================================================================

/**
 * GET /api/keys
 * List all API keys for the authenticated user
 */
export async function handleListKeys(
  request: Request,
  db: D1Database
): Promise<Response> {
  // Verify auth
  const auth = await verifyAuthToken(request);
  if (!auth.valid) {
    return auth.error!;
  }

  // Get keys
  const keys = await listApiKeys(db, auth.customerId!);

  return successResponse({
    keys: keys.map((key) => ({
      id: key.id,
      name: key.name,
      keyPrefix: key.key_prefix,
      isActive: !!key.is_active,
      lastUsedAt: key.last_used_at,
      createdAt: key.created_at,
      expiresAt: key.expires_at,
    })),
    total: keys.length,
  });
}

/**
 * POST /api/keys
 * Create a new API key
 */
export async function handleCreateKey(
  request: Request,
  db: D1Database
): Promise<Response> {
  // Verify auth
  const auth = await verifyAuthToken(request);
  if (!auth.valid) {
    return auth.error!;
  }

  // Parse body
  const body = await parseJsonBody<CreateKeyRequest>(request);
  const name = body?.name || 'API Key';
  const environment = body?.environment || 'live';

  // Validate environment
  if (!['live', 'test'].includes(environment)) {
    return errorResponse('Environment must be "live" or "test"', 400, 'INVALID_ENVIRONMENT');
  }

  // Create key
  const { apiKey, fullKey } = await createApiKey(db, auth.customerId!, name, environment);

  return successResponse(
    {
      key: {
        id: apiKey.id,
        name: apiKey.name,
        keyPrefix: apiKey.key_prefix,
        fullKey,  // Only shown once!
        isActive: !!apiKey.is_active,
        createdAt: apiKey.created_at,
      },
      warning: 'Save this key now. You will not be able to see it again.',
    },
    'API key created successfully'
  );
}

/**
 * DELETE /api/keys/:id
 * Revoke (deactivate) an API key
 */
export async function handleRevokeKey(
  request: Request,
  db: D1Database,
  keyId: string
): Promise<Response> {
  // Verify auth
  const auth = await verifyAuthToken(request);
  if (!auth.valid) {
    return auth.error!;
  }

  if (!keyId) {
    return errorResponse('Key ID is required', 400, 'MISSING_KEY_ID');
  }

  // Revoke key
  const success = await revokeApiKey(db, keyId, auth.customerId!);
  if (!success) {
    return errorResponse('API key not found or already revoked', 404, 'KEY_NOT_FOUND');
  }

  return successResponse(
    { id: keyId, revoked: true },
    'API key revoked successfully'
  );
}

/**
 * DELETE /api/keys/:id?permanent=true
 * Permanently delete an API key
 */
export async function handleDeleteKey(
  request: Request,
  db: D1Database,
  keyId: string
): Promise<Response> {
  // Verify auth
  const auth = await verifyAuthToken(request);
  if (!auth.valid) {
    return auth.error!;
  }

  if (!keyId) {
    return errorResponse('Key ID is required', 400, 'MISSING_KEY_ID');
  }

  // Delete key
  const success = await deleteApiKey(db, keyId, auth.customerId!);
  if (!success) {
    return errorResponse('API key not found', 404, 'KEY_NOT_FOUND');
  }

  return successResponse(
    { id: keyId, deleted: true },
    'API key deleted permanently'
  );
}
