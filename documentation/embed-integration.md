# Embed Tokens in Your Project

This guide shows you how to embed design tokens from ATUI Token Manager into your project using a simple script tag.

## Quick Start

Add this single line to your HTML `<head>`:

```html
<script src="https://your-token-manager.com/embed/COLLECTION_ID/tokens.js"></script>
```

That's it! Your tokens are now available as CSS variables.

## How It Works

The embed script:
1. Fetches your token collection from the Token Manager
2. Converts tokens to CSS variables
3. Injects them into a `<style>` tag in your document head
4. Makes them available to your entire application

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

### Manual Refresh

To see token updates, refresh your page:
- The script fetches the latest tokens on every page load
- No cache busting needed (CDN cache is 60 seconds)

### Auto-Refresh (Advanced)

For a live development experience, you can poll for updates:

```javascript
// Poll every 5 seconds for token updates
setInterval(() => {
  const script = document.createElement('script');
  script.src = `https://your-token-manager.com/embed/COLLECTION_ID/tokens.js?t=${Date.now()}`;
  document.head.appendChild(script);
}, 5000);
```

**Note**: This creates multiple `<style>` tags. For production, use manual refresh or wait for WebSocket support (coming soon).

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

### Console Messages

The script logs when tokens are loaded:

```
[ATUI Tokens] Loaded: My Collection (Default)
```

If you see this, tokens are working correctly.

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

- **Manual refresh required**: Page refresh needed to see token updates (WebSocket support coming soon)
- **No authentication**: Embed endpoint is public (by design for ease of use)
- **60-second cache**: Updates may take up to 1 minute to propagate via CDN

## Future Features

Coming soon:
- **WebSocket support**: Real-time updates without page refresh
- **Scoped injection**: Load tokens only for specific components
- **Subset loading**: Load only specific token groups for performance
- **TypeScript definitions**: Auto-generated types for tokens

## Support

For issues or questions:
- Check the Token Manager documentation
- Contact your organization's Token Manager admin
- Report bugs via your project's issue tracker
