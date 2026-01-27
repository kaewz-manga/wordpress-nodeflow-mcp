/**
 * Admin Dashboard Service
 *
 * Operations management for the SaaS platform
 */

// Use Web Crypto API (Cloudflare Workers compatible)
import {
  AdminUser,
  AdminRole,
  AdminPermissions,
  ADMIN_PERMISSIONS,
  DashboardStats,
  CustomerListItem,
  CustomerDetail,
  CustomerFilters,
  AdminAction,
  ChangeSubscriptionRequest,
  SuspendCustomerRequest,
} from './types';

// =============================================================================
// Admin User Management
// =============================================================================

export async function createAdminUser(
  db: D1Database,
  email: string,
  name: string,
  passwordHash: string,
  role: AdminRole = 'support'
): Promise<{ admin?: AdminUser; error?: string }> {
  // Check if email already exists
  const existing = await db
    .prepare('SELECT id FROM admin_users WHERE email = ?')
    .bind(email)
    .first();

  if (existing) {
    return { error: 'Email already registered' };
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db
    .prepare(`
      INSERT INTO admin_users (id, email, name, password_hash, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `)
    .bind(id, email, name, passwordHash, role, now, now)
    .run();

  const admin = await db
    .prepare('SELECT * FROM admin_users WHERE id = ?')
    .bind(id)
    .first<AdminUser>();

  return { admin: admin! };
}

export async function getAdminByEmail(
  db: D1Database,
  email: string
): Promise<AdminUser | null> {
  return db
    .prepare('SELECT * FROM admin_users WHERE email = ?')
    .bind(email)
    .first<AdminUser>();
}

export async function getAdminById(
  db: D1Database,
  adminId: string
): Promise<AdminUser | null> {
  return db
    .prepare('SELECT * FROM admin_users WHERE id = ?')
    .bind(adminId)
    .first<AdminUser>();
}

export async function updateAdminLastLogin(
  db: D1Database,
  adminId: string
): Promise<void> {
  await db
    .prepare('UPDATE admin_users SET last_login_at = ? WHERE id = ?')
    .bind(new Date().toISOString(), adminId)
    .run();
}

export async function listAdminUsers(db: D1Database): Promise<AdminUser[]> {
  const result = await db
    .prepare('SELECT * FROM admin_users ORDER BY created_at DESC')
    .all<AdminUser>();

  return result.results;
}

export async function updateAdminRole(
  db: D1Database,
  adminId: string,
  role: AdminRole
): Promise<{ success: boolean; error?: string }> {
  const admin = await getAdminById(db, adminId);
  if (!admin) {
    return { success: false, error: 'Admin not found' };
  }

  await db
    .prepare('UPDATE admin_users SET role = ?, updated_at = ? WHERE id = ?')
    .bind(role, new Date().toISOString(), adminId)
    .run();

  return { success: true };
}

export async function deactivateAdmin(
  db: D1Database,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  await db
    .prepare('UPDATE admin_users SET is_active = 0, updated_at = ? WHERE id = ?')
    .bind(new Date().toISOString(), adminId)
    .run();

  return { success: true };
}

export function getAdminPermissions(role: AdminRole): AdminPermissions {
  return ADMIN_PERMISSIONS[role];
}

// =============================================================================
// Dashboard Statistics
// =============================================================================

export async function getDashboardStats(db: D1Database): Promise<DashboardStats> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  // Customer stats
  const totalCustomers = await db
    .prepare('SELECT COUNT(*) as count FROM customers')
    .first<{ count: number }>();

  const activeCustomers = await db
    .prepare("SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'")
    .first<{ count: number }>();

  const newCustomers = await db
    .prepare('SELECT COUNT(*) as count FROM customers WHERE created_at >= ?')
    .bind(startOfMonth)
    .first<{ count: number }>();

  const churnedCustomers = await db
    .prepare("SELECT COUNT(*) as count FROM subscriptions WHERE status = 'cancelled' AND updated_at >= ?")
    .bind(startOfMonth)
    .first<{ count: number }>();

  // Revenue stats (simplified - actual would need payment history)
  const tierPrices: Record<string, number> = {
    free: 0,
    starter: 29,
    pro: 99,
    business: 299,
    enterprise: 999,
  };

  const subscriptionsByTier = await db
    .prepare(`
      SELECT tier, COUNT(*) as count
      FROM subscriptions
      WHERE status = 'active'
      GROUP BY tier
    `)
    .all<{ tier: string; count: number }>();

  let mrr = 0;
  const byTier: Record<string, number> = {};

  for (const row of subscriptionsByTier.results) {
    mrr += (tierPrices[row.tier] || 0) * row.count;
    byTier[row.tier] = row.count;
  }

  // Usage stats
  const totalRequests = await db
    .prepare('SELECT SUM(total_requests) as total FROM usage_stats')
    .first<{ total: number }>();

  const todayRequests = await db
    .prepare('SELECT SUM(total_requests) as total FROM usage_stats WHERE date >= ?')
    .bind(startOfDay.split('T')[0])
    .first<{ total: number }>();

  // Trial conversions (customers who upgraded from free)
  const trialConversions = await db
    .prepare(`
      SELECT COUNT(DISTINCT customer_id) as count
      FROM audit_logs
      WHERE action = 'subscription.upgrade'
      AND created_at >= ?
    `)
    .bind(startOfMonth)
    .first<{ count: number }>();

  return {
    customers: {
      total: totalCustomers?.count || 0,
      active: activeCustomers?.count || 0,
      newThisMonth: newCustomers?.count || 0,
      churnedThisMonth: churnedCustomers?.count || 0,
    },
    revenue: {
      mrr,
      arr: mrr * 12,
      growthPercent: 0, // Would need historical data
    },
    usage: {
      totalRequests: totalRequests?.total || 0,
      requestsToday: todayRequests?.total || 0,
      avgResponseTime: 0, // Would need request logs
      errorRate: 0, // Would need error tracking
    },
    subscriptions: {
      byTier,
      trialConversions: trialConversions?.count || 0,
    },
  };
}

// =============================================================================
// Customer Management
// =============================================================================

export async function listCustomers(
  db: D1Database,
  filters: CustomerFilters = {}
): Promise<{ customers: CustomerListItem[]; total: number }> {
  const {
    tier,
    status,
    search,
    sortBy = 'created_at',
    sortOrder = 'desc',
    limit = 50,
    offset = 0,
  } = filters;

  let whereClause = '1=1';
  const params: (string | number)[] = [];

  if (tier) {
    whereClause += ' AND s.tier = ?';
    params.push(tier);
  }

  if (status) {
    whereClause += ' AND s.status = ?';
    params.push(status);
  }

  if (search) {
    whereClause += ' AND (c.email LIKE ? OR c.name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  // Validate sort column to prevent SQL injection
  const validSortColumns = ['created_at', 'email', 'tier', 'requests_used'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const sortDir = sortOrder === 'asc' ? 'ASC' : 'DESC';

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as count
    FROM customers c
    LEFT JOIN subscriptions s ON c.id = s.customer_id
    WHERE ${whereClause}
  `;

  const countStmt = db.prepare(countQuery);
  for (let i = 0; i < params.length; i++) {
    countStmt.bind(params[i]);
  }
  const countResult = await db
    .prepare(countQuery)
    .bind(...params)
    .first<{ count: number }>();

  // Get customers
  const query = `
    SELECT
      c.id,
      c.email,
      c.name,
      s.tier,
      s.status,
      s.requests_used as requestsUsed,
      s.requests_limit as requestsLimit,
      c.created_at as createdAt,
      c.last_active_at as lastActiveAt
    FROM customers c
    LEFT JOIN subscriptions s ON c.id = s.customer_id
    WHERE ${whereClause}
    ORDER BY ${sortColumn === 'tier' ? 's.tier' : sortColumn === 'requests_used' ? 's.requests_used' : 'c.' + sortColumn} ${sortDir}
    LIMIT ? OFFSET ?
  `;

  const result = await db
    .prepare(query)
    .bind(...params, limit, offset)
    .all<CustomerListItem>();

  return {
    customers: result.results,
    total: countResult?.count || 0,
  };
}

export async function getCustomerDetail(
  db: D1Database,
  customerId: string
): Promise<CustomerDetail | null> {
  const customer = await db
    .prepare(`
      SELECT
        c.*,
        s.tier,
        s.status,
        s.requests_used,
        s.requests_limit,
        s.billing_cycle_end,
        s.stripe_customer_id
      FROM customers c
      LEFT JOIN subscriptions s ON c.id = s.customer_id
      WHERE c.id = ?
    `)
    .bind(customerId)
    .first<{
      id: string;
      email: string;
      name: string | null;
      tier: string;
      status: string;
      requests_used: number;
      requests_limit: number;
      billing_cycle_end: string | null;
      stripe_customer_id: string | null;
      created_at: string;
      last_active_at: string | null;
    }>();

  if (!customer) {
    return null;
  }

  // Get API key counts
  const apiKeyStats = await db
    .prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active
      FROM api_keys
      WHERE customer_id = ?
    `)
    .bind(customerId)
    .first<{ total: number; active: number }>();

  // Get usage stats
  const usageStats = await db
    .prepare(`
      SELECT
        SUM(total_requests) as totalRequests,
        AVG(avg_response_time) as avgResponseTime
      FROM usage_stats
      WHERE customer_id = ?
    `)
    .bind(customerId)
    .first<{ totalRequests: number; avgResponseTime: number }>();

  const last30Days = await db
    .prepare(`
      SELECT SUM(total_requests) as count
      FROM usage_stats
      WHERE customer_id = ? AND date >= date('now', '-30 days')
    `)
    .bind(customerId)
    .first<{ count: number }>();

  // Get team info
  const teamInfo = await db
    .prepare(`
      SELECT
        t.id,
        (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as memberCount
      FROM teams t
      WHERE t.owner_id = ?
    `)
    .bind(customerId)
    .first<{ id: string; memberCount: number }>();

  return {
    id: customer.id,
    email: customer.email,
    name: customer.name,
    tier: customer.tier,
    subscription: {
      status: customer.status,
      requestsUsed: customer.requests_used,
      requestsLimit: customer.requests_limit,
      billingCycleEnd: customer.billing_cycle_end,
      stripeCustomerId: customer.stripe_customer_id,
    },
    apiKeys: {
      total: apiKeyStats?.total || 0,
      active: apiKeyStats?.active || 0,
    },
    usage: {
      totalRequests: usageStats?.totalRequests || 0,
      last30Days: last30Days?.count || 0,
      avgResponseTime: usageStats?.avgResponseTime || 0,
    },
    team: {
      hasTeam: !!teamInfo,
      memberCount: teamInfo?.memberCount || 0,
    },
    createdAt: customer.created_at,
    lastActiveAt: customer.last_active_at,
  };
}

// =============================================================================
// Admin Actions
// =============================================================================

export async function logAdminAction(
  db: D1Database,
  adminId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  details: Record<string, unknown> | null,
  ipAddress: string | null
): Promise<void> {
  await db
    .prepare(`
      INSERT INTO admin_actions (id, admin_id, action, target_type, target_id, details, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      crypto.randomUUID(),
      adminId,
      action,
      targetType,
      targetId,
      details ? JSON.stringify(details) : null,
      ipAddress,
      new Date().toISOString()
    )
    .run();
}

export async function getAdminActions(
  db: D1Database,
  adminId?: string,
  limit: number = 100
): Promise<AdminAction[]> {
  let query = 'SELECT * FROM admin_actions';
  const params: (string | number)[] = [];

  if (adminId) {
    query += ' WHERE admin_id = ?';
    params.push(adminId);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  const result = await db.prepare(query).bind(...params).all<AdminAction>();
  return result.results;
}

// =============================================================================
// Customer Actions
// =============================================================================

export async function changeCustomerSubscription(
  db: D1Database,
  adminId: string,
  request: ChangeSubscriptionRequest,
  ipAddress: string | null
): Promise<{ success: boolean; error?: string }> {
  const { customerId, tier, reason } = request;

  // Validate tier
  const validTiers = ['free', 'starter', 'pro', 'business', 'enterprise'];
  if (!validTiers.includes(tier)) {
    return { success: false, error: 'Invalid tier' };
  }

  // Get tier limits
  const tierLimits: Record<string, number> = {
    free: 100,
    starter: 5000,
    pro: 25000,
    business: 100000,
    enterprise: 1000000,
  };

  // Update subscription
  await db
    .prepare(`
      UPDATE subscriptions
      SET tier = ?, requests_limit = ?, updated_at = ?
      WHERE customer_id = ?
    `)
    .bind(tier, tierLimits[tier], new Date().toISOString(), customerId)
    .run();

  // Log admin action
  await logAdminAction(db, adminId, 'subscription.change', 'customer', customerId, {
    newTier: tier,
    reason,
  }, ipAddress);

  return { success: true };
}

export async function suspendCustomer(
  db: D1Database,
  adminId: string,
  request: SuspendCustomerRequest,
  ipAddress: string | null
): Promise<{ success: boolean; error?: string }> {
  const { customerId, reason } = request;

  // Update subscription status
  await db
    .prepare(`
      UPDATE subscriptions
      SET status = 'suspended', updated_at = ?
      WHERE customer_id = ?
    `)
    .bind(new Date().toISOString(), customerId)
    .run();

  // Deactivate all API keys
  await db
    .prepare(`
      UPDATE api_keys
      SET is_active = 0, updated_at = ?
      WHERE customer_id = ?
    `)
    .bind(new Date().toISOString(), customerId)
    .run();

  // Log admin action
  await logAdminAction(db, adminId, 'customer.suspend', 'customer', customerId, {
    reason,
  }, ipAddress);

  return { success: true };
}

export async function reactivateCustomer(
  db: D1Database,
  adminId: string,
  customerId: string,
  ipAddress: string | null
): Promise<{ success: boolean; error?: string }> {
  // Update subscription status
  await db
    .prepare(`
      UPDATE subscriptions
      SET status = 'active', updated_at = ?
      WHERE customer_id = ?
    `)
    .bind(new Date().toISOString(), customerId)
    .run();

  // Log admin action
  await logAdminAction(db, adminId, 'customer.reactivate', 'customer', customerId, null, ipAddress);

  return { success: true };
}

export async function resetCustomerUsage(
  db: D1Database,
  adminId: string,
  customerId: string,
  ipAddress: string | null
): Promise<{ success: boolean; error?: string }> {
  // Reset subscription usage counter
  await db
    .prepare(`
      UPDATE subscriptions
      SET requests_used = 0, updated_at = ?
      WHERE customer_id = ?
    `)
    .bind(new Date().toISOString(), customerId)
    .run();

  // Log admin action
  await logAdminAction(db, adminId, 'customer.reset_usage', 'customer', customerId, null, ipAddress);

  return { success: true };
}

export async function deleteCustomerData(
  db: D1Database,
  adminId: string,
  customerId: string,
  ipAddress: string | null
): Promise<{ success: boolean; error?: string }> {
  // Delete in order to respect foreign key constraints
  await db.prepare('DELETE FROM webhook_deliveries WHERE webhook_id IN (SELECT id FROM webhooks WHERE customer_id = ?)').bind(customerId).run();
  await db.prepare('DELETE FROM webhooks WHERE customer_id = ?').bind(customerId).run();
  await db.prepare('DELETE FROM team_members WHERE team_id IN (SELECT id FROM teams WHERE owner_id = ?)').bind(customerId).run();
  await db.prepare('DELETE FROM teams WHERE owner_id = ?').bind(customerId).run();
  await db.prepare('DELETE FROM usage_stats WHERE customer_id = ?').bind(customerId).run();
  await db.prepare('DELETE FROM api_keys WHERE customer_id = ?').bind(customerId).run();
  await db.prepare('DELETE FROM subscriptions WHERE customer_id = ?').bind(customerId).run();
  await db.prepare('DELETE FROM audit_logs WHERE customer_id = ?').bind(customerId).run();
  await db.prepare('DELETE FROM customers WHERE id = ?').bind(customerId).run();

  // Log admin action (log before delete would be lost)
  await logAdminAction(db, adminId, 'customer.delete', 'customer', customerId, null, ipAddress);

  return { success: true };
}
