---
description: Code review for WordPress MCP
---

# Code Review

## WordPress-Specific Checks

1. **Application Password Format**
   - Spaces always removed
   - `cleanApplicationPassword()` used

2. **WordPress API Client**
   - Proper error handling
   - 401 handled correctly
   - Retry on rate limit

3. **Content Sanitization**
   - HTML content escaped where needed
   - User input validated

## Quick Checks

```bash
# Find password handling
grep -r "app_password\|application_password" src/

# Check for any types
grep -r ": any" src/

# Find console.log
grep -r "console.log" src/
```
