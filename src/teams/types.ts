/**
 * Team Management Types
 */

// =============================================================================
// Team Roles
// =============================================================================

export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface RolePermissions {
  canManageTeam: boolean;
  canManageApiKeys: boolean;
  canManageWebhooks: boolean;
  canViewUsage: boolean;
  canViewAuditLogs: boolean;
  canManageBilling: boolean;
}

export const ROLE_PERMISSIONS: Record<TeamRole, RolePermissions> = {
  owner: {
    canManageTeam: true,
    canManageApiKeys: true,
    canManageWebhooks: true,
    canViewUsage: true,
    canViewAuditLogs: true,
    canManageBilling: true,
  },
  admin: {
    canManageTeam: true,
    canManageApiKeys: true,
    canManageWebhooks: true,
    canViewUsage: true,
    canViewAuditLogs: true,
    canManageBilling: false,
  },
  member: {
    canManageTeam: false,
    canManageApiKeys: true,
    canManageWebhooks: false,
    canViewUsage: true,
    canViewAuditLogs: false,
    canManageBilling: false,
  },
  viewer: {
    canManageTeam: false,
    canManageApiKeys: false,
    canManageWebhooks: false,
    canViewUsage: true,
    canViewAuditLogs: false,
    canManageBilling: false,
  },
};

// =============================================================================
// Team Database Models
// =============================================================================

export interface Team {
  id: string;
  customer_id: string;      // Owner's customer ID
  name: string;
  description: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  email: string;
  name: string | null;
  role: TeamRole;
  password_hash: string | null;  // Null for pending invites
  invite_token: string | null;
  invite_expires_at: string | null;
  status: 'pending' | 'active' | 'suspended';
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamInvite {
  id: string;
  team_id: string;
  email: string;
  role: TeamRole;
  token: string;
  invited_by: string;       // Customer or member ID who invited
  expires_at: string;
  created_at: string;
}

// =============================================================================
// API Types
// =============================================================================

export interface TeamResponse {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface TeamMemberResponse {
  id: string;
  email: string;
  name: string | null;
  role: TeamRole;
  status: 'pending' | 'active' | 'suspended';
  permissions: RolePermissions;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface CreateTeamRequest {
  name: string;
  description?: string;
}

export interface UpdateTeamRequest {
  name?: string;
  description?: string;
}

export interface InviteMemberRequest {
  email: string;
  role: TeamRole;
  name?: string;
}

export interface UpdateMemberRequest {
  role?: TeamRole;
  name?: string;
}

export interface AcceptInviteRequest {
  token: string;
  password: string;
  name?: string;
}
