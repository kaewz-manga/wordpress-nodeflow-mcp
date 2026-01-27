/**
 * SSO API Endpoints
 *
 * POST   /api/sso/providers           - Create SSO provider
 * GET    /api/sso/providers           - List SSO providers
 * GET    /api/sso/providers/:id       - Get SSO provider
 * PATCH  /api/sso/providers/:id       - Update SSO provider
 * DELETE /api/sso/providers/:id       - Delete SSO provider
 * POST   /api/sso/login               - Initiate SSO login
 * GET    /api/sso/discover            - Discover SSO by email domain
 */

import { Customer } from '../saas/types';
import {
  CreateSSOProviderRequest,
  UpdateSSOProviderRequest,
} from '../enterprise/sso/types';
import {
  createSSOProvider,
  getSSOProvider,
  listSSOProviders,
  updateSSOProvider,
  deleteSSOProvider,
  initiateSSOLogin,
  findSSOProviderByDomain,
  generateSAMLMetadata,
} from '../enterprise/sso/service';
import { logCustomerAction } from '../audit/service';
import { jsonResponse, errorResponse, verifyToken, extractBearerToken } from './utils';

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
    return { error: errorResponse('Customer not found', 404, 'CUSTOMER_NOT_FOUND') };
  }

  return { customer };
}

// =============================================================================
// Tier Check
// =============================================================================

function checkEnterpriseTier(customer: Customer): Response | null {
  if (customer.tier !== 'enterprise') {
    return errorResponse('SSO is available for Enterprise tier only', 403, 'TIER_REQUIRED');
  }
  return null;
}

function getBaseUrl(request: Request): string {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

// =============================================================================
// Handlers
// =============================================================================

export async function handleCreateSSOProvider(
  request: Request,
  db: D1Database
): Promise<Response> {
  const auth = await getAuthenticatedCustomer(request, db);
  if (auth.error) return auth.error;

  const tierCheck = checkEnterpriseTier(auth.customer);
  if (tierCheck) return tierCheck;

  let body: CreateSSOProviderRequest;
  try {
    body = await request.json() as CreateSSOProviderRequest;
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  if (!body.name || !body.type || !body.config) {
    return errorResponse('Name, type, and config are required', 400);
  }

  if (!['saml', 'oidc'].includes(body.type)) {
    return errorResponse('Invalid SSO type. Must be saml or oidc', 400);
  }

  const baseUrl = getBaseUrl(request);
  const result = await createSSOProvider(db, auth.customer.id, body, baseUrl);

  if (result.error) {
    return errorResponse(result.error, 400);
  }

  await logCustomerAction(db, auth.customer.id, 'settings.update', request, {
    resourceType: 'sso_provider',
    resourceId: result.provider!.id,
    details: { name: body.name, type: body.type },
  });

  return jsonResponse({ provider: result.provider }, 201);
}

export async function handleListSSOProviders(
  request: Request,
  db: D1Database
): Promise<Response> {
  const auth = await getAuthenticatedCustomer(request, db);
  if (auth.error) return auth.error;

  const tierCheck = checkEnterpriseTier(auth.customer);
  if (tierCheck) return tierCheck;

  const baseUrl = getBaseUrl(request);
  const providers = await listSSOProviders(db, auth.customer.id, baseUrl);
  return jsonResponse({ providers });
}

export async function handleGetSSOProvider(
  request: Request,
  db: D1Database,
  providerId: string
): Promise<Response> {
  const auth = await getAuthenticatedCustomer(request, db);
  if (auth.error) return auth.error;

  const tierCheck = checkEnterpriseTier(auth.customer);
  if (tierCheck) return tierCheck;

  const baseUrl = getBaseUrl(request);
  const provider = await getSSOProvider(db, auth.customer.id, providerId, baseUrl);

  if (!provider) {
    return errorResponse('SSO provider not found', 404);
  }

  return jsonResponse({ provider });
}

export async function handleUpdateSSOProvider(
  request: Request,
  db: D1Database,
  providerId: string
): Promise<Response> {
  const auth = await getAuthenticatedCustomer(request, db);
  if (auth.error) return auth.error;

  const tierCheck = checkEnterpriseTier(auth.customer);
  if (tierCheck) return tierCheck;

  let body: UpdateSSOProviderRequest;
  try {
    body = await request.json() as UpdateSSOProviderRequest;
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  const baseUrl = getBaseUrl(request);
  const result = await updateSSOProvider(db, auth.customer.id, providerId, body, baseUrl);

  if (result.error) {
    return errorResponse(result.error, 400);
  }

  await logCustomerAction(db, auth.customer.id, 'settings.update', request, {
    resourceType: 'sso_provider',
    resourceId: providerId,
  });

  return jsonResponse({ provider: result.provider });
}

export async function handleDeleteSSOProvider(
  request: Request,
  db: D1Database,
  providerId: string
): Promise<Response> {
  const auth = await getAuthenticatedCustomer(request, db);
  if (auth.error) return auth.error;

  const tierCheck = checkEnterpriseTier(auth.customer);
  if (tierCheck) return tierCheck;

  const result = await deleteSSOProvider(db, auth.customer.id, providerId);

  if (result.error) {
    return errorResponse(result.error, 404);
  }

  await logCustomerAction(db, auth.customer.id, 'settings.update', request, {
    resourceType: 'sso_provider',
    resourceId: providerId,
    details: { action: 'deleted' },
  });

  return jsonResponse({ success: true, message: 'SSO provider deleted' });
}

export async function handleInitiateSSOLogin(
  request: Request,
  db: D1Database,
  kv: KVNamespace
): Promise<Response> {
  let body: { providerId: string; returnUrl?: string };
  try {
    body = await request.json() as typeof body;
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  if (!body.providerId) {
    return errorResponse('Provider ID is required', 400);
  }

  const baseUrl = getBaseUrl(request);
  const returnUrl = body.returnUrl || `${baseUrl}/dashboard`;

  const result = await initiateSSOLogin(db, kv, body.providerId, returnUrl, baseUrl);

  if (result.error) {
    return errorResponse(result.error, 400);
  }

  return jsonResponse({
    redirectUrl: result.redirectUrl,
  });
}

export async function handleDiscoverSSO(
  request: Request,
  db: D1Database
): Promise<Response> {
  const url = new URL(request.url);
  const email = url.searchParams.get('email');

  if (!email) {
    return errorResponse('Email is required', 400);
  }

  const baseUrl = getBaseUrl(request);
  const provider = await findSSOProviderByDomain(db, email, baseUrl);

  if (!provider) {
    return jsonResponse({ ssoRequired: false });
  }

  return jsonResponse({
    ssoRequired: true,
    provider: {
      id: provider.id,
      name: provider.name,
      type: provider.type,
    },
  });
}

export async function handleGetSAMLMetadata(
  request: Request,
  db: D1Database,
  providerId: string
): Promise<Response> {
  // Get customer ID from provider
  const provider = await db
    .prepare('SELECT customer_id FROM sso_providers WHERE id = ?')
    .bind(providerId)
    .first<{ customer_id: string }>();

  if (!provider) {
    return errorResponse('Provider not found', 404);
  }

  const baseUrl = getBaseUrl(request);
  const metadata = generateSAMLMetadata(providerId, provider.customer_id, baseUrl);

  return new Response(metadata, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}
