# Style Dictionary GUI - Setup Guide

## Overview

This is a web-based GUI for managing design tokens using the Style Dictionary framework. It supports both **greenfield** (new projects) and **brownfield** (existing style-dictionary projects) workflows.

## Features

✅ **Token Management**
- View tokens in visual HTML tables with color swatches
- Edit tokens inline with auto-save
- Organize tokens into groups/sets
- Support for token references (e.g., `{color.primary}`)

✅ **Style Dictionary Integration**
- Uses Style Dictionary v5.x API for token building
- Generates CSS, SCSS, JavaScript, and JSON outputs
- Automatic token reference resolution
- Configurable via `config.js`

✅ **Token Validation**
- W3C Design Tokens specification compliance
- Color value validation (hex format)
- Dimension value validation (px, rem, em, etc.)
- Token reference validation
- Circular reference detection

✅ **GitHub Integration**
- Import tokens from GitHub repositories
- Export tokens to GitHub
- Browse repository structure
- Multi-branch support

## Quick Start

### 1. Installation

```bash
npm install
```

### 2. Setup Tokens Directory

**Option A: Greenfield (New Project)**

Create your tokens directory:

```bash
mkdir -p tokens/globals tokens/brands
```

Add your first token file:

```json
// tokens/globals/colors.json
{
  "color": {
    "primary": {
      "value": "#007bff",
      "type": "color"
    }
  }
}
```

**Option B: Brownfield (Existing Project)**

Symlink your existing tokens directory:

```bash
ln -s /path/to/your/existing/tokens tokens
```

Or configure the path in your `config.js`:

```javascript
module.exports = {
  source: ['path/to/your/tokens/**/*.json'],
  // ... rest of config
};
```

### 3. Configure Style Dictionary (Optional)

The default `config.js` works out of the box. Customize it for your needs:

```javascript
module.exports = {
  source: ['tokens/**/*.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'build/css/',
      prefix: 'token', // Global namespace
      files: [{
        destination: 'variables.css',
        format: 'css/variables',
      }],
    },
  },
};
```

### 4. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Usage

### Viewing Tokens

1. Navigate to the homepage (`/`)
2. All tokens are loaded and displayed in sections
3. Tokens are grouped by their directory structure

### Editing Tokens

1. **Colors**: Click on the color swatch to open a color picker
2. **Other values**: Click on the value to edit inline
3. Changes are auto-saved to the JSON files

### Building Tokens

1. Click the **"Build Tokens"** button in the header
2. Style Dictionary will generate files in the `build/` directory
3. Check the output in:
   - `build/css/variables.css`
   - `build/scss/_variables.scss`
   - `build/js/tokens.js`
   - `build/json/tokens.json`

### Generating Tokens

1. Navigate to `/generate`
2. Fill in the token details:
   - Name (e.g., "primary")
   - Type (color, dimension, fontFamily, etc.)
   - Value (e.g., "#007bff" or "{color.base.blue}")
3. Organize into groups
4. Export to JSON or GitHub

### Token References

Tokens can reference other tokens using curly braces:

```json
{
  "color": {
    "primary": {
      "value": "#007bff",
      "type": "color"
    },
    "link": {
      "value": "{color.primary}",
      "type": "color"
    }
  }
}
```

**Note**: In Style Dictionary v5.x, use `{color.primary}` instead of `{color.primary.value}`

## API Endpoints

### GET `/api/tokens`

Get all tokens grouped by section.

**Response:**
```json
{
  "rawFiles": { ... },
  "flatTokens": {
    "globals": [
      {
        "path": "color.primary",
        "token": { "value": "#007bff", "type": "color" },
        "filePath": "globals/colors.json",
        "section": "globals"
      }
    ]
  }
}
```

### PUT `/api/tokens/[...path]`

Update a specific token.

**Body:**
```json
{
  "tokenPath": "color.primary",
  "newValue": "#0056b3"
}
```

### POST `/api/build`

Build tokens using Style Dictionary.

**Response:**
```json
{
  "success": true,
  "message": "Tokens built successfully",
  "builtFiles": {
    "css": ["variables.css"],
    "scss": ["_variables.scss"],
    "js": ["tokens.js"],
    "json": ["tokens.json"]
  },
  "platforms": ["css", "scss", "js", "json"]
}
```

### POST `/api/tokens/validate`

Validate tokens before saving.

**Body (single token):**
```json
{
  "name": "primary",
  "type": "color",
  "value": "#007bff"
}
```

**Body (batch):**
```json
{
  "tokens": [
    { "name": "primary", "type": "color", "value": "#007bff" },
    { "name": "secondary", "type": "color", "value": "{primary}" }
  ]
}
```

**Response:**
```json
{
  "valid": true,
  "errors": []
}
```

## W3C Token Types

The validator supports these W3C Design Tokens specification types:

- `color` - Color values (hex format)
- `dimension` - Size values (px, rem, em, %, etc.)
- `fontFamily` - Font family names
- `fontWeight` - Font weights (100-900)
- `duration` - Time values (ms, s)
- `cubicBezier` - Cubic bezier curves
- `number` - Numeric values
- `strokeStyle` - Stroke styles
- `border` - Border definitions
- `transition` - Transition definitions
- `shadow` - Shadow definitions
- `gradient` - Gradient definitions
- `typography` - Typography compositions

## File Structure

```
tokens-manager/
├── tokens/              # Your token files (gitignored)
│   ├── globals/
│   ├── brands/
│   └── palette/
├── build/               # Style Dictionary output (gitignored)
├── config.js            # Style Dictionary configuration
├── src/
│   ├── app/
│   │   ├── page.tsx     # Token viewer
│   │   ├── generate/    # Token generator
│   │   └── api/
│   │       ├── tokens/  # Token CRUD
│   │       ├── build/   # SD build endpoint
│   │       └── ...
│   ├── components/
│   │   ├── TokenTable.tsx           # Token display/edit
│   │   └── TokenGeneratorFormNew.tsx # Token creation
│   └── utils/
│       ├── tokenUpdater.ts    # Token file operations
│       └── tokenValidator.ts  # Token validation
└── package.json
```

## Best Practices

### Token Naming

- Use lowercase with hyphens: `primary-color`, `spacing-large`
- Or camelCase: `primaryColor`, `spacingLarge`
- Organize hierarchically: `color.brand.primary`

### Token Organization

```
tokens/
├── globals/           # Shared tokens
│   ├── colors.json
│   ├── spacing.json
│   └── typography.json
├── brands/            # Brand-specific tokens
│   ├── brand-a.json
│   └── brand-b.json
└── components/        # Component tokens
    ├── button.json
    └── card.json
```

### Token References

Use references to maintain consistency:

```json
{
  "color": {
    "base": {
      "blue": { "value": "#007bff", "type": "color" }
    },
    "primary": { "value": "{color.base.blue}", "type": "color" },
    "link": { "value": "{color.primary}", "type": "color" }
  }
}
```

### Global Namespace

Configure a global namespace in `config.js`:

```javascript
platforms: {
  css: {
    prefix: 'myapp', // Generates --myapp-color-primary
  }
}
```

## Troubleshooting

### Tokens not loading

1. Check that `tokens/` directory exists
2. Verify JSON files are valid
3. Check browser console for errors

### Build fails

1. Verify `config.js` syntax
2. Check for circular token references
3. Ensure all referenced tokens exist

### Token references not resolving

1. Use `{path.to.token}` format (without `.value`)
2. Ensure referenced token exists before the reference
3. Check for typos in token paths

## Advanced Configuration

### Custom Transforms

Add custom transforms in `config.js`:

```javascript
const StyleDictionary = require('style-dictionary');

StyleDictionary.registerTransform({
  name: 'custom/kebab-case',
  type: 'name',
  transformer: (token) => token.path.join('-'),
});

module.exports = {
  platforms: {
    css: {
      transforms: ['custom/kebab-case', 'color/css'],
      // ...
    }
  }
};
```

### Multi-Brand Setup

Organize tokens by brand:

```
tokens/
├── globals/           # Shared across brands
├── brands/
│   ├── brand-a/
│   │   ├── colors.json
│   │   └── typography.json
│   └── brand-b/
│       ├── colors.json
│       └── typography.json
```

Build each brand separately:

```javascript
platforms: {
  'brand-a-css': {
    transformGroup: 'css',
    buildPath: 'build/brand-a/css/',
    // ...
  },
  'brand-b-css': {
    transformGroup: 'css',
    buildPath: 'build/brand-b/css/',
    // ...
  }
}
```

## Support

For issues or questions:
- Check the [Style Dictionary documentation](https://styledictionary.com/)
- Review the [W3C Design Tokens spec](https://design-tokens.github.io/community-group/format/)
- Open an issue on GitHub
