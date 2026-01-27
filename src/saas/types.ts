/**
 * SaaS Types and Interfaces
 */

// =============================================================================
// Subscription Tiers
// =============================================================================

export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'business' | 'enterprise';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'past_due';

export interface TierConfig {
  tier: SubscriptionTier;
  name: string;
  priceMonthly: number;
  requestsLimit: number;
  rateLimit: number;
  description: string;
}

export const TIER_CONFIGS: Record<SubscriptionTier, TierConfig> = {
  free: {
    tier: 'free',
    name: 'Free',
    priceMonthly: 0,
    requestsLimit: 1000,
    rateLimit: 10,
    description: 'For testing and small projects',
  },
  starter: {
    tier: 'starter',
    name: 'Starter',
    priceMonthly: 900,
    requestsLimit: 10000,
    rateLimit: 30,
    description: 'For individual developers',
  },
  pro: {
    tier: 'pro',
    name: 'Pro',
    priceMonthly: 2900,
    requestsLimit: 50000,
    rateLimit: 100,
    description: 'For growing projects',
  },
  business: {
    tier: 'business',
    name: 'Business',
    priceMonthly: 9900,
    requestsLimit: 200000,
    rateLimit: 300,
    description: 'For teams and agencies',
  },
  enterprise: {
    tier: 'enterprise',
    name: 'Enterprise',
    priceMonthly: 0,
    requestsLimit: 999999999,
    rateLimit: 1000,
    description: 'Custom pricing for large organizations',
  },
};

// =============================================================================
// Database Models
// =============================================================================

export interface Customer {
  id: string;
  email: string;
  name: string | null;
  password_hash: string;
  tier: SubscriptionTier;
  is_active: number;
  email_verified: number;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  customer_id: string;
  key_hash: string;
  key_prefix: string;
  name: string;
  permissions: string;
  is_active: number;
  last_used_at: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface Subscription {
  id: string;
  customer_id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  requests_limit: number;
  requests_used: number;
  rate_limit: number;
  billing_cycle_start: string | null;
  billing_cycle_end: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UsageLog {
  id: string;
  api_key_id: string;
  customer_id: string;
  tool_name: string;
  wordpress_url: string | null;
  status_code: number | null;
  response_time_ms: number | null;
  error_message: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface UsageDaily {
  id: string;
  customer_id: string;
  date: string;
  requests_count: number;
  successful_count: number;
  errors_count: number;
  total_response_time_ms: number;
}

// =============================================================================
// API Key Format
// =============================================================================

export interface GeneratedApiKey {
  key: string;        // Full key (only shown once): wp_mcp_live_xxxxx
  keyPrefix: string;  // Display prefix: wp_mcp_live_xxxxxxxx
  keyHash: string;    // SHA-256 hash (stored in DB)
}

// =============================================================================
// Auth Context (passed through request)
// =============================================================================

export interface AuthContext {
  customerId: string;
  apiKeyId: string;
  tier: SubscriptionTier;
  subscription: Subscription;
  rateLimit: number;
  requestsRemaining: number;
}

// =============================================================================
// Rate Limit Info
// =============================================================================

export interface RateLimitInfo {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

// =============================================================================
// Usage Stats
// =============================================================================

export interface UsageStats {
  currentPeriod: {
    used: number;
    limit: number;
    remaining: number;
    percentUsed: number;
  };
  today: {
    requests: number;
    successful: number;
    errors: number;
    avgResponseTime: number;
  };
}
