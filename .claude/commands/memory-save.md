---
description: Save WordPress MCP knowledge to Memory MCP
---

# Save to Memory MCP

## Entity Types

| Entity | Use For |
|--------|---------|
| `decision-YYYY-MM-DD-topic` | Architecture decisions |
| `incident-YYYY-MM-DD-topic` | Bug fixes |
| `wp-pattern-name` | WordPress patterns |

## Example: App Password Issue

```
Entity: incident-2026-02-05-app-password-401
Observations:
- Bug: 401 on write operations
- Cause: Application Password had spaces
- Fix: cleanApplicationPassword() removes spaces
- Lesson: WordPress shows passwords with spaces for readability
```
