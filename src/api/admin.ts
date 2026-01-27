/**
 * Admin Dashboard API Endpoints
 *
 * POST   /api/admin/login              - Admin login
 * GET    /api/admin/dashboard          - Dashboard stats
 * GET    /api/admin/customers          - List customers
 * GET    /api/admin/customers/:id      - Get customer detail
 * POST   /api/admin/customers/:id/subscription - Change subscription
 * POST   /api/admin/customers/:id/suspend - Suspend customer
 * POST   /api/admin/customers/:id/reactivate - Reactivate customer
 * POST   /api/admin/customers/:id/reset-usage - Reset usage
 * DELETE /api/admin/customers/:id      - Delete customer
 * GET    /api/admin/users              - List admin users
 * POST   /api/admin/users              - Create admin user
 * PATCH  /api/admin/users/:id          - Update admin user
 * DELETE /api/admin/users/:id          - Deactivate admin user
 * GET    /api/admin/actions            - Get admin action log
 */

import { hashPassword, verifyPassword } from '../saas/customers';
import {
  AdminRole,
  ADMIN_PERMISSIONS,
  CustomerFilters,
} from '../enterprise/admin/types';
import {
  createAdminUser,
  getAdminByEmail,
  getAdminById,
  updateAdminLastLogin,
  listAdminUsers,
  updateAdminRole,
  deactivateAdmin,
  getAdminPermissions,
  getDashboardStats,
  listCustomers,
  getCustomerDetail,
  logAdminAction,
  getAdminActions,
  changeCustomerSubscription,
  suspendCustomer,
  reactivateCustomer,
  resetCustomerUsage,
  deleteCustomerData,
} from '../enterprise/admin/service';
import { jsonResponse, errorResponse, extractBearerToken } from './utils';

// =============================================================================
// Admin JWT (separate from customer JWT)
// =============================================================================

const JWT_SECRET_KEY = 'your-jwt-secret-key';  // In production, use env variable
const JWT_EXPIRY_HOURS = 24;

function base64UrlEncode(data: string): string {
  return btoa(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function createSignature(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const signatureArray = Array.from(new Uint8Array(signature));
  return base64UrlEncode(String.fromCharCode(...signatureArray));
}

async function generateAdminToken(adminId: string, role: AdminRole): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: adminId,
    role,
    isAdmin: true,
    iat: now,
    exp: now + JWT_EXPIRY_HOURS * 3600,
  };

  const headerBase64 = base64UrlEncode(JSON.stringify(header));
  const payloadBase64 = base64UrlEncode(JSON.stringify(payload));
  const dataToSign = `${headerBase64}.${payloadBase64}`;
  const signature = await createSignature(dataToSign, JWT_SECRET_KEY);

  return `${dataToSign}.${signature}`;
}

async function verifyAdminToken(
  request: Request,
  db: D1Database,
  requiredPermission?: keyof typeof ADMIN_PERMISSIONS.super_admin
): Promise<{ adminId: string; role: AdminRole; error?: never } | { adminId?: never; role?: never; error: Response }> {
  const token = extractBearerToken(request);
  if (!token) {
    return { error: errorResponse('Admin authorization required', 401, 'MISSING_TOKEN') };
  }

  // Decode JWT manually for admin verification
  try {
    const [, payloadB64] = token.split('.');
    const payload = JSON.parse(atob(payloadB64));

    if (!payload.isAdmin) {
      return { error: errorResponse('Invalid admin token', 401, 'INVALID_ADMIN_TOKEN') };
    }

    // Verify admin still exists and is active
    const admin = await getAdminById(db, payload.sub);
    if (!admin || !admin.is_active) {
      return { error: errorResponse('Admin account not found or inactive', 401, 'ADMIN_INACTIVE') };
    }

    // Check permission if required
    if (requiredPermission) {
      const permissions = getAdminPermissions(admin.role);
      if (!permissions[requiredPermission]) {
        return { error: errorResponse('Insufficient permissions', 403, 'PERMISSION_DENIED') };
      }
    }

    return { adminId: payload.sub, role: admin.role };
  } catch {
    return { error: errorResponse('Invalid admin token', 401, 'INVALID_ADMIN_TOKEN') };
  }
}

function getClientIP(request: Request): string | null {
  return request.headers.get('cf-connecting-ip') ||
         request.headers.get('x-forwarded-for')?.split(',')[0] ||
         null;
}

// =============================================================================
// Authentication
// =============================================================================

export async function handleAdminLogin(
  request: Request,
  db: D1Database
): Promise<Response> {
  let body: { email: string; password: string };
  try {
    body = await request.json() as typeof body;
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  if (!body.email || !body.password) {
    return errorResponse('Email and password are required', 400);
  }

  const admin = await getAdminByEmail(db, body.email);
  if (!admin) {
    return errorResponse('Invalid credentials', 401);
  }

  if (!admin.is_active) {
    return errorResponse('Account is inactive', 401);
  }

  const validPassword = await verifyPassword(body.password, admin.password_hash);
  if (!validPassword) {
    return errorResponse('Invalid credentials', 401);
  }

  // Update last login
  await updateAdminLastLogin(db, admin.id);

  // Generate admin token
  const token = await generateAdminToken(admin.id, admin.role);

  // Log action
  await logAdminAction(db, admin.id, 'admin.login', 'admin', admin.id, null, getClientIP(request));

  return jsonResponse({
    token,
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      permissions: getAdminPermissions(admin.role),
    },
  });
}

// =============================================================================
// Dashboard
// =============================================================================

export async function handleGetDashboard(
  request: Request,
  db: D1Database
): Promise<Response> {
  const auth = await verifyAdminToken(request, db);
  if (auth.error) return auth.error;

  const stats = await getDashboardStats(db);
  return jsonResponse({ stats });
}

// =============================================================================
// Customer Management
// =============================================================================

export async function handleListCustomers(
  request: Request,
  db: D1Database
): Promise<Response> {
  const auth = await verifyAdminToken(request, db, 'canManageCustomers');
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const filters: CustomerFilters = {
    tier: url.searchParams.get('tier') || undefined,
    status: url.searchParams.get('status') || undefined,
    search: url.searchParams.get('search') || undefined,
    sortBy: (url.searchParams.get('sortBy') as CustomerFilters['sortBy']) || 'created_at',
    sortOrder: (url.searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
    limit: parseInt(url.searchParams.get('limit') || '50', 10),
    offset: parseInt(url.searchParams.get('offset') || '0', 10),
  };

  const result = await listCustomers(db, filters);
  return jsonResponse(result);
}

export async function handleGetCustomerDetail(
  request: Request,
  db: D1Database,
  customerId: string
): Promise<Response> {
  const auth = await verifyAdminToken(request, db, 'canManageCustomers');
  if (auth.error) return auth.error;

  const customer = await getCustomerDetail(db, customerId);

  if (!customer) {
    return errorResponse('Customer not found', 404);
  }

  return jsonResponse({ customer });
}

export async function handleChangeSubscription(
  request: Request,
  db: D1Database,
  customerId: string
): Promise<Response> {
  const auth = await verifyAdminToken(request, db, 'canManageSubscriptions');
  if (auth.error) return auth.error;

  let body: { tier: string; reason: string };
  try {
    body = await request.json() as typeof body;
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  if (!body.tier || !body.reason) {
    return errorResponse('Tier and reason are required', 400);
  }

  const result = await changeCustomerSubscription(
    db,
    auth.adminId,
    { customerId, tier: body.tier, reason: body.reason },
    getClientIP(request)
  );

  if (result.error) {
    return errorResponse(result.error, 400);
  }

  return jsonResponse({ success: true, message: 'Subscription updated' });
}

export async function handleSuspendCustomer(
  request: Request,
  db: D1Database,
  customerId: string
): Promise<Response> {
  const auth = await verifyAdminToken(request, db, 'canManageCustomers');
  if (auth.error) return auth.error;

  let body: { reason: string };
  try {
    body = await request.json() as typeof body;
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  if (!body.reason) {
    return errorResponse('Reason is required', 400);
  }

  const result = await suspendCustomer(
    db,
    auth.adminId,
    { customerId, reason: body.reason },
    getClientIP(request)
  );

  if (result.error) {
    return errorResponse(result.error, 400);
  }

  return jsonResponse({ success: true, message: 'Customer suspended' });
}

export async function handleReactivateCustomer(
  request: Request,
  db: D1Database,
  customerId: string
): Promise<Response> {
  const auth = await verifyAdminToken(request, db, 'canManageCustomers');
  if (auth.error) return auth.error;

  const result = await reactivateCustomer(db, auth.adminId, customerId, getClientIP(request));

  if (result.error) {
    return errorResponse(result.error, 400);
  }

  return jsonResponse({ success: true, message: 'Customer reactivated' });
}

export async function handleResetCustomerUsage(
  request: Request,
  db: D1Database,
  customerId: string
): Promise<Response> {
  const auth = await verifyAdminToken(request, db, 'canManageSubscriptions');
  if (auth.error) return auth.error;

  const result = await resetCustomerUsage(db, auth.adminId, customerId, getClientIP(request));

  if (result.error) {
    return errorResponse(result.error, 400);
  }

  return jsonResponse({ success: true, message: 'Usage reset' });
}

export async function handleDeleteCustomer(
  request: Request,
  db: D1Database,
  customerId: string
): Promise<Response> {
  const auth = await verifyAdminToken(request, db, 'canManageCustomers');
  if (auth.error) return auth.error;

  // Only super_admin can delete customers
  if (auth.role !== 'super_admin') {
    return errorResponse('Only super admins can delete customers', 403, 'PERMISSION_DENIED');
  }

  const result = await deleteCustomerData(db, auth.adminId, customerId, getClientIP(request));

  if (result.error) {
    return errorResponse(result.error, 400);
  }

  return jsonResponse({ success: true, message: 'Customer deleted' });
}

// =============================================================================
// Admin User Management
// =============================================================================

export async function handleListAdminUsers(
  request: Request,
  db: D1Database
): Promise<Response> {
  const auth = await verifyAdminToken(request, db, 'canManageAdmins');
  if (auth.error) return auth.error;

  const admins = await listAdminUsers(db);

  // Remove password hashes from response
  const sanitizedAdmins = admins.map(({ password_hash, ...admin }) => admin);

  return jsonResponse({ admins: sanitizedAdmins });
}

export async function handleCreateAdminUser(
  request: Request,
  db: D1Database
): Promise<Response> {
  const auth = await verifyAdminToken(request, db, 'canManageAdmins');
  if (auth.error) return auth.error;

  let body: { email: string; name: string; password: string; role?: AdminRole };
  try {
    body = await request.json() as typeof body;
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  if (!body.email || !body.name || !body.password) {
    return errorResponse('Email, name, and password are required', 400);
  }

  if (body.password.length < 12) {
    return errorResponse('Password must be at least 12 characters', 400);
  }

  const validRoles: AdminRole[] = ['super_admin', 'admin', 'support'];
  const role = body.role || 'support';
  if (!validRoles.includes(role)) {
    return errorResponse('Invalid role', 400);
  }

  // Only super_admin can create other super_admins
  if (role === 'super_admin' && auth.role !== 'super_admin') {
    return errorResponse('Only super admins can create other super admins', 403);
  }

  const passwordHash = await hashPassword(body.password);
  const result = await createAdminUser(db, body.email, body.name, passwordHash, role);

  if (result.error) {
    return errorResponse(result.error, 400);
  }

  // Log action
  await logAdminAction(db, auth.adminId, 'admin.create', 'admin', result.admin!.id, {
    email: body.email,
    role,
  }, getClientIP(request));

  // Remove password hash from response
  const { password_hash, ...admin } = result.admin!;

  return jsonResponse({ admin }, 201);
}

export async function handleUpdateAdminUser(
  request: Request,
  db: D1Database,
  targetAdminId: string
): Promise<Response> {
  const auth = await verifyAdminToken(request, db, 'canManageAdmins');
  if (auth.error) return auth.error;

  let body: { role?: AdminRole };
  try {
    body = await request.json() as typeof body;
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  if (body.role) {
    const validRoles: AdminRole[] = ['super_admin', 'admin', 'support'];
    if (!validRoles.includes(body.role)) {
      return errorResponse('Invalid role', 400);
    }

    // Only super_admin can set super_admin role
    if (body.role === 'super_admin' && auth.role !== 'super_admin') {
      return errorResponse('Only super admins can grant super admin role', 403);
    }

    const result = await updateAdminRole(db, targetAdminId, body.role);
    if (result.error) {
      return errorResponse(result.error, 400);
    }

    // Log action
    await logAdminAction(db, auth.adminId, 'admin.update_role', 'admin', targetAdminId, {
      newRole: body.role,
    }, getClientIP(request));
  }

  return jsonResponse({ success: true, message: 'Admin user updated' });
}

export async function handleDeactivateAdminUser(
  request: Request,
  db: D1Database,
  targetAdminId: string
): Promise<Response> {
  const auth = await verifyAdminToken(request, db, 'canManageAdmins');
  if (auth.error) return auth.error;

  // Cannot deactivate yourself
  if (targetAdminId === auth.adminId) {
    return errorResponse('Cannot deactivate your own account', 400);
  }

  // Only super_admin can deactivate other super_admins
  const targetAdmin = await getAdminById(db, targetAdminId);
  if (targetAdmin?.role === 'super_admin' && auth.role !== 'super_admin') {
    return errorResponse('Only super admins can deactivate other super admins', 403);
  }

  const result = await deactivateAdmin(db, targetAdminId);

  if (result.error) {
    return errorResponse(result.error, 400);
  }

  // Log action
  await logAdminAction(db, auth.adminId, 'admin.deactivate', 'admin', targetAdminId, null, getClientIP(request));

  return jsonResponse({ success: true, message: 'Admin user deactivated' });
}

// =============================================================================
// Admin Action Log
// =============================================================================

export async function handleGetAdminActions(
  request: Request,
  db: D1Database
): Promise<Response> {
  const auth = await verifyAdminToken(request, db, 'canViewLogs');
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const adminId = url.searchParams.get('adminId') || undefined;
  const limit = parseInt(url.searchParams.get('limit') || '100', 10);

  const actions = await getAdminActions(db, adminId, Math.min(limit, 500));
  return jsonResponse({ actions });
}
