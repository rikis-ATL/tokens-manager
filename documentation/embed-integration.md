# Embed Tokens in Your Project

This guide shows you how to embed design tokens from ATUI Token Manager into your project using a simple script tag with **real-time automatic updates**.

## Quick Start

Add this single line to your HTML `<head>`:

```html
<script src="https://your-token-manager.com/embed/COLLECTION_ID/tokens.js"></script>
```

That's it! Your tokens are now available as CSS variables and will **automatically update** when you change them in the Token Manager.

## How It Works

The embed script:
1. Fetches your token collection from the Token Manager
2. Converts tokens to CSS variables
3. Injects them into a `<style>` tag in your document head
4. **Connects via WebSocket** for real-time updates (no page refresh needed!)
5. Automatically reconnects if the connection drops

### Real-Time Updates

When you edit tokens in the Token Manager, the changes are **instantly pushed** to all connected pages via WebSocket. No manual refresh required!

### Generated CSS Variables

Tokens are injected with your collection's namespace (default: `token`):

```css
:root {
  /* Colors */
  --token-color-primary: #3b82f6;
  --token-color-secondary: #8b5cf6;
  --token-color-background: #ffffff;
  
  /* Spacing */
  --token-spacing-xs: 0.25rem;
  --token-spacing-sm: 0.5rem;
  --token-spacing-md: 1rem;
  
  /* Typography */
  --token-font-size-body: 1rem;
  --token-font-family-sans: system-ui, sans-serif;
  
  /* And more... */
}
```

## Usage in Your Code

### HTML/CSS

```html
<button style="
  background: var(--token-color-primary);
  padding: var(--token-spacing-md);
  font-size: var(--token-font-size-body);
">
  Click me
</button>
```

### CSS Files

```css
.button {
  background: var(--token-color-primary);
  color: var(--token-color-on-primary);
  padding: var(--token-spacing-sm) var(--token-spacing-md);
  border-radius: var(--token-radius-sm);
}
```

### Styled Components / Emotion

```jsx
const Button = styled.button`
  background: var(--token-color-primary);
  padding: var(--token-spacing-md);
  font-size: var(--token-font-size-body);
`;
```

### Tailwind CSS (arbitrary values)

```jsx
<button className="bg-[var(--token-color-primary)] p-[var(--token-spacing-md)]">
  Click me
</button>
```

## Using Themes

To load a specific theme instead of the default collection tokens:

```html
<script src="https://your-token-manager.com/embed/COLLECTION_ID/tokens.js?theme=THEME_ID"></script>
```

### Finding Theme IDs

1. Go to your collection's Tokens page
2. Open the theme selector dropdown (if you have themes)
3. The theme ID is shown in the URL when you select a theme: `/tokens?theme=THEME_ID`

### Dynamic Theme Switching

For runtime theme switching, you can reload the script with a different theme:

```javascript
function loadTheme(themeId) {
  // Remove old script
  const oldScript = document.querySelector('script[src*="/embed/"]');
  if (oldScript) oldScript.remove();
  
  // Remove old styles
  const oldStyles = document.getElementById('atui-tokens-COLLECTION_ID');
  if (oldStyles) oldStyles.remove();
  
  // Load new theme
  const script = document.createElement('script');
  script.src = `https://your-token-manager.com/embed/COLLECTION_ID/tokens.js?theme=${themeId}`;
  document.head.appendChild(script);
}

// Usage
loadTheme('dark-theme-id');
```

## Getting Updates

### Automatic Real-Time Updates (Default)

The embed script automatically receives updates via WebSocket:
- Edit a token in the Token Manager
- Changes appear **instantly** in all connected pages
- No page refresh needed
- Automatic reconnection if connection drops

```
[ATUI Tokens] WebSocket connected
[ATUI Tokens] Received update: {...}
[ATUI Tokens] ✨ Tokens updated automatically
```

### Connection Status

Check the browser console to see WebSocket status:
- `WebSocket connected` - Real-time updates enabled
- `WebSocket disconnected` - Will auto-reconnect
- `Failed to load Socket.IO client` - Fallback to manual refresh

### Manual Refresh (Fallback)

If WebSocket fails to load, refresh the page to see updates:
- The script fetches the latest tokens on every page load
- No cache busting needed (CDN cache is 60 seconds)

## Configuration

### Find Your Collection ID

1. Go to Settings for your collection
2. Your Collection ID is in the embed script snippet
3. Or check the URL: `/collections/COLLECTION_ID/tokens`

### Self-Hosted Token Manager

If you're running your own instance, replace the domain:

```html
<script src="https://your-domain.com/embed/COLLECTION_ID/tokens.js"></script>
```

### Localhost Development

For local development:

```html
<script src="http://localhost:3001/embed/COLLECTION_ID/tokens.js"></script>
```

## Framework-Specific Examples

### React

```jsx
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://your-token-manager.com/embed/COLLECTION_ID/tokens.js';
    document.head.appendChild(script);
    
    return () => script.remove();
  }, []);

  return (
    <button style={{ 
      background: 'var(--token-color-primary)',
      padding: 'var(--token-spacing-md)'
    }}>
      Click me
    </button>
  );
}
```

### Vue

```vue
<template>
  <button :style="{
    background: 'var(--token-color-primary)',
    padding: 'var(--token-spacing-md)'
  }">
    Click me
  </button>
</template>

<script>
export default {
  mounted() {
    const script = document.createElement('script');
    script.src = 'https://your-token-manager.com/embed/COLLECTION_ID/tokens.js';
    document.head.appendChild(script);
  }
}
</script>
```

### Next.js (App Router)

Add to `app/layout.tsx`:

```tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <script src="https://your-token-manager.com/embed/COLLECTION_ID/tokens.js" />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

## Troubleshooting

### Tokens Not Loading

1. Check browser console for errors
2. Verify your Collection ID is correct
3. Ensure the Token Manager is accessible from your domain
4. Check CORS settings if using a different domain

### WebSocket Not Connecting

Check console for:
- `Failed to load Socket.IO client` - CDN blocked, check network
- `WebSocket connection error` - Token Manager server down or unreachable
- `Max reconnection attempts reached` - Server offline for extended period

WebSocket failures don't break token loading - tokens still load initially, just without real-time updates.

### Console Messages

The script logs when tokens are loaded:

```
[ATUI Tokens] Loaded: My Collection (Default)
[ATUI Tokens] WebSocket connected
```

If you see these, everything is working correctly.

Real-time update logs:
```
[ATUI Tokens] Received update: {collectionId: "...", themeId: "..."}
[ATUI Tokens] ✨ Tokens updated automatically
```

### Inspecting Injected Tokens

Check the generated `<style>` tag:

```javascript
const styleEl = document.getElementById('atui-tokens-COLLECTION_ID');
console.log(styleEl.textContent);
```

### Network Errors

If the script fails to load:
- **404**: Collection ID is incorrect
- **401**: Authentication required (shouldn't happen for embed endpoint)
- **CORS**: Contact your Token Manager admin about cross-origin settings

## Best Practices

1. **Load in `<head>`**: Ensures tokens are available before page render
2. **Use CSS variables**: More performant than JavaScript token access
3. **Cache appropriately**: The endpoint has 60-second cache, don't bypass it
4. **Version control**: Document your Collection ID in your project README
5. **Fallback values**: Use CSS variable fallbacks for resilience:
   ```css
   color: var(--token-color-primary, #3b82f6);
   ```

## Limitations

- **WebSocket requires Socket.IO CDN**: Loads from `cdn.socket.io` (fallback if blocked)
- **60-second cache**: Initial load may be cached for up to 1 minute
- **No authentication**: Embed endpoint is public (by design for ease of use)

## Technical Details

### WebSocket Implementation

- **Protocol**: Socket.IO over WebSocket (with polling fallback)
- **Reconnection**: Automatic with exponential backoff (max 10 attempts)
- **Room-based**: Each collection has its own WebSocket room
- **Efficient**: Only broadcasts to subscribed clients

### Security

- **Public endpoint**: No authentication required for embed
- **CORS enabled**: Works from any origin
- **Read-only**: Embed script cannot modify tokens

## Future Features

Planned enhancements:
- **Scoped injection**: Load tokens only for specific components
- **Subset loading**: Load only specific token groups for performance
- **TypeScript definitions**: Auto-generated types for tokens
- **Offline support**: Service worker caching

## Support

For issues or questions:
- Check the Token Manager documentation
- Contact your organization's Token Manager admin
- Report bugs via your project's issue tracker
