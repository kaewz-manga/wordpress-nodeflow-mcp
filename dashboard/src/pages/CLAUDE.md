# Pages Guide

> Page component patterns for WordPress MCP Dashboard.

---

## Page Types

| Type | Auth | Example |
|------|------|---------|
| **Public** | None | Landing, Login, Register |
| **Protected** | JWT required | Dashboard, Connections |
| **Admin** | JWT + is_admin | Admin panel |

---

## WordPress Pages

### Posts Page (`/wordpress/posts`)

```tsx
export default function PostsPage() {
  const { selectedConnection } = useConnection();
  const [posts, setPosts] = useState<WPPost[]>([]);

  if (!selectedConnection) {
    return <SelectConnectionPrompt />;
  }

  return (
    <DashboardLayout>
      <h1>Posts</h1>
      <PostsTable posts={posts} />
      <CreatePostModal />
    </DashboardLayout>
  );
}
```

### Media Page (`/wordpress/media`)

```tsx
export default function MediaPage() {
  const { selectedConnection } = useConnection();
  const [media, setMedia] = useState<WPMedia[]>([]);

  return (
    <DashboardLayout>
      <h1>Media Library</h1>
      <UploadDropzone onUpload={handleUpload} />
      <MediaGrid media={media} />
    </DashboardLayout>
  );
}
```

---

## Common Patterns

### Loading State

```tsx
if (loading) {
  return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-wp-accent" />
      </div>
    </DashboardLayout>
  );
}
```

### Connection Required

```tsx
if (!selectedConnection) {
  return (
    <DashboardLayout>
      <div className="text-center py-12">
        <Link2 className="h-12 w-12 text-wp-text-muted mx-auto mb-4" />
        <p className="text-wp-text-secondary mb-4">
          Select a WordPress connection to continue
        </p>
        <Button onClick={() => navigate('/connections')}>
          Manage Connections
        </Button>
      </div>
    </DashboardLayout>
  );
}
```
