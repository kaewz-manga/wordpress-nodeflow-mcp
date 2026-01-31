/**
 * Stripe Billing Integration
 * Uses fetch directly (no SDK) for Cloudflare Workers compatibility
 */

import { Env } from './saas-types';
import { getUserById, updateUserPlan, updateUserStripeCustomerId, getUserByStripeCustomerId } from './db';

// ============================================
// Plan to Stripe Price ID Mapping
// ============================================

function getPriceId(env: Env, planId: string): string | null {
  const map: Record<string, string | undefined> = {
    starter: env.STRIPE_PRICE_STARTER,
    pro: env.STRIPE_PRICE_PRO,
    enterprise: env.STRIPE_PRICE_ENTERPRISE,
  };
  return map[planId] || null;
}

// ============================================
// Stripe API Helper
// ============================================

async function stripeRequest(
  env: Env,
  endpoint: string,
  method: string = 'POST',
  body?: Record<string, string>
): Promise<any> {
  const response = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error((data as any).error?.message || `Stripe API error: ${response.status}`);
  }

  return data;
}

// ============================================
// Checkout Session
// ============================================

export async function createCheckoutSession(
  env: Env,
  userId: string,
  planId: string
): Promise<{ url: string; session_id: string }> {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe is not configured');
  }

  const priceId = getPriceId(env, planId);
  if (!priceId) {
    throw new Error(`Invalid plan: ${planId}`);
  }

  const user = await getUserById(env.DB, userId);
  if (!user) {
    throw new Error('User not found');
  }

  const appUrl = env.APP_URL || 'https://wordpress-mcp-saas.com';

  const params: Record<string, string> = {
    'mode': 'subscription',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    'success_url': `${appUrl}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    'cancel_url': `${appUrl}/dashboard?checkout=cancelled`,
    'client_reference_id': userId,
    'metadata[user_id]': userId,
    'metadata[plan_id]': planId,
  };

  // If user already has a Stripe customer ID, reuse it
  if (user.stripe_customer_id) {
    params['customer'] = user.stripe_customer_id;
  } else {
    params['customer_email'] = user.email;
  }

  const session = await stripeRequest(env, '/checkout/sessions', 'POST', params);

  return {
    url: session.url,
    session_id: session.id,
  };
}

// ============================================
// Billing Portal Session
// ============================================

export async function createBillingPortalSession(
  env: Env,
  userId: string
): Promise<{ url: string }> {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe is not configured');
  }

  const user = await getUserById(env.DB, userId);
  if (!user) {
    throw new Error('User not found');
  }

  if (!user.stripe_customer_id) {
    throw new Error('No billing account found. Please subscribe to a plan first.');
  }

  const appUrl = env.APP_URL || 'https://wordpress-mcp-saas.com';

  const session = await stripeRequest(env, '/billing_portal/sessions', 'POST', {
    'customer': user.stripe_customer_id,
    'return_url': `${appUrl}/dashboard`,
  });

  return { url: session.url };
}

// ============================================
// Webhook Handler
// ============================================

export async function handleStripeWebhook(
  request: Request,
  env: Env
): Promise<Response> {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: 'Stripe not configured' }), { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return new Response(JSON.stringify({ error: 'Missing signature' }), { status: 400 });
  }

  // Verify webhook signature
  const isValid = await verifyWebhookSignature(body, signature, env.STRIPE_WEBHOOK_SECRET);
  if (!isValid) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 });
  }

  const event = JSON.parse(body);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        await handleCheckoutCompleted(env, event.data.object);
        break;
      }

      case 'customer.subscription.deleted': {
        await handleSubscriptionDeleted(env, event.data.object);
        break;
      }

      default:
        // Ignore unhandled event types
        break;
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error: any) {
    console.error('Webhook handler error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

// ============================================
// Webhook Event Handlers
// ============================================

async function handleCheckoutCompleted(env: Env, session: any): Promise<void> {
  const userId = session.client_reference_id || session.metadata?.user_id;
  const planId = session.metadata?.plan_id;
  const customerId = session.customer;

  if (!userId || !planId) {
    console.error('Missing user_id or plan_id in checkout session');
    return;
  }

  // Update user's Stripe customer ID
  if (customerId) {
    await updateUserStripeCustomerId(env.DB, userId, customerId);
  }

  // Upgrade user's plan
  await updateUserPlan(env.DB, userId, planId);
}

async function handleSubscriptionDeleted(env: Env, subscription: any): Promise<void> {
  const customerId = subscription.customer;

  if (!customerId) {
    console.error('Missing customer ID in subscription deleted event');
    return;
  }

  // Find user by Stripe customer ID
  const user = await getUserByStripeCustomerId(env.DB, customerId);
  if (!user) {
    console.error(`No user found for Stripe customer: ${customerId}`);
    return;
  }

  // Downgrade to free plan
  await updateUserPlan(env.DB, user.id, 'free');
}

// ============================================
// Webhook Signature Verification
// ============================================

async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  // Parse Stripe signature header: t=timestamp,v1=signature
  const parts = signature.split(',');
  const timestampPart = parts.find(p => p.startsWith('t='));
  const signaturePart = parts.find(p => p.startsWith('v1='));

  if (!timestampPart || !signaturePart) {
    return false;
  }

  const timestamp = timestampPart.slice(2);
  const expectedSignature = signaturePart.slice(3);

  // Check timestamp tolerance (5 minutes)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) {
    return false;
  }

  // Compute expected signature: HMAC-SHA256(secret, timestamp + '.' + payload)
  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signedPayload)
  );

  // Convert to hex
  const computedSignature = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time comparison
  if (computedSignature.length !== expectedSignature.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < computedSignature.length; i++) {
    result |= computedSignature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }

  return result === 0;
}
