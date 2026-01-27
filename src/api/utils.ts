/**
 * API Utilities
 * Helper functions for REST API responses and JWT handling
 */

// =============================================================================
// Response Helpers
// =============================================================================

export function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function errorResponse(
  message: string,
  status: number = 400,
  code?: string
): Response {
  return jsonResponse(
    {
      error: {
        message,
        code: code || 'ERROR',
        status,
      },
    },
    status
  );
}

export function successResponse(data: unknown, message?: string): Response {
  return jsonResponse({
    success: true,
    message,
    data,
  });
}

// =============================================================================
// JWT Token Handling (Simple implementation using Web Crypto)
// =============================================================================

interface JWTPayload {
  sub: string;  // customer ID
  email: string;
  tier: string;
  iat: number;  // issued at
  exp: number;  // expiration
}

const JWT_SECRET_KEY = 'your-jwt-secret-key';  // In production, use env variable
const JWT_EXPIRY_HOURS = 24 * 7;  // 7 days

/**
 * Base64URL encode
 */
function base64UrlEncode(data: string): string {
  return btoa(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Base64URL decode
 */
function base64UrlDecode(data: string): string {
  const padded = data + '='.repeat((4 - (data.length % 4)) % 4);
  return atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
}

/**
 * Create HMAC-SHA256 signature
 */
async function createSignature(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const signatureArray = Array.from(new Uint8Array(signature));
  return base64UrlEncode(String.fromCharCode(...signatureArray));
}

/**
 * Verify HMAC-SHA256 signature
 */
async function verifySignature(data: string, signature: string, secret: string): Promise<boolean> {
  const expectedSignature = await createSignature(data, secret);
  return signature === expectedSignature;
}

/**
 * Generate JWT token
 */
export async function generateToken(
  customerId: string,
  email: string,
  tier: string,
  secretKey?: string
): Promise<string> {
  const secret = secretKey || JWT_SECRET_KEY;
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'HS256', typ: 'JWT' };
  const payload: JWTPayload = {
    sub: customerId,
    email,
    tier,
    iat: now,
    exp: now + JWT_EXPIRY_HOURS * 3600,
  };

  const headerBase64 = base64UrlEncode(JSON.stringify(header));
  const payloadBase64 = base64UrlEncode(JSON.stringify(payload));
  const dataToSign = `${headerBase64}.${payloadBase64}`;
  const signature = await createSignature(dataToSign, secret);

  return `${dataToSign}.${signature}`;
}

/**
 * Verify and decode JWT token
 */
export async function verifyToken(
  token: string,
  secretKey?: string
): Promise<JWTPayload | null> {
  const secret = secretKey || JWT_SECRET_KEY;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerBase64, payloadBase64, signature] = parts;
    const dataToVerify = `${headerBase64}.${payloadBase64}`;

    // Verify signature
    const isValid = await verifySignature(dataToVerify, signature, secret);
    if (!isValid) return null;

    // Decode payload
    const payload: JWTPayload = JSON.parse(base64UrlDecode(payloadBase64));

    // Check expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Extract JWT from Authorization header
 */
export function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

// =============================================================================
// Request Parsing
// =============================================================================

/**
 * Parse JSON body from request
 */
export async function parseJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return await request.json() as T;
  } catch {
    return null;
  }
}

/**
 * Get query parameter
 */
export function getQueryParam(url: URL, name: string): string | null {
  return url.searchParams.get(name);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  return { valid: true };
}

// =============================================================================
// Database Helpers
// =============================================================================

/**
 * Get customer by ID
 */
export async function getCustomer(
  db: D1Database,
  customerId: string
): Promise<{ id: string; email: string; tier: string; name: string | null } | null> {
  const customer = await db
    .prepare('SELECT id, email, tier, name FROM customers WHERE id = ?')
    .bind(customerId)
    .first<{ id: string; email: string; tier: string; name: string | null }>();

  return customer || null;
}
