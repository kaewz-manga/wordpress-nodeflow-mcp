---
description: Run security audit for WordPress MCP
---

# Security Audit

## WordPress-Specific Checks

1. **Application Password Handling**
   - Spaces removed before storage
   - Encrypted with AES-256-GCM
   - Never logged

2. **Multi-tenant Isolation**
   - Headers validated
   - Each request uses own credentials
   - No credential leakage

3. **URL Validation**
   - HTTPS enforced
   - No localhost/internal IPs (SSRF prevention)

## Quick Checks

```bash
# Search for password logging
grep -r "password\|app_password" src/ | grep -i "log\|console"

# Check for hardcoded credentials
grep -r "x-wordpress-password" src/
```
