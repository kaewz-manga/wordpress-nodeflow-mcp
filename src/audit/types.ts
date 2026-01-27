/**
 * Audit Log Types
 */

// =============================================================================
// Audit Event Types
// =============================================================================

export type AuditAction =
  // Auth actions
  | 'auth.login'
  | 'auth.logout'
  | 'auth.register'
  | 'auth.password_change'
  | 'auth.oauth_login'
  // API Key actions
  | 'api_key.create'
  | 'api_key.revoke'
  | 'api_key.delete'
  | 'api_key.regenerate'
  // Subscription actions
  | 'subscription.upgrade'
  | 'subscription.downgrade'
  | 'subscription.cancel'
  | 'subscription.resume'
  // Webhook actions
  | 'webhook.create'
  | 'webhook.update'
  | 'webhook.delete'
  | 'webhook.regenerate_secret'
  // Team actions
  | 'team.create'
  | 'team.member_add'
  | 'team.member_remove'
  | 'team.member_role_change'
  // Settings actions
  | 'settings.update'
  | 'profile.update';

export const AUDIT_ACTIONS: AuditAction[] = [
  'auth.login',
  'auth.logout',
  'auth.register',
  'auth.password_change',
  'auth.oauth_login',
  'api_key.create',
  'api_key.revoke',
  'api_key.delete',
  'api_key.regenerate',
  'subscription.upgrade',
  'subscription.downgrade',
  'subscription.cancel',
  'subscription.resume',
  'webhook.create',
  'webhook.update',
  'webhook.delete',
  'webhook.regenerate_secret',
  'team.create',
  'team.member_add',
  'team.member_remove',
  'team.member_role_change',
  'settings.update',
  'profile.update',
];

// =============================================================================
// Audit Log Entry
// =============================================================================

export interface AuditLog {
  id: string;
  customer_id: string;
  actor_id: string;           // Who performed the action (customer or team member)
  actor_type: 'customer' | 'team_member' | 'system';
  action: AuditAction;
  resource_type: string | null;  // e.g., 'api_key', 'webhook', 'subscription'
  resource_id: string | null;    // ID of the affected resource
  details: string | null;        // JSON with additional details
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// =============================================================================
// API Types
// =============================================================================

export interface AuditLogResponse {
  id: string;
  actorId: string;
  actorType: 'customer' | 'team_member' | 'system';
  action: AuditAction;
  resourceType: string | null;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditLogFilters {
  action?: AuditAction;
  resourceType?: string;
  resourceId?: string;
  actorId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

// =============================================================================
// Audit Context
// =============================================================================

export interface AuditContext {
  customerId: string;
  actorId: string;
  actorType: 'customer' | 'team_member' | 'system';
  ipAddress?: string;
  userAgent?: string;
}
