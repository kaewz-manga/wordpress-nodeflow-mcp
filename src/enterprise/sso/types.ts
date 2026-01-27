/**
 * SSO/SAML Types and Configuration
 */

// =============================================================================
// SSO Provider Types
// =============================================================================

export type SSOProviderType = 'saml' | 'oidc';

export interface SSOProvider {
  id: string;
  customer_id: string;
  name: string;
  type: SSOProviderType;
  config: string;              // JSON configuration
  is_active: number;
  is_default: number;          // Default provider for customer
  domain: string | null;       // Email domain for auto-matching
  created_at: string;
  updated_at: string;
}

// =============================================================================
// SAML Configuration
// =============================================================================

export interface SAMLConfig {
  // Identity Provider (IdP) Settings
  idpEntityId: string;         // IdP Entity ID
  idpSsoUrl: string;           // IdP Single Sign-On URL
  idpCertificate: string;      // IdP X.509 Certificate (PEM format)
  idpSloUrl?: string;          // IdP Single Logout URL (optional)

  // Service Provider (SP) Settings - Auto-generated
  spEntityId?: string;         // Our Entity ID
  spAcsUrl?: string;           // Assertion Consumer Service URL
  spSloUrl?: string;           // Single Logout URL

  // Attribute Mapping
  attributeMapping?: {
    email?: string;            // Default: email or nameID
    firstName?: string;        // Default: firstName or givenName
    lastName?: string;         // Default: lastName or surname
    displayName?: string;      // Default: displayName or cn
  };

  // Options
  signRequests?: boolean;      // Sign SAML requests
  wantAssertionsSigned?: boolean; // Require signed assertions
  allowUnsolicitedResponse?: boolean;
}

// =============================================================================
// OIDC Configuration (OpenID Connect)
// =============================================================================

export interface OIDCConfig {
  issuer: string;              // OIDC Issuer URL
  clientId: string;
  clientSecret: string;
  authorizationUrl?: string;   // If not discoverable
  tokenUrl?: string;           // If not discoverable
  userInfoUrl?: string;        // If not discoverable
  scopes?: string[];           // Default: ['openid', 'email', 'profile']

  // Attribute Mapping
  attributeMapping?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
  };
}

// =============================================================================
// SSO Session
// =============================================================================

export interface SSOSession {
  id: string;
  customer_id: string;
  provider_id: string;
  team_member_id: string | null;
  session_index: string | null;  // SAML SessionIndex
  name_id: string | null;        // SAML NameID
  attributes: string | null;     // JSON - Received attributes
  expires_at: string;
  created_at: string;
}

// =============================================================================
// API Request/Response Types
// =============================================================================

export interface CreateSSOProviderRequest {
  name: string;
  type: SSOProviderType;
  domain?: string;
  config: SAMLConfig | OIDCConfig;
}

export interface UpdateSSOProviderRequest {
  name?: string;
  domain?: string;
  config?: Partial<SAMLConfig | OIDCConfig>;
  is_active?: boolean;
  is_default?: boolean;
}

export interface SSOProviderResponse {
  id: string;
  name: string;
  type: SSOProviderType;
  domain: string | null;
  isActive: boolean;
  isDefault: boolean;
  spMetadata?: SPMetadata;
  createdAt: string;
}

export interface SPMetadata {
  entityId: string;
  acsUrl: string;
  sloUrl: string;
  metadataUrl: string;
}

// =============================================================================
// SAML Request/Response
// =============================================================================

export interface SAMLAuthRequest {
  id: string;
  issueInstant: string;
  destination: string;
  assertionConsumerServiceURL: string;
  issuer: string;
}

export interface SAMLAssertion {
  issuer: string;
  nameId: string;
  nameIdFormat: string;
  sessionIndex?: string;
  attributes: Record<string, string | string[]>;
  notBefore?: string;
  notOnOrAfter?: string;
  audience?: string;
}

// =============================================================================
// SSO Login State
// =============================================================================

export interface SSOLoginState {
  providerId: string;
  returnUrl: string;
  requestId: string;
  createdAt: number;
}
