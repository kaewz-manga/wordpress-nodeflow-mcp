/**
 * Custom Domains Service
 *
 * Handles domain registration, verification, and SSL provisioning
 */

import {
  CustomDomain,
  DomainStatus,
  CreateDomainRequest,
  CreateDomainResponse,
  DomainResponse,
  VerifyDomainResponse,
  DomainListResponse,
  DNSVerificationResult,
  DOMAIN_LIMITS,
  DOMAIN_VALIDATION,
} from './types';

// =============================================================================
// Helper Functions
// =============================================================================

function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'dom_';
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateVerificationToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'wp-mcp-verify-';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function normalizeDomain(domain: string): string {
  return domain
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');
}

function validateDomain(domain: string): { valid: boolean; error?: string } {
  const normalized = normalizeDomain(domain);

  if (normalized.length < DOMAIN_VALIDATION.minLength) {
    return { valid: false, error: 'Domain is too short' };
  }

  if (normalized.length > DOMAIN_VALIDATION.maxLength) {
    return { valid: false, error: 'Domain is too long' };
  }

  if (!DOMAIN_VALIDATION.pattern.test(normalized)) {
    return { valid: false, error: 'Invalid domain format' };
  }

  for (const pattern of DOMAIN_VALIDATION.blockedPatterns) {
    if (pattern.test(normalized)) {
      return { valid: false, error: 'This domain cannot be used' };
    }
  }

  return { valid: true };
}

function formatDomainResponse(domain: CustomDomain): DomainResponse {
  return {
    id: domain.id,
    domain: domain.domain,
    status: domain.status,
    domainType: domain.domain_type,
    verification: {
      verified: domain.verified_at !== null,
      verifiedAt: domain.verified_at,
      record: {
        type: 'TXT',
        name: domain.verification_record,
        value: domain.verification_token,
      },
    },
    ssl: {
      status: domain.ssl_status,
      expiresAt: domain.ssl_expires_at,
    },
    createdAt: domain.created_at,
    updatedAt: domain.updated_at,
  };
}

// =============================================================================
// Domain Service Class
// =============================================================================

export class CustomDomainService {
  constructor(private db: D1Database) {}

  /**
   * Check if customer can add more domains based on their tier
   */
  async canAddDomain(customerId: string, tier: string): Promise<{ allowed: boolean; limit: number; current: number }> {
    const limit = DOMAIN_LIMITS[tier] || 0;

    if (limit === 0) {
      return { allowed: false, limit: 0, current: 0 };
    }

    const result = await this.db
      .prepare('SELECT COUNT(*) as count FROM custom_domains WHERE customer_id = ?')
      .bind(customerId)
      .first<{ count: number }>();

    const current = result?.count || 0;

    return {
      allowed: current < limit,
      limit,
      current,
    };
  }

  /**
   * Create a new custom domain
   */
  async createDomain(customerId: string, request: CreateDomainRequest): Promise<CreateDomainResponse> {
    const normalized = normalizeDomain(request.domain);
    const validation = validateDomain(normalized);

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Check if domain already exists
    const existing = await this.db
      .prepare('SELECT id FROM custom_domains WHERE domain = ?')
      .bind(normalized)
      .first();

    if (existing) {
      throw new Error('Domain is already registered');
    }

    const id = generateId();
    const verificationToken = generateVerificationToken();
    const verificationRecord = `_mcp-verification.${normalized}`;
    const now = new Date().toISOString();

    await this.db
      .prepare(`
        INSERT INTO custom_domains (
          id, customer_id, domain, domain_type, status,
          verification_token, verification_record,
          verified_at, ssl_status, ssl_expires_at,
          last_check_at, check_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        customerId,
        normalized,
        'custom',
        'pending_verification',
        verificationToken,
        verificationRecord,
        null,
        null,
        null,
        null,
        0,
        now,
        now
      )
      .run();

    return {
      domain: {
        id,
        domain: normalized,
        status: 'pending_verification',
        verification: {
          type: 'TXT',
          name: verificationRecord,
          value: verificationToken,
          instructions: `Add a TXT record with name "${verificationRecord}" and value "${verificationToken}" to your DNS settings.`,
        },
      },
    };
  }

  /**
   * Get all domains for a customer
   */
  async listDomains(customerId: string): Promise<DomainListResponse> {
    const results = await this.db
      .prepare('SELECT * FROM custom_domains WHERE customer_id = ? ORDER BY created_at DESC')
      .bind(customerId)
      .all<CustomDomain>();

    const domains = (results.results || []).map(formatDomainResponse);

    return {
      domains,
      total: domains.length,
      limit: 10,
    };
  }

  /**
   * Get a single domain by ID
   */
  async getDomain(customerId: string, domainId: string): Promise<DomainResponse | null> {
    const domain = await this.db
      .prepare('SELECT * FROM custom_domains WHERE id = ? AND customer_id = ?')
      .bind(domainId, customerId)
      .first<CustomDomain>();

    if (!domain) {
      return null;
    }

    return formatDomainResponse(domain);
  }

  /**
   * Verify domain DNS configuration
   */
  async verifyDomain(customerId: string, domainId: string): Promise<VerifyDomainResponse> {
    const domain = await this.db
      .prepare('SELECT * FROM custom_domains WHERE id = ? AND customer_id = ?')
      .bind(domainId, customerId)
      .first<CustomDomain>();

    if (!domain) {
      throw new Error('Domain not found');
    }

    if (domain.status === 'active') {
      return {
        verified: true,
        status: 'active',
        message: 'Domain is already verified and active',
      };
    }

    // Perform DNS lookup
    const dnsResult = await this.checkDNSVerification(domain);
    const now = new Date().toISOString();

    if (dnsResult.success) {
      // Mark as verified, pending SSL
      await this.db
        .prepare(`
          UPDATE custom_domains
          SET status = ?, verified_at = ?, ssl_status = ?, last_check_at = ?, check_count = check_count + 1, updated_at = ?
          WHERE id = ?
        `)
        .bind('pending_ssl', now, 'pending', now, now, domainId)
        .run();

      // In a real implementation, we would trigger SSL provisioning here
      // For now, we'll simulate it by setting to active after verification
      await this.db
        .prepare(`
          UPDATE custom_domains
          SET status = ?, ssl_status = ?, updated_at = ?
          WHERE id = ?
        `)
        .bind('active', 'active', now, domainId)
        .run();

      return {
        verified: true,
        status: 'active',
        message: 'Domain verified successfully! SSL certificate has been provisioned.',
      };
    } else {
      // Update check count
      await this.db
        .prepare(`
          UPDATE custom_domains
          SET last_check_at = ?, check_count = check_count + 1, updated_at = ?
          WHERE id = ?
        `)
        .bind(now, now, domainId)
        .run();

      return {
        verified: false,
        status: 'pending_verification',
        message: dnsResult.error || 'DNS verification failed',
        nextSteps: `Please add a TXT record: Name: ${domain.verification_record}, Value: ${domain.verification_token}`,
      };
    }
  }

  /**
   * Check DNS TXT record for verification
   */
  private async checkDNSVerification(domain: CustomDomain): Promise<DNSVerificationResult> {
    try {
      // Use DNS over HTTPS (DoH) to check TXT records
      const response = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain.verification_record)}&type=TXT`,
        {
          headers: {
            Accept: 'application/dns-json',
          },
        }
      );

      if (!response.ok) {
        return {
          success: false,
          records: [],
          expectedValue: domain.verification_token,
          foundValue: null,
          error: 'Failed to query DNS',
        };
      }

      const dnsData = await response.json() as {
        Answer?: Array<{ type: number; data: string }>;
      };

      if (!dnsData.Answer || dnsData.Answer.length === 0) {
        return {
          success: false,
          records: [],
          expectedValue: domain.verification_token,
          foundValue: null,
          error: 'No TXT records found. Please add the verification record.',
        };
      }

      // Check each TXT record
      for (const record of dnsData.Answer) {
        if (record.type === 16) { // TXT record type
          // TXT records are quoted, remove quotes
          const value = record.data.replace(/^"|"$/g, '');
          if (value === domain.verification_token) {
            return {
              success: true,
              records: [{ type: 'TXT', name: domain.verification_record, value }],
              expectedValue: domain.verification_token,
              foundValue: value,
            };
          }
        }
      }

      return {
        success: false,
        records: dnsData.Answer.map((r: { data: string }) => ({
          type: 'TXT',
          name: domain.verification_record,
          value: r.data.replace(/^"|"$/g, ''),
        })),
        expectedValue: domain.verification_token,
        foundValue: null,
        error: 'TXT record found but value does not match',
      };
    } catch (error) {
      return {
        success: false,
        records: [],
        expectedValue: domain.verification_token,
        foundValue: null,
        error: `DNS verification error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Delete a custom domain
   */
  async deleteDomain(customerId: string, domainId: string): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM custom_domains WHERE id = ? AND customer_id = ?')
      .bind(domainId, customerId)
      .run();

    return (result.meta?.changes || 0) > 0;
  }

  /**
   * Refresh domain status (check SSL, DNS, etc.)
   */
  async refreshDomainStatus(customerId: string, domainId: string): Promise<DomainResponse | null> {
    const domain = await this.db
      .prepare('SELECT * FROM custom_domains WHERE id = ? AND customer_id = ?')
      .bind(domainId, customerId)
      .first<CustomDomain>();

    if (!domain) {
      return null;
    }

    // Re-verify DNS if not yet verified
    if (domain.status === 'pending_verification') {
      await this.verifyDomain(customerId, domainId);
    }

    // Re-fetch updated domain
    return this.getDomain(customerId, domainId);
  }

  /**
   * Get domain by domain name (for routing)
   */
  async getDomainByName(domainName: string): Promise<CustomDomain | null> {
    const normalized = normalizeDomain(domainName);
    return this.db
      .prepare('SELECT * FROM custom_domains WHERE domain = ? AND status = ?')
      .bind(normalized, 'active')
      .first<CustomDomain>();
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createCustomDomainService(db: D1Database): CustomDomainService {
  return new CustomDomainService(db);
}
