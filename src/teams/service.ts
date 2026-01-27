/**
 * Team Management Service
 */

import {
  Team,
  TeamMember,
  TeamRole,
  TeamResponse,
  TeamMemberResponse,
  CreateTeamRequest,
  UpdateTeamRequest,
  InviteMemberRequest,
  UpdateMemberRequest,
  ROLE_PERMISSIONS,
} from './types';

// =============================================================================
// Constants
// =============================================================================

const MAX_TEAM_MEMBERS = 50;
const INVITE_EXPIRY_DAYS = 7;
const INVITE_TOKEN_LENGTH = 32;

// =============================================================================
// Helper Functions
// =============================================================================

function generateToken(): string {
  const array = new Uint8Array(INVITE_TOKEN_LENGTH);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const key = await crypto.subtle.importKey(
    'raw',
    data,
    { name: 'PBKDF2' },
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
    key,
    256
  );

  const hashArray = Array.from(new Uint8Array(derivedBits));
  const saltArray = Array.from(salt);

  return `${saltArray.map(b => b.toString(16).padStart(2, '0')).join('')}:${hashArray.map(b => b.toString(16).padStart(2, '0')).join('')}`;
}

async function getMemberCount(db: D1Database, teamId: string): Promise<number> {
  const result = await db
    .prepare('SELECT COUNT(*) as count FROM team_members WHERE team_id = ?')
    .bind(teamId)
    .first<{ count: number }>();
  return result?.count || 0;
}

function teamToResponse(team: Team, memberCount: number): TeamResponse {
  return {
    id: team.id,
    name: team.name,
    description: team.description,
    memberCount,
    isActive: team.is_active === 1,
    createdAt: team.created_at,
  };
}

function memberToResponse(member: TeamMember): TeamMemberResponse {
  return {
    id: member.id,
    email: member.email,
    name: member.name,
    role: member.role,
    status: member.status,
    permissions: ROLE_PERMISSIONS[member.role],
    lastLoginAt: member.last_login_at,
    createdAt: member.created_at,
  };
}

// =============================================================================
// Team CRUD
// =============================================================================

export async function createTeam(
  db: D1Database,
  customerId: string,
  request: CreateTeamRequest
): Promise<{ team?: TeamResponse; error?: string }> {
  // Check if customer already has a team
  const existing = await db
    .prepare('SELECT id FROM teams WHERE customer_id = ?')
    .bind(customerId)
    .first();

  if (existing) {
    return { error: 'You already have a team. Each customer can only have one team.' };
  }

  if (!request.name || request.name.trim().length === 0) {
    return { error: 'Team name is required' };
  }

  const id = crypto.randomUUID();

  await db
    .prepare(
      `INSERT INTO teams (id, customer_id, name, description, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))`
    )
    .bind(id, customerId, request.name.trim(), request.description || null)
    .run();

  const team = await db
    .prepare('SELECT * FROM teams WHERE id = ?')
    .bind(id)
    .first<Team>();

  if (!team) {
    return { error: 'Failed to create team' };
  }

  return { team: teamToResponse(team, 0) };
}

export async function getTeam(
  db: D1Database,
  customerId: string
): Promise<TeamResponse | null> {
  const team = await db
    .prepare('SELECT * FROM teams WHERE customer_id = ?')
    .bind(customerId)
    .first<Team>();

  if (!team) {
    return null;
  }

  const memberCount = await getMemberCount(db, team.id);
  return teamToResponse(team, memberCount);
}

export async function updateTeam(
  db: D1Database,
  customerId: string,
  request: UpdateTeamRequest
): Promise<{ team?: TeamResponse; error?: string }> {
  const existing = await db
    .prepare('SELECT * FROM teams WHERE customer_id = ?')
    .bind(customerId)
    .first<Team>();

  if (!existing) {
    return { error: 'Team not found' };
  }

  const updates: string[] = [];
  const values: (string | null)[] = [];

  if (request.name !== undefined) {
    if (!request.name || request.name.trim().length === 0) {
      return { error: 'Team name cannot be empty' };
    }
    updates.push('name = ?');
    values.push(request.name.trim());
  }

  if (request.description !== undefined) {
    updates.push('description = ?');
    values.push(request.description || null);
  }

  if (updates.length === 0) {
    const memberCount = await getMemberCount(db, existing.id);
    return { team: teamToResponse(existing, memberCount) };
  }

  updates.push("updated_at = datetime('now')");
  values.push(existing.id);

  await db
    .prepare(`UPDATE teams SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  const team = await db
    .prepare('SELECT * FROM teams WHERE id = ?')
    .bind(existing.id)
    .first<Team>();

  const memberCount = await getMemberCount(db, existing.id);
  return { team: team ? teamToResponse(team, memberCount) : undefined };
}

export async function deleteTeam(
  db: D1Database,
  customerId: string
): Promise<{ success: boolean; error?: string }> {
  const team = await db
    .prepare('SELECT id FROM teams WHERE customer_id = ?')
    .bind(customerId)
    .first<{ id: string }>();

  if (!team) {
    return { success: false, error: 'Team not found' };
  }

  // Delete all members first
  await db
    .prepare('DELETE FROM team_members WHERE team_id = ?')
    .bind(team.id)
    .run();

  // Delete invites
  await db
    .prepare('DELETE FROM team_invites WHERE team_id = ?')
    .bind(team.id)
    .run();

  // Delete team
  await db
    .prepare('DELETE FROM teams WHERE id = ?')
    .bind(team.id)
    .run();

  return { success: true };
}

// =============================================================================
// Team Members
// =============================================================================

export async function inviteMember(
  db: D1Database,
  customerId: string,
  request: InviteMemberRequest
): Promise<{ invite?: { token: string; expiresAt: string }; error?: string }> {
  // Get team
  const team = await db
    .prepare('SELECT id FROM teams WHERE customer_id = ?')
    .bind(customerId)
    .first<{ id: string }>();

  if (!team) {
    return { error: 'Team not found' };
  }

  // Validate role
  if (request.role === 'owner') {
    return { error: 'Cannot invite someone as owner' };
  }

  // Check member limit
  const memberCount = await getMemberCount(db, team.id);
  if (memberCount >= MAX_TEAM_MEMBERS) {
    return { error: `Maximum ${MAX_TEAM_MEMBERS} team members allowed` };
  }

  // Check if already a member
  const existingMember = await db
    .prepare('SELECT id FROM team_members WHERE team_id = ? AND email = ?')
    .bind(team.id, request.email.toLowerCase())
    .first();

  if (existingMember) {
    return { error: 'This email is already a team member' };
  }

  // Check for pending invite
  const existingInvite = await db
    .prepare('SELECT id FROM team_invites WHERE team_id = ? AND email = ? AND expires_at > datetime(\'now\')')
    .bind(team.id, request.email.toLowerCase())
    .first();

  if (existingInvite) {
    return { error: 'A pending invite already exists for this email' };
  }

  // Create invite
  const id = crypto.randomUUID();
  const token = generateToken();
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  await db
    .prepare(
      `INSERT INTO team_invites (id, team_id, email, role, token, invited_by, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    )
    .bind(id, team.id, request.email.toLowerCase(), request.role, token, customerId, expiresAt)
    .run();

  // Also create a pending member entry
  const memberId = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO team_members (id, team_id, email, name, role, status, invite_token, invite_expires_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, datetime('now'), datetime('now'))`
    )
    .bind(memberId, team.id, request.email.toLowerCase(), request.name || null, request.role, token, expiresAt)
    .run();

  return {
    invite: {
      token,
      expiresAt,
    },
  };
}

export async function acceptInvite(
  db: D1Database,
  token: string,
  password: string,
  name?: string
): Promise<{ member?: TeamMemberResponse; error?: string }> {
  // Find pending member with this token
  const member = await db
    .prepare(
      `SELECT * FROM team_members
       WHERE invite_token = ?
       AND status = 'pending'
       AND invite_expires_at > datetime('now')`
    )
    .bind(token)
    .first<TeamMember>();

  if (!member) {
    return { error: 'Invalid or expired invite' };
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Update member
  await db
    .prepare(
      `UPDATE team_members
       SET password_hash = ?,
           name = COALESCE(?, name),
           status = 'active',
           invite_token = NULL,
           invite_expires_at = NULL,
           updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(passwordHash, name || null, member.id)
    .run();

  // Delete the invite record
  await db
    .prepare('DELETE FROM team_invites WHERE token = ?')
    .bind(token)
    .run();

  const updatedMember = await db
    .prepare('SELECT * FROM team_members WHERE id = ?')
    .bind(member.id)
    .first<TeamMember>();

  return { member: updatedMember ? memberToResponse(updatedMember) : undefined };
}

export async function listMembers(
  db: D1Database,
  customerId: string
): Promise<TeamMemberResponse[]> {
  const team = await db
    .prepare('SELECT id FROM teams WHERE customer_id = ?')
    .bind(customerId)
    .first<{ id: string }>();

  if (!team) {
    return [];
  }

  const result = await db
    .prepare('SELECT * FROM team_members WHERE team_id = ? ORDER BY created_at ASC')
    .bind(team.id)
    .all<TeamMember>();

  return result.results.map(memberToResponse);
}

export async function updateMember(
  db: D1Database,
  customerId: string,
  memberId: string,
  request: UpdateMemberRequest
): Promise<{ member?: TeamMemberResponse; error?: string }> {
  const team = await db
    .prepare('SELECT id FROM teams WHERE customer_id = ?')
    .bind(customerId)
    .first<{ id: string }>();

  if (!team) {
    return { error: 'Team not found' };
  }

  const member = await db
    .prepare('SELECT * FROM team_members WHERE id = ? AND team_id = ?')
    .bind(memberId, team.id)
    .first<TeamMember>();

  if (!member) {
    return { error: 'Member not found' };
  }

  // Cannot change owner role
  if (member.role === 'owner') {
    return { error: 'Cannot modify owner role' };
  }

  // Cannot promote to owner
  if (request.role === 'owner') {
    return { error: 'Cannot promote to owner' };
  }

  const updates: string[] = [];
  const values: (string | null)[] = [];

  if (request.role !== undefined) {
    updates.push('role = ?');
    values.push(request.role);
  }

  if (request.name !== undefined) {
    updates.push('name = ?');
    values.push(request.name || null);
  }

  if (updates.length === 0) {
    return { member: memberToResponse(member) };
  }

  updates.push("updated_at = datetime('now')");
  values.push(memberId);

  await db
    .prepare(`UPDATE team_members SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  const updated = await db
    .prepare('SELECT * FROM team_members WHERE id = ?')
    .bind(memberId)
    .first<TeamMember>();

  return { member: updated ? memberToResponse(updated) : undefined };
}

export async function removeMember(
  db: D1Database,
  customerId: string,
  memberId: string
): Promise<{ success: boolean; error?: string }> {
  const team = await db
    .prepare('SELECT id FROM teams WHERE customer_id = ?')
    .bind(customerId)
    .first<{ id: string }>();

  if (!team) {
    return { success: false, error: 'Team not found' };
  }

  const member = await db
    .prepare('SELECT role FROM team_members WHERE id = ? AND team_id = ?')
    .bind(memberId, team.id)
    .first<{ role: TeamRole }>();

  if (!member) {
    return { success: false, error: 'Member not found' };
  }

  if (member.role === 'owner') {
    return { success: false, error: 'Cannot remove the owner' };
  }

  await db
    .prepare('DELETE FROM team_members WHERE id = ?')
    .bind(memberId)
    .run();

  return { success: true };
}

export async function cancelInvite(
  db: D1Database,
  customerId: string,
  memberId: string
): Promise<{ success: boolean; error?: string }> {
  const team = await db
    .prepare('SELECT id FROM teams WHERE customer_id = ?')
    .bind(customerId)
    .first<{ id: string }>();

  if (!team) {
    return { success: false, error: 'Team not found' };
  }

  const member = await db
    .prepare('SELECT invite_token, status FROM team_members WHERE id = ? AND team_id = ?')
    .bind(memberId, team.id)
    .first<{ invite_token: string | null; status: string }>();

  if (!member) {
    return { success: false, error: 'Member not found' };
  }

  if (member.status !== 'pending') {
    return { success: false, error: 'Cannot cancel - member is already active' };
  }

  // Delete invite
  if (member.invite_token) {
    await db
      .prepare('DELETE FROM team_invites WHERE token = ?')
      .bind(member.invite_token)
      .run();
  }

  // Delete pending member
  await db
    .prepare('DELETE FROM team_members WHERE id = ?')
    .bind(memberId)
    .run();

  return { success: true };
}
