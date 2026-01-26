/**
 * wordpress-nodeflow-mcp
 * Cloudflare Workers MCP server for WordPress REST API
 */

import { handleMCP } from './mcp/server';

export interface Env {
  WORDPRESS_URL?: string;
  WORDPRESS_USERNAME?: string;
  WORDPRESS_APP_PASSWORD?: string;
  IMGBB_API_KEY?: string;
  ALLOWED_ORIGINS?: string;
}

/**
 * Handle CORS preflight requests
 */
function handleCORS(allowedOrigins: string = '*'): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigins,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-wordpress-url, x-wordpress-username, x-wordpress-password, x-imgbb-api-key',
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
  newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, x-wordpress-url, x-wordpress-username, x-wordpress-password, x-imgbb-api-key');

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
      },
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

    // Route handling
    switch (url.pathname) {
      case '/':
        response = handleRoot();
        break;

      case '/health':
        response = handleHealth();
        break;

      case '/mcp':
        response = await handleMCP(request, env);
        break;

      default:
        response = new Response('Not Found', { status: 404 });
    }

    // Add CORS headers to all responses
    return addCORSHeaders(response, allowedOrigins);
  },
};
