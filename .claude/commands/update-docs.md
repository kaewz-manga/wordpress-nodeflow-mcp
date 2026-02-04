---
description: Update WordPress MCP documentation
---

# Update Documentation

## Files to Update

| File | When to Update |
|------|----------------|
| `CLAUDE.md` | Architecture changes |
| `src/CLAUDE.md` | New routes, tools |
| `dashboard/CLAUDE.md` | New pages |
| `migrations/CLAUDE.md` | New tables |
| `README.md` | User-facing changes |

## WordPress Tool Documentation

When adding new tools, update:
1. Tool definition in `src/mcp/tools.ts`
2. Handler in `src/mcp/handlers/`
3. Tools list in `CLAUDE.md`
4. Examples in `README.md`
