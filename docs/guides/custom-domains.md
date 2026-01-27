# Custom Domains Guide

Use your own domain for accessing WordPress MCP API (Business and Enterprise plans).

## Overview

Custom domains allow you to:

- Use your brand's domain for API access (e.g., `api.yourdomain.com`)
- Maintain consistent branding across your infrastructure
- Simplify firewall rules with a single domain
- Enable white-label solutions for your clients

## Prerequisites

- Business or Enterprise subscription plan
- Access to your domain's DNS settings
- A valid domain name (subdomains recommended)

## Domain Limits by Plan

| Plan | Custom Domains |
|------|----------------|
| Free | 0 |
| Starter | 0 |
| Pro | 0 |
| Business | 3 |
| Enterprise | 10 |

## Adding a Custom Domain

### Step 1: Add Domain in Dashboard

1. Go to **Dashboard > Settings > Custom Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `api.example.com`)
4. Click **Add**

### Step 2: Configure DNS

You'll receive DNS verification instructions:

```
Record Type: TXT
Name: _mcp-verification.api.example.com
Value: wp-mcp-verify-abc123xyz...
```

Add this TXT record in your DNS provider's settings.

### Step 3: Verify Domain

1. Wait for DNS propagation (usually 5-15 minutes)
2. Click **Verify** in the Dashboard
3. Once verified, SSL will be automatically provisioned

### Step 4: Update DNS to Point to MCP

After verification, add a CNAME record:

```
Record Type: CNAME
Name: api (or your subdomain)
Value: custom.wordpress-mcp.com
```

## API Endpoints

### List Domains

```bash
curl https://api.wordpress-mcp.com/api/domains \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:

```json
{
  "domains": [
    {
      "id": "dom_abc123",
      "domain": "api.example.com",
      "status": "active",
      "domainType": "custom",
      "verification": {
        "verified": true,
        "verifiedAt": "2026-01-20T10:00:00Z",
        "record": {
          "type": "TXT",
          "name": "_mcp-verification.api.example.com",
          "value": "wp-mcp-verify-abc123..."
        }
      },
      "ssl": {
        "status": "active",
        "expiresAt": "2027-01-20T10:00:00Z"
      },
      "createdAt": "2026-01-15T08:30:00Z",
      "updatedAt": "2026-01-20T10:00:00Z"
    }
  ],
  "total": 1,
  "limit": 10
}
```

### Add Domain

```bash
curl -X POST https://api.wordpress-mcp.com/api/domains \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "api.example.com"
  }'
```

Response:

```json
{
  "domain": {
    "id": "dom_abc123",
    "domain": "api.example.com",
    "status": "pending_verification",
    "verification": {
      "type": "TXT",
      "name": "_mcp-verification.api.example.com",
      "value": "wp-mcp-verify-abc123xyz789...",
      "instructions": "Add a TXT record with name \"_mcp-verification.api.example.com\" and value \"wp-mcp-verify-abc123xyz789...\" to your DNS settings."
    }
  }
}
```

### Verify Domain

```bash
curl -X POST https://api.wordpress-mcp.com/api/domains/dom_abc123/verify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:

```json
{
  "verified": true,
  "status": "active",
  "message": "Domain verified successfully! SSL certificate has been provisioned."
}
```

### Get Domain Details

```bash
curl https://api.wordpress-mcp.com/api/domains/dom_abc123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Delete Domain

```bash
curl -X DELETE https://api.wordpress-mcp.com/api/domains/dom_abc123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Check Domain Limits

```bash
curl https://api.wordpress-mcp.com/api/domains/limits \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:

```json
{
  "tier": "business",
  "limit": 3,
  "used": 1,
  "remaining": 2,
  "canAddMore": true
}
```

## Domain Statuses

| Status | Description |
|--------|-------------|
| `pending_verification` | DNS verification in progress |
| `pending_ssl` | DNS verified, SSL being provisioned |
| `active` | Domain is active and ready |
| `ssl_expired` | SSL certificate expired |
| `verification_failed` | DNS verification failed |
| `suspended` | Domain manually suspended |

## Using Your Custom Domain

Once active, use your domain instead of the default:

```bash
curl -X POST https://api.example.com/mcp \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

All MCP functionality works identically through your custom domain.

## DNS Provider Instructions

### Cloudflare

1. Go to DNS settings
2. Add TXT record for verification
3. Add CNAME record pointing to `custom.wordpress-mcp.com`
4. Keep Proxy status as "DNS only" (gray cloud)

### AWS Route 53

1. Go to your hosted zone
2. Create TXT record for verification
3. Create CNAME record for your subdomain
4. Set TTL to 300 seconds

### GoDaddy

1. Go to DNS Management
2. Add TXT record with the verification value
3. Add CNAME record pointing to `custom.wordpress-mcp.com`

### Namecheap

1. Go to Advanced DNS
2. Add TXT record for verification
3. Add CNAME record for your subdomain

## SSL Certificates

- SSL certificates are automatically provisioned via Let's Encrypt
- Certificates are valid for 90 days and auto-renew
- You'll receive email notifications before expiration

## Troubleshooting

### Verification Failed

- Wait 15-30 minutes for DNS propagation
- Verify TXT record is correct (no extra spaces)
- Check record name matches exactly
- Try using [DNS Checker](https://dnschecker.org) to verify propagation

### SSL Not Provisioning

- Ensure CNAME record points to `custom.wordpress-mcp.com`
- Remove any existing A records for the subdomain
- Disable any CDN proxy (use DNS-only mode)

### Domain Not Resolving

- Verify CNAME record is correct
- Clear local DNS cache: `sudo dscacheutil -flushcache`
- Wait for DNS TTL to expire

### 403 Forbidden on Custom Domain

- Check domain status is "active"
- Verify SSL is provisioned
- Ensure you're using the correct API key

## Security Considerations

1. **Use HTTPS only**: All custom domains require SSL
2. **Subdomain recommended**: Use `api.example.com` instead of `example.com`
3. **Keep DNS credentials secure**: DNS access allows domain hijacking
4. **Monitor certificate expiry**: Set up alerts for SSL renewal

## Best Practices

1. **Use descriptive subdomains**: `mcp-api.company.com` or `wordpress-api.company.com`
2. **Plan for multiple environments**: Consider separate domains for staging/production
3. **Monitor domain health**: Check dashboard regularly for SSL/DNS issues
4. **Document your setup**: Keep records of DNS configuration for your team
