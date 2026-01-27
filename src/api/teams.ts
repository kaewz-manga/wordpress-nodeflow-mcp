/**
 * Team Management API Endpoints
 *
 * GET    /api/team                   - Get team info
 * POST   /api/team                   - Create team
 * PATCH  /api/team                   - Update team
 * DELETE /api/team                   - Delete team
 * GET    /api/team/members           - List members
 * POST   /api/team/members           - Invite member
 * PATCH  /api/team/members/:id       - Update member
 * DELETE /api/team/members/:id       - Remove member
 * POST   /api/team/invites/:id/cancel - Cancel invite
 * POST   /api/team/invites/accept    - Accept invite (public)
 */

import { Customer } from '../saas/types';
import {
  CreateTeamRequest,
  UpdateTeamRequest,
  InviteMemberRequest,
  UpdateMemberRequest,
  ROLE_PERMISSIONS,
} from '../teams/types';
import {
  createTeam,
  getTeam,
  updateTeam,
  deleteTeam,
  inviteMember,
  acceptInvite,
  listMembers,
  updateMember,
  removeMember,
  cancelInvite,
} from '../teams/service';
import { logCustomerAction } from '../audit/service';
import { jsonResponse, errorResponse, verifyToken, extractBearerToken } from './utils';

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
// Team Handlers
// =============================================================================

export async function handleGetTeam(
  request: Request,
  db: D1Database
): Promise<Response> {
  const auth = await getAuthenticatedCustomer(request, db);
  if (auth.error) return auth.error;

  const team = await getTeam(db, auth.customer.id);

  if (!team) {
    return jsonResponse({ team: null, message: 'No team created yet' });
  }

  return jsonResponse({ team });
}

export async function handleCreateTeam(
  request: Request,
  db: D1Database
): Promise<Response> {
  const auth = await getAuthenticatedCustomer(request, db);
  if (auth.error) return auth.error;

  // Check tier - teams are for Pro and above
  if (!['pro', 'business', 'enterprise'].includes(auth.customer.tier)) {
    return errorResponse('Teams are available for Pro tier and above', 403, 'TIER_REQUIRED');
  }

  let body: CreateTeamRequest;
  try {
    body = await request.json() as CreateTeamRequest;
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  const result = await createTeam(db, auth.customer.id, body);

  if (result.error) {
    return errorResponse(result.error, 400);
  }

  // Audit log
  await logCustomerAction(db, auth.customer.id, 'team.create', request, {
    resourceType: 'team',
    resourceId: result.team!.id,
    details: { name: body.name },
  });

  return jsonResponse({ team: result.team }, 201);
}

export async function handleUpdateTeam(
  request: Request,
  db: D1Database
): Promise<Response> {
  const auth = await getAuthenticatedCustomer(request, db);
  if (auth.error) return auth.error;

  let body: UpdateTeamRequest;
  try {
    body = await request.json() as UpdateTeamRequest;
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  const result = await updateTeam(db, auth.customer.id, body);

  if (result.error) {
    return errorResponse(result.error, 400);
  }

  return jsonResponse({ team: result.team });
}

export async function handleDeleteTeam(
  request: Request,
  db: D1Database
): Promise<Response> {
  const auth = await getAuthenticatedCustomer(request, db);
  if (auth.error) return auth.error;

  const result = await deleteTeam(db, auth.customer.id);

  if (result.error) {
    return errorResponse(result.error, 400);
  }

  return jsonResponse({ success: true, message: 'Team deleted' });
}

// =============================================================================
// Member Handlers
// =============================================================================

export async function handleListMembers(
  request: Request,
  db: D1Database
): Promise<Response> {
  const auth = await getAuthenticatedCustomer(request, db);
  if (auth.error) return auth.error;

  const members = await listMembers(db, auth.customer.id);

  return jsonResponse({ members });
}

export async function handleInviteMember(
  request: Request,
  db: D1Database
): Promise<Response> {
  const auth = await getAuthenticatedCustomer(request, db);
  if (auth.error) return auth.error;

  let body: InviteMemberRequest;
  try {
    body = await request.json() as InviteMemberRequest;
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  if (!body.email) {
    return errorResponse('Email is required', 400);
  }

  if (!body.role || !['admin', 'member', 'viewer'].includes(body.role)) {
    return errorResponse('Valid role is required (admin, member, viewer)', 400);
  }

  const result = await inviteMember(db, auth.customer.id, body);

  if (result.error) {
    return errorResponse(result.error, 400);
  }

  // Audit log
  await logCustomerAction(db, auth.customer.id, 'team.member_add', request, {
    details: { email: body.email, role: body.role },
  });

  return jsonResponse({
    invite: result.invite,
    message: 'Invite sent successfully',
  }, 201);
}

export async function handleUpdateMember(
  request: Request,
  db: D1Database,
  memberId: string
): Promise<Response> {
  const auth = await getAuthenticatedCustomer(request, db);
  if (auth.error) return auth.error;

  let body: UpdateMemberRequest;
  try {
    body = await request.json() as UpdateMemberRequest;
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  if (body.role && !['admin', 'member', 'viewer'].includes(body.role)) {
    return errorResponse('Invalid role', 400);
  }

  const result = await updateMember(db, auth.customer.id, memberId, body);

  if (result.error) {
    return errorResponse(result.error, 400);
  }

  // Audit log
  await logCustomerAction(db, auth.customer.id, 'team.member_role_change', request, {
    resourceType: 'team_member',
    resourceId: memberId,
    details: body as unknown as Record<string, unknown>,
  });

  return jsonResponse({ member: result.member });
}

export async function handleRemoveMember(
  request: Request,
  db: D1Database,
  memberId: string
): Promise<Response> {
  const auth = await getAuthenticatedCustomer(request, db);
  if (auth.error) return auth.error;

  const result = await removeMember(db, auth.customer.id, memberId);

  if (result.error) {
    return errorResponse(result.error, 400);
  }

  // Audit log
  await logCustomerAction(db, auth.customer.id, 'team.member_remove', request, {
    resourceType: 'team_member',
    resourceId: memberId,
  });

  return jsonResponse({ success: true, message: 'Member removed' });
}

export async function handleCancelInvite(
  request: Request,
  db: D1Database,
  memberId: string
): Promise<Response> {
  const auth = await getAuthenticatedCustomer(request, db);
  if (auth.error) return auth.error;

  const result = await cancelInvite(db, auth.customer.id, memberId);

  if (result.error) {
    return errorResponse(result.error, 400);
  }

  return jsonResponse({ success: true, message: 'Invite cancelled' });
}

// =============================================================================
// Public Handlers (No Auth Required)
// =============================================================================

export async function handleAcceptInvite(
  request: Request,
  db: D1Database
): Promise<Response> {
  let body: { token: string; password: string; name?: string };
  try {
    body = await request.json() as typeof body;
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  if (!body.token) {
    return errorResponse('Invite token is required', 400);
  }

  if (!body.password || body.password.length < 8) {
    return errorResponse('Password must be at least 8 characters', 400);
  }

  const result = await acceptInvite(db, body.token, body.password, body.name);

  if (result.error) {
    return errorResponse(result.error, 400);
  }

  return jsonResponse({
    member: result.member,
    message: 'Invite accepted successfully',
  });
}

export function handleGetRoles(): Response {
  return jsonResponse({
    roles: Object.entries(ROLE_PERMISSIONS).map(([role, permissions]) => ({
      role,
      permissions,
    })),
  });
}
