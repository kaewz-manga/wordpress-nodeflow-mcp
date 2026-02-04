# Components Guide

> Reusable UI components for WordPress MCP Dashboard.

---

## Component Categories

| Category | Components |
|----------|------------|
| **Layout** | DashboardLayout, Sidebar |
| **Forms** | Input, Select, Button |
| **Data Display** | Table, Card, Badge |
| **Feedback** | Modal, Toast, Alert |
| **WordPress** | PostCard, MediaCard, EditorToolbar |

---

## WordPress-Specific Components

### PostCard

```tsx
interface PostCardProps {
  post: WPPost;
  onEdit: () => void;
  onDelete: () => void;
}

export function PostCard({ post, onEdit, onDelete }: PostCardProps) {
  return (
    <Card>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-wp-text">{post.title.rendered}</h3>
          <p className="text-sm text-wp-text-secondary">
            {post.status} • {formatDate(post.date)}
          </p>
        </div>
        <Badge variant={post.status === 'publish' ? 'success' : 'warning'}>
          {post.status}
        </Badge>
      </div>
      <div className="mt-4 flex gap-2">
        <Button size="sm" onClick={onEdit}>Edit</Button>
        <Button size="sm" variant="danger" onClick={onDelete}>Delete</Button>
      </div>
    </Card>
  );
}
```

### MediaCard

```tsx
interface MediaCardProps {
  media: WPMedia;
  onSelect?: () => void;
}

export function MediaCard({ media, onSelect }: MediaCardProps) {
  return (
    <div
      className="bg-wp-card border border-wp-border rounded-lg overflow-hidden cursor-pointer hover:border-wp-accent"
      onClick={onSelect}
    >
      {media.media_type === 'image' ? (
        <img src={media.source_url} alt={media.title.rendered} className="w-full h-32 object-cover" />
      ) : (
        <div className="w-full h-32 flex items-center justify-center bg-wp-elevated">
          <FileIcon className="h-8 w-8 text-wp-text-muted" />
        </div>
      )}
      <div className="p-2">
        <p className="text-sm text-wp-text truncate">{media.title.rendered}</p>
        <p className="text-xs text-wp-text-muted">{media.mime_type}</p>
      </div>
    </div>
  );
}
```

### ConnectionSelector

```tsx
export function ConnectionSelector() {
  const { connections, selectedConnection, setSelectedConnection } = useConnection();

  return (
    <Select
      value={selectedConnection?.id}
      onChange={(id) => setSelectedConnection(connections.find(c => c.id === id))}
    >
      <option value="">Select WordPress site...</option>
      {connections.map(conn => (
        <option key={conn.id} value={conn.id}>{conn.name}</option>
      ))}
    </Select>
  );
}
```

---

## Theme Classes

### WordPress Blue Accent

```tsx
// Background
className="bg-wp-accent"      // #3b82f6
className="hover:bg-blue-600"

// Text
className="text-wp-accent"

// Border
className="border-wp-accent"
className="focus:ring-wp-accent"
```
