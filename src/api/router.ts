/**
 * API Router
 * Routes all /api/* requests to appropriate handlers
 */

import { handleRegister, handleLogin, handleGetMe } from './auth';
import { handleListKeys, handleCreateKey, handleRevokeKey, handleDeleteKey } from './keys';
import { handleGetUsage, handleGetUsageHistory, handleGetUsageLogs, handleGetToolUsage } from './usage';
import {
  handleGoogleAuth,
  handleGitHubAuth,
  handleGoogleCallback,
  handleGitHubCallback,
  handleGetProviders,
} from './oauth-handlers';
import {
  handleGetBilling,
  handleCreateCheckout,
  handleCreatePortal,
  handleGetInvoices,
  handleCancelSubscription,
  handleResumeSubscription,
  handleGetPlans,
} from './billing';
import {
  handleListWebhooks,
  handleCreateWebhook,
  handleGetWebhook,
  handleUpdateWebhook,
  handleDeleteWebhook,
  handleTestWebhook,
  handleRegenerateSecret,
  handleGetSecret,
  handleGetDeliveries,
  handleGetEventTypes,
} from './webhooks';
import {
  handleListAuditLogs,
  handleGetAuditLog,
  handleExportAuditLogs,
  handleGetActionTypes,
} from './audit';
import {
  handleGetTeam,
  handleCreateTeam,
  handleUpdateTeam,
  handleDeleteTeam,
  handleListMembers,
  handleInviteMember,
  handleUpdateMember,
  handleRemoveMember,
  handleCancelInvite,
  handleAcceptInvite,
  handleGetRoles,
} from './teams';
import {
  handleListDomains,
  handleCreateDomain,
  handleGetDomain,
  handleVerifyDomain,
  handleRefreshDomain,
  handleDeleteDomain,
  handleGetDomainLimits,
} from './domains';
import { errorResponse, getQueryParam } from './utils';

// =============================================================================
// Types
// =============================================================================

export interface ApiEnv {
  DB: D1Database;
  RATE_LIMIT: KVNamespace;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PUBLISHABLE_KEY?: string;
}

// =============================================================================
// Router
// =============================================================================

/**
 * Handle all /api/* routes
 */
export async function handleApiRequest(
  request: Request,
  env: ApiEnv
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // ==========================================================================
  // OAuth Routes
  // ==========================================================================

  // GET /api/auth/providers - List available OAuth providers
  if (path === '/api/auth/providers' && method === 'GET') {
    return handleGetProviders(env);
  }

  // GET /api/auth/google - Initiate Google OAuth
  if (path === '/api/auth/google' && method === 'GET') {
    return handleGoogleAuth(request, env);
  }

  // GET /api/auth/github - Initiate GitHub OAuth
  if (path === '/api/auth/github' && method === 'GET') {
    return handleGitHubAuth(request, env);
  }

  // GET /api/auth/callback/google - Google OAuth callback
  if (path === '/api/auth/callback/google' && method === 'GET') {
    return handleGoogleCallback(request, env);
  }

  // GET /api/auth/callback/github - GitHub OAuth callback
  if (path === '/api/auth/callback/github' && method === 'GET') {
    return handleGitHubCallback(request, env);
  }

  // ==========================================================================
  // Auth Routes
  // ==========================================================================

  // POST /api/auth/register
  if (path === '/api/auth/register' && method === 'POST') {
    return handleRegister(request, env.DB);
  }

  // POST /api/auth/login
  if (path === '/api/auth/login' && method === 'POST') {
    return handleLogin(request, env.DB);
  }

  // GET /api/auth/me
  if (path === '/api/auth/me' && method === 'GET') {
    return handleGetMe(request, env.DB);
  }

  // ==========================================================================
  // API Keys Routes
  // ==========================================================================

  // GET /api/keys
  if (path === '/api/keys' && method === 'GET') {
    return handleListKeys(request, env.DB);
  }

  // POST /api/keys
  if (path === '/api/keys' && method === 'POST') {
    return handleCreateKey(request, env.DB);
  }

  // DELETE /api/keys/:id
  const keysDeleteMatch = path.match(/^\/api\/keys\/([a-zA-Z0-9-]+)$/);
  if (keysDeleteMatch && method === 'DELETE') {
    const keyId = keysDeleteMatch[1];
    const permanent = getQueryParam(url, 'permanent') === 'true';

    if (permanent) {
      return handleDeleteKey(request, env.DB, keyId);
    }
    return handleRevokeKey(request, env.DB, keyId);
  }

  // ==========================================================================
  // Usage Routes
  // ==========================================================================

  // GET /api/usage
  if (path === '/api/usage' && method === 'GET') {
    return handleGetUsage(request, env.DB);
  }

  // GET /api/usage/history
  if (path === '/api/usage/history' && method === 'GET') {
    return handleGetUsageHistory(request, env.DB);
  }

  // GET /api/usage/logs
  if (path === '/api/usage/logs' && method === 'GET') {
    return handleGetUsageLogs(request, env.DB);
  }

  // GET /api/usage/tools
  if (path === '/api/usage/tools' && method === 'GET') {
    return handleGetToolUsage(request, env.DB);
  }

  // ==========================================================================
  // Billing Routes
  // ==========================================================================

  // GET /api/billing/plans - Get available plans (public)
  if (path === '/api/billing/plans' && method === 'GET') {
    return handleGetPlans();
  }

  // Check if Stripe is configured for billing routes
  const stripeConfigured = env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET;

  // GET /api/billing - Get billing info
  if (path === '/api/billing' && method === 'GET') {
    if (!stripeConfigured) {
      return errorResponse('Billing is not configured', 503, 'BILLING_NOT_CONFIGURED');
    }
    return handleGetBilling(request, {
      DB: env.DB,
      STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY!,
      STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET!,
    });
  }

  // POST /api/billing/checkout - Create checkout session
  if (path === '/api/billing/checkout' && method === 'POST') {
    if (!stripeConfigured) {
      return errorResponse('Billing is not configured', 503, 'BILLING_NOT_CONFIGURED');
    }
    return handleCreateCheckout(request, {
      DB: env.DB,
      STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY!,
      STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET!,
    });
  }

  // POST /api/billing/portal - Create billing portal session
  if (path === '/api/billing/portal' && method === 'POST') {
    if (!stripeConfigured) {
      return errorResponse('Billing is not configured', 503, 'BILLING_NOT_CONFIGURED');
    }
    return handleCreatePortal(request, {
      DB: env.DB,
      STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY!,
      STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET!,
    });
  }

  // GET /api/billing/invoices - Get invoices
  if (path === '/api/billing/invoices' && method === 'GET') {
    if (!stripeConfigured) {
      return errorResponse('Billing is not configured', 503, 'BILLING_NOT_CONFIGURED');
    }
    return handleGetInvoices(request, {
      DB: env.DB,
      STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY!,
      STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET!,
    });
  }

  // POST /api/billing/cancel - Cancel subscription
  if (path === '/api/billing/cancel' && method === 'POST') {
    if (!stripeConfigured) {
      return errorResponse('Billing is not configured', 503, 'BILLING_NOT_CONFIGURED');
    }
    return handleCancelSubscription(request, {
      DB: env.DB,
      STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY!,
      STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET!,
    });
  }

  // POST /api/billing/resume - Resume subscription
  if (path === '/api/billing/resume' && method === 'POST') {
    if (!stripeConfigured) {
      return errorResponse('Billing is not configured', 503, 'BILLING_NOT_CONFIGURED');
    }
    return handleResumeSubscription(request, {
      DB: env.DB,
      STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY!,
      STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET!,
    });
  }

  // ==========================================================================
  // Webhook Routes
  // ==========================================================================

  // GET /api/webhooks/events - List webhook event types (public)
  if (path === '/api/webhooks/events' && method === 'GET') {
    return handleGetEventTypes();
  }

  // GET /api/webhooks - List webhooks
  if (path === '/api/webhooks' && method === 'GET') {
    return handleListWebhooks(request, env.DB);
  }

  // POST /api/webhooks - Create webhook
  if (path === '/api/webhooks' && method === 'POST') {
    return handleCreateWebhook(request, env.DB);
  }

  // Webhook ID routes
  const webhookIdMatch = path.match(/^\/api\/webhooks\/([a-zA-Z0-9-]+)$/);
  if (webhookIdMatch) {
    const webhookId = webhookIdMatch[1];

    if (method === 'GET') {
      return handleGetWebhook(request, env.DB, webhookId);
    }
    if (method === 'PATCH') {
      return handleUpdateWebhook(request, env.DB, webhookId);
    }
    if (method === 'DELETE') {
      return handleDeleteWebhook(request, env.DB, webhookId);
    }
  }

  // POST /api/webhooks/:id/test - Test webhook
  const webhookTestMatch = path.match(/^\/api\/webhooks\/([a-zA-Z0-9-]+)\/test$/);
  if (webhookTestMatch && method === 'POST') {
    return handleTestWebhook(request, env.DB, webhookTestMatch[1]);
  }

  // POST /api/webhooks/:id/secret - Regenerate secret
  const webhookSecretMatch = path.match(/^\/api\/webhooks\/([a-zA-Z0-9-]+)\/secret$/);
  if (webhookSecretMatch) {
    if (method === 'POST') {
      return handleRegenerateSecret(request, env.DB, webhookSecretMatch[1]);
    }
    if (method === 'GET') {
      return handleGetSecret(request, env.DB, webhookSecretMatch[1]);
    }
  }

  // GET /api/webhooks/:id/deliveries - Get delivery history
  const webhookDeliveriesMatch = path.match(/^\/api\/webhooks\/([a-zA-Z0-9-]+)\/deliveries$/);
  if (webhookDeliveriesMatch && method === 'GET') {
    return handleGetDeliveries(request, env.DB, webhookDeliveriesMatch[1]);
  }

  // ==========================================================================
  // Audit Log Routes
  // ==========================================================================

  // GET /api/audit/actions - List audit action types (public)
  if (path === '/api/audit/actions' && method === 'GET') {
    return handleGetActionTypes();
  }

  // GET /api/audit/export - Export audit logs
  if (path === '/api/audit/export' && method === 'GET') {
    return handleExportAuditLogs(request, env.DB);
  }

  // GET /api/audit - List audit logs
  if (path === '/api/audit' && method === 'GET') {
    return handleListAuditLogs(request, env.DB);
  }

  // GET /api/audit/:id - Get audit log entry
  const auditIdMatch = path.match(/^\/api\/audit\/([a-zA-Z0-9-]+)$/);
  if (auditIdMatch && method === 'GET') {
    return handleGetAuditLog(request, env.DB, auditIdMatch[1]);
  }

  // ==========================================================================
  // Team Routes
  // ==========================================================================

  // GET /api/team/roles - List team roles (public)
  if (path === '/api/team/roles' && method === 'GET') {
    return handleGetRoles();
  }

  // POST /api/team/invites/accept - Accept invite (public)
  if (path === '/api/team/invites/accept' && method === 'POST') {
    return handleAcceptInvite(request, env.DB);
  }

  // GET /api/team - Get team
  if (path === '/api/team' && method === 'GET') {
    return handleGetTeam(request, env.DB);
  }

  // POST /api/team - Create team
  if (path === '/api/team' && method === 'POST') {
    return handleCreateTeam(request, env.DB);
  }

  // PATCH /api/team - Update team
  if (path === '/api/team' && method === 'PATCH') {
    return handleUpdateTeam(request, env.DB);
  }

  // DELETE /api/team - Delete team
  if (path === '/api/team' && method === 'DELETE') {
    return handleDeleteTeam(request, env.DB);
  }

  // GET /api/team/members - List members
  if (path === '/api/team/members' && method === 'GET') {
    return handleListMembers(request, env.DB);
  }

  // POST /api/team/members - Invite member
  if (path === '/api/team/members' && method === 'POST') {
    return handleInviteMember(request, env.DB);
  }

  // Team member routes
  const memberIdMatch = path.match(/^\/api\/team\/members\/([a-zA-Z0-9-]+)$/);
  if (memberIdMatch) {
    const memberId = memberIdMatch[1];

    if (method === 'PATCH') {
      return handleUpdateMember(request, env.DB, memberId);
    }
    if (method === 'DELETE') {
      return handleRemoveMember(request, env.DB, memberId);
    }
  }

  // POST /api/team/invites/:id/cancel - Cancel invite
  const cancelInviteMatch = path.match(/^\/api\/team\/invites\/([a-zA-Z0-9-]+)\/cancel$/);
  if (cancelInviteMatch && method === 'POST') {
    return handleCancelInvite(request, env.DB, cancelInviteMatch[1]);
  }

  // ==========================================================================
  // Custom Domains Routes (Business and Enterprise tiers)
  // ==========================================================================

  // GET /api/domains/limits - Get domain limits for current tier
  if (path === '/api/domains/limits' && method === 'GET') {
    return handleGetDomainLimits(request, env.DB);
  }

  // GET /api/domains - List domains
  if (path === '/api/domains' && method === 'GET') {
    return handleListDomains(request, env.DB);
  }

  // POST /api/domains - Create domain
  if (path === '/api/domains' && method === 'POST') {
    return handleCreateDomain(request, env.DB);
  }

  // Domain ID routes
  const domainIdMatch = path.match(/^\/api\/domains\/([a-zA-Z0-9_-]+)$/);
  if (domainIdMatch) {
    const domainId = domainIdMatch[1];

    if (method === 'GET') {
      return handleGetDomain(request, env.DB, domainId);
    }
    if (method === 'DELETE') {
      return handleDeleteDomain(request, env.DB, domainId);
    }
  }

  // POST /api/domains/:id/verify - Verify domain DNS
  const domainVerifyMatch = path.match(/^\/api\/domains\/([a-zA-Z0-9_-]+)\/verify$/);
  if (domainVerifyMatch && method === 'POST') {
    return handleVerifyDomain(request, env.DB, domainVerifyMatch[1]);
  }

  // POST /api/domains/:id/refresh - Refresh domain status
  const domainRefreshMatch = path.match(/^\/api\/domains\/([a-zA-Z0-9_-]+)\/refresh$/);
  if (domainRefreshMatch && method === 'POST') {
    return handleRefreshDomain(request, env.DB, domainRefreshMatch[1]);
  }

  // ==========================================================================
  // Not Found
  // ==========================================================================

  return errorResponse(`API endpoint not found: ${method} ${path}`, 404, 'NOT_FOUND');
}

/**
 * API Documentation endpoint
 * GET /api
 */
export function handleApiDocs(): Response {
  return new Response(
    JSON.stringify({
      name: 'WordPress MCP SaaS API',
      version: '1.0.0',
      endpoints: {
        auth: {
          'POST /api/auth/register': 'Create new account with email/password',
          'POST /api/auth/login': 'Login with email/password',
          'GET /api/auth/me': 'Get current user info (requires auth)',
          'GET /api/auth/providers': 'List available OAuth providers',
          'GET /api/auth/google': 'Login with Google',
          'GET /api/auth/github': 'Login with GitHub',
        },
        keys: {
          'GET /api/keys': 'List all API keys (requires auth)',
          'POST /api/keys': 'Create new API key (requires auth)',
          'DELETE /api/keys/:id': 'Revoke API key (requires auth)',
          'DELETE /api/keys/:id?permanent=true': 'Delete API key permanently (requires auth)',
        },
        usage: {
          'GET /api/usage': 'Get usage summary (requires auth)',
          'GET /api/usage/history?days=30': 'Get daily usage history (requires auth)',
          'GET /api/usage/logs?limit=100': 'Get recent request logs (requires auth)',
          'GET /api/usage/tools?days=30': 'Get tool usage breakdown (requires auth)',
        },
        billing: {
          'GET /api/billing/plans': 'Get available pricing plans (public)',
          'GET /api/billing': 'Get billing info (requires auth)',
          'POST /api/billing/checkout': 'Create Stripe checkout session (requires auth)',
          'POST /api/billing/portal': 'Create Stripe billing portal session (requires auth)',
          'GET /api/billing/invoices': 'Get invoice history (requires auth)',
          'POST /api/billing/cancel': 'Cancel subscription (requires auth)',
          'POST /api/billing/resume': 'Resume cancelled subscription (requires auth)',
        },
        webhooks: {
          'GET /api/webhooks/events': 'List available webhook event types (public)',
          'GET /api/webhooks': 'List webhooks (requires auth)',
          'POST /api/webhooks': 'Create webhook (requires auth)',
          'GET /api/webhooks/:id': 'Get webhook (requires auth)',
          'PATCH /api/webhooks/:id': 'Update webhook (requires auth)',
          'DELETE /api/webhooks/:id': 'Delete webhook (requires auth)',
          'POST /api/webhooks/:id/test': 'Test webhook (requires auth)',
          'GET /api/webhooks/:id/secret': 'Get webhook secret (requires auth)',
          'POST /api/webhooks/:id/secret': 'Regenerate webhook secret (requires auth)',
          'GET /api/webhooks/:id/deliveries': 'Get delivery history (requires auth)',
        },
        audit: {
          'GET /api/audit/actions': 'List audit action types (public)',
          'GET /api/audit': 'List audit logs (requires auth)',
          'GET /api/audit/:id': 'Get audit log entry (requires auth)',
          'GET /api/audit/export': 'Export audit logs as JSON/CSV (requires auth)',
        },
        team: {
          'GET /api/team/roles': 'List team roles and permissions (public)',
          'GET /api/team': 'Get team info (requires auth)',
          'POST /api/team': 'Create team (requires auth, Pro+ tier)',
          'PATCH /api/team': 'Update team (requires auth)',
          'DELETE /api/team': 'Delete team (requires auth)',
          'GET /api/team/members': 'List team members (requires auth)',
          'POST /api/team/members': 'Invite team member (requires auth)',
          'PATCH /api/team/members/:id': 'Update member role (requires auth)',
          'DELETE /api/team/members/:id': 'Remove team member (requires auth)',
          'POST /api/team/invites/:id/cancel': 'Cancel invite (requires auth)',
          'POST /api/team/invites/accept': 'Accept invite (public)',
        },
        domains: {
          'GET /api/domains/limits': 'Get domain limits for current tier (requires auth)',
          'GET /api/domains': 'List custom domains (requires auth, Business+ tier)',
          'POST /api/domains': 'Add custom domain (requires auth, Business+ tier)',
          'GET /api/domains/:id': 'Get domain details (requires auth)',
          'DELETE /api/domains/:id': 'Delete custom domain (requires auth)',
          'POST /api/domains/:id/verify': 'Verify domain DNS configuration (requires auth)',
          'POST /api/domains/:id/refresh': 'Refresh domain status (requires auth)',
        },
      },
      authentication: {
        jwt: {
          type: 'Bearer Token',
          header: 'Authorization: Bearer <jwt_token>',
          note: 'Get token from /api/auth/login, /api/auth/register, or OAuth callback',
        },
        oauth: {
          google: 'GET /api/auth/google?return_url=/dashboard',
          github: 'GET /api/auth/github?return_url=/dashboard',
        },
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
