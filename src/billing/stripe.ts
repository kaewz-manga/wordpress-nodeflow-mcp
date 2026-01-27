/**
 * Stripe API Client
 * Handles all Stripe API interactions
 */

import { SubscriptionTier, TIER_CONFIGS } from '../saas/types';
import {
  StripeEnv,
  STRIPE_PRICE_IDS,
  CreateCheckoutParams,
  CheckoutSession,
  CreatePortalParams,
  PortalSession,
  StripeSubscriptionData,
  StripeCustomerData,
  StripeInvoice,
} from './types';

// =============================================================================
// Configuration
// =============================================================================

const STRIPE_API_BASE = 'https://api.stripe.com/v1';

// =============================================================================
// Helper Functions
// =============================================================================

function getAuthHeader(secretKey: string): string {
  return `Basic ${btoa(secretKey + ':')}`;
}

async function stripeRequest<T>(
  secretKey: string,
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: Record<string, string | undefined>
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: getAuthHeader(secretKey),
  };

  let requestBody: string | undefined;

  if (body) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined) {
        params.append(key, value);
      }
    }
    requestBody = params.toString();
  }

  const response = await fetch(`${STRIPE_API_BASE}${endpoint}`, {
    method,
    headers,
    body: requestBody,
  });

  const data = await response.json() as T & { error?: { message: string } };

  if (!response.ok) {
    const errorMessage = data.error?.message || 'Stripe API error';
    throw new Error(`Stripe Error: ${errorMessage}`);
  }

  return data;
}

// =============================================================================
// Customer Management
// =============================================================================

export async function createStripeCustomer(
  env: StripeEnv,
  customerId: string,
  email: string,
  name?: string
): Promise<StripeCustomerData> {
  return stripeRequest<StripeCustomerData>(
    env.STRIPE_SECRET_KEY,
    '/customers',
    'POST',
    {
      email,
      name,
      'metadata[customer_id]': customerId,
    }
  );
}

export async function getStripeCustomer(
  env: StripeEnv,
  stripeCustomerId: string
): Promise<StripeCustomerData> {
  return stripeRequest<StripeCustomerData>(
    env.STRIPE_SECRET_KEY,
    `/customers/${stripeCustomerId}`
  );
}

export async function updateStripeCustomer(
  env: StripeEnv,
  stripeCustomerId: string,
  data: { email?: string; name?: string }
): Promise<StripeCustomerData> {
  return stripeRequest<StripeCustomerData>(
    env.STRIPE_SECRET_KEY,
    `/customers/${stripeCustomerId}`,
    'POST',
    {
      email: data.email,
      name: data.name,
    }
  );
}

// =============================================================================
// Checkout Session
// =============================================================================

export async function createCheckoutSession(
  env: StripeEnv,
  params: CreateCheckoutParams
): Promise<CheckoutSession> {
  const { customerId, customerEmail, tier, successUrl, cancelUrl } = params;

  // Free tier doesn't need checkout
  if (tier === 'free') {
    throw new Error('Free tier does not require checkout');
  }

  // Enterprise requires custom handling
  if (tier === 'enterprise') {
    throw new Error('Enterprise tier requires custom pricing. Please contact sales.');
  }

  const priceId = STRIPE_PRICE_IDS[tier];
  if (!priceId) {
    throw new Error(`Invalid tier: ${tier}`);
  }

  const tierConfig = TIER_CONFIGS[tier];

  const response = await stripeRequest<{ id: string; url: string }>(
    env.STRIPE_SECRET_KEY,
    '/checkout/sessions',
    'POST',
    {
      mode: 'subscription',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      customer_email: customerEmail,
      success_url: successUrl,
      cancel_url: cancelUrl,
      'metadata[customer_id]': customerId,
      'metadata[tier]': tier,
      'subscription_data[metadata][customer_id]': customerId,
      'subscription_data[metadata][tier]': tier,
      'subscription_data[description]': `${tierConfig.name} Plan - ${tierConfig.requestsLimit.toLocaleString()} requests/month`,
    }
  );

  return {
    id: response.id,
    url: response.url,
  };
}

// =============================================================================
// Billing Portal
// =============================================================================

export async function createBillingPortalSession(
  env: StripeEnv,
  params: CreatePortalParams
): Promise<PortalSession> {
  const response = await stripeRequest<{ id: string; url: string }>(
    env.STRIPE_SECRET_KEY,
    '/billing_portal/sessions',
    'POST',
    {
      customer: params.stripeCustomerId,
      return_url: params.returnUrl,
    }
  );

  return {
    id: response.id,
    url: response.url,
  };
}

// =============================================================================
// Subscription Management
// =============================================================================

export async function getStripeSubscription(
  env: StripeEnv,
  subscriptionId: string
): Promise<StripeSubscriptionData> {
  return stripeRequest<StripeSubscriptionData>(
    env.STRIPE_SECRET_KEY,
    `/subscriptions/${subscriptionId}`
  );
}

export async function cancelStripeSubscription(
  env: StripeEnv,
  subscriptionId: string,
  cancelImmediately = false
): Promise<StripeSubscriptionData> {
  if (cancelImmediately) {
    return stripeRequest<StripeSubscriptionData>(
      env.STRIPE_SECRET_KEY,
      `/subscriptions/${subscriptionId}`,
      'DELETE'
    );
  }

  // Cancel at period end
  return stripeRequest<StripeSubscriptionData>(
    env.STRIPE_SECRET_KEY,
    `/subscriptions/${subscriptionId}`,
    'POST',
    {
      cancel_at_period_end: 'true',
    }
  );
}

export async function resumeStripeSubscription(
  env: StripeEnv,
  subscriptionId: string
): Promise<StripeSubscriptionData> {
  return stripeRequest<StripeSubscriptionData>(
    env.STRIPE_SECRET_KEY,
    `/subscriptions/${subscriptionId}`,
    'POST',
    {
      cancel_at_period_end: 'false',
    }
  );
}

export async function updateStripeSubscription(
  env: StripeEnv,
  subscriptionId: string,
  newTier: SubscriptionTier
): Promise<StripeSubscriptionData> {
  if (newTier === 'free' || newTier === 'enterprise') {
    throw new Error(`Cannot upgrade to ${newTier} tier via this method`);
  }

  const priceId = STRIPE_PRICE_IDS[newTier];

  // First get the current subscription to find the item ID
  const currentSub = await getStripeSubscription(env, subscriptionId);
  const itemId = currentSub.items.data[0]?.id;

  if (!itemId) {
    throw new Error('No subscription item found');
  }

  return stripeRequest<StripeSubscriptionData>(
    env.STRIPE_SECRET_KEY,
    `/subscriptions/${subscriptionId}`,
    'POST',
    {
      'items[0][id]': itemId,
      'items[0][price]': priceId,
      'metadata[tier]': newTier,
      proration_behavior: 'create_prorations',
    }
  );
}

// =============================================================================
// Invoices
// =============================================================================

export async function getCustomerInvoices(
  env: StripeEnv,
  stripeCustomerId: string,
  limit = 10
): Promise<StripeInvoice[]> {
  const response = await stripeRequest<{ data: StripeInvoice[] }>(
    env.STRIPE_SECRET_KEY,
    `/invoices?customer=${stripeCustomerId}&limit=${limit}`
  );

  return response.data;
}

export async function getUpcomingInvoice(
  env: StripeEnv,
  stripeCustomerId: string
): Promise<StripeInvoice | null> {
  try {
    return await stripeRequest<StripeInvoice>(
      env.STRIPE_SECRET_KEY,
      `/invoices/upcoming?customer=${stripeCustomerId}`
    );
  } catch {
    // No upcoming invoice (e.g., subscription cancelled)
    return null;
  }
}

// =============================================================================
// Webhook Verification
// =============================================================================

export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  webhookSecret: string
): Promise<boolean> {
  // Parse the signature header
  const parts = signature.split(',');
  const signatureParts: Record<string, string> = {};

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key && value) {
      signatureParts[key] = value;
    }
  }

  const timestamp = signatureParts['t'];
  const expectedSignature = signatureParts['v1'];

  if (!timestamp || !expectedSignature) {
    return false;
  }

  // Check timestamp (allow 5 minutes tolerance)
  const currentTime = Math.floor(Date.now() / 1000);
  const timestampNum = parseInt(timestamp, 10);
  if (Math.abs(currentTime - timestampNum) > 300) {
    return false;
  }

  // Compute expected signature
  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signedPayload)
  );

  const computedSignature = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return computedSignature === expectedSignature;
}

// =============================================================================
// Helper: Map Stripe Status to Our Status
// =============================================================================

export function mapStripeStatusToSubscriptionStatus(
  stripeStatus: string
): 'active' | 'cancelled' | 'expired' | 'past_due' {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'canceled':
    case 'incomplete_expired':
      return 'cancelled';
    default:
      return 'expired';
  }
}

// =============================================================================
// Helper: Get Tier from Price ID
// =============================================================================

export function getTierFromPriceId(priceId: string): SubscriptionTier {
  for (const [tier, id] of Object.entries(STRIPE_PRICE_IDS)) {
    if (id === priceId) {
      return tier as SubscriptionTier;
    }
  }
  return 'free';
}
