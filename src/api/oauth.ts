/**
 * OAuth Configuration and Types
 */

// =============================================================================
// Types
// =============================================================================

export type OAuthProvider = 'google' | 'github';

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string;
}

export interface OAuthUserInfo {
  provider: OAuthProvider;
  providerId: string;
  email: string;
  name: string | null;
  picture: string | null;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

// =============================================================================
// OAuth Provider Configurations
// =============================================================================

export function getGoogleConfig(env: OAuthEnv, baseUrl: string): OAuthConfig {
  return {
    clientId: env.GOOGLE_CLIENT_ID || '',
    clientSecret: env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: `${baseUrl}/api/auth/callback/google`,
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scope: 'openid email profile',
  };
}

export function getGitHubConfig(env: OAuthEnv, baseUrl: string): OAuthConfig {
  return {
    clientId: env.GITHUB_CLIENT_ID || '',
    clientSecret: env.GITHUB_CLIENT_SECRET || '',
    redirectUri: `${baseUrl}/api/auth/callback/github`,
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    scope: 'read:user user:email',
  };
}

// =============================================================================
// Environment Interface
// =============================================================================

export interface OAuthEnv {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
}

// =============================================================================
// OAuth State Management (CSRF protection)
// =============================================================================

/**
 * Generate OAuth state token for CSRF protection
 */
export async function generateOAuthState(): Promise<string> {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Store OAuth state in KV (expires in 10 minutes)
 */
export async function storeOAuthState(
  kv: KVNamespace,
  state: string,
  data: { provider: OAuthProvider; returnUrl?: string }
): Promise<void> {
  await kv.put(`oauth_state:${state}`, JSON.stringify(data), {
    expirationTtl: 600, // 10 minutes
  });
}

/**
 * Verify and consume OAuth state
 */
export async function verifyOAuthState(
  kv: KVNamespace,
  state: string
): Promise<{ provider: OAuthProvider; returnUrl?: string } | null> {
  const data = await kv.get(`oauth_state:${state}`);
  if (!data) return null;

  // Delete state after use (one-time use)
  await kv.delete(`oauth_state:${state}`);

  return JSON.parse(data);
}

// =============================================================================
// OAuth URL Builders
// =============================================================================

/**
 * Build authorization URL for OAuth provider
 */
export function buildAuthorizationUrl(config: OAuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scope,
    state,
  });

  // Google-specific: prompt for account selection
  if (config.authorizationUrl.includes('google')) {
    params.set('access_type', 'offline');
    params.set('prompt', 'select_account');
  }

  return `${config.authorizationUrl}?${params.toString()}`;
}

// =============================================================================
// OAuth Token Exchange
// =============================================================================

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  config: OAuthConfig,
  code: string
): Promise<OAuthTokenResponse> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code',
  });

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json();
}

// =============================================================================
// User Info Fetchers
// =============================================================================

/**
 * Fetch user info from Google
 */
export async function fetchGoogleUserInfo(accessToken: string): Promise<OAuthUserInfo> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Google user info');
  }

  const data = await response.json() as {
    id: string;
    email: string;
    name?: string;
    picture?: string;
  };

  return {
    provider: 'google',
    providerId: data.id,
    email: data.email,
    name: data.name || null,
    picture: data.picture || null,
  };
}

/**
 * Fetch user info from GitHub
 */
export async function fetchGitHubUserInfo(accessToken: string): Promise<OAuthUserInfo> {
  // Fetch user profile
  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'WordPress-MCP-SaaS',
    },
  });

  if (!userResponse.ok) {
    throw new Error('Failed to fetch GitHub user info');
  }

  const userData = await userResponse.json() as {
    id: number;
    login: string;
    name?: string;
    avatar_url?: string;
    email?: string;
  };

  // Fetch email if not public
  let email = userData.email;
  if (!email) {
    const emailResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'WordPress-MCP-SaaS',
      },
    });

    if (emailResponse.ok) {
      const emails = await emailResponse.json() as Array<{
        email: string;
        primary: boolean;
        verified: boolean;
      }>;
      const primaryEmail = emails.find((e) => e.primary && e.verified);
      email = primaryEmail?.email || emails[0]?.email;
    }
  }

  if (!email) {
    throw new Error('No email found for GitHub user');
  }

  return {
    provider: 'github',
    providerId: userData.id.toString(),
    email,
    name: userData.name || userData.login,
    picture: userData.avatar_url || null,
  };
}
