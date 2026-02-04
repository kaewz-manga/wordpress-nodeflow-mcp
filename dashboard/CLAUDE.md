# Dashboard Guide

> React 19 SPA for WordPress MCP SaaS platform management.

---

## Tech Stack

- **React 19** + TypeScript
- **Vite** — Build tool
- **React Router v6** — Routing
- **TanStack Query** — Data fetching
- **Tailwind CSS** — Styling (dark theme)
- **Lucide React** — Icons

---

## Theme Colors (wp-*)

| Variable | Color | Use |
|----------|-------|-----|
| `wp-bg` | `#0a0a0a` | Page background |
| `wp-card` | `#141414` | Card background |
| `wp-elevated` | `#1f1f1f` | Elevated surfaces |
| `wp-border` | `#2a2a2a` | Borders |
| `wp-accent` | `#3b82f6` | Blue accent (WordPress blue) |
| `wp-text` | `#fafafa` | Primary text |
| `wp-text-secondary` | `#a3a3a3` | Secondary text |

---

## File Structure

```
dashboard/
├── src/
│   ├── App.tsx              # Routes + providers
│   ├── main.tsx             # Entry point
│   ├── index.css            # Tailwind + theme
│   ├── components/          # Reusable components
│   ├── contexts/            # React contexts
│   ├── hooks/               # Custom hooks
│   ├── lib/
│   │   └── api.ts           # API client
│   └── pages/               # Route pages
│       ├── admin/           # Admin panel
│       └── wordpress/       # WordPress UI pages
├── public/
├── index.html
└── vite.config.ts
```

---

## Route Structure

### Public Routes
- `/` — Landing page
- `/login` — Login (email + OAuth)
- `/register` — Register
- `/pricing` — Pricing plans

### Protected Routes (require login)
- `/dashboard` — Overview + stats
- `/connections` — WordPress connections + API keys
- `/usage` — Usage statistics
- `/settings` — Profile, password, 2FA

### Admin Routes (require `is_admin: true`)
- `/admin` — Overview
- `/admin/users` — User management

### WordPress Routes
- `/wordpress/posts` — Post management
- `/wordpress/pages` — Page management
- `/wordpress/media` — Media library

---

## Context Providers

```tsx
<QueryClientProvider>
  <AuthProvider>
    <SudoProvider>
      <ConnectionProvider>
        <AppRoutes />
      </ConnectionProvider>
    </SudoProvider>
  </AuthProvider>
</QueryClientProvider>
```

---

## Commands

```bash
npm run dev          # Start (port 5173)
npm run build        # Build for production
npm run deploy       # Deploy to Cloudflare Pages
```
