/**
 * Authentication API Endpoints
 * POST /api/auth/register - Create new account
 * POST /api/auth/login - Login and get JWT token
 * GET /api/auth/me - Get current user info
 */

import {
  createCustomer,
  findCustomerByEmail,
  authenticateCustomer,
  findSubscriptionByCustomerId,
} from '../saas/customers';
import {
  errorResponse,
  successResponse,
  generateToken,
  verifyToken,
  extractBearerToken,
  parseJsonBody,
  isValidEmail,
  isValidPassword,
} from './utils';

// =============================================================================
// Types
// =============================================================================

interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

// =============================================================================
// Handlers
// =============================================================================

/**
 * POST /api/auth/register
 * Create a new customer account
 */
export async function handleRegister(
  request: Request,
  db: D1Database
): Promise<Response> {
  // Parse body
  const body = await parseJsonBody<RegisterRequest>(request);
  if (!body) {
    return errorResponse('Invalid JSON body', 400, 'INVALID_BODY');
  }

  const { email, password, name } = body;

  // Validate email
  if (!email || !isValidEmail(email)) {
    return errorResponse('Valid email is required', 400, 'INVALID_EMAIL');
  }

  // Validate password
  if (!password) {
    return errorResponse('Password is required', 400, 'MISSING_PASSWORD');
  }
  const passwordCheck = isValidPassword(password);
  if (!passwordCheck.valid) {
    return errorResponse(passwordCheck.message!, 400, 'WEAK_PASSWORD');
  }

  // Check if email already exists
  const existing = await findCustomerByEmail(db, email);
  if (existing) {
    return errorResponse('Email already registered', 409, 'EMAIL_EXISTS');
  }

  // Create customer
  const { customer, subscription } = await createCustomer(db, email, password, name);

  // Generate token
  const token = await generateToken(customer.id, customer.email, customer.tier);

  return successResponse(
    {
      token,
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        tier: customer.tier,
        createdAt: customer.created_at,
      },
      subscription: {
        tier: subscription.tier,
        status: subscription.status,
        requestsLimit: subscription.requests_limit,
        requestsUsed: subscription.requests_used,
        rateLimit: subscription.rate_limit,
      },
    },
    'Account created successfully'
  );
}

/**
 * POST /api/auth/login
 * Authenticate and get JWT token
 */
export async function handleLogin(
  request: Request,
  db: D1Database
): Promise<Response> {
  // Parse body
  const body = await parseJsonBody<LoginRequest>(request);
  if (!body) {
    return errorResponse('Invalid JSON body', 400, 'INVALID_BODY');
  }

  const { email, password } = body;

  // Validate input
  if (!email || !password) {
    return errorResponse('Email and password are required', 400, 'MISSING_CREDENTIALS');
  }

  // Authenticate
  const customer = await authenticateCustomer(db, email, password);
  if (!customer) {
    return errorResponse('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Get subscription
  const subscription = await findSubscriptionByCustomerId(db, customer.id);

  // Generate token
  const token = await generateToken(customer.id, customer.email, customer.tier);

  return successResponse(
    {
      token,
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        tier: customer.tier,
        createdAt: customer.created_at,
      },
      subscription: subscription
        ? {
            tier: subscription.tier,
            status: subscription.status,
            requestsLimit: subscription.requests_limit,
            requestsUsed: subscription.requests_used,
            rateLimit: subscription.rate_limit,
          }
        : null,
    },
    'Login successful'
  );
}

/**
 * GET /api/auth/me
 * Get current authenticated user info
 */
export async function handleGetMe(
  request: Request,
  db: D1Database
): Promise<Response> {
  // Extract and verify token
  const token = extractBearerToken(request);
  if (!token) {
    return errorResponse('Authorization token required', 401, 'MISSING_TOKEN');
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return errorResponse('Invalid or expired token', 401, 'INVALID_TOKEN');
  }

  // Get customer
  const customer = await findCustomerByEmail(db, payload.email);
  if (!customer) {
    return errorResponse('User not found', 404, 'USER_NOT_FOUND');
  }

  // Get subscription
  const subscription = await findSubscriptionByCustomerId(db, customer.id);

  return successResponse({
    customer: {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      tier: customer.tier,
      emailVerified: !!customer.email_verified,
      createdAt: customer.created_at,
    },
    subscription: subscription
      ? {
          tier: subscription.tier,
          status: subscription.status,
          requestsLimit: subscription.requests_limit,
          requestsUsed: subscription.requests_used,
          requestsRemaining: Math.max(0, subscription.requests_limit - subscription.requests_used),
          rateLimit: subscription.rate_limit,
          billingCycleEnd: subscription.billing_cycle_end,
        }
      : null,
  });
}

/**
 * Auth middleware - verify JWT and return customer ID
 */
export async function verifyAuthToken(request: Request): Promise<{
  valid: boolean;
  customerId?: string;
  email?: string;
  error?: Response;
}> {
  const token = extractBearerToken(request);
  if (!token) {
    return {
      valid: false,
      error: errorResponse('Authorization token required', 401, 'MISSING_TOKEN'),
    };
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return {
      valid: false,
      error: errorResponse('Invalid or expired token', 401, 'INVALID_TOKEN'),
    };
  }

  return {
    valid: true,
    customerId: payload.sub,
    email: payload.email,
  };
}
