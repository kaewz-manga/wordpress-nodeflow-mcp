# Contexts Guide

> React Context providers for WordPress MCP Dashboard.

---

## Available Contexts

| Context | Purpose | Key Values |
|---------|---------|------------|
| **AuthContext** | User authentication state | user, login, logout |
| **SudoContext** | TOTP verification for protected actions | withSudo |
| **ConnectionContext** | Selected WordPress connection | selectedConnection |

---

## AuthContext

```tsx
interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}
```

### Usage

```tsx
const { user, logout } = useAuth();

return (
  <div>
    <p>Email: {user?.email}</p>
    <button onClick={logout}>Logout</button>
  </div>
);
```

---

## SudoContext

For actions that require TOTP verification.

```tsx
interface SudoContextValue {
  withSudo: <T>(action: () => Promise<T>) => Promise<T>;
  isSudoActive: boolean;
}
```

### Usage

```tsx
const { withSudo } = useSudo();

const handleDelete = async () => {
  await withSudo(async () => {
    await api.delete(`/connections/${id}`);
    toast.success('Connection deleted');
  });
};
```

---

## ConnectionContext

For managing selected WordPress connection.

```tsx
interface ConnectionContextValue {
  connections: WordPressConnection[];
  selectedConnection: WordPressConnection | null;
  setSelectedConnection: (conn: WordPressConnection | null) => void;
  refreshConnections: () => Promise<void>;
}
```

### Usage

```tsx
const { selectedConnection } = useConnection();

if (!selectedConnection) {
  return <SelectConnectionPrompt />;
}

// Use selectedConnection.wordpress_url, etc.
```

---

## Provider Setup

```tsx
// App.tsx
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SudoProvider>
          <ConnectionProvider>
            <RouterProvider router={router} />
          </ConnectionProvider>
        </SudoProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
```
