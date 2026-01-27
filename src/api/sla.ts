/**
 * SLA Dashboard API Endpoints
 *
 * GET    /api/status                    - Public status page
 * GET    /api/status/uptime             - Uptime statistics
 * GET    /api/sla/report                - Customer SLA report
 * GET    /api/incidents                 - List incidents
 * GET    /api/incidents/:id/updates     - Get incident updates
 * POST   /api/admin/incidents           - Create incident (admin)
 * PATCH  /api/admin/incidents/:id       - Update incident status (admin)
 * GET    /api/performance               - Performance metrics
 */

import { Customer } from '../saas/types';
import {
  IncidentStatus,
  IncidentSeverity,
} from '../enterprise/sla/types';
import {
  getSystemStatus,
  getUptimeStats,
  generateSLAReport,
  getPerformanceMetrics,
  getIncidentHistory,
  getIncidentUpdates,
  createIncident,
  updateIncidentStatus,
} from '../enterprise/sla/service';
import { jsonResponse, errorResponse, verifyToken, extractBearerToken } from './utils';

// =============================================================================
// Auth Helpers
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

// Admin auth using admin JWT
async function verifyAdminToken(
  request: Request,
  db: D1Database
): Promise<{ adminId: string; error?: never } | { adminId?: never; error: Response }> {
  const token = extractBearerToken(request);
  if (!token) {
    return { error: errorResponse('Admin authorization required', 401, 'MISSING_TOKEN') };
  }

  // Decode JWT to check admin flag
  try {
    const [, payloadB64] = token.split('.');
    const payload = JSON.parse(atob(payloadB64));

    if (!payload.isAdmin) {
      return { error: errorResponse('Invalid admin token', 401, 'INVALID_ADMIN_TOKEN') };
    }

    // Verify admin still exists
    const admin = await db
      .prepare('SELECT id FROM admin_users WHERE id = ? AND is_active = 1')
      .bind(payload.sub)
      .first<{ id: string }>();

    if (!admin) {
      return { error: errorResponse('Admin not found or inactive', 401, 'ADMIN_INACTIVE') };
    }

    return { adminId: payload.sub };
  } catch {
    return { error: errorResponse('Invalid admin token', 401, 'INVALID_ADMIN_TOKEN') };
  }
}

// =============================================================================
// Public Status Endpoints
// =============================================================================

export async function handleGetStatus(db: D1Database): Promise<Response> {
  const status = await getSystemStatus(db);
  return jsonResponse(status);
}

export async function handleGetUptimeStats(
  request: Request,
  db: D1Database
): Promise<Response> {
  const url = new URL(request.url);
  const periodParam = url.searchParams.get('period') || 'week';

  // Validate period
  const validPeriods = ['day', 'week', 'month', 'quarter', 'year'] as const;
  type ValidPeriod = typeof validPeriods[number];
  const period: ValidPeriod = validPeriods.includes(periodParam as ValidPeriod)
    ? periodParam as ValidPeriod
    : 'week';

  const stats = await getUptimeStats(db, period);
  return jsonResponse({ stats });
}

// =============================================================================
// Customer SLA Report
// =============================================================================

export async function handleGetSLAReport(
  request: Request,
  db: D1Database
): Promise<Response> {
  const auth = await getAuthenticatedCustomer(request, db);
  if (auth.error) return auth.error;

  // Only pro+ tiers get SLA reports
  if (!['pro', 'business', 'enterprise'].includes(auth.customer.tier)) {
    return errorResponse('SLA reports are available for Pro tier and above', 403, 'TIER_REQUIRED');
  }

  const url = new URL(request.url);
  const startDate = url.searchParams.get('startDate') || getMonthStart();
  const endDate = url.searchParams.get('endDate') || new Date().toISOString().split('T')[0];

  const isEnterprise = auth.customer.tier === 'enterprise';
  const report = await generateSLAReport(db, auth.customer.id, startDate, endDate, isEnterprise);
  return jsonResponse({ report });
}

function getMonthStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
}

// =============================================================================
// Incidents (Public)
// =============================================================================

export async function handleListIncidents(
  request: Request,
  db: D1Database
): Promise<Response> {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '20', 10);

  const incidents = await getIncidentHistory(db, Math.min(limit, 100));
  return jsonResponse({ incidents });
}

export async function handleGetIncidentDetails(
  db: D1Database,
  incidentId: string
): Promise<Response> {
  const updates = await getIncidentUpdates(db, incidentId);
  return jsonResponse({ updates });
}

// =============================================================================
// Admin: Incident Management
// =============================================================================

export async function handleCreateIncident(
  request: Request,
  db: D1Database
): Promise<Response> {
  const auth = await verifyAdminToken(request, db);
  if (auth.error) return auth.error;

  let body: {
    title: string;
    description?: string;
    severity?: IncidentSeverity;
    affectedComponents?: string[];
  };
  try {
    body = await request.json() as typeof body;
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  if (!body.title) {
    return errorResponse('Title is required', 400);
  }

  const severity = body.severity || 'minor';
  const validSeverities: IncidentSeverity[] = ['critical', 'major', 'minor'];
  if (!validSeverities.includes(severity)) {
    return errorResponse('Invalid severity', 400);
  }

  const incident = await createIncident(
    db,
    body.title,
    body.description || '',
    severity,
    body.affectedComponents || []
  );

  return jsonResponse({ incident }, 201);
}

export async function handleUpdateIncident(
  request: Request,
  db: D1Database,
  incidentId: string
): Promise<Response> {
  const auth = await verifyAdminToken(request, db);
  if (auth.error) return auth.error;

  let body: { status: IncidentStatus; message: string };
  try {
    body = await request.json() as typeof body;
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  if (!body.status || !body.message) {
    return errorResponse('Status and message are required', 400);
  }

  const validStatuses: IncidentStatus[] = ['investigating', 'identified', 'monitoring', 'resolved'];
  if (!validStatuses.includes(body.status)) {
    return errorResponse('Invalid status', 400);
  }

  await updateIncidentStatus(db, incidentId, body.status, body.message);

  return jsonResponse({ success: true, message: 'Incident updated' });
}

// =============================================================================
// Performance Metrics
// =============================================================================

export async function handleGetPerformance(
  request: Request,
  db: D1Database
): Promise<Response> {
  const url = new URL(request.url);
  const hours = parseInt(url.searchParams.get('hours') || '24', 10);

  const metrics = await getPerformanceMetrics(db, Math.min(hours, 168)); // Max 7 days
  return jsonResponse({ metrics });
}
