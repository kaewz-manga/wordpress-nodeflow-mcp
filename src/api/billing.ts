/**
 * Billing API Endpoints
 *
 * GET  /api/billing - Get billing info
 * POST /api/billing/checkout - Create checkout session
 * POST /api/billing/portal - Create billing portal session
 * GET  /api/billing/invoices - Get invoices
 * POST /api/billing/cancel - Cancel subscription
 * POST /api/billing/resume - Resume cancelled subscription
 */

import { TIER_CONFIGS, SubscriptionTier, Subscription, Customer } from '../saas/types';
import { StripeEnv, BillingInfo, InvoiceInfo } from '../billing/types';
import {
  createCheckoutSession,
  createBillingPortalSession,
  cancelStripeSubscription,
  resumeStripeSubscription,
  getCustomerInvoices,
  createStripeCustomer,
} from '../billing/stripe';
import { jsonResponse, errorResponse, verifyToken, extractBearerToken } from './utils';

// =============================================================================
// Types
// =============================================================================

interface BillingEnv extends StripeEnv {
  DB: D1Database;
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
    return { error: errorResponse('Customer not found', 404, 'CUSTOMER_NOT_FOUND') };
  }

  return { customer };
}

// =============================================================================
// GET /api/billing - Get billing info
// =============================================================================

export async function handleGetBilling(
  request: Request,
  env: BillingEnv
): Promise<Response> {
  const auth = await getAuthenticatedCustomer(request, env.DB);
  if (auth.error) return auth.error;
  const { customer } = auth;

  // Get subscription
  const subscription = await env.DB
    .prepare('SELECT * FROM subscriptions WHERE customer_id = ?')
    .bind(customer.id)
    .first<Subscription>();

  if (!subscription) {
    return errorResponse('Subscription not found', 404);
  }

  const tierConfig = TIER_CONFIGS[subscription.tier as SubscriptionTier] || TIER_CONFIGS.free;

  const billingInfo: BillingInfo = {
    hasSubscription: subscription.tier !== 'free',
    tier: subscription.tier as SubscriptionTier,
    status: subscription.status,
    currentPeriodEnd: subscription.billing_cycle_end,
    cancelAtPeriodEnd: false, // This would be fetched from Stripe if needed
    stripeCustomerId: subscription.stripe_customer_id,
  };

  return jsonResponse({
    billing: billingInfo,
    plan: {
      name: tierConfig.name,
      price: tierConfig.priceMonthly,
      requestsLimit: tierConfig.requestsLimit,
      rateLimit: tierConfig.rateLimit,
    },
    usage: {
      used: subscription.requests_used,
      limit: subscription.requests_limit,
      remaining: Math.max(0, subscription.requests_limit - subscription.requests_used),
    },
  });
}

// =============================================================================
// POST /api/billing/checkout - Create checkout session
// =============================================================================

export async function handleCreateCheckout(
  request: Request,
  env: BillingEnv
): Promise<Response> {
  const auth = await getAuthenticatedCustomer(request, env.DB);
  if (auth.error) return auth.error;
  const { customer } = auth;

  let body: { tier?: string; successUrl?: string; cancelUrl?: string };
  try {
    body = await request.json() as typeof body;
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  const tier = body.tier as SubscriptionTier;
  if (!tier || !['starter', 'pro', 'business'].includes(tier)) {
    return errorResponse('Invalid tier. Must be one of: starter, pro, business', 400);
  }

  // Get return URLs from request or use defaults
  const origin = new URL(request.url).origin;
  const successUrl = body.successUrl || `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = body.cancelUrl || `${origin}/billing/cancel`;

  try {
    const session = await createCheckoutSession(env, {
      customerId: customer.id,
      customerEmail: customer.email,
      tier,
      successUrl,
      cancelUrl,
    });

    return jsonResponse({
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create checkout session';
    return errorResponse(message, 500);
  }
}

// =============================================================================
// POST /api/billing/portal - Create billing portal session
// =============================================================================

export async function handleCreatePortal(
  request: Request,
  env: BillingEnv
): Promise<Response> {
  const auth = await getAuthenticatedCustomer(request, env.DB);
  if (auth.error) return auth.error;
  const { customer } = auth;

  // Get subscription to find Stripe customer ID
  const subscription = await env.DB
    .prepare('SELECT stripe_customer_id FROM subscriptions WHERE customer_id = ?')
    .bind(customer.id)
    .first<{ stripe_customer_id: string | null }>();

  if (!subscription?.stripe_customer_id) {
    return errorResponse('No active subscription found. Please subscribe first.', 400);
  }

  let body: { returnUrl?: string };
  try {
    body = await request.json() as typeof body;
  } catch {
    body = {};
  }

  const origin = new URL(request.url).origin;
  const returnUrl = body.returnUrl || `${origin}/billing`;

  try {
    const session = await createBillingPortalSession(env, {
      stripeCustomerId: subscription.stripe_customer_id,
      returnUrl,
    });

    return jsonResponse({
      portalUrl: session.url,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create portal session';
    return errorResponse(message, 500);
  }
}

// =============================================================================
// GET /api/billing/invoices - Get invoices
// =============================================================================

export async function handleGetInvoices(
  request: Request,
  env: BillingEnv
): Promise<Response> {
  const auth = await getAuthenticatedCustomer(request, env.DB);
  if (auth.error) return auth.error;
  const { customer } = auth;

  // Get subscription to find Stripe customer ID
  const subscription = await env.DB
    .prepare('SELECT stripe_customer_id FROM subscriptions WHERE customer_id = ?')
    .bind(customer.id)
    .first<{ stripe_customer_id: string | null }>();

  if (!subscription?.stripe_customer_id) {
    return jsonResponse({ invoices: [] });
  }

  try {
    const stripeInvoices = await getCustomerInvoices(env, subscription.stripe_customer_id);

    const invoices: InvoiceInfo[] = stripeInvoices.map((inv) => ({
      id: inv.id,
      date: new Date(inv.created * 1000).toISOString(),
      amount: inv.amount_paid,
      currency: inv.currency.toUpperCase(),
      status: inv.status,
      pdfUrl: inv.invoice_pdf,
      hostedUrl: inv.hosted_invoice_url,
    }));

    return jsonResponse({ invoices });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch invoices';
    return errorResponse(message, 500);
  }
}

// =============================================================================
// POST /api/billing/cancel - Cancel subscription
// =============================================================================

export async function handleCancelSubscription(
  request: Request,
  env: BillingEnv
): Promise<Response> {
  const auth = await getAuthenticatedCustomer(request, env.DB);
  if (auth.error) return auth.error;
  const { customer } = auth;

  // Get subscription
  const subscription = await env.DB
    .prepare('SELECT stripe_subscription_id, tier FROM subscriptions WHERE customer_id = ?')
    .bind(customer.id)
    .first<{ stripe_subscription_id: string | null; tier: string }>();

  if (!subscription?.stripe_subscription_id) {
    return errorResponse('No active subscription to cancel', 400);
  }

  if (subscription.tier === 'free') {
    return errorResponse('Free tier cannot be cancelled', 400);
  }

  let body: { immediately?: boolean };
  try {
    body = await request.json() as typeof body;
  } catch {
    body = {};
  }

  try {
    await cancelStripeSubscription(
      env,
      subscription.stripe_subscription_id,
      body.immediately === true
    );

    // Update local status
    const newStatus = body.immediately ? 'cancelled' : 'active';
    await env.DB
      .prepare(`UPDATE subscriptions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE customer_id = ?`)
      .bind(newStatus, customer.id)
      .run();

    return jsonResponse({
      message: body.immediately
        ? 'Subscription cancelled immediately'
        : 'Subscription will be cancelled at the end of the billing period',
      cancelledImmediately: body.immediately === true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to cancel subscription';
    return errorResponse(message, 500);
  }
}

// =============================================================================
// POST /api/billing/resume - Resume cancelled subscription
// =============================================================================

export async function handleResumeSubscription(
  request: Request,
  env: BillingEnv
): Promise<Response> {
  const auth = await getAuthenticatedCustomer(request, env.DB);
  if (auth.error) return auth.error;
  const { customer } = auth;

  // Get subscription
  const subscription = await env.DB
    .prepare('SELECT stripe_subscription_id FROM subscriptions WHERE customer_id = ?')
    .bind(customer.id)
    .first<{ stripe_subscription_id: string | null }>();

  if (!subscription?.stripe_subscription_id) {
    return errorResponse('No subscription to resume', 400);
  }

  try {
    await resumeStripeSubscription(env, subscription.stripe_subscription_id);

    return jsonResponse({
      message: 'Subscription resumed successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to resume subscription';
    return errorResponse(message, 500);
  }
}

// =============================================================================
// GET /api/billing/plans - Get available plans
// =============================================================================

export function handleGetPlans(): Response {
  const plans = Object.entries(TIER_CONFIGS)
    .filter(([tier]) => tier !== 'enterprise') // Enterprise is custom
    .map(([tier, config]) => ({
      tier,
      name: config.name,
      price: config.priceMonthly,
      priceFormatted: config.priceMonthly === 0 ? 'Free' : `$${(config.priceMonthly / 100).toFixed(0)}/mo`,
      requestsLimit: config.requestsLimit,
      requestsLimitFormatted: config.requestsLimit.toLocaleString(),
      rateLimit: config.rateLimit,
      rateLimitFormatted: `${config.rateLimit} req/min`,
      description: config.description,
      features: getPlanFeatures(tier as SubscriptionTier),
    }));

  return jsonResponse({ plans });
}

function getPlanFeatures(tier: SubscriptionTier): string[] {
  const baseFeatures = ['All WordPress tools', 'Multi-site support', 'API access'];

  switch (tier) {
    case 'free':
      return [...baseFeatures, 'Community support'];
    case 'starter':
      return [...baseFeatures, 'Email support', 'Usage analytics'];
    case 'pro':
      return [...baseFeatures, 'Priority support', 'Advanced analytics', 'Webhooks'];
    case 'business':
      return [...baseFeatures, 'Dedicated support', 'Custom integrations', 'SLA guarantee', 'Team management'];
    case 'enterprise':
      return [...baseFeatures, 'Custom pricing', 'Dedicated instance', '24/7 support', 'Custom SLA'];
    default:
      return baseFeatures;
  }
}

// =============================================================================
// POST /api/billing/create-customer - Create Stripe customer (internal use)
// =============================================================================

export async function ensureStripeCustomer(
  env: BillingEnv,
  customerId: string,
  email: string,
  name?: string
): Promise<string> {
  // Check if already has Stripe customer
  const subscription = await env.DB
    .prepare('SELECT stripe_customer_id FROM subscriptions WHERE customer_id = ?')
    .bind(customerId)
    .first<{ stripe_customer_id: string | null }>();

  if (subscription?.stripe_customer_id) {
    return subscription.stripe_customer_id;
  }

  // Create new Stripe customer
  const stripeCustomer = await createStripeCustomer(env, customerId, email, name || undefined);

  // Update subscription with Stripe customer ID
  await env.DB
    .prepare(`UPDATE subscriptions SET stripe_customer_id = ?, updated_at = CURRENT_TIMESTAMP WHERE customer_id = ?`)
    .bind(stripeCustomer.id, customerId)
    .run();

  return stripeCustomer.id;
}
