/**
 * Authentication Middleware and Handlers
 */

import { Env, AuthContext, ApiResponse } from './saas-types';
import {
  hashPassword,
  verifyPassword,
  generateJWT,
  verifyJWT,
  generateApiKey,
  hashApiKey,
  encrypt,
  decrypt,
} from './crypto-utils';
import {
  createUser,
  getUserByEmail,
  getUserById,
  createConnection,
  getConnectionById,
  createApiKey as createApiKeyDb,
  getApiKeyByHash,
  updateApiKeyLastUsed,
  getOrCreateMonthlyUsage,
  getPlan,
  getCurrentYearMonth,
  countUserConnections,
} from './db';

// ============================================
// Auth Handlers (for Management API)
// ============================================

/**
 * Register a new user
 */
export async function handleRegister(
  db: D1Database,
  email: string,
  password: string
): Promise<ApiResponse> {
  // Validate input
  if (!email || !password) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email and password are required',
      },
    };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid email format',
      },
    };
  }

  // Validate password strength
  if (password.length < 8) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Password must be at least 8 characters',
      },
    };
  }

  // Check if user exists
  const existingUser = await getUserByEmail(db, email);
  if (existingUser) {
    return {
      success: false,
      error: {
        code: 'USER_EXISTS',
        message: 'User with this email already exists',
      },
    };
  }

  // Hash password and create user
  const passwordHash = await hashPassword(password);
  const user = await createUser(db, email, passwordHash);

  return {
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
      },
    },
  };
}

/**
 * Login user
 */
export async function handleLogin(
  db: D1Database,
  jwtSecret: string,
  email: string,
  password: string
): Promise<ApiResponse> {
  // Validate input
  if (!email || !password) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email and password are required',
      },
    };
  }

  // Get user
  const user = await getUserByEmail(db, email);
  if (!user) {
    return {
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      },
    };
  }

  // Check if user is active
  if (user.status !== 'active') {
    return {
      success: false,
      error: {
        code: 'ACCOUNT_SUSPENDED',
        message: 'Account is suspended or deleted',
      },
    };
  }

  // Verify password
  const validPassword = await verifyPassword(password, user.password_hash);
  if (!validPassword) {
    return {
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      },
    };
  }

  // Generate JWT
  const token = await generateJWT(
    {
      sub: user.id,
      email: user.email,
      plan: user.plan,
      is_admin: (user as any).is_admin || 0,
    },
    jwtSecret
  );

  return {
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        is_admin: (user as any).is_admin || 0,
      },
    },
  };
}

// ============================================
// MCP API Key Authentication
// ============================================

/**
 * Authenticate MCP request using API key
 * Returns auth context or null if invalid
 */
export async function authenticateMcpRequest(
  request: Request,
  env: Env
): Promise<{ context: AuthContext | null; error: ApiResponse | null }> {
  // Extract API key from header
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return {
      context: null,
      error: {
        success: false,
        error: {
          code: 'MISSING_AUTH',
          message: 'Authorization header is required',
        },
      },
    };
  }

  // Parse Bearer token
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return {
      context: null,
      error: {
        success: false,
        error: {
          code: 'INVALID_AUTH_FORMAT',
          message: 'Authorization header must be "Bearer <api_key>"',
        },
      },
    };
  }

  const apiKey = match[1];

  // Validate API key format
  if (!apiKey.startsWith('n2f_')) {
    return {
      context: null,
      error: {
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key format',
        },
      },
    };
  }

  // Hash the key and lookup
  const keyHash = await hashApiKey(apiKey);

  // Try cache first (KV)
  const cacheKey = `apikey:${keyHash}`;
  let cachedData = await env.RATE_LIMIT_KV?.get(cacheKey, 'json') as {
    user_id: string;
    email: string;
    plan: string;
    connection_id: string;
    wp_url: string;
    wp_username_encrypted: string;
    wp_password_encrypted: string;
    api_key_id: string;
  } | null;

  if (!cachedData) {
    // Lookup in database
    const apiKeyRecord = await getApiKeyByHash(env.DB, keyHash);
    if (!apiKeyRecord) {
      return {
        context: null,
        error: {
          success: false,
          error: {
            code: 'INVALID_API_KEY',
            message: 'Invalid or revoked API key',
          },
        },
      };
    }

    // Get user
    const user = await getUserById(env.DB, apiKeyRecord.user_id);
    if (!user || user.status !== 'active') {
      return {
        context: null,
        error: {
          success: false,
          error: {
            code: 'ACCOUNT_SUSPENDED',
            message: 'Account is suspended or deleted',
          },
        },
      };
    }

    // Get connection
    const connection = await getConnectionById(env.DB, apiKeyRecord.connection_id);
    if (!connection || connection.status !== 'active') {
      return {
        context: null,
        error: {
          success: false,
          error: {
            code: 'CONNECTION_INACTIVE',
            message: 'WordPress connection is inactive or deleted',
          },
        },
      };
    }

    // Cache for 1 hour
    cachedData = {
      user_id: user.id,
      email: user.email,
      plan: user.plan,
      connection_id: connection.id,
      wp_url: connection.wp_url,
      wp_username_encrypted: connection.wp_username_encrypted,
      wp_password_encrypted: connection.wp_password_encrypted,
      api_key_id: apiKeyRecord.id,
    };

    await env.RATE_LIMIT_KV?.put(cacheKey, JSON.stringify(cachedData), {
      expirationTtl: 3600, // 1 hour
    });
  }

  // Get plan limits
  const plan = await getPlan(env.DB, cachedData.plan);
  const monthlyLimit = plan?.monthly_request_limit || 100;

  // Check rate limit
  const yearMonth = getCurrentYearMonth();
  const usage = await getOrCreateMonthlyUsage(env.DB, cachedData.user_id, yearMonth);

  if (usage.request_count >= monthlyLimit) {
    return {
      context: null,
      error: {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Monthly request limit exceeded',
          details: {
            limit: monthlyLimit,
            used: usage.request_count,
            plan: cachedData.plan,
          },
        },
      },
    };
  }

  // Decrypt WordPress credentials
  let wpUsername: string;
  let wpPassword: string;
  try {
    wpUsername = await decrypt(cachedData.wp_username_encrypted, env.ENCRYPTION_KEY);
    wpPassword = await decrypt(cachedData.wp_password_encrypted, env.ENCRYPTION_KEY);
  } catch {
    return {
      context: null,
      error: {
        success: false,
        error: {
          code: 'DECRYPTION_ERROR',
          message: 'Failed to decrypt WordPress credentials',
        },
      },
    };
  }

  // Update last used (async, don't wait)
  updateApiKeyLastUsed(env.DB, cachedData.api_key_id).catch(() => {});

  // Return auth context
  return {
    context: {
      user: {
        id: cachedData.user_id,
        email: cachedData.email,
        plan: cachedData.plan as 'free' | 'starter' | 'pro' | 'enterprise',
      },
      connection: {
        id: cachedData.connection_id,
        wp_url: cachedData.wp_url,
        wp_username: wpUsername,
        wp_password: wpPassword,
      },
      apiKey: {
        id: cachedData.api_key_id,
      },
      usage: {
        current: usage.request_count,
        limit: monthlyLimit,
        remaining: monthlyLimit - usage.request_count,
      },
    },
    error: null,
  };
}

// ============================================
// Connection & API Key Creation
// ============================================

/**
 * Create a new WordPress connection with API key
 */
export async function handleCreateConnection(
  db: D1Database,
  encryptionKey: string,
  userId: string,
  userPlan: string,
  name: string,
  wpUrl: string,
  wpUsername: string,
  wpPassword: string
): Promise<ApiResponse> {
  // Validate input
  if (!name || !wpUrl || !wpUsername || !wpPassword) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Name, WordPress URL, username, and application password are required',
      },
    };
  }

  // Validate URL format
  try {
    new URL(wpUrl);
  } catch {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid WordPress URL format',
      },
    };
  }

  // Check connection limit
  const plan = await getPlan(db, userPlan);
  const maxConnections = plan?.max_connections || 1;
  const currentConnections = await countUserConnections(db, userId);

  if (maxConnections !== -1 && currentConnections >= maxConnections) {
    return {
      success: false,
      error: {
        code: 'CONNECTION_LIMIT',
        message: `Connection limit reached (${maxConnections} for ${userPlan} plan)`,
      },
    };
  }

  // Clean the application password (remove spaces)
  const cleanPassword = wpPassword.replace(/\s+/g, '');

  // Test connection to WordPress
  try {
    const cleanUrl = wpUrl.replace(/\/+$/, '');
    const credentials = btoa(`${wpUsername}:${cleanPassword}`);
    const testResponse = await fetch(`${cleanUrl}/wp-json/wp/v2/posts?per_page=1`, {
      headers: {
        'Authorization': `Basic ${credentials}`,
      },
    });

    if (!testResponse.ok) {
      return {
        success: false,
        error: {
          code: 'CONNECTION_FAILED',
          message: `Failed to connect to WordPress: ${testResponse.status} ${testResponse.statusText}`,
        },
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: {
        code: 'CONNECTION_FAILED',
        message: `Failed to connect to WordPress: ${err.message}`,
      },
    };
  }

  // Encrypt WordPress credentials
  const encryptedUsername = await encrypt(wpUsername, encryptionKey);
  const encryptedPassword = await encrypt(cleanPassword, encryptionKey);

  // Create connection
  const connection = await createConnection(db, userId, name, wpUrl, encryptedUsername, encryptedPassword);

  // Generate SaaS API key
  const { key, hash, prefix } = await generateApiKey();
  await createApiKeyDb(db, userId, connection.id, hash, prefix, 'Default');

  return {
    success: true,
    data: {
      connection: {
        id: connection.id,
        name: connection.name,
        wp_url: connection.wp_url,
        status: connection.status,
        created_at: connection.created_at,
      },
      api_key: key, // Only returned once!
      api_key_prefix: prefix,
      message: 'Save your API key now. It will not be shown again.',
    },
  };
}

// ============================================
// Verify JWT (for Management API)
// ============================================

/**
 * Verify JWT token from Authorization header
 */
export async function verifyAuthToken(
  request: Request,
  jwtSecret: string
): Promise<{ userId: string; email: string; plan: string; is_admin: number } | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return null;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const token = match[1];

  // Skip if it's an API key (starts with n2f_)
  if (token.startsWith('n2f_')) return null;

  const payload = await verifyJWT(token, jwtSecret);
  if (!payload) return null;

  return {
    userId: payload.sub,
    email: payload.email,
    plan: payload.plan,
    is_admin: payload.is_admin || 0,
  };
}

/**
 * Verify admin access - checks JWT + confirms admin status from DB
 */
export async function verifyAdminToken(
  request: Request,
  jwtSecret: string,
  db: D1Database
): Promise<{ userId: string; email: string } | null> {
  const authUser = await verifyAuthToken(request, jwtSecret);
  if (!authUser) return null;

  // Always check DB for current admin status (JWT could be stale)
  const user = await getUserById(db, authUser.userId);
  if (!user || (user as any).is_admin !== 1) return null;

  return { userId: user.id, email: user.email };
}
