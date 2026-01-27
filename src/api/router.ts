/**
 * API Router
 * Routes all /api/* requests to appropriate handlers
 */

import { handleRegister, handleLogin, handleGetMe } from './auth';
import { handleListKeys, handleCreateKey, handleRevokeKey, handleDeleteKey } from './keys';
import { handleGetUsage, handleGetUsageHistory, handleGetUsageLogs, handleGetToolUsage } from './usage';
import {
  handleGoogleAuth,
  handleGitHubAuth,
  handleGoogleCallback,
  handleGitHubCallback,
  handleGetProviders,
} from './oauth-handlers';
import { errorResponse, getQueryParam } from './utils';

// =============================================================================
// Types
// =============================================================================

export interface ApiEnv {
  DB: D1Database;
  RATE_LIMIT: KVNamespace;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
}

// =============================================================================
// Router
// =============================================================================

/**
 * Handle all /api/* routes
 */
export async function handleApiRequest(
  request: Request,
  env: ApiEnv
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // ==========================================================================
  // OAuth Routes
  // ==========================================================================

  // GET /api/auth/providers - List available OAuth providers
  if (path === '/api/auth/providers' && method === 'GET') {
    return handleGetProviders(env);
  }

  // GET /api/auth/google - Initiate Google OAuth
  if (path === '/api/auth/google' && method === 'GET') {
    return handleGoogleAuth(request, env);
  }

  // GET /api/auth/github - Initiate GitHub OAuth
  if (path === '/api/auth/github' && method === 'GET') {
    return handleGitHubAuth(request, env);
  }

  // GET /api/auth/callback/google - Google OAuth callback
  if (path === '/api/auth/callback/google' && method === 'GET') {
    return handleGoogleCallback(request, env);
  }

  // GET /api/auth/callback/github - GitHub OAuth callback
  if (path === '/api/auth/callback/github' && method === 'GET') {
    return handleGitHubCallback(request, env);
  }

  // ==========================================================================
  // Auth Routes
  // ==========================================================================

  // POST /api/auth/register
  if (path === '/api/auth/register' && method === 'POST') {
    return handleRegister(request, env.DB);
  }

  // POST /api/auth/login
  if (path === '/api/auth/login' && method === 'POST') {
    return handleLogin(request, env.DB);
  }

  // GET /api/auth/me
  if (path === '/api/auth/me' && method === 'GET') {
    return handleGetMe(request, env.DB);
  }

  // ==========================================================================
  // API Keys Routes
  // ==========================================================================

  // GET /api/keys
  if (path === '/api/keys' && method === 'GET') {
    return handleListKeys(request, env.DB);
  }

  // POST /api/keys
  if (path === '/api/keys' && method === 'POST') {
    return handleCreateKey(request, env.DB);
  }

  // DELETE /api/keys/:id
  const keysDeleteMatch = path.match(/^\/api\/keys\/([a-zA-Z0-9-]+)$/);
  if (keysDeleteMatch && method === 'DELETE') {
    const keyId = keysDeleteMatch[1];
    const permanent = getQueryParam(url, 'permanent') === 'true';

    if (permanent) {
      return handleDeleteKey(request, env.DB, keyId);
    }
    return handleRevokeKey(request, env.DB, keyId);
  }

  // ==========================================================================
  // Usage Routes
  // ==========================================================================

  // GET /api/usage
  if (path === '/api/usage' && method === 'GET') {
    return handleGetUsage(request, env.DB);
  }

  // GET /api/usage/history
  if (path === '/api/usage/history' && method === 'GET') {
    return handleGetUsageHistory(request, env.DB);
  }

  // GET /api/usage/logs
  if (path === '/api/usage/logs' && method === 'GET') {
    return handleGetUsageLogs(request, env.DB);
  }

  // GET /api/usage/tools
  if (path === '/api/usage/tools' && method === 'GET') {
    return handleGetToolUsage(request, env.DB);
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
          'POST /api/auth/register': 'Create new account with email/password',
          'POST /api/auth/login': 'Login with email/password',
          'GET /api/auth/me': 'Get current user info (requires auth)',
          'GET /api/auth/providers': 'List available OAuth providers',
          'GET /api/auth/google': 'Login with Google',
          'GET /api/auth/github': 'Login with GitHub',
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
        jwt: {
          type: 'Bearer Token',
          header: 'Authorization: Bearer <jwt_token>',
          note: 'Get token from /api/auth/login, /api/auth/register, or OAuth callback',
        },
        oauth: {
          google: 'GET /api/auth/google?return_url=/dashboard',
          github: 'GET /api/auth/github?return_url=/dashboard',
        },
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
