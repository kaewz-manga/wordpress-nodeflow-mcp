/**
 * wordpress-nodeflow-mcp
 * Cloudflare Workers MCP server for WordPress REST API
 */

import { handleMCP } from './mcp/server';
import { handleApiRequest, handleApiDocs } from './api';
import {
  authenticateRequest,
  isLegacyAuthRequest,
  addUsageHeaders,
  incrementUsage,
  logUsage,
  AuthContext,
} from './saas';
import { handleStripeWebhook } from './billing';

export interface Env {
  // WordPress credentials (legacy/fallback)
  WORDPRESS_URL?: string;
  WORDPRESS_USERNAME?: string;
  WORDPRESS_APP_PASSWORD?: string;
  IMGBB_API_KEY?: string;
  ALLOWED_ORIGINS?: string;

  // SaaS bindings
  DB: D1Database;
  RATE_LIMIT: KVNamespace;

  // OAuth credentials
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;

  // Stripe billing
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PUBLISHABLE_KEY?: string;

  // Tier configuration
  TIER_FREE_LIMIT?: string;
  TIER_STARTER_LIMIT?: string;
  TIER_PRO_LIMIT?: string;
  TIER_BUSINESS_LIMIT?: string;
  TIER_FREE_RATE?: string;
  TIER_STARTER_RATE?: string;
  TIER_PRO_RATE?: string;
  TIER_BUSINESS_RATE?: string;
}

/**
 * Handle CORS preflight requests
 */
function handleCORS(allowedOrigins: string = '*'): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigins,
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, x-wordpress-url, x-wordpress-username, x-wordpress-password, x-imgbb-api-key',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * Add CORS headers to response
 */
function addCORSHeaders(response: Response, allowedOrigins: string = '*'): Response {
  const newHeaders = new Headers(response.headers);
  newHeaders.set('Access-Control-Allow-Origin', allowedOrigins);
  newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, x-wordpress-url, x-wordpress-username, x-wordpress-password, x-imgbb-api-key');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

/**
 * Handle root endpoint
 */
function handleRoot(): Response {
  return new Response(
    JSON.stringify({
      name: 'wordpress-nodeflow-mcp',
      version: '1.0.0',
      description: 'Cloudflare Workers MCP server for WordPress REST API',
      endpoints: {
        '/': 'Server information',
        '/health': 'Health check',
        '/mcp': 'MCP JSON-RPC endpoint',
        '/api': 'Dashboard REST API',
        '/webhooks/stripe': 'Stripe webhook endpoint',
      },
      authentication: {
        mcp: 'Use Authorization: Bearer <api_key> or X-API-Key header',
        api: 'Use Authorization: Bearer <jwt_token> from /api/auth/login',
        legacy: 'Or use x-wordpress-* headers for backward compatibility',
      },
      documentation: 'https://github.com/your-repo/wordpress-nodeflow-mcp',
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Handle health check endpoint
 */
function handleHealth(): Response {
  return new Response(
    JSON.stringify({
      status: 'healthy',
      server: 'wordpress-nodeflow-mcp',
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Main Worker entry point
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const allowedOrigins = env.ALLOWED_ORIGINS || '*';

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCORS(allowedOrigins);
    }

    let response: Response;
    let authContext: AuthContext | null = null;
    const startTime = Date.now();

    // Route handling
    // API routes (/api/*)
    if (url.pathname.startsWith('/api')) {
      if (url.pathname === '/api') {
        response = handleApiDocs();
      } else if (env.DB && env.RATE_LIMIT) {
        response = await handleApiRequest(request, {
          DB: env.DB,
          RATE_LIMIT: env.RATE_LIMIT,
          GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
          GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
          GITHUB_CLIENT_ID: env.GITHUB_CLIENT_ID,
          GITHUB_CLIENT_SECRET: env.GITHUB_CLIENT_SECRET,
          STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY,
          STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET,
          STRIPE_PUBLISHABLE_KEY: env.STRIPE_PUBLISHABLE_KEY,
        });
      } else {
        response = new Response(
          JSON.stringify({ error: { message: 'API not configured', code: 'API_NOT_CONFIGURED' } }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return addCORSHeaders(response, allowedOrigins);
    }

    switch (url.pathname) {
      case '/':
        response = handleRoot();
        break;

      case '/health':
        response = handleHealth();
        break;

      case '/webhooks/stripe': {
        // Handle Stripe webhooks
        if (request.method !== 'POST') {
          response = new Response('Method Not Allowed', { status: 405 });
          break;
        }

        if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET || !env.DB) {
          response = new Response(
            JSON.stringify({ error: 'Stripe webhooks not configured' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
          break;
        }

        response = await handleStripeWebhook(request, {
          DB: env.DB,
          STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY,
          STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET,
        });
        break;
      }

      case '/mcp': {
        // Check if using legacy auth (WordPress headers without API key)
        const useLegacyAuth = isLegacyAuthRequest(request);

        if (useLegacyAuth) {
          // Legacy mode: bypass SaaS auth, use WordPress headers directly
          response = await handleMCP(request, env);
        } else if (env.DB && env.RATE_LIMIT) {
          // SaaS mode: authenticate with API key
          const authResult = await authenticateRequest(request, { DB: env.DB, RATE_LIMIT: env.RATE_LIMIT });

          if (!authResult.success) {
            response = authResult.response;
          } else {
            authContext = authResult.context;

            // Increment usage counter
            await incrementUsage(env.DB, authContext.customerId);

            // Process MCP request
            response = await handleMCP(request, env);

            // Add usage headers
            response = addUsageHeaders(response, authContext);
          }
        } else {
          // No DB/KV configured, fall back to legacy mode
          response = await handleMCP(request, env);
        }

        // Log usage (async, don't block response)
        if (authContext && env.DB) {
          const responseTime = Date.now() - startTime;
          logUsage(env.DB, {
            apiKeyId: authContext.apiKeyId,
            customerId: authContext.customerId,
            toolName: 'mcp_request',
            statusCode: response.status,
            responseTimeMs: responseTime,
            ipAddress: request.headers.get('CF-Connecting-IP') || undefined,
            userAgent: request.headers.get('User-Agent') || undefined,
          }).catch(() => {}); // Ignore logging errors
        }
        break;
      }

      default:
        response = new Response('Not Found', { status: 404 });
    }

    // Add CORS headers to all responses
    return addCORSHeaders(response, allowedOrigins);
  },
};
