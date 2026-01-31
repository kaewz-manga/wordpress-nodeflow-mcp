/**
 * WordPress MCP SaaS Server for Cloudflare Workers
 * Multi-tenant WordPress automation via Model Context Protocol
 */

import { WordPressClient } from './wp-client';
import { MCPToolResponse } from './types';
import { Env, ApiResponse, AuthContext, RateLimitInfo } from './saas-types';
import { allTools } from './tools';
import {
  handleRegister,
  handleLogin,
  handleCreateConnection,
  authenticateMcpRequest,
  verifyAuthToken,
  verifyAdminToken,
} from './auth';
import {
  getOAuthAuthorizeUrl,
  handleOAuthCallback,
  generateOAuthState,
  validateOAuthState,
} from './oauth';
import {
  getUserById,
  getConnectionsByUserId,
  getApiKeysByUserId,
  deleteConnection,
  revokeApiKey,
  getOrCreateMonthlyUsage,
  incrementMonthlyUsage,
  logUsage,
  getPlan,
  getAllPlans,
  getCurrentYearMonth,
  getNextMonthReset,
  countUserConnections,
  updateUserPassword,
  deleteUser,
  getAllUsers,
  updateUserStatus,
  adminUpdateUserPlan,
  logAdminAction,
  getAdminStats,
  getUsageTimeseries,
  getTopTools,
  getTopUsers,
  getRecentErrors,
  getPlanDistribution,
  getErrorTrend,
} from './db';
import { hashPassword, verifyPassword } from './crypto-utils';
import { generateApiKey } from './crypto-utils';
import { createApiKey as createApiKeyDb } from './db';
import { createCheckoutSession, createBillingPortalSession, handleStripeWebhook } from './stripe';

// ============================================
// CORS Headers
// ============================================
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ============================================
// Response Helpers
// ============================================

function jsonResponse(data: any, status: number = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

function apiResponse<T>(data: ApiResponse<T>, status: number = 200, rateLimitInfo?: RateLimitInfo): Response {
  const headers: Record<string, string> = {};

  if (rateLimitInfo) {
    headers['X-RateLimit-Limit'] = String(rateLimitInfo.limit);
    headers['X-RateLimit-Remaining'] = String(rateLimitInfo.remaining);
    headers['X-RateLimit-Reset'] = rateLimitInfo.reset;
  }

  return jsonResponse(
    {
      ...data,
      meta: {
        request_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
    },
    status,
    headers
  );
}

function jsonRpcResponse(id: string | number | null, result: any, rateLimitInfo?: RateLimitInfo): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...CORS_HEADERS,
  };

  if (rateLimitInfo) {
    headers['X-RateLimit-Limit'] = String(rateLimitInfo.limit);
    headers['X-RateLimit-Remaining'] = String(rateLimitInfo.remaining);
    headers['X-RateLimit-Reset'] = rateLimitInfo.reset;
  }

  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      id,
      result,
    }),
    { headers }
  );
}

function jsonRpcError(id: string | number | null, code: number, message: string): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      id,
      error: { code, message },
    }),
    {
      status: code === -32600 ? 400 : 500,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    }
  );
}

// ============================================
// MCP Tool Handler
// ============================================

async function handleToolCall(
  toolName: string,
  args: any,
  client: WordPressClient
): Promise<MCPToolResponse> {
  let result: any;

  try {
    switch (toolName) {
      // Posts
      case 'wp_get_posts':
        result = await client.getPosts(args);
        break;
      case 'wp_get_post':
        result = await client.getPost(args.id);
        break;
      case 'wp_create_post':
        result = await client.createPost(args);
        break;
      case 'wp_update_post':
        result = await client.updatePost(args.id, args);
        break;
      case 'wp_delete_post':
        result = await client.deletePost(args.id, args.force);
        break;

      // Pages
      case 'wp_get_pages':
        result = await client.getPages(args);
        break;
      case 'wp_create_page':
        result = await client.createPage(args);
        break;
      case 'wp_update_page':
        result = await client.updatePage(args.id, args);
        break;
      case 'wp_delete_page':
        result = await client.deletePage(args.id, args.force);
        break;

      // Media
      case 'wp_get_media':
        result = await client.getMedia(args);
        break;
      case 'wp_get_media_item':
        result = await client.getMediaItem(args.id);
        break;
      case 'wp_upload_media_from_url':
        result = await client.uploadMediaFromUrl(args);
        break;
      case 'wp_upload_media_from_base64':
        result = await client.uploadMediaFromBase64(args);
        break;

      // Categories
      case 'wp_get_categories':
        result = await client.getCategories(args);
        break;
      case 'wp_get_category':
        result = await client.getCategory(args.id);
        break;
      case 'wp_create_category':
        result = await client.createCategory(args);
        break;
      case 'wp_delete_category':
        result = await client.deleteCategory(args.id, args.force);
        break;

      // Tags
      case 'wp_get_tags':
        result = await client.getTags(args);
        break;
      case 'wp_create_tag':
        result = await client.createTag(args);
        break;

      // Comments
      case 'wp_get_comments':
        result = await client.getComments(args);
        break;
      case 'wp_approve_comment':
        result = await client.updateCommentStatus(args.id, 'approved');
        break;
      case 'wp_spam_comment':
        result = await client.updateCommentStatus(args.id, 'spam');
        break;
      case 'wp_delete_comment':
        result = await client.deleteComment(args.id, args.force);
        break;

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (error: any) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
    };
  }
}

// ============================================
// Management API Routes
// ============================================

async function handleManagementApi(
  request: Request,
  env: Env,
  path: string
): Promise<Response> {
  const method = request.method;

  // Auth endpoints (no auth required)
  if (path === '/api/auth/register' && method === 'POST') {
    const body = await request.json() as { email: string; password: string };
    const result = await handleRegister(env.DB, body.email, body.password);
    return apiResponse(result, result.success ? 201 : 400);
  }

  if (path === '/api/auth/login' && method === 'POST') {
    const body = await request.json() as { email: string; password: string };
    const result = await handleLogin(env.DB, env.JWT_SECRET, body.email, body.password);
    return apiResponse(result, result.success ? 200 : 401);
  }

  // OAuth: Get available providers
  if (path === '/api/auth/oauth/providers' && method === 'GET') {
    return apiResponse({
      success: true,
      data: {
        providers: [
          { id: 'github', name: 'GitHub', enabled: !!env.GITHUB_CLIENT_ID },
          { id: 'google', name: 'Google', enabled: !!env.GOOGLE_CLIENT_ID },
        ].filter(p => p.enabled),
      },
    });
  }

  // OAuth: Initiate flow
  const oauthInitMatch = path.match(/^\/api\/auth\/oauth\/(github|google)$/);
  if (oauthInitMatch && method === 'GET') {
    const provider = oauthInitMatch[1] as 'github' | 'google';
    const url = new URL(request.url);
    const redirectUri = url.searchParams.get('redirect_uri') || `${url.origin}/api/auth/oauth/${provider}/callback`;

    if (provider === 'github' && !env.GITHUB_CLIENT_ID) {
      return apiResponse({
        success: false,
        error: { code: 'PROVIDER_NOT_CONFIGURED', message: 'GitHub OAuth is not configured' },
      }, 400);
    }
    if (provider === 'google' && !env.GOOGLE_CLIENT_ID) {
      return apiResponse({
        success: false,
        error: { code: 'PROVIDER_NOT_CONFIGURED', message: 'Google OAuth is not configured' },
      }, 400);
    }

    const state = await generateOAuthState(env.RATE_LIMIT_KV);
    await env.RATE_LIMIT_KV.put(`oauth_redirect:${state}`, redirectUri, { expirationTtl: 600 });
    const authorizeUrl = getOAuthAuthorizeUrl(provider, env, redirectUri, state);

    return apiResponse({
      success: true,
      data: { url: authorizeUrl, state },
    });
  }

  // OAuth: Callback handler
  const oauthCallbackMatch = path.match(/^\/api\/auth\/oauth\/(github|google)\/callback$/);
  if (oauthCallbackMatch && method === 'GET') {
    const provider = oauthCallbackMatch[1] as 'github' | 'google';
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      const errorDesc = url.searchParams.get('error_description') || error;
      const frontendUrl = env.APP_URL || url.origin;
      return Response.redirect(`${frontendUrl}/login?error=${encodeURIComponent(errorDesc)}`, 302);
    }

    if (!code || !state) {
      return apiResponse({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'Missing code or state parameter' },
      }, 400);
    }

    const validState = await validateOAuthState(env.RATE_LIMIT_KV, state);
    if (!validState) {
      return apiResponse({
        success: false,
        error: { code: 'INVALID_STATE', message: 'Invalid or expired state parameter' },
      }, 400);
    }

    const redirectUri = await env.RATE_LIMIT_KV.get(`oauth_redirect:${state}`) ||
      `${url.origin}/api/auth/oauth/${provider}/callback`;
    await env.RATE_LIMIT_KV.delete(`oauth_redirect:${state}`);

    const result = await handleOAuthCallback(provider, env, code, redirectUri);

    if (result.success && result.data) {
      const frontendUrl = env.APP_URL || url.origin;
      return Response.redirect(
        `${frontendUrl}/auth/callback?token=${result.data.token}&email=${encodeURIComponent(result.data.user.email)}`,
        302
      );
    } else {
      const frontendUrl = env.APP_URL || url.origin;
      return Response.redirect(
        `${frontendUrl}/login?error=${encodeURIComponent(result.error?.message || 'OAuth failed')}`,
        302
      );
    }
  }

  // Stripe webhook (no auth - signature verified internally)
  if (path === '/api/webhooks/stripe' && method === 'POST') {
    return handleStripeWebhook(request, env);
  }

  // Plans endpoint (public)
  if (path === '/api/plans' && method === 'GET') {
    const plans = await getAllPlans(env.DB);
    return apiResponse({
      success: true,
      data: { plans: plans.map(p => ({
        id: p.id,
        name: p.name,
        monthly_request_limit: p.monthly_request_limit,
        max_connections: p.max_connections,
        price_monthly: p.price_monthly,
        features: JSON.parse(p.features || '{}'),
      }))},
    });
  }

  // All other endpoints require JWT auth
  const authUser = await verifyAuthToken(request, env.JWT_SECRET);
  if (!authUser) {
    return apiResponse(
      {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or missing token' },
      },
      401
    );
  }

  // ============================================
  // Admin API Endpoints
  // ============================================
  if (path.startsWith('/api/admin/')) {
    const admin = await verifyAdminToken(request, env.JWT_SECRET, env.DB);
    if (!admin) {
      return apiResponse(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        403
      );
    }

    // GET /api/admin/stats
    if (path === '/api/admin/stats' && method === 'GET') {
      const stats = await getAdminStats(env.DB);
      return apiResponse({ success: true, data: stats });
    }

    // GET /api/admin/users
    if (path === '/api/admin/users' && method === 'GET') {
      const params = new URL(request.url).searchParams;
      const result = await getAllUsers(env.DB, {
        limit: parseInt(params.get('limit') || '20'),
        offset: parseInt(params.get('offset') || '0'),
        plan: params.get('plan') || undefined,
        status: params.get('status') || undefined,
        search: params.get('search') || undefined,
      });
      return apiResponse({ success: true, data: result });
    }

    // GET /api/admin/users/:id
    const userDetailMatch = path.match(/^\/api\/admin\/users\/([^/]+)$/);
    if (userDetailMatch && method === 'GET') {
      const user = await getUserById(env.DB, userDetailMatch[1]);
      if (!user) {
        return apiResponse({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
      }
      const connections = await getConnectionsByUserId(env.DB, userDetailMatch[1]);
      const yearMonth = getCurrentYearMonth();
      const usage = await getOrCreateMonthlyUsage(env.DB, userDetailMatch[1], yearMonth);
      return apiResponse({
        success: true,
        data: {
          user: { id: user.id, email: user.email, plan: user.plan, status: user.status, is_admin: (user as any).is_admin || 0, created_at: user.created_at },
          connections: connections.map(c => ({ id: c.id, name: c.name, wp_url: c.wp_url, status: c.status, created_at: c.created_at })),
          usage: { request_count: usage.request_count, success_count: usage.success_count, error_count: usage.error_count },
        },
      });
    }

    // PUT /api/admin/users/:id/plan
    const planMatch = path.match(/^\/api\/admin\/users\/([^/]+)\/plan$/);
    if (planMatch && method === 'PUT') {
      const body = await request.json() as { plan: string };
      const validPlans = ['free', 'starter', 'pro', 'enterprise'];
      if (!validPlans.includes(body.plan)) {
        return apiResponse({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid plan' } }, 400);
      }
      await adminUpdateUserPlan(env.DB, planMatch[1], body.plan);
      await logAdminAction(env.DB, admin.userId, 'change_plan', planMatch[1], { plan: body.plan });
      return apiResponse({ success: true, data: { message: 'Plan updated' } });
    }

    // PUT /api/admin/users/:id/status
    const statusMatch = path.match(/^\/api\/admin\/users\/([^/]+)\/status$/);
    if (statusMatch && method === 'PUT') {
      const body = await request.json() as { status: string };
      if (!['active', 'suspended'].includes(body.status)) {
        return apiResponse({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid status' } }, 400);
      }
      if (statusMatch[1] === admin.userId) {
        return apiResponse({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot change own status' } }, 403);
      }
      await updateUserStatus(env.DB, statusMatch[1], body.status);
      await logAdminAction(env.DB, admin.userId, 'change_status', statusMatch[1], { status: body.status });
      return apiResponse({ success: true, data: { message: 'Status updated' } });
    }

    // DELETE /api/admin/users/:id
    const deleteMatch = path.match(/^\/api\/admin\/users\/([^/]+)$/);
    if (deleteMatch && method === 'DELETE') {
      if (deleteMatch[1] === admin.userId) {
        return apiResponse({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot delete own account' } }, 403);
      }
      await deleteUser(env.DB, deleteMatch[1]);
      await logAdminAction(env.DB, admin.userId, 'delete_user', deleteMatch[1], {});
      return apiResponse({ success: true, data: { message: 'User deleted' } });
    }

    // GET /api/admin/analytics/usage
    if (path === '/api/admin/analytics/usage' && method === 'GET') {
      const days = parseInt(new URL(request.url).searchParams.get('days') || '30');
      const timeseries = await getUsageTimeseries(env.DB, days);
      return apiResponse({ success: true, data: { timeseries } });
    }

    // GET /api/admin/analytics/tools
    if (path === '/api/admin/analytics/tools' && method === 'GET') {
      const params = new URL(request.url).searchParams;
      const days = parseInt(params.get('days') || '30');
      const limit = parseInt(params.get('limit') || '10');
      const tools = await getTopTools(env.DB, days, limit);
      return apiResponse({ success: true, data: { tools } });
    }

    // GET /api/admin/analytics/top-users
    if (path === '/api/admin/analytics/top-users' && method === 'GET') {
      const params = new URL(request.url).searchParams;
      const days = parseInt(params.get('days') || '30');
      const limit = parseInt(params.get('limit') || '10');
      const users = await getTopUsers(env.DB, days, limit);
      return apiResponse({ success: true, data: { users } });
    }

    // GET /api/admin/revenue/overview
    if (path === '/api/admin/revenue/overview' && method === 'GET') {
      const distribution = await getPlanDistribution(env.DB);
      const mrr = distribution.reduce((sum, row) => sum + row.count * row.price_monthly, 0);
      return apiResponse({ success: true, data: { mrr: Math.round(mrr * 100) / 100, plan_distribution: distribution } });
    }

    // GET /api/admin/health/errors
    if (path === '/api/admin/health/errors' && method === 'GET') {
      const limit = parseInt(new URL(request.url).searchParams.get('limit') || '50');
      const errors = await getRecentErrors(env.DB, limit);
      return apiResponse({ success: true, data: { errors } });
    }

    // GET /api/admin/health/error-trend
    if (path === '/api/admin/health/error-trend' && method === 'GET') {
      const days = parseInt(new URL(request.url).searchParams.get('days') || '30');
      const trend = await getErrorTrend(env.DB, days);
      return apiResponse({ success: true, data: { trend } });
    }

    return apiResponse({ success: false, error: { code: 'NOT_FOUND', message: 'Admin endpoint not found' } }, 404);
  }

  // POST /api/billing/checkout
  if (path === '/api/billing/checkout' && method === 'POST') {
    try {
      const body = await request.json() as { plan_id: string };
      if (!body.plan_id) {
        return apiResponse(
          { success: false, error: { code: 'INVALID_REQUEST', message: 'plan_id is required' } },
          400
        );
      }
      const result = await createCheckoutSession(env, authUser.userId, body.plan_id);
      return apiResponse({ success: true, data: result });
    } catch (error: any) {
      return apiResponse(
        { success: false, error: { code: 'BILLING_ERROR', message: error.message } },
        400
      );
    }
  }

  // POST /api/billing/portal
  if (path === '/api/billing/portal' && method === 'POST') {
    try {
      const result = await createBillingPortalSession(env, authUser.userId);
      return apiResponse({ success: true, data: result });
    } catch (error: any) {
      return apiResponse(
        { success: false, error: { code: 'BILLING_ERROR', message: error.message } },
        400
      );
    }
  }

  // GET /api/user/profile
  if (path === '/api/user/profile' && method === 'GET') {
    const user = await getUserById(env.DB, authUser.userId);
    if (!user) {
      return apiResponse(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
        404
      );
    }
    return apiResponse({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        status: user.status,
        is_admin: (user as any).is_admin || 0,
        created_at: user.created_at,
        oauth_provider: user.oauth_provider || null,
      },
    });
  }

  // PUT /api/user/password
  if (path === '/api/user/password' && method === 'PUT') {
    const body = await request.json() as { current_password: string; new_password: string };

    if (!body.current_password || !body.new_password) {
      return apiResponse(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'Current and new password required' } },
        400
      );
    }

    if (body.new_password.length < 8) {
      return apiResponse(
        { success: false, error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters' } },
        400
      );
    }

    const user = await getUserById(env.DB, authUser.userId);
    if (!user) {
      return apiResponse(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
        404
      );
    }

    if (user.oauth_provider && !user.password_hash) {
      return apiResponse(
        { success: false, error: { code: 'OAUTH_USER', message: 'OAuth users cannot change password' } },
        400
      );
    }

    const validPassword = await verifyPassword(body.current_password, user.password_hash || '');
    if (!validPassword) {
      return apiResponse(
        { success: false, error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' } },
        401
      );
    }

    const newHash = await hashPassword(body.new_password);
    await updateUserPassword(env.DB, authUser.userId, newHash);

    return apiResponse({
      success: true,
      data: { message: 'Password updated successfully' },
    });
  }

  // DELETE /api/user
  if (path === '/api/user' && method === 'DELETE') {
    const body = await request.json().catch(() => ({})) as { password?: string; confirm?: boolean };

    const user = await getUserById(env.DB, authUser.userId);
    if (!user) {
      return apiResponse(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
        404
      );
    }

    if (user.password_hash && !user.oauth_provider) {
      if (!body.password) {
        return apiResponse(
          { success: false, error: { code: 'PASSWORD_REQUIRED', message: 'Password required to delete account' } },
          400
        );
      }
      const validPassword = await verifyPassword(body.password, user.password_hash);
      if (!validPassword) {
        return apiResponse(
          { success: false, error: { code: 'INVALID_PASSWORD', message: 'Password is incorrect' } },
          401
        );
      }
    } else {
      if (!body.confirm) {
        return apiResponse(
          { success: false, error: { code: 'CONFIRM_REQUIRED', message: 'Confirmation required to delete account' } },
          400
        );
      }
    }

    await deleteUser(env.DB, authUser.userId);
    return apiResponse({
      success: true,
      data: { message: 'Account deleted successfully' },
    });
  }

  // GET /api/connections
  if (path === '/api/connections' && method === 'GET') {
    const connections = await getConnectionsByUserId(env.DB, authUser.userId);
    const apiKeys = await getApiKeysByUserId(env.DB, authUser.userId);

    return apiResponse({
      success: true,
      data: {
        connections: connections.map(c => ({
          id: c.id,
          name: c.name,
          wp_url: c.wp_url,
          status: c.status,
          created_at: c.created_at,
          api_keys: apiKeys
            .filter(k => k.connection_id === c.id)
            .map(k => ({
              id: k.id,
              prefix: k.key_prefix,
              name: k.name,
              status: k.status,
              last_used_at: k.last_used_at,
              created_at: k.created_at,
            })),
        })),
      },
    });
  }

  // POST /api/connections
  if (path === '/api/connections' && method === 'POST') {
    const body = await request.json() as { name: string; wp_url: string; wp_username: string; wp_password: string };
    const result = await handleCreateConnection(
      env.DB,
      env.ENCRYPTION_KEY,
      authUser.userId,
      authUser.plan,
      body.name,
      body.wp_url,
      body.wp_username,
      body.wp_password
    );
    return apiResponse(result, result.success ? 201 : 400);
  }

  // DELETE /api/connections/:id
  const deleteConnectionMatch = path.match(/^\/api\/connections\/([^\/]+)$/);
  if (deleteConnectionMatch && method === 'DELETE') {
    const connectionId = deleteConnectionMatch[1];
    const connections = await getConnectionsByUserId(env.DB, authUser.userId);
    const connection = connections.find(c => c.id === connectionId);

    if (!connection) {
      return apiResponse(
        { success: false, error: { code: 'NOT_FOUND', message: 'Connection not found' } },
        404
      );
    }

    await deleteConnection(env.DB, connectionId);
    return apiResponse({ success: true, data: { message: 'Connection deleted' } });
  }

  // POST /api/connections/:id/api-keys
  const newApiKeyMatch = path.match(/^\/api\/connections\/([^\/]+)\/api-keys$/);
  if (newApiKeyMatch && method === 'POST') {
    const connectionId = newApiKeyMatch[1];
    const connections = await getConnectionsByUserId(env.DB, authUser.userId);
    const connection = connections.find(c => c.id === connectionId);

    if (!connection) {
      return apiResponse(
        { success: false, error: { code: 'NOT_FOUND', message: 'Connection not found' } },
        404
      );
    }

    const body = await request.json().catch(() => ({})) as { name?: string };
    const { key, hash, prefix } = await generateApiKey();
    await createApiKeyDb(env.DB, authUser.userId, connectionId, hash, prefix, body.name || 'API Key');

    return apiResponse({
      success: true,
      data: {
        api_key: key,
        prefix,
        message: 'Save your API key now. It will not be shown again.',
      },
    }, 201);
  }

  // DELETE /api/api-keys/:id
  const revokeKeyMatch = path.match(/^\/api\/api-keys\/([^\/]+)$/);
  if (revokeKeyMatch && method === 'DELETE') {
    const keyId = revokeKeyMatch[1];
    const apiKeysData = await getApiKeysByUserId(env.DB, authUser.userId);
    const apiKey = apiKeysData.find(k => k.id === keyId);

    if (!apiKey) {
      return apiResponse(
        { success: false, error: { code: 'NOT_FOUND', message: 'API key not found' } },
        404
      );
    }

    await revokeApiKey(env.DB, keyId);
    return apiResponse({ success: true, data: { message: 'API key revoked' } });
  }

  // GET /api/usage
  if (path === '/api/usage' && method === 'GET') {
    const yearMonth = getCurrentYearMonth();
    const usage = await getOrCreateMonthlyUsage(env.DB, authUser.userId, yearMonth);
    const freshUser = await getUserById(env.DB, authUser.userId);
    const currentPlanId = freshUser?.plan || authUser.plan;
    const plan = await getPlan(env.DB, currentPlanId);
    const connectionCount = await countUserConnections(env.DB, authUser.userId);

    return apiResponse({
      success: true,
      data: {
        plan: currentPlanId,
        period: yearMonth,
        requests: {
          used: usage.request_count,
          limit: plan?.monthly_request_limit || 100,
          remaining: Math.max(0, (plan?.monthly_request_limit || 100) - usage.request_count),
        },
        connections: {
          used: connectionCount,
          limit: plan?.max_connections || 1,
        },
        success_rate: usage.request_count > 0
          ? Math.round((usage.success_count / usage.request_count) * 100)
          : 100,
        reset_at: getNextMonthReset(),
      },
    });
  }

  // Not found
  return apiResponse(
    { success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } },
    404
  );
}

// ============================================
// MCP Protocol Handler
// ============================================

async function handleMcpRequest(
  request: Request,
  env: Env,
  authContext: AuthContext
): Promise<Response> {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonRpcError(null, -32700, 'Parse error: Invalid JSON');
  }

  const { jsonrpc, id, method, params } = body;

  if (jsonrpc !== '2.0') {
    return jsonRpcError(id, -32600, 'Invalid Request: jsonrpc must be "2.0"');
  }

  const rateLimitInfo: RateLimitInfo = {
    limit: authContext.usage.limit,
    remaining: authContext.usage.remaining,
    reset: getNextMonthReset(),
  };

  try {
    switch (method) {
      case 'initialize': {
        return jsonRpcResponse(
          id,
          {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: {
              name: 'wordpress-mcp-saas',
              version: '2.0.0',
            },
          },
          rateLimitInfo
        );
      }

      case 'notifications/initialized': {
        return jsonRpcResponse(id, {}, rateLimitInfo);
      }

      case 'tools/list': {
        return jsonRpcResponse(id, { tools: allTools }, rateLimitInfo);
      }

      case 'tools/call': {
        const startTime = Date.now();
        const { name: toolName, arguments: args } = params;

        // Create WordPress client with user's credentials
        const client = new WordPressClient({
          url: authContext.connection.wp_url,
          username: authContext.connection.wp_username,
          password: authContext.connection.wp_password,
        });

        const result = await handleToolCall(toolName, args || {}, client);
        const responseTime = Date.now() - startTime;

        // Check if result contains error
        const isError = result.content[0]?.text?.startsWith('Error:');

        // Log usage
        const yearMonth = getCurrentYearMonth();
        await Promise.all([
          incrementMonthlyUsage(env.DB, authContext.user.id, yearMonth, !isError),
          logUsage(
            env.DB,
            authContext.user.id,
            authContext.apiKey.id,
            authContext.connection.id,
            toolName,
            isError ? 'error' : 'success',
            responseTime,
            isError ? result.content[0]?.text : null
          ),
        ]);

        // Update remaining count
        rateLimitInfo.remaining = Math.max(0, rateLimitInfo.remaining - 1);

        return jsonRpcResponse(id, result, rateLimitInfo);
      }

      case 'ping': {
        return jsonRpcResponse(id, {}, rateLimitInfo);
      }

      default: {
        return jsonRpcError(id, -32601, `Method not found: ${method}`);
      }
    }
  } catch (error: any) {
    return jsonRpcError(id, -32603, `Internal error: ${error.message}`);
  }
}

// ============================================
// Main Handler
// ============================================

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Health check
    if (path === '/' && request.method === 'GET') {
      return jsonResponse({
        name: 'wordpress-mcp-saas',
        version: '2.0.0',
        description: 'Multi-tenant WordPress MCP SaaS server',
        status: 'ok',
        endpoints: {
          mcp: '/mcp',
          api: '/api/*',
        },
      });
    }

    // Management API
    if (path.startsWith('/api/')) {
      return handleManagementApi(request, env, path);
    }

    // MCP endpoint
    if (path === '/mcp' && request.method === 'POST') {
      try {
        const { context, error } = await authenticateMcpRequest(request, env);

        if (error) {
          return jsonRpcError(null, -32000, error.error?.message || 'Authentication failed');
        }

        if (!context) {
          return jsonRpcError(null, -32000, 'Authentication failed');
        }

        return handleMcpRequest(request, env, context);
      } catch (err: any) {
        return jsonRpcError(null, -32603, `Internal error: ${err.message}`);
      }
    }

    // Not found
    return jsonResponse({ error: 'Not found' }, 404);
  },
};
