/**
 * Stripe Billing Types and Configuration
 */

import { SubscriptionTier } from '../saas/types';

// =============================================================================
// Environment
// =============================================================================

export interface StripeEnv {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PUBLISHABLE_KEY?: string;
}

// =============================================================================
// Stripe Price Configuration
// =============================================================================

export interface StripePriceConfig {
  tier: SubscriptionTier;
  priceId: string;           // Stripe Price ID (price_xxx)
  productId: string;         // Stripe Product ID (prod_xxx)
  amount: number;            // Amount in cents
  currency: string;
  interval: 'month' | 'year';
}

// Price IDs should be set as environment variables
// These are placeholders that will be replaced with actual Stripe Price IDs
export const STRIPE_PRICE_IDS: Record<Exclude<SubscriptionTier, 'free' | 'enterprise'>, string> = {
  starter: 'price_starter_monthly',
  pro: 'price_pro_monthly',
  business: 'price_business_monthly',
};

// =============================================================================
// Stripe Customer
// =============================================================================

export interface StripeCustomerData {
  id: string;
  email: string;
  name: string | null;
  metadata: {
    customer_id: string;  // Our internal customer ID
  };
}

// =============================================================================
// Stripe Subscription
// =============================================================================

export interface StripeSubscriptionData {
  id: string;
  customer: string;
  status: StripeSubscriptionStatus;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
  items: {
    data: Array<{
      id: string;
      price: {
        id: string;
        product: string;
      };
    }>;
  };
  metadata: {
    tier: SubscriptionTier;
  };
}

export type StripeSubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'unpaid'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'paused';

// =============================================================================
// Checkout Session
// =============================================================================

export interface CreateCheckoutParams {
  customerId: string;
  customerEmail: string;
  tier: SubscriptionTier;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  id: string;
  url: string;
}

// =============================================================================
// Billing Portal
// =============================================================================

export interface CreatePortalParams {
  stripeCustomerId: string;
  returnUrl: string;
}

export interface PortalSession {
  id: string;
  url: string;
}

// =============================================================================
// Webhook Events
// =============================================================================

export type StripeWebhookEventType =
  | 'checkout.session.completed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.paid'
  | 'invoice.payment_failed'
  | 'customer.created'
  | 'customer.updated';

export interface StripeWebhookEvent {
  id: string;
  type: StripeWebhookEventType;
  data: {
    object: Record<string, unknown>;
  };
  created: number;
}

// =============================================================================
// Invoice
// =============================================================================

export interface StripeInvoice {
  id: string;
  customer: string;
  subscription: string | null;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  amount_due: number;
  amount_paid: number;
  currency: string;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  created: number;
  period_start: number;
  period_end: number;
}

// =============================================================================
// API Responses
// =============================================================================

export interface BillingInfo {
  hasSubscription: boolean;
  tier: SubscriptionTier;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
}

export interface InvoiceInfo {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: string;
  pdfUrl: string | null;
  hostedUrl: string | null;
}
