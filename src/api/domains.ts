/**
 * Custom Domains API Handlers
 *
 * Endpoints for managing custom domains (Business and Enterprise tiers)
 */

import { Customer } from '../saas/types';
import { errorResponse, jsonResponse, verifyToken, extractBearerToken } from './utils';
import { createCustomDomainService, DOMAIN_LIMITS } from '../custom-domains';

// =============================================================================
// Types
// =============================================================================

interface CreateDomainBody {
  domain: string;
}

// =============================================================================
// Auth Helper
// =============================================================================

async function getAuthenticatedCustomer(
  request: Request,
  db: D1Database
): Promise<{ customer: Customer; error?: never } | { customer?: never; error: Response }> {
  const token = extractBearerToken(request);
  if (!token) {
    return { error: errorResponse('Authorization token required', 401, 'MISSING_TOKEN') };
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return { error: errorResponse('Invalid or expired token', 401, 'INVALID_TOKEN') };
  }

  const customer = await db
    .prepare('SELECT * FROM customers WHERE id = ?')
    .bind(payload.sub)
    .first<Customer>();

  if (!customer) {
    return { error: errorResponse('Customer not found', 404, 'NOT_FOUND') };
  }

  return { customer };
}

function checkDomainTierAccess(tier: string): Response | null {
  const limit = DOMAIN_LIMITS[tier] || 0;
  if (limit === 0) {
    return errorResponse(
      'Custom domains are available for Business and Enterprise plans',
      403,
      'TIER_REQUIRED'
    );
  }
  return null;
}

// =============================================================================
// Handlers
// =============================================================================

/**
 * GET /api/domains - List customer's custom domains
 */
export async function handleListDomains(
  request: Request,
  db: D1Database
): Promise<Response> {
  const authResult = await getAuthenticatedCustomer(request, db);
  if (authResult.error) return authResult.error;

  const tierCheck = checkDomainTierAccess(authResult.customer.tier);
  if (tierCheck) return tierCheck;

  const service = createCustomDomainService(db);
  const result = await service.listDomains(authResult.customer.id);

  return jsonResponse(result);
}

/**
 * POST /api/domains - Create a new custom domain
 */
export async function handleCreateDomain(
  request: Request,
  db: D1Database
): Promise<Response> {
  const authResult = await getAuthenticatedCustomer(request, db);
  if (authResult.error) return authResult.error;

  const tierCheck = checkDomainTierAccess(authResult.customer.tier);
  if (tierCheck) return tierCheck;

  // Check domain limit
  const service = createCustomDomainService(db);
  const limitCheck = await service.canAddDomain(authResult.customer.id, authResult.customer.tier);

  if (!limitCheck.allowed) {
    return errorResponse(
      `Domain limit reached (${limitCheck.current}/${limitCheck.limit}). Upgrade to add more domains.`,
      403,
      'DOMAIN_LIMIT_REACHED'
    );
  }

  // Parse request body
  let body: CreateDomainBody;
  try {
    body = await request.json() as CreateDomainBody;
  } catch {
    return errorResponse('Invalid JSON body', 400, 'INVALID_JSON');
  }

  if (!body.domain || typeof body.domain !== 'string') {
    return errorResponse('Domain is required', 400, 'VALIDATION_ERROR');
  }

  try {
    const result = await service.createDomain(authResult.customer.id, { domain: body.domain });
    return jsonResponse(result, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create domain';
    return errorResponse(message, 400, 'CREATE_FAILED');
  }
}

/**
 * GET /api/domains/:id - Get a specific domain
 */
export async function handleGetDomain(
  request: Request,
  db: D1Database,
  domainId: string
): Promise<Response> {
  const authResult = await getAuthenticatedCustomer(request, db);
  if (authResult.error) return authResult.error;

  const tierCheck = checkDomainTierAccess(authResult.customer.tier);
  if (tierCheck) return tierCheck;

  const service = createCustomDomainService(db);
  const domain = await service.getDomain(authResult.customer.id, domainId);

  if (!domain) {
    return errorResponse('Domain not found', 404, 'NOT_FOUND');
  }

  return jsonResponse({ domain });
}

/**
 * POST /api/domains/:id/verify - Verify domain DNS configuration
 */
export async function handleVerifyDomain(
  request: Request,
  db: D1Database,
  domainId: string
): Promise<Response> {
  const authResult = await getAuthenticatedCustomer(request, db);
  if (authResult.error) return authResult.error;

  const tierCheck = checkDomainTierAccess(authResult.customer.tier);
  if (tierCheck) return tierCheck;

  const service = createCustomDomainService(db);

  try {
    const result = await service.verifyDomain(authResult.customer.id, domainId);
    return jsonResponse(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Verification failed';
    return errorResponse(message, 400, 'VERIFICATION_FAILED');
  }
}

/**
 * POST /api/domains/:id/refresh - Refresh domain status
 */
export async function handleRefreshDomain(
  request: Request,
  db: D1Database,
  domainId: string
): Promise<Response> {
  const authResult = await getAuthenticatedCustomer(request, db);
  if (authResult.error) return authResult.error;

  const tierCheck = checkDomainTierAccess(authResult.customer.tier);
  if (tierCheck) return tierCheck;

  const service = createCustomDomainService(db);
  const domain = await service.refreshDomainStatus(authResult.customer.id, domainId);

  if (!domain) {
    return errorResponse('Domain not found', 404, 'NOT_FOUND');
  }

  return jsonResponse({ domain });
}

/**
 * DELETE /api/domains/:id - Delete a custom domain
 */
export async function handleDeleteDomain(
  request: Request,
  db: D1Database,
  domainId: string
): Promise<Response> {
  const authResult = await getAuthenticatedCustomer(request, db);
  if (authResult.error) return authResult.error;

  const tierCheck = checkDomainTierAccess(authResult.customer.tier);
  if (tierCheck) return tierCheck;

  const service = createCustomDomainService(db);
  const deleted = await service.deleteDomain(authResult.customer.id, domainId);

  if (!deleted) {
    return errorResponse('Domain not found', 404, 'NOT_FOUND');
  }

  return jsonResponse({ success: true, message: 'Domain deleted successfully' });
}

/**
 * GET /api/domains/limits - Get domain limits for current tier
 */
export async function handleGetDomainLimits(
  request: Request,
  db: D1Database
): Promise<Response> {
  const authResult = await getAuthenticatedCustomer(request, db);
  if (authResult.error) return authResult.error;

  const service = createCustomDomainService(db);
  const limitInfo = await service.canAddDomain(authResult.customer.id, authResult.customer.tier);

  return jsonResponse({
    tier: authResult.customer.tier,
    limit: limitInfo.limit,
    used: limitInfo.current,
    remaining: Math.max(0, limitInfo.limit - limitInfo.current),
    canAddMore: limitInfo.allowed,
    allLimits: DOMAIN_LIMITS,
  });
}
