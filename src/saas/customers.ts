/**
 * Customer Service
 * Manage customer accounts and subscriptions
 */

import { Customer, Subscription, SubscriptionTier, TIER_CONFIGS } from './types';

// =============================================================================
// Password Hashing (using Web Crypto API)
// =============================================================================

/**
 * Hash password using PBKDF2
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const hashArray = Array.from(new Uint8Array(derivedBits));
  const saltArray = Array.from(salt);
  const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  const saltHex = saltArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return `${saltHex}:${hash}`;
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [saltHex, hash] = storedHash.split(':');
  if (!saltHex || !hash) return false;

  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
  const encoder = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const hashArray = Array.from(new Uint8Array(derivedBits));
  const computedHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return computedHash === hash;
}

// =============================================================================
// Customer Operations
// =============================================================================

/**
 * Create a new customer
 */
export async function createCustomer(
  db: D1Database,
  email: string,
  password: string,
  name?: string
): Promise<{ customer: Customer; subscription: Subscription }> {
  const customerId = crypto.randomUUID();
  const subscriptionId = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  const tierConfig = TIER_CONFIGS.free;

  // Create customer
  await db
    .prepare(
      `INSERT INTO customers (id, email, name, password_hash, tier, is_active, email_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'free', 1, 0, datetime('now'), datetime('now'))`
    )
    .bind(customerId, email.toLowerCase(), name || null, passwordHash)
    .run();

  // Create free subscription
  const now = new Date();
  const cycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  await db
    .prepare(
      `INSERT INTO subscriptions (id, customer_id, tier, status, requests_limit, requests_used, rate_limit, billing_cycle_start, billing_cycle_end, created_at, updated_at)
       VALUES (?, ?, 'free', 'active', ?, 0, ?, datetime('now'), ?, datetime('now'), datetime('now'))`
    )
    .bind(subscriptionId, customerId, tierConfig.requestsLimit, tierConfig.rateLimit, cycleEnd.toISOString())
    .run();

  const customer = await findCustomerById(db, customerId);
  const subscription = await findSubscriptionByCustomerId(db, customerId);

  return { customer: customer!, subscription: subscription! };
}

/**
 * Find customer by email
 */
export async function findCustomerByEmail(
  db: D1Database,
  email: string
): Promise<Customer | null> {
  return db
    .prepare('SELECT * FROM customers WHERE email = ? AND is_active = 1')
    .bind(email.toLowerCase())
    .first<Customer>();
}

/**
 * Find customer by ID
 */
export async function findCustomerById(
  db: D1Database,
  id: string
): Promise<Customer | null> {
  return db
    .prepare('SELECT * FROM customers WHERE id = ? AND is_active = 1')
    .bind(id)
    .first<Customer>();
}

/**
 * Authenticate customer with email and password
 */
export async function authenticateCustomer(
  db: D1Database,
  email: string,
  password: string
): Promise<Customer | null> {
  const customer = await findCustomerByEmail(db, email);
  if (!customer) return null;

  const isValid = await verifyPassword(password, customer.password_hash);
  return isValid ? customer : null;
}

/**
 * Update customer profile
 */
export async function updateCustomer(
  db: D1Database,
  customerId: string,
  updates: { name?: string; email?: string }
): Promise<Customer | null> {
  const fields: string[] = ["updated_at = datetime('now')"];
  const values: (string | null)[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.email !== undefined) {
    fields.push('email = ?');
    values.push(updates.email.toLowerCase());
  }

  values.push(customerId);

  await db
    .prepare(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  return findCustomerById(db, customerId);
}

// =============================================================================
// Subscription Operations
// =============================================================================

/**
 * Find subscription by customer ID
 */
export async function findSubscriptionByCustomerId(
  db: D1Database,
  customerId: string
): Promise<Subscription | null> {
  return db
    .prepare('SELECT * FROM subscriptions WHERE customer_id = ?')
    .bind(customerId)
    .first<Subscription>();
}

/**
 * Update subscription tier
 */
export async function updateSubscriptionTier(
  db: D1Database,
  customerId: string,
  newTier: SubscriptionTier
): Promise<Subscription | null> {
  const tierConfig = TIER_CONFIGS[newTier];

  await db
    .prepare(
      `UPDATE subscriptions
       SET tier = ?, requests_limit = ?, rate_limit = ?, updated_at = datetime('now')
       WHERE customer_id = ?`
    )
    .bind(newTier, tierConfig.requestsLimit, tierConfig.rateLimit, customerId)
    .run();

  // Also update customer tier
  await db
    .prepare("UPDATE customers SET tier = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(newTier, customerId)
    .run();

  return findSubscriptionByCustomerId(db, customerId);
}

/**
 * Increment usage counter
 */
export async function incrementUsage(
  db: D1Database,
  customerId: string
): Promise<{ used: number; limit: number; remaining: number }> {
  await db
    .prepare(
      `UPDATE subscriptions SET requests_used = requests_used + 1, updated_at = datetime('now')
       WHERE customer_id = ?`
    )
    .bind(customerId)
    .run();

  const subscription = await findSubscriptionByCustomerId(db, customerId);
  if (!subscription) {
    throw new Error('Subscription not found');
  }

  return {
    used: subscription.requests_used,
    limit: subscription.requests_limit,
    remaining: Math.max(0, subscription.requests_limit - subscription.requests_used),
  };
}

/**
 * Reset monthly usage (called at billing cycle start)
 */
export async function resetMonthlyUsage(
  db: D1Database,
  customerId: string
): Promise<void> {
  const now = new Date();
  const cycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  await db
    .prepare(
      `UPDATE subscriptions
       SET requests_used = 0, billing_cycle_start = datetime('now'), billing_cycle_end = ?, updated_at = datetime('now')
       WHERE customer_id = ?`
    )
    .bind(cycleEnd.toISOString(), customerId)
    .run();
}

/**
 * Check if customer has exceeded their limit
 */
export async function checkUsageLimit(
  db: D1Database,
  customerId: string
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const subscription = await findSubscriptionByCustomerId(db, customerId);
  if (!subscription) {
    return { allowed: false, used: 0, limit: 0 };
  }

  return {
    allowed: subscription.requests_used < subscription.requests_limit,
    used: subscription.requests_used,
    limit: subscription.requests_limit,
  };
}

// =============================================================================
// OAuth Operations
// =============================================================================

export type OAuthProvider = 'google' | 'github';

export interface OAuthUserData {
  provider: OAuthProvider;
  providerId: string;
  email: string;
  name: string | null;
  picture: string | null;
}

/**
 * Find customer by OAuth provider
 */
export async function findCustomerByOAuth(
  db: D1Database,
  provider: OAuthProvider,
  providerId: string
): Promise<Customer | null> {
  return db
    .prepare('SELECT * FROM customers WHERE oauth_provider = ? AND oauth_provider_id = ? AND is_active = 1')
    .bind(provider, providerId)
    .first<Customer>();
}

/**
 * Create customer via OAuth (no password needed)
 */
export async function createOAuthCustomer(
  db: D1Database,
  data: OAuthUserData
): Promise<{ customer: Customer; subscription: Subscription }> {
  const customerId = crypto.randomUUID();
  const subscriptionId = crypto.randomUUID();
  const tierConfig = TIER_CONFIGS.free;

  // Create customer with OAuth placeholder password
  await db
    .prepare(
      `INSERT INTO customers (id, email, name, password_hash, tier, is_active, email_verified, oauth_provider, oauth_provider_id, picture_url, created_at, updated_at)
       VALUES (?, ?, ?, 'oauth', 'free', 1, 1, ?, ?, ?, datetime('now'), datetime('now'))`
    )
    .bind(
      customerId,
      data.email.toLowerCase(),
      data.name,
      data.provider,
      data.providerId,
      data.picture
    )
    .run();

  // Create free subscription
  const now = new Date();
  const cycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  await db
    .prepare(
      `INSERT INTO subscriptions (id, customer_id, tier, status, requests_limit, requests_used, rate_limit, billing_cycle_start, billing_cycle_end, created_at, updated_at)
       VALUES (?, ?, 'free', 'active', ?, 0, ?, datetime('now'), ?, datetime('now'), datetime('now'))`
    )
    .bind(subscriptionId, customerId, tierConfig.requestsLimit, tierConfig.rateLimit, cycleEnd.toISOString())
    .run();

  const customer = await findCustomerById(db, customerId);
  const subscription = await findSubscriptionByCustomerId(db, customerId);

  return { customer: customer!, subscription: subscription! };
}

/**
 * Link OAuth provider to existing customer
 */
export async function linkOAuthProvider(
  db: D1Database,
  customerId: string,
  data: OAuthUserData
): Promise<void> {
  await db
    .prepare(
      `UPDATE customers
       SET oauth_provider = ?, oauth_provider_id = ?, picture_url = ?, email_verified = 1, updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(data.provider, data.providerId, data.picture, customerId)
    .run();
}

/**
 * Find or create customer via OAuth
 * Returns existing customer if email matches, creates new if not
 */
export async function findOrCreateOAuthCustomer(
  db: D1Database,
  data: OAuthUserData
): Promise<{ customer: Customer; subscription: Subscription; isNew: boolean }> {
  // First, try to find by OAuth provider ID
  let customer = await findCustomerByOAuth(db, data.provider, data.providerId);
  if (customer) {
    const subscription = await findSubscriptionByCustomerId(db, customer.id);
    return { customer, subscription: subscription!, isNew: false };
  }

  // Second, try to find by email
  customer = await findCustomerByEmail(db, data.email);
  if (customer) {
    // Link OAuth to existing account
    await linkOAuthProvider(db, customer.id, data);
    customer = await findCustomerById(db, customer.id);
    const subscription = await findSubscriptionByCustomerId(db, customer!.id);
    return { customer: customer!, subscription: subscription!, isNew: false };
  }

  // Create new customer
  const result = await createOAuthCustomer(db, data);
  return { ...result, isNew: true };
}
