---
name: dashboard-components
description: React Dashboard patterns with WordPress blue theme
user-invocable: false
---

# Dashboard Components Reference

## Theme Colors (WordPress Blue)

```css
:root {
  --wp-bg: #0a0a0a;
  --wp-card: #141414;
  --wp-elevated: #1f1f1f;
  --wp-border: #2a2a2a;
  --wp-accent: #3b82f6;  /* WordPress Blue */
  --wp-text: #fafafa;
  --wp-text-secondary: #a3a3a3;
  --wp-text-muted: #737373;
}
```

## Button Templates

### Primary (Blue)
```tsx
<button className="bg-wp-accent hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
  Save
</button>
```

### Secondary
```tsx
<button className="border border-wp-border text-wp-text hover:bg-wp-elevated px-4 py-2 rounded-lg">
  Cancel
</button>
```

## WordPress-Specific Components

### Post Status Badge
```tsx
const statusColors = {
  publish: 'bg-green-500/20 text-green-400',
  draft: 'bg-yellow-500/20 text-yellow-400',
  pending: 'bg-orange-500/20 text-orange-400',
  private: 'bg-purple-500/20 text-purple-400',
};

<span className={`px-2 py-1 rounded text-xs ${statusColors[status]}`}>
  {status}
</span>
```

### Media Type Icon
```tsx
const mediaIcons = {
  image: ImageIcon,
  video: VideoIcon,
  audio: AudioLinesIcon,
  application: FileIcon,
};

const Icon = mediaIcons[media.media_type] || FileIcon;
<Icon className="h-8 w-8 text-wp-text-muted" />
```
