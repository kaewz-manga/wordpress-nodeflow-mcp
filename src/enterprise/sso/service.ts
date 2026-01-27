/**
 * SSO Service
 * Manages SSO providers and authentication
 */

import {
  SSOProvider,
  SSOProviderType,
  SAMLConfig,
  CreateSSOProviderRequest,
  UpdateSSOProviderRequest,
  SSOProviderResponse,
  SPMetadata,
  SSOLoginState,
} from './types';

// =============================================================================
// Constants
// =============================================================================

const SSO_STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_PROVIDERS_PER_CUSTOMER = 5;

// =============================================================================
// Helper Functions
// =============================================================================

function generateId(): string {
  return crypto.randomUUID();
}

function providerToResponse(provider: SSOProvider, baseUrl: string): SSOProviderResponse {
  const response: SSOProviderResponse = {
    id: provider.id,
    name: provider.name,
    type: provider.type as SSOProviderType,
    domain: provider.domain,
    isActive: provider.is_active === 1,
    isDefault: provider.is_default === 1,
    createdAt: provider.created_at,
  };

  // Add SP metadata for SAML providers
  if (provider.type === 'saml') {
    response.spMetadata = generateSPMetadata(provider.id, provider.customer_id, baseUrl);
  }

  return response;
}

function generateSPMetadata(providerId: string, _customerId: string, baseUrl: string): SPMetadata {
  return {
    entityId: `${baseUrl}/sso/saml/${providerId}/metadata`,
    acsUrl: `${baseUrl}/sso/saml/${providerId}/acs`,
    sloUrl: `${baseUrl}/sso/saml/${providerId}/slo`,
    metadataUrl: `${baseUrl}/sso/saml/${providerId}/metadata`,
  };
}

// =============================================================================
// Provider CRUD
// =============================================================================

export async function createSSOProvider(
  db: D1Database,
  customerId: string,
  request: CreateSSOProviderRequest,
  baseUrl: string
): Promise<{ provider?: SSOProviderResponse; error?: string }> {
  // Check provider limit
  const countResult = await db
    .prepare('SELECT COUNT(*) as count FROM sso_providers WHERE customer_id = ?')
    .bind(customerId)
    .first<{ count: number }>();

  if (countResult && countResult.count >= MAX_PROVIDERS_PER_CUSTOMER) {
    return { error: `Maximum ${MAX_PROVIDERS_PER_CUSTOMER} SSO providers allowed` };
  }

  // Validate configuration
  if (request.type === 'saml') {
    const samlConfig = request.config as SAMLConfig;
    if (!samlConfig.idpEntityId || !samlConfig.idpSsoUrl || !samlConfig.idpCertificate) {
      return { error: 'SAML config requires idpEntityId, idpSsoUrl, and idpCertificate' };
    }
  }

  // Check domain uniqueness within customer
  if (request.domain) {
    const existing = await db
      .prepare('SELECT id FROM sso_providers WHERE customer_id = ? AND domain = ?')
      .bind(customerId, request.domain.toLowerCase())
      .first();

    if (existing) {
      return { error: 'A provider with this domain already exists' };
    }
  }

  const id = generateId();
  const isFirst = countResult?.count === 0;

  // Add SP metadata to SAML config
  let configToStore = request.config;
  if (request.type === 'saml') {
    const spMetadata = generateSPMetadata(id, customerId, baseUrl);
    configToStore = {
      ...request.config,
      spEntityId: spMetadata.entityId,
      spAcsUrl: spMetadata.acsUrl,
      spSloUrl: spMetadata.sloUrl,
    };
  }

  await db
    .prepare(
      `INSERT INTO sso_providers
       (id, customer_id, name, type, config, domain, is_active, is_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, datetime('now'), datetime('now'))`
    )
    .bind(
      id,
      customerId,
      request.name,
      request.type,
      JSON.stringify(configToStore),
      request.domain?.toLowerCase() || null,
      isFirst ? 1 : 0
    )
    .run();

  const provider = await db
    .prepare('SELECT * FROM sso_providers WHERE id = ?')
    .bind(id)
    .first<SSOProvider>();

  if (!provider) {
    return { error: 'Failed to create SSO provider' };
  }

  return { provider: providerToResponse(provider, baseUrl) };
}

export async function getSSOProvider(
  db: D1Database,
  customerId: string,
  providerId: string,
  baseUrl: string
): Promise<SSOProviderResponse | null> {
  const provider = await db
    .prepare('SELECT * FROM sso_providers WHERE id = ? AND customer_id = ?')
    .bind(providerId, customerId)
    .first<SSOProvider>();

  return provider ? providerToResponse(provider, baseUrl) : null;
}

export async function listSSOProviders(
  db: D1Database,
  customerId: string,
  baseUrl: string
): Promise<SSOProviderResponse[]> {
  const result = await db
    .prepare('SELECT * FROM sso_providers WHERE customer_id = ? ORDER BY created_at ASC')
    .bind(customerId)
    .all<SSOProvider>();

  return result.results.map(p => providerToResponse(p, baseUrl));
}

export async function updateSSOProvider(
  db: D1Database,
  customerId: string,
  providerId: string,
  request: UpdateSSOProviderRequest,
  baseUrl: string
): Promise<{ provider?: SSOProviderResponse; error?: string }> {
  const existing = await db
    .prepare('SELECT * FROM sso_providers WHERE id = ? AND customer_id = ?')
    .bind(providerId, customerId)
    .first<SSOProvider>();

  if (!existing) {
    return { error: 'SSO provider not found' };
  }

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (request.name !== undefined) {
    updates.push('name = ?');
    values.push(request.name);
  }

  if (request.domain !== undefined) {
    // Check domain uniqueness
    if (request.domain) {
      const duplicate = await db
        .prepare('SELECT id FROM sso_providers WHERE customer_id = ? AND domain = ? AND id != ?')
        .bind(customerId, request.domain.toLowerCase(), providerId)
        .first();

      if (duplicate) {
        return { error: 'A provider with this domain already exists' };
      }
    }

    updates.push('domain = ?');
    values.push(request.domain?.toLowerCase() || null);
  }

  if (request.config !== undefined) {
    const existingConfig = JSON.parse(existing.config);
    const newConfig = { ...existingConfig, ...request.config };
    updates.push('config = ?');
    values.push(JSON.stringify(newConfig));
  }

  if (request.is_active !== undefined) {
    updates.push('is_active = ?');
    values.push(request.is_active ? 1 : 0);
  }

  if (request.is_default !== undefined && request.is_default) {
    // Unset other defaults first
    await db
      .prepare("UPDATE sso_providers SET is_default = 0 WHERE customer_id = ?")
      .bind(customerId)
      .run();

    updates.push('is_default = 1');
  }

  if (updates.length === 0) {
    return { provider: providerToResponse(existing, baseUrl) };
  }

  updates.push("updated_at = datetime('now')");
  values.push(providerId);

  await db
    .prepare(`UPDATE sso_providers SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  const updated = await db
    .prepare('SELECT * FROM sso_providers WHERE id = ?')
    .bind(providerId)
    .first<SSOProvider>();

  return { provider: updated ? providerToResponse(updated, baseUrl) : undefined };
}

export async function deleteSSOProvider(
  db: D1Database,
  customerId: string,
  providerId: string
): Promise<{ success: boolean; error?: string }> {
  const result = await db
    .prepare('DELETE FROM sso_providers WHERE id = ? AND customer_id = ?')
    .bind(providerId, customerId)
    .run();

  if (result.meta.changes === 0) {
    return { success: false, error: 'SSO provider not found' };
  }

  // Delete sessions
  await db
    .prepare('DELETE FROM sso_sessions WHERE provider_id = ?')
    .bind(providerId)
    .run();

  return { success: true };
}

// =============================================================================
// SSO Login Flow
// =============================================================================

export async function initiateSSOLogin(
  db: D1Database,
  kv: KVNamespace,
  providerId: string,
  returnUrl: string,
  baseUrl: string
): Promise<{ redirectUrl?: string; error?: string }> {
  const provider = await db
    .prepare('SELECT * FROM sso_providers WHERE id = ? AND is_active = 1')
    .bind(providerId)
    .first<SSOProvider>();

  if (!provider) {
    return { error: 'SSO provider not found or inactive' };
  }

  if (provider.type === 'saml') {
    return initiateSAMLLogin(kv, provider, returnUrl, baseUrl);
  } else {
    return initiateOIDCLogin(kv, provider, returnUrl, baseUrl);
  }
}

async function initiateSAMLLogin(
  kv: KVNamespace,
  provider: SSOProvider,
  returnUrl: string,
  baseUrl: string
): Promise<{ redirectUrl?: string; error?: string }> {
  const config = JSON.parse(provider.config) as SAMLConfig;

  // Generate SAML AuthnRequest
  const requestId = `_${generateId().replace(/-/g, '')}`;
  const issueInstant = new Date().toISOString();
  const acsUrl = `${baseUrl}/sso/saml/${provider.id}/acs`;

  const authnRequest = `
    <samlp:AuthnRequest
      xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
      xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
      ID="${requestId}"
      Version="2.0"
      IssueInstant="${issueInstant}"
      Destination="${config.idpSsoUrl}"
      AssertionConsumerServiceURL="${acsUrl}"
      ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
      <saml:Issuer>${config.spEntityId || acsUrl}</saml:Issuer>
      <samlp:NameIDPolicy
        Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
        AllowCreate="true"/>
    </samlp:AuthnRequest>
  `.trim().replace(/\n\s*/g, '');

  // Store state in KV
  const state: SSOLoginState = {
    providerId: provider.id,
    returnUrl,
    requestId,
    createdAt: Date.now(),
  };

  await kv.put(`sso_state:${requestId}`, JSON.stringify(state), {
    expirationTtl: SSO_STATE_EXPIRY_MS / 1000,
  });

  // Encode and redirect
  const encodedRequest = btoa(authnRequest);
  const redirectUrl = `${config.idpSsoUrl}?SAMLRequest=${encodeURIComponent(encodedRequest)}&RelayState=${encodeURIComponent(requestId)}`;

  return { redirectUrl };
}

async function initiateOIDCLogin(
  kv: KVNamespace,
  provider: SSOProvider,
  returnUrl: string,
  baseUrl: string
): Promise<{ redirectUrl?: string; error?: string }> {
  // OIDC login is similar to OAuth
  // Generate state and redirect to authorization URL
  const config = JSON.parse(provider.config);

  const state = generateId();
  const stateData: SSOLoginState = {
    providerId: provider.id,
    returnUrl,
    requestId: state,
    createdAt: Date.now(),
  };

  await kv.put(`sso_state:${state}`, JSON.stringify(stateData), {
    expirationTtl: SSO_STATE_EXPIRY_MS / 1000,
  });

  const scopes = config.scopes || ['openid', 'email', 'profile'];
  const redirectUri = `${baseUrl}/sso/oidc/${provider.id}/callback`;

  const authUrl = new URL(config.authorizationUrl || `${config.issuer}/authorize`);
  authUrl.searchParams.set('client_id', config.clientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scopes.join(' '));
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', state);

  return { redirectUrl: authUrl.toString() };
}

// =============================================================================
// Domain-based SSO Discovery
// =============================================================================

export async function findSSOProviderByDomain(
  db: D1Database,
  email: string,
  baseUrl: string
): Promise<SSOProviderResponse | null> {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) {
    return null;
  }

  const provider = await db
    .prepare('SELECT * FROM sso_providers WHERE domain = ? AND is_active = 1')
    .bind(domain)
    .first<SSOProvider>();

  return provider ? providerToResponse(provider, baseUrl) : null;
}

// =============================================================================
// SSO State Management
// =============================================================================

export async function getSSOState(
  kv: KVNamespace,
  stateId: string
): Promise<SSOLoginState | null> {
  const stateJson = await kv.get(`sso_state:${stateId}`);
  if (!stateJson) {
    return null;
  }

  const state = JSON.parse(stateJson) as SSOLoginState;

  // Check expiry
  if (Date.now() - state.createdAt > SSO_STATE_EXPIRY_MS) {
    await kv.delete(`sso_state:${stateId}`);
    return null;
  }

  return state;
}

export async function deleteSSOState(
  kv: KVNamespace,
  stateId: string
): Promise<void> {
  await kv.delete(`sso_state:${stateId}`);
}

// =============================================================================
// SAML Metadata Generation
// =============================================================================

export function generateSAMLMetadata(
  providerId: string,
  customerId: string,
  baseUrl: string
): string {
  const sp = generateSPMetadata(providerId, customerId, baseUrl);

  return `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                     entityID="${sp.entityId}">
  <md:SPSSODescriptor AuthnRequestsSigned="false"
                      WantAssertionsSigned="true"
                      protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                                 Location="${sp.acsUrl}"
                                 index="0"
                                 isDefault="true"/>
    <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                            Location="${sp.sloUrl}"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;
}
