---
name: api-conventions
description: REST API conventions for WordPress MCP SaaS
user-invocable: false
---

# API Conventions

## Authentication Headers

### JWT (Dashboard)
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### API Key (MCP Clients)
```
Authorization: Bearer wp_xxxxxxxxxxxxx
```

### WordPress Credentials (Multi-tenant)
```
x-wordpress-url: https://wp.example.com
x-wordpress-username: admin
x-wordpress-password: ApplicationPasswordNoSpaces
```

## Response Format

### Success
```json
{
  "success": true,
  "data": { ... }
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title is required"
  }
}
```

## HTTP Status Codes

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Rate Limited |
| 500 | Internal Error |

## WordPress-Specific Errors

| Code | Description |
|------|-------------|
| `WP_AUTH_FAILED` | WordPress authentication failed |
| `WP_NOT_FOUND` | WordPress resource not found |
| `WP_API_ERROR` | WordPress API returned error |
| `APP_PASSWORD_FORMAT` | Application Password has spaces |
