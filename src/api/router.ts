/**
 * API Router
 * Routes all /api/* requests to appropriate handlers
 */

import { handleRegister, handleLogin, handleGetMe } from './auth';
import { handleListKeys, handleCreateKey, handleRevokeKey, handleDeleteKey } from './keys';
import { handleGetUsage, handleGetUsageHistory, handleGetUsageLogs, handleGetToolUsage } from './usage';
import { errorResponse, getQueryParam } from './utils';

// =============================================================================
// Router
// =============================================================================

/**
 * Handle all /api/* routes
 */
export async function handleApiRequest(
  request: Request,
  db: D1Database
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // ==========================================================================
  // Auth Routes
  // ==========================================================================

  // POST /api/auth/register
  if (path === '/api/auth/register' && method === 'POST') {
    return handleRegister(request, db);
  }

  // POST /api/auth/login
  if (path === '/api/auth/login' && method === 'POST') {
    return handleLogin(request, db);
  }

  // GET /api/auth/me
  if (path === '/api/auth/me' && method === 'GET') {
    return handleGetMe(request, db);
  }

  // ==========================================================================
  // API Keys Routes
  // ==========================================================================

  // GET /api/keys
  if (path === '/api/keys' && method === 'GET') {
    return handleListKeys(request, db);
  }

  // POST /api/keys
  if (path === '/api/keys' && method === 'POST') {
    return handleCreateKey(request, db);
  }

  // DELETE /api/keys/:id
  const keysDeleteMatch = path.match(/^\/api\/keys\/([a-zA-Z0-9-]+)$/);
  if (keysDeleteMatch && method === 'DELETE') {
    const keyId = keysDeleteMatch[1];
    const permanent = getQueryParam(url, 'permanent') === 'true';

    if (permanent) {
      return handleDeleteKey(request, db, keyId);
    }
    return handleRevokeKey(request, db, keyId);
  }

  // ==========================================================================
  // Usage Routes
  // ==========================================================================

  // GET /api/usage
  if (path === '/api/usage' && method === 'GET') {
    return handleGetUsage(request, db);
  }

  // GET /api/usage/history
  if (path === '/api/usage/history' && method === 'GET') {
    return handleGetUsageHistory(request, db);
  }

  // GET /api/usage/logs
  if (path === '/api/usage/logs' && method === 'GET') {
    return handleGetUsageLogs(request, db);
  }

  // GET /api/usage/tools
  if (path === '/api/usage/tools' && method === 'GET') {
    return handleGetToolUsage(request, db);
  }

  // ==========================================================================
  // Not Found
  // ==========================================================================

  return errorResponse(`API endpoint not found: ${method} ${path}`, 404, 'NOT_FOUND');
}

/**
 * API Documentation endpoint
 * GET /api
 */
export function handleApiDocs(): Response {
  return new Response(
    JSON.stringify({
      name: 'WordPress MCP SaaS API',
      version: '1.0.0',
      endpoints: {
        auth: {
          'POST /api/auth/register': 'Create new account',
          'POST /api/auth/login': 'Login and get JWT token',
          'GET /api/auth/me': 'Get current user info (requires auth)',
        },
        keys: {
          'GET /api/keys': 'List all API keys (requires auth)',
          'POST /api/keys': 'Create new API key (requires auth)',
          'DELETE /api/keys/:id': 'Revoke API key (requires auth)',
          'DELETE /api/keys/:id?permanent=true': 'Delete API key permanently (requires auth)',
        },
        usage: {
          'GET /api/usage': 'Get usage summary (requires auth)',
          'GET /api/usage/history?days=30': 'Get daily usage history (requires auth)',
          'GET /api/usage/logs?limit=100': 'Get recent request logs (requires auth)',
          'GET /api/usage/tools?days=30': 'Get tool usage breakdown (requires auth)',
        },
      },
      authentication: {
        type: 'Bearer Token',
        header: 'Authorization: Bearer <jwt_token>',
        note: 'Get token from /api/auth/login or /api/auth/register',
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
