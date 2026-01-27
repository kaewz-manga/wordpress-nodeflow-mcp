/**
 * Admin Dashboard Types
 */

// =============================================================================
// Admin User Types
// =============================================================================

export type AdminRole = 'super_admin' | 'admin' | 'support';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  password_hash: string;
  is_active: number;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminPermissions {
  canManageCustomers: boolean;
  canManageSubscriptions: boolean;
  canManageAdmins: boolean;
  canViewLogs: boolean;
  canManageIncidents: boolean;
  canAccessBilling: boolean;
}

export const ADMIN_PERMISSIONS: Record<AdminRole, AdminPermissions> = {
  super_admin: {
    canManageCustomers: true,
    canManageSubscriptions: true,
    canManageAdmins: true,
    canViewLogs: true,
    canManageIncidents: true,
    canAccessBilling: true,
  },
  admin: {
    canManageCustomers: true,
    canManageSubscriptions: true,
    canManageAdmins: false,
    canViewLogs: true,
    canManageIncidents: true,
    canAccessBilling: false,
  },
  support: {
    canManageCustomers: false,
    canManageSubscriptions: false,
    canManageAdmins: false,
    canViewLogs: true,
    canManageIncidents: false,
    canAccessBilling: false,
  },
};

// =============================================================================
// Dashboard Stats Types
// =============================================================================

export interface DashboardStats {
  customers: {
    total: number;
    active: number;
    newThisMonth: number;
    churnedThisMonth: number;
  };
  revenue: {
    mrr: number;           // Monthly Recurring Revenue
    arr: number;           // Annual Recurring Revenue
    growthPercent: number;
  };
  usage: {
    totalRequests: number;
    requestsToday: number;
    avgResponseTime: number;
    errorRate: number;
  };
  subscriptions: {
    byTier: Record<string, number>;
    trialConversions: number;
  };
}

// =============================================================================
// Customer Management Types
// =============================================================================

export interface CustomerListItem {
  id: string;
  email: string;
  name: string | null;
  tier: string;
  status: string;
  requestsUsed: number;
  requestsLimit: number;
  createdAt: string;
  lastActiveAt: string | null;
}

export interface CustomerDetail {
  id: string;
  email: string;
  name: string | null;
  tier: string;
  subscription: {
    status: string;
    requestsUsed: number;
    requestsLimit: number;
    billingCycleEnd: string | null;
    stripeCustomerId: string | null;
  };
  apiKeys: {
    total: number;
    active: number;
  };
  usage: {
    totalRequests: number;
    last30Days: number;
    avgResponseTime: number;
  };
  team: {
    hasTeam: boolean;
    memberCount: number;
  };
  createdAt: string;
  lastActiveAt: string | null;
}

export interface CustomerFilters {
  tier?: string;
  status?: string;
  search?: string;
  sortBy?: 'created_at' | 'email' | 'tier' | 'requests_used';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// =============================================================================
// Admin Actions
// =============================================================================

export interface AdminAction {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface ChangeSubscriptionRequest {
  customerId: string;
  tier: string;
  reason: string;
}

export interface SuspendCustomerRequest {
  customerId: string;
  reason: string;
}
