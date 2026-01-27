/**
 * Stripe Webhook Handlers
 * Handles Stripe webhook events to sync subscription status
 */

import { TIER_CONFIGS, SubscriptionTier } from '../saas/types';
import {
  StripeEnv,
  StripeWebhookEvent,
  StripeSubscriptionData,
} from './types';
import {
  verifyWebhookSignature,
  mapStripeStatusToSubscriptionStatus,
  getTierFromPriceId,
} from './stripe';

// =============================================================================
// Types
// =============================================================================

interface WebhookEnv extends StripeEnv {
  DB: D1Database;
}

interface WebhookResult {
  success: boolean;
  message: string;
  eventType?: string;
}

// =============================================================================
// Main Webhook Handler
// =============================================================================

export async function handleStripeWebhook(
  request: Request,
  env: WebhookEnv
): Promise<Response> {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return new Response(JSON.stringify({ error: 'Missing signature' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const payload = await request.text();

  // Verify webhook signature
  const isValid = await verifyWebhookSignature(
    payload,
    signature,
    env.STRIPE_WEBHOOK_SECRET
  );

  if (!isValid) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parse event
  let event: StripeWebhookEvent;
  try {
    event = JSON.parse(payload) as StripeWebhookEvent;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Handle event
  const result = await processWebhookEvent(event, env.DB);

  return new Response(JSON.stringify(result), {
    status: result.success ? 200 : 500,
    headers: { 'Content-Type': 'application/json' },
  });
}

// =============================================================================
// Event Processing
// =============================================================================

async function processWebhookEvent(
  event: StripeWebhookEvent,
  db: D1Database
): Promise<WebhookResult> {
  const eventType = event.type;

  try {
    switch (eventType) {
      case 'checkout.session.completed':
        return await handleCheckoutCompleted(event.data.object, db);

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        return await handleSubscriptionUpdated(event.data.object as unknown as StripeSubscriptionData, db);

      case 'customer.subscription.deleted':
        return await handleSubscriptionDeleted(event.data.object as unknown as StripeSubscriptionData, db);

      case 'invoice.paid':
        return await handleInvoicePaid(event.data.object, db);

      case 'invoice.payment_failed':
        return await handleInvoicePaymentFailed(event.data.object, db);

      default:
        // Acknowledge unhandled events
        return {
          success: true,
          message: `Event ${eventType} acknowledged but not handled`,
          eventType,
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Error processing ${eventType}: ${message}`,
      eventType,
    };
  }
}

// =============================================================================
// Event Handlers
// =============================================================================

interface CheckoutSessionObject {
  id: string;
  customer: string;
  subscription: string;
  metadata?: {
    customer_id?: string;
    tier?: string;
  };
}

async function handleCheckoutCompleted(
  object: Record<string, unknown>,
  db: D1Database
): Promise<WebhookResult> {
  const session = object as unknown as CheckoutSessionObject;
  const customerId = session.metadata?.customer_id;
  const stripeCustomerId = session.customer;
  const stripeSubscriptionId = session.subscription;

  if (!customerId) {
    return {
      success: false,
      message: 'Missing customer_id in checkout session metadata',
      eventType: 'checkout.session.completed',
    };
  }

  // Update subscription with Stripe IDs
  await db
    .prepare(
      `UPDATE subscriptions
       SET stripe_customer_id = ?, stripe_subscription_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE customer_id = ?`
    )
    .bind(stripeCustomerId, stripeSubscriptionId, customerId)
    .run();

  return {
    success: true,
    message: `Checkout completed for customer ${customerId}`,
    eventType: 'checkout.session.completed',
  };
}

async function handleSubscriptionUpdated(
  subscription: StripeSubscriptionData,
  db: D1Database
): Promise<WebhookResult> {
  const stripeSubscriptionId = subscription.id;
  const stripeCustomerId = subscription.customer;
  const stripeStatus = subscription.status;
  const currentPeriodStart = new Date(subscription.current_period_start * 1000).toISOString();
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();

  // Get tier from price ID
  const priceId = subscription.items.data[0]?.price?.id;
  const tier = priceId ? getTierFromPriceId(priceId) : (subscription.metadata?.tier || 'starter');
  const tierConfig = TIER_CONFIGS[tier as SubscriptionTier] || TIER_CONFIGS.starter;

  // Map Stripe status to our status
  const status = mapStripeStatusToSubscriptionStatus(stripeStatus);

  // Update subscription
  const result = await db
    .prepare(
      `UPDATE subscriptions
       SET tier = ?,
           status = ?,
           requests_limit = ?,
           rate_limit = ?,
           billing_cycle_start = ?,
           billing_cycle_end = ?,
           stripe_customer_id = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE stripe_subscription_id = ?`
    )
    .bind(
      tier,
      status,
      tierConfig.requestsLimit,
      tierConfig.rateLimit,
      currentPeriodStart,
      currentPeriodEnd,
      stripeCustomerId,
      stripeSubscriptionId
    )
    .run();

  if (result.meta.changes === 0) {
    // Try to find by stripe_customer_id if subscription ID not found
    await db
      .prepare(
        `UPDATE subscriptions
         SET tier = ?,
             status = ?,
             requests_limit = ?,
             rate_limit = ?,
             billing_cycle_start = ?,
             billing_cycle_end = ?,
             stripe_subscription_id = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE stripe_customer_id = ?`
      )
      .bind(
        tier,
        status,
        tierConfig.requestsLimit,
        tierConfig.rateLimit,
        currentPeriodStart,
        currentPeriodEnd,
        stripeSubscriptionId,
        stripeCustomerId
      )
      .run();
  }

  // Also update customer tier
  await db
    .prepare(
      `UPDATE customers SET tier = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = (SELECT customer_id FROM subscriptions WHERE stripe_subscription_id = ?)`
    )
    .bind(tier, stripeSubscriptionId)
    .run();

  return {
    success: true,
    message: `Subscription ${stripeSubscriptionId} updated to ${tier} (${status})`,
    eventType: 'customer.subscription.updated',
  };
}

async function handleSubscriptionDeleted(
  subscription: StripeSubscriptionData,
  db: D1Database
): Promise<WebhookResult> {
  const stripeSubscriptionId = subscription.id;

  // Get the customer ID first
  const subRecord = await db
    .prepare('SELECT customer_id FROM subscriptions WHERE stripe_subscription_id = ?')
    .bind(stripeSubscriptionId)
    .first<{ customer_id: string }>();

  if (!subRecord) {
    return {
      success: true,
      message: `Subscription ${stripeSubscriptionId} not found, possibly already deleted`,
      eventType: 'customer.subscription.deleted',
    };
  }

  const customerId = subRecord.customer_id;
  const freeTier = TIER_CONFIGS.free;

  // Downgrade to free tier
  await db
    .prepare(
      `UPDATE subscriptions
       SET tier = 'free',
           status = 'cancelled',
           requests_limit = ?,
           rate_limit = ?,
           stripe_subscription_id = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE stripe_subscription_id = ?`
    )
    .bind(freeTier.requestsLimit, freeTier.rateLimit, stripeSubscriptionId)
    .run();

  // Update customer tier
  await db
    .prepare(`UPDATE customers SET tier = 'free', updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .bind(customerId)
    .run();

  return {
    success: true,
    message: `Subscription ${stripeSubscriptionId} deleted, customer ${customerId} downgraded to free`,
    eventType: 'customer.subscription.deleted',
  };
}

interface InvoiceObject {
  id: string;
  subscription: string;
  customer: string;
  status: string;
  amount_paid?: number;
}

async function handleInvoicePaid(
  object: Record<string, unknown>,
  db: D1Database
): Promise<WebhookResult> {
  const invoice = object as unknown as InvoiceObject;
  const stripeSubscriptionId = invoice.subscription;

  if (!stripeSubscriptionId) {
    return {
      success: true,
      message: 'Invoice paid but no subscription attached',
      eventType: 'invoice.paid',
    };
  }

  // Reset monthly usage when invoice is paid (new billing cycle)
  await db
    .prepare(
      `UPDATE subscriptions
       SET requests_used = 0,
           status = 'active',
           updated_at = CURRENT_TIMESTAMP
       WHERE stripe_subscription_id = ?`
    )
    .bind(stripeSubscriptionId)
    .run();

  return {
    success: true,
    message: `Invoice ${invoice.id} paid, usage reset for subscription ${stripeSubscriptionId}`,
    eventType: 'invoice.paid',
  };
}

async function handleInvoicePaymentFailed(
  object: Record<string, unknown>,
  db: D1Database
): Promise<WebhookResult> {
  const invoice = object as unknown as InvoiceObject;
  const stripeSubscriptionId = invoice.subscription;

  if (!stripeSubscriptionId) {
    return {
      success: true,
      message: 'Invoice payment failed but no subscription attached',
      eventType: 'invoice.payment_failed',
    };
  }

  // Mark subscription as past_due
  await db
    .prepare(
      `UPDATE subscriptions
       SET status = 'past_due', updated_at = CURRENT_TIMESTAMP
       WHERE stripe_subscription_id = ?`
    )
    .bind(stripeSubscriptionId)
    .run();

  return {
    success: true,
    message: `Invoice ${invoice.id} payment failed, subscription ${stripeSubscriptionId} marked as past_due`,
    eventType: 'invoice.payment_failed',
  };
}
