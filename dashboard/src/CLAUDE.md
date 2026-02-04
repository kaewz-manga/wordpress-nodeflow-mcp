# Dashboard Source Guide

> React patterns and conventions for Dashboard code.

---

## Import Order

1. React/Router
2. Third-party (TanStack Query, Lucide)
3. Contexts (`../contexts/*`)
4. Hooks (`../hooks/*`)
5. Components (`../components/*`)
6. API (`../lib/api`)
7. Types

---

## Component Patterns

### Page Component

```tsx
export default function PageName() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DataType | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="space-y-6">
      {/* Content */}
    </div>
  );
}
```

### Card Component

```tsx
<div className="bg-wp-card border border-wp-border rounded-lg p-6">
  <h3 className="text-lg font-semibold text-wp-text mb-4">Title</h3>
  {/* Content */}
</div>
```

### Button Styles

```tsx
// Primary (blue - WordPress)
<button className="bg-wp-accent hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
  Save
</button>

// Secondary (outline)
<button className="border border-wp-border text-wp-text hover:bg-wp-elevated px-4 py-2 rounded-lg">
  Cancel
</button>

// Danger (red)
<button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg">
  Delete
</button>
```

---

## State Management

### Auth State

```tsx
const { user, login, logout, isAuthenticated } = useAuth();
```

### Sudo Mode (Protected Actions)

```tsx
const { withSudo } = useSudo();

const handleDelete = async () => {
  await withSudo(async () => {
    await api.delete(`/connections/${id}`);
  });
};
```

### Connection Selection

```tsx
const { connections, selectedConnection, setSelectedConnection } = useConnection();
```

---

## Protected Actions

These require TOTP verification (sudo mode):

| Action | Page |
|--------|------|
| Delete connection | Connections |
| Generate API key | Connections |
| Change password | Settings |
| Delete account | Settings |

Always wrap with `withSudo()`.
