/**
 * OAuth Route Handlers
 * GET /api/auth/google - Redirect to Google OAuth
 * GET /api/auth/github - Redirect to GitHub OAuth
 * GET /api/auth/callback/google - Google OAuth callback
 * GET /api/auth/callback/github - GitHub OAuth callback
 */

import {
  OAuthProvider,
  OAuthEnv,
  getGoogleConfig,
  getGitHubConfig,
  generateOAuthState,
  storeOAuthState,
  verifyOAuthState,
  buildAuthorizationUrl,
  exchangeCodeForToken,
  fetchGoogleUserInfo,
  fetchGitHubUserInfo,
} from './oauth';
import { findOrCreateOAuthCustomer } from '../saas/customers';
import { errorResponse, generateToken, getQueryParam } from './utils';

// =============================================================================
// Types
// =============================================================================

interface OAuthHandlerEnv extends OAuthEnv {
  DB: D1Database;
  RATE_LIMIT: KVNamespace;
}

// =============================================================================
// OAuth Initiation Handlers
// =============================================================================

/**
 * GET /api/auth/google
 * Redirect to Google OAuth
 */
export async function handleGoogleAuth(
  request: Request,
  env: OAuthHandlerEnv
): Promise<Response> {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const returnUrl = getQueryParam(url, 'return_url') || '/';

  // Check if Google OAuth is configured
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return errorResponse('Google OAuth is not configured', 503, 'OAUTH_NOT_CONFIGURED');
  }

  const config = getGoogleConfig(env, baseUrl);
  const state = await generateOAuthState();

  // Store state in KV
  await storeOAuthState(env.RATE_LIMIT, state, {
    provider: 'google',
    returnUrl,
  });

  // Redirect to Google
  const authUrl = buildAuthorizationUrl(config, state);
  return Response.redirect(authUrl, 302);
}

/**
 * GET /api/auth/github
 * Redirect to GitHub OAuth
 */
export async function handleGitHubAuth(
  request: Request,
  env: OAuthHandlerEnv
): Promise<Response> {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const returnUrl = getQueryParam(url, 'return_url') || '/';

  // Check if GitHub OAuth is configured
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return errorResponse('GitHub OAuth is not configured', 503, 'OAUTH_NOT_CONFIGURED');
  }

  const config = getGitHubConfig(env, baseUrl);
  const state = await generateOAuthState();

  // Store state in KV
  await storeOAuthState(env.RATE_LIMIT, state, {
    provider: 'github',
    returnUrl,
  });

  // Redirect to GitHub
  const authUrl = buildAuthorizationUrl(config, state);
  return Response.redirect(authUrl, 302);
}

// =============================================================================
// OAuth Callback Handlers
// =============================================================================

/**
 * GET /api/auth/callback/google
 * Handle Google OAuth callback
 */
export async function handleGoogleCallback(
  request: Request,
  env: OAuthHandlerEnv
): Promise<Response> {
  const url = new URL(request.url);
  const code = getQueryParam(url, 'code');
  const state = getQueryParam(url, 'state');
  const error = getQueryParam(url, 'error');

  // Check for OAuth error
  if (error) {
    return createOAuthErrorResponse(error, getQueryParam(url, 'error_description'));
  }

  // Validate required params
  if (!code || !state) {
    return errorResponse('Missing code or state parameter', 400, 'INVALID_CALLBACK');
  }

  // Verify state
  const stateData = await verifyOAuthState(env.RATE_LIMIT, state);
  if (!stateData || stateData.provider !== 'google') {
    return errorResponse('Invalid or expired state', 400, 'INVALID_STATE');
  }

  try {
    const baseUrl = `${url.protocol}//${url.host}`;
    const config = getGoogleConfig(env, baseUrl);

    // Exchange code for token
    const tokenResponse = await exchangeCodeForToken(config, code);

    // Fetch user info
    const userInfo = await fetchGoogleUserInfo(tokenResponse.access_token);

    // Find or create customer
    const { customer, subscription, isNew } = await findOrCreateOAuthCustomer(env.DB, {
      provider: 'google',
      providerId: userInfo.providerId,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
    });

    // Generate JWT token
    const token = await generateToken(customer.id, customer.email, customer.tier);

    // Return success response (or redirect with token)
    return createOAuthSuccessResponse(token, customer, subscription, isNew, stateData.returnUrl);
  } catch (err) {
    console.error('Google OAuth error:', err);
    return errorResponse(
      err instanceof Error ? err.message : 'OAuth authentication failed',
      500,
      'OAUTH_ERROR'
    );
  }
}

/**
 * GET /api/auth/callback/github
 * Handle GitHub OAuth callback
 */
export async function handleGitHubCallback(
  request: Request,
  env: OAuthHandlerEnv
): Promise<Response> {
  const url = new URL(request.url);
  const code = getQueryParam(url, 'code');
  const state = getQueryParam(url, 'state');
  const error = getQueryParam(url, 'error');

  // Check for OAuth error
  if (error) {
    return createOAuthErrorResponse(error, getQueryParam(url, 'error_description'));
  }

  // Validate required params
  if (!code || !state) {
    return errorResponse('Missing code or state parameter', 400, 'INVALID_CALLBACK');
  }

  // Verify state
  const stateData = await verifyOAuthState(env.RATE_LIMIT, state);
  if (!stateData || stateData.provider !== 'github') {
    return errorResponse('Invalid or expired state', 400, 'INVALID_STATE');
  }

  try {
    const baseUrl = `${url.protocol}//${url.host}`;
    const config = getGitHubConfig(env, baseUrl);

    // Exchange code for token
    const tokenResponse = await exchangeCodeForToken(config, code);

    // Fetch user info
    const userInfo = await fetchGitHubUserInfo(tokenResponse.access_token);

    // Find or create customer
    const { customer, subscription, isNew } = await findOrCreateOAuthCustomer(env.DB, {
      provider: 'github',
      providerId: userInfo.providerId,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
    });

    // Generate JWT token
    const token = await generateToken(customer.id, customer.email, customer.tier);

    // Return success response (or redirect with token)
    return createOAuthSuccessResponse(token, customer, subscription, isNew, stateData.returnUrl);
  } catch (err) {
    console.error('GitHub OAuth error:', err);
    return errorResponse(
      err instanceof Error ? err.message : 'OAuth authentication failed',
      500,
      'OAUTH_ERROR'
    );
  }
}

// =============================================================================
// Response Helpers
// =============================================================================

/**
 * Create OAuth error response
 */
function createOAuthErrorResponse(error: string, description?: string | null): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: error,
        message: description || 'OAuth authentication failed',
      },
    }),
    {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Create OAuth success response
 * In a real app, you might redirect to frontend with token in URL fragment
 */
function createOAuthSuccessResponse(
  token: string,
  customer: { id: string; email: string; name: string | null; tier: string },
  subscription: { tier: string; status: string; requests_limit: number; requests_used: number },
  isNew: boolean,
  _returnUrl?: string
): Response {
  // For API-first approach, return JSON with token
  // For web app, you might redirect: Response.redirect(`${returnUrl}#token=${token}`)

  return new Response(
    JSON.stringify({
      success: true,
      message: isNew ? 'Account created successfully' : 'Login successful',
      data: {
        token,
        customer: {
          id: customer.id,
          email: customer.email,
          name: customer.name,
          tier: customer.tier,
        },
        subscription: {
          tier: subscription.tier,
          status: subscription.status,
          requestsLimit: subscription.requests_limit,
          requestsUsed: subscription.requests_used,
        },
        isNewUser: isNew,
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// =============================================================================
// Check OAuth Availability
// =============================================================================

/**
 * GET /api/auth/providers
 * List available OAuth providers
 */
export function handleGetProviders(env: OAuthEnv): Response {
  const providers: { name: string; id: OAuthProvider; available: boolean }[] = [
    {
      name: 'Google',
      id: 'google',
      available: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    },
    {
      name: 'GitHub',
      id: 'github',
      available: !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
    },
  ];

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        providers: providers.filter((p) => p.available),
        all: providers,
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
