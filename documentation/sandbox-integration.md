# Sandbox Integration Guide

## Overview

The ATUI Tokens Manager supports real-time token preview in external sandboxes (Stackblitz, CodeSandbox, GitHub Codespaces, or localhost). As you edit tokens, the preview updates instantly via PostMessage API.

## Setup

### 1. Configure Sandbox URL

1. Navigate to **Collections → [Your Collection] → Settings**
2. Scroll to **Live Preview Sandbox** section
3. Enter your sandbox URL:
   - Stackblitz: `https://stackblitz.com/edit/your-project`
   - CodeSandbox: `https://codesandbox.io/s/your-sandbox`
   - Localhost: `http://localhost:3000`
   - GitHub Codespaces: `https://your-codespace.github.dev`
4. Save (auto-saves after 800ms)

### 2. Add Token Listener to Your Sandbox

Your sandbox must listen for token updates via PostMessage. Add this script to your HTML or React app:

#### Option A: Plain HTML/JavaScript

```html
<!DOCTYPE html>
<html>
<head>
  <style id="token-styles">
    /* Tokens will be injected here */
  </style>
</head>
<body>
  <div class="app">
    <h1 style="color: var(--token-color-primary)">Hello World</h1>
  </div>

  <script>
    // Send ready signal to parent
    window.parent.postMessage({ type: 'SANDBOX_READY' }, '*');

    // Listen for token updates
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'TOKENS_UPDATE') {
        const { css, themeName, namespace } = event.data;
        
        // Inject CSS variables into page
        const styleEl = document.getElementById('token-styles');
        if (styleEl) {
          styleEl.textContent = css;
          console.log(`[Tokens] Updated from theme: ${themeName}`);
        }
      }
    });
  </script>
</body>
</html>
```

#### Option B: React App

```tsx
// Add to your App.tsx or root component
import { useEffect } from 'react';

export default function App() {
  useEffect(() => {
    // Send ready signal
    window.parent.postMessage({ type: 'SANDBOX_READY' }, '*');

    // Listen for token updates
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'TOKENS_UPDATE') {
        const { css, themeName, namespace } = event.data;
        
        // Inject CSS into head
        let styleEl = document.getElementById('token-styles');
        if (!styleEl) {
          styleEl = document.createElement('style');
          styleEl.id = 'token-styles';
          document.head.appendChild(styleEl);
        }
        styleEl.textContent = css;
        
        console.log(`[Tokens] Updated ${namespace} from ${themeName}`);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="app">
      <h1 style={{ color: 'var(--token-color-primary)' }}>
        Hello World
      </h1>
    </div>
  );
}
```

## PostMessage Protocol

### Messages Sent by Token Manager

#### `TOKENS_UPDATE`
Sent whenever tokens change (editing, theme switching, etc.)

```typescript
{
  type: 'TOKENS_UPDATE',
  css: string,           // Full CSS with :root { --token-name: value; }
  namespace: string,     // e.g. "token" → --token-color-primary
  themeId: string,       // Theme ID or "__default__"
  themeName: string,     // Human-readable theme name
}
```

### Messages Expected from Sandbox

#### `SANDBOX_READY`
Send this once when your sandbox loads to signal you're ready to receive updates.

```typescript
window.parent.postMessage({ type: 'SANDBOX_READY' }, '*');
```

## Usage

### 1. Open Live Preview Tab

1. Go to **Collections → [Your Collection] → Tokens**
2. The right panel now has tabs: **Graph** | **Live Preview**
3. Click **Live Preview** to see your sandbox

### 2. Edit Tokens

- Edit any token in the table
- Switch between themes
- Changes appear instantly in the sandbox iframe

### 3. Connection Status

The preview panel header shows:
- **Connected** (green badge) - Sandbox is ready
- **Connecting...** (gray badge) - Waiting for `SANDBOX_READY` message
- **Last update** timestamp

## Token Format

Tokens are delivered as CSS custom properties (variables):

```css
:root {
  --token-color-primary: #0066ff;
  --token-color-secondary: #6b7280;
  --token-spacing-small: 8px;
  --token-spacing-medium: 16px;
  --token-font-family-body: "Inter", sans-serif;
  --token-border-radius-default: 4px;
}
```

Usage in your CSS:

```css
.button {
  background: var(--token-color-primary);
  padding: var(--token-spacing-medium);
  border-radius: var(--token-border-radius-default);
  font-family: var(--token-font-family-body);
}
```

## Update Frequency

- **Immediate**: Tokens are sent immediately when you edit/save
- **Theme switch**: Tokens update when switching themes
- **No polling**: Uses event-driven PostMessage (efficient)

## CORS Considerations

- **Stackblitz/CodeSandbox**: Works out of the box (supports iframe embedding)
- **Localhost**: Works if running on same machine
- **GitHub Codespaces**: May require CORS headers - add to your dev server:
  ```javascript
  headers: {
    'Access-Control-Allow-Origin': 'https://tokens-manager.your-domain.com',
    'Access-Control-Allow-Methods': 'GET, POST',
  }
  ```

## Troubleshooting

### Preview not updating?

1. **Check connection status**: Look for green "Connected" badge
2. **Check browser console**: Look for `[Tokens] Updated` logs
3. **Verify PostMessage listener**: Make sure your sandbox has the `message` event listener
4. **Check iframe sandbox attribute**: The iframe uses `sandbox="allow-scripts allow-same-origin allow-forms"`

### "Connecting..." never changes to "Connected"?

Your sandbox needs to send `SANDBOX_READY`:

```javascript
window.parent.postMessage({ type: 'SANDBOX_READY' }, '*');
```

### CSS variables not applying?

1. Make sure the `<style>` element is in `<head>`
2. Check CSS selector specificity (CSS vars may be overridden)
3. Verify token paths match (check namespace in Settings)

## Best Practices

1. **Send SANDBOX_READY early**: Add it to your entry point or root component
2. **Use CSS variables**: Reference tokens as `var(--token-name)` for hot-reload
3. **Add console logs**: Debug PostMessage with `console.log(event.data)`
4. **Test with localhost first**: Easier to debug than cloud sandboxes

## Example Projects

### Minimal HTML Sandbox

Create this as `index.html` in Stackblitz:

```html
<!DOCTYPE html>
<html>
<head>
  <style id="token-styles"></style>
  <style>
    body { 
      font-family: var(--token-font-family-body, sans-serif); 
      margin: 0; 
      padding: 2rem;
    }
    .card {
      background: var(--token-color-surface, white);
      color: var(--token-color-text, black);
      padding: var(--token-spacing-large, 24px);
      border-radius: var(--token-border-radius-default, 8px);
      box-shadow: var(--token-shadow-default, 0 2px 4px rgba(0,0,0,0.1));
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Live Token Preview</h1>
    <p>Edit tokens in Token Manager to see updates here.</p>
  </div>

  <script>
    window.parent.postMessage({ type: 'SANDBOX_READY' }, '*');
    window.addEventListener('message', (e) => {
      if (e.data?.type === 'TOKENS_UPDATE') {
        document.getElementById('token-styles').textContent = e.data.css;
        console.log('Tokens updated from:', e.data.themeName);
      }
    });
  </script>
</body>
</html>
```

### React + Vite Sandbox

```tsx
// main.tsx
import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

function App() {
  useEffect(() => {
    window.parent.postMessage({ type: 'SANDBOX_READY' }, '*');
    
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'TOKENS_UPDATE') {
        let style = document.getElementById('tokens');
        if (!style) {
          style = document.createElement('style');
          style.id = 'tokens';
          document.head.appendChild(style);
        }
        style.textContent = e.data.css;
      }
    };
    
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return (
    <div style={{ 
      background: 'var(--token-color-surface)',
      color: 'var(--token-color-text)',
      padding: 'var(--token-spacing-large)',
    }}>
      <h1>Live Preview</h1>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

## Security Notes

- PostMessage uses `*` origin for maximum compatibility
- Only token CSS is transmitted (no sensitive data)
- Sandbox iframe uses restrictive `sandbox` attribute
- Tokens are read-only in the preview (no bi-directional sync yet)

## Future Enhancements

- Bi-directional sync (edit tokens in sandbox)
- Multiple sandbox tabs (desktop, mobile, dark mode)
- Sandbox templates library
- Screenshot/recording from preview
