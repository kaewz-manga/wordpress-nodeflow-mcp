/**
 * Custom Domains Types
 *
 * Allows Business and Enterprise customers to use their own domain
 * for accessing the MCP API instead of the default api.wordpress-mcp.com
 */

// =============================================================================
// Domain Status
// =============================================================================

export type DomainStatus =
  | 'pending_verification'  // DNS not yet verified
  | 'pending_ssl'           // DNS verified, waiting for SSL
  | 'active'                // Fully configured and working
  | 'ssl_expired'           // SSL certificate expired
  | 'verification_failed'   // DNS verification failed
  | 'suspended';            // Manually suspended

export type DomainType = 'subdomain' | 'custom';

// =============================================================================
// Database Model
// =============================================================================

export interface CustomDomain {
  id: string;
  customer_id: string;
  domain: string;                    // e.g., "api.example.com"
  domain_type: DomainType;
  status: DomainStatus;
  verification_token: string;        // DNS TXT record value
  verification_record: string;       // DNS TXT record name
  verified_at: string | null;
  ssl_status: 'pending' | 'active' | 'expired' | null;
  ssl_expires_at: string | null;
  last_check_at: string | null;
  check_count: number;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// API Request/Response Types
// =============================================================================

export interface CreateDomainRequest {
  domain: string;
}

export interface CreateDomainResponse {
  domain: {
    id: string;
    domain: string;
    status: DomainStatus;
    verification: {
      type: 'TXT';
      name: string;
      value: string;
      instructions: string;
    };
  };
}

export interface DomainResponse {
  id: string;
  domain: string;
  status: DomainStatus;
  domainType: DomainType;
  verification: {
    verified: boolean;
    verifiedAt: string | null;
    record: {
      type: 'TXT';
      name: string;
      value: string;
    };
  };
  ssl: {
    status: string | null;
    expiresAt: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface VerifyDomainResponse {
  verified: boolean;
  status: DomainStatus;
  message: string;
  nextSteps?: string;
}

export interface DomainListResponse {
  domains: DomainResponse[];
  total: number;
  limit: number;
}

// =============================================================================
// DNS Verification Types
// =============================================================================

export interface DNSRecord {
  type: string;
  name: string;
  value: string;
  ttl?: number;
}

export interface DNSVerificationResult {
  success: boolean;
  records: DNSRecord[];
  expectedValue: string;
  foundValue: string | null;
  error?: string;
}

// =============================================================================
// SSL Certificate Types
// =============================================================================

export interface SSLCertificate {
  domain: string;
  status: 'pending' | 'active' | 'expired';
  issuedAt: string | null;
  expiresAt: string | null;
  issuer: string | null;
}

// =============================================================================
// Domain Configuration (Cloudflare Workers)
// =============================================================================

export interface DomainConfig {
  // Cloudflare Zone ID for the custom domain
  zoneId: string | null;

  // Worker route pattern
  routePattern: string;

  // SSL mode
  sslMode: 'flexible' | 'full' | 'strict';

  // Custom headers to add
  customHeaders: Record<string, string>;
}

// =============================================================================
// Tier Limits
// =============================================================================

export const DOMAIN_LIMITS: Record<string, number> = {
  free: 0,
  starter: 0,
  pro: 0,
  business: 3,
  enterprise: 10,
};

// =============================================================================
// Validation
// =============================================================================

export const DOMAIN_VALIDATION = {
  minLength: 4,
  maxLength: 253,
  // Valid domain pattern (no protocol, no trailing slash)
  pattern: /^(?!-)[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/,
  // Reserved/blocked domains
  blockedPatterns: [
    /^localhost/i,
    /^127\./,
    /^192\.168\./,
    /^10\./,
    /\.local$/i,
    /wordpress-mcp\.com$/i,
    /nodeflow\.workers\.dev$/i,
  ],
};
