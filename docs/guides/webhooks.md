# Webhooks Guide

Receive real-time notifications when events occur in your WordPress MCP account.

## Overview

Webhooks allow you to receive HTTP POST requests when specific events happen:

- API key created/deleted
- Usage limit reached
- Subscription changed
- Security alerts

## Setting Up Webhooks

### Via Dashboard

1. Go to **Dashboard > Settings > Webhooks**
2. Click **Add Webhook**
3. Enter your endpoint URL
4. Select events to subscribe to
5. Click **Create Webhook**

### Via API

```bash
curl -X POST https://api.wordpress-mcp.com/api/webhooks \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-server.com/webhooks/wordpress-mcp",
    "events": ["usage.limit_reached", "api_key.created"],
    "secret": "your_webhook_secret"
  }'
```

## Webhook Events

### Account Events

| Event | Description |
|-------|-------------|
| `api_key.created` | New API key created |
| `api_key.deleted` | API key deleted |
| `api_key.rotated` | API key rotated |

### Usage Events

| Event | Description |
|-------|-------------|
| `usage.limit_reached` | Monthly limit reached |
| `usage.limit_warning` | 80% of limit used |
| `usage.rate_limited` | Rate limit triggered |

### Billing Events

| Event | Description |
|-------|-------------|
| `subscription.created` | New subscription |
| `subscription.updated` | Plan changed |
| `subscription.cancelled` | Subscription cancelled |
| `payment.succeeded` | Payment successful |
| `payment.failed` | Payment failed |

### Security Events

| Event | Description |
|-------|-------------|
| `security.suspicious_activity` | Unusual API usage detected |
| `security.login_new_device` | Login from new device |

## Webhook Payload

Each webhook delivery includes:

```json
{
  "id": "evt_abc123",
  "type": "usage.limit_reached",
  "timestamp": "2026-01-27T10:00:00Z",
  "data": {
    "customerId": "cust_xyz",
    "currentUsage": 10000,
    "limit": 10000,
    "percentage": 100
  }
}
```

## Verifying Webhooks

All webhooks include a signature in the `X-Webhook-Signature` header.

### Signature Verification (Node.js)

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Express middleware
app.post('/webhooks', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);

  if (!verifyWebhook(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  // Process webhook
  const event = req.body;
  console.log('Received event:', event.type);

  res.status(200).send('OK');
});
```

### Signature Verification (Python)

```python
import hmac
import hashlib

def verify_webhook(payload, signature, secret):
    expected = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected)
```

## Retry Policy

Failed webhook deliveries are retried with exponential backoff:

| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | 1 minute |
| 3 | 5 minutes |
| 4 | 30 minutes |
| 5 | 2 hours |

After 5 failed attempts, the webhook is disabled and you'll receive an email notification.

## Webhook Logs

View delivery history:

1. Go to **Dashboard > Settings > Webhooks**
2. Click on a webhook
3. View **Delivery History**

Each log entry shows:
- Timestamp
- Event type
- Response status
- Response time
- Payload (for debugging)

## Best Practices

1. **Respond quickly**: Return 200 status within 30 seconds
2. **Process asynchronously**: Queue events for background processing
3. **Handle duplicates**: Events may be delivered multiple times
4. **Verify signatures**: Always validate the webhook signature
5. **Monitor failures**: Set up alerts for failed deliveries

## Troubleshooting

### Webhook Not Received

- Check endpoint URL is accessible from internet
- Verify SSL certificate is valid
- Check firewall rules allow our IPs
- Review webhook logs for errors

### Signature Mismatch

- Ensure you're using the raw request body
- Check webhook secret is correct
- Verify no middleware is modifying the body

### Timeout Errors

- Process events asynchronously
- Return 200 immediately, process later
- Increase server timeout limits
