# Team Management Guide

Collaborate with your team on WordPress MCP (Pro and Business plans).

## Overview

Team features allow you to:

- Invite team members to your organization
- Assign roles with different permissions
- Share API keys across the team
- Track usage by team member
- Centralize billing under one account

## Plans with Team Features

| Feature | Pro | Business | Enterprise |
|---------|-----|----------|------------|
| Team members | 5 | 20 | Unlimited |
| Roles | Admin, Member | Admin, Member, Viewer | Custom roles |
| SSO/SAML | ❌ | ❌ | ✅ |
| Audit logs | 30 days | 90 days | 1 year |
| Activity reports | Basic | Advanced | Custom |

## Inviting Team Members

### Via Dashboard

1. Go to **Dashboard > Team**
2. Click **Invite Member**
3. Enter their email address
4. Select a role
5. Click **Send Invite**

The invitee will receive an email with a link to join your organization.

### Via API

```bash
curl -X POST https://api.wordpress-mcp.com/api/team/invite \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teammate@company.com",
    "role": "member"
  }'
```

Response:

```json
{
  "invitation": {
    "id": "inv_abc123",
    "email": "teammate@company.com",
    "role": "member",
    "status": "pending",
    "expiresAt": "2026-02-03T10:00:00Z"
  }
}
```

## Team Roles

### Admin

Full access to all features:

- ✅ Create/delete API keys
- ✅ Manage team members
- ✅ View all usage and analytics
- ✅ Manage billing and subscription
- ✅ Configure webhooks
- ✅ Access all WordPress sites

### Member

Standard access for daily work:

- ✅ Create personal API keys
- ✅ View team API keys (no delete)
- ✅ View personal usage stats
- ❌ Manage team members
- ❌ View billing information
- ✅ Access assigned WordPress sites

### Viewer (Business+)

Read-only access:

- ✅ View API keys (masked)
- ✅ View usage statistics
- ❌ Create or modify API keys
- ❌ Manage team
- ❌ Access billing
- ✅ Read-only WordPress access

## Managing Team Members

### Update Role

```bash
curl -X PATCH https://api.wordpress-mcp.com/api/team/members/mem_xyz \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "admin"
  }'
```

### Remove Member

```bash
curl -X DELETE https://api.wordpress-mcp.com/api/team/members/mem_xyz \
  -H "Authorization: Bearer YOUR_API_KEY"
```

When a member is removed:
- Their personal API keys are deactivated
- They lose access to shared resources
- Their usage history is retained for audit

## Shared API Keys

Teams can share API keys for collaborative projects:

### Creating a Shared Key

1. Go to **Dashboard > API Keys**
2. Click **Create API Key**
3. Enable **Share with team**
4. Select who can use the key

### Key Visibility

| Your Role | Shared Keys | Personal Keys (others) |
|-----------|-------------|------------------------|
| Admin | Full access | Can view/revoke |
| Member | Can use | Hidden |
| Viewer | View only (masked) | Hidden |

## Usage Tracking

### By Team Member

View individual usage:

```bash
curl https://api.wordpress-mcp.com/api/team/usage \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Response:

```json
{
  "period": "2026-01",
  "members": [
    {
      "id": "mem_abc",
      "name": "John Doe",
      "email": "john@company.com",
      "requests": 5432,
      "percentage": 45.2
    },
    {
      "id": "mem_xyz",
      "name": "Jane Smith",
      "email": "jane@company.com",
      "requests": 3210,
      "percentage": 26.7
    }
  ],
  "total": 12015
}
```

### Usage Alerts

Configure alerts when team members approach limits:

1. Go to **Dashboard > Settings > Notifications**
2. Enable **Team usage alerts**
3. Set threshold (e.g., 80% of allocation)

## Audit Logs

Track all team activity (Business+):

```bash
curl https://api.wordpress-mcp.com/api/team/audit-logs \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Response:

```json
{
  "logs": [
    {
      "id": "log_123",
      "timestamp": "2026-01-27T10:30:00Z",
      "actor": {
        "id": "mem_abc",
        "name": "John Doe",
        "email": "john@company.com"
      },
      "action": "api_key.created",
      "resource": {
        "type": "api_key",
        "id": "key_xyz",
        "name": "Production Key"
      },
      "ip": "192.168.1.1"
    }
  ]
}
```

### Tracked Actions

- `member.invited` - Team member invited
- `member.joined` - Invitation accepted
- `member.removed` - Member removed
- `member.role_changed` - Role updated
- `api_key.created` - API key created
- `api_key.deleted` - API key deleted
- `api_key.rotated` - API key rotated
- `settings.updated` - Settings changed
- `subscription.changed` - Plan changed

## Best Practices

### 1. Principle of Least Privilege

Assign the minimum role needed:
- Developers → Member
- Project managers → Viewer
- Tech leads → Admin

### 2. Regular Access Reviews

Quarterly review of team access:
- Remove inactive members
- Verify role assignments
- Audit API key usage

### 3. Separate Environments

Create separate API keys per environment:
- `Production - Team` → Shared production key
- `Staging - Team` → Shared staging key
- `Dev - [Name]` → Personal development keys

### 4. Enable Audit Logging

For compliance and security:
- Keep audit logs enabled
- Export logs periodically
- Review suspicious activity

## Offboarding Checklist

When a team member leaves:

1. ☐ Remove from team in Dashboard
2. ☐ Rotate any shared API keys they had access to
3. ☐ Review audit logs for recent activity
4. ☐ Update webhook endpoints if they managed any
5. ☐ Reassign any resources they owned

## Troubleshooting

### Invitation Not Received

- Check spam folder
- Verify email address spelling
- Resend invitation from Dashboard
- Check if email domain is blocked

### Cannot Access Shared Resources

- Verify role permissions
- Check if resource is shared with your role
- Contact team admin for access

### Usage Not Showing

- Usage data updates every 5 minutes
- Check date range filter
- Verify member has made API calls
