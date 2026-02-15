# Design Token Manager

A web-based application for visually managing design tokens with an intuitive table interface, color swatches, and live editing capabilities.

## Features

- 📊 **Tabular Display**: View all design tokens in an organized table format
- 🎨 **Color Swatches**: Visual 40px color swatches with click-to-edit functionality
- ✏️ **Live Editing**: Direct inline editing of token values with instant save
- 📁 **File Organization**: Tokens grouped by section (globals, brands, palette)
- 💾 **Auto-Save**: Automatic file updates with backup creation
- 🔄 **Real-time Updates**: Live feedback with loading indicators

## Project Structure

```
token-manager/
├── src/
│   ├── app/
│   │   ├── api/tokens/           # API routes for token operations
│   │   │   ├── route.ts          # GET all tokens
│   │   │   └── [...path]/route.ts # PUT specific token updates
│   │   └── page.tsx              # Main application page
│   ├── components/
│   │   └── TokenTable.tsx        # Token display and editing component
│   └── utils/
│       └── tokenUpdater.ts       # Core token manipulation logic
├── tokens/ -> ../design-tokens/tokens/  # Symlinked token files
├── test-api.js                   # API logic test script
└── test-save.js                  # Save functionality test script
```

## Technology Stack

- **Frontend**: Next.js 16 with TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Next.js API routes
- **File Operations**: Node.js fs module

## Token Format Support

The application supports the Design Tokens specification format:

```json
{
  "token": {
    "color": {
      "primary": {
        "value": "#007bff",
        "type": "color",
        "attributes": {
          "font": "inverse"
        }
      }
    }
  }
}
```

### Supported Token Types

- **color**: Visual color swatches with color picker
- **fontSizes**: Text input fields
- **fontWeight**: Text input fields
- **spacing**: Text input fields
- **borderRadius**: Text input fields
- And any other string-based token types

## Usage

### Starting the Application

```bash
npm install
npm run dev
```

**Note**: Requires Node.js >=20.9.0 for Next.js 16 compatibility.

### Using the Interface

1. **View Tokens**: All tokens are automatically loaded and displayed in sections
2. **Edit Colors**: Click on any color swatch to open the color picker
3. **Edit Values**: Click on any non-color value to edit inline
4. **Save Changes**: Changes are automatically saved when you finish editing
5. **Visual Feedback**: Saving indicators show progress for each token

### API Endpoints

#### GET `/api/tokens`
Returns all tokens grouped by section:
```json
{
  "rawFiles": { "globals/color-base.json": {...} },
  "flatTokens": {
    "globals": [
      {
        "path": "token.color.primary",
        "token": { "value": "#007bff", "type": "color" },
        "filePath": "globals/color-base.json",
        "section": "globals"
      }
    ]
  }
}
```

#### PUT `/api/tokens/[...path]`
Updates a specific token:
```json
{
  "tokenPath": "token.color.primary",
  "newValue": "#0056b3"
}
```

## File Operations

### Backup System
- Automatic backup creation before any file modification
- Backup files named with timestamp: `filename.json.backup-{timestamp}`
- Original JSON structure and formatting preserved

### Symlink Setup
The application uses a symlink to reference external token files:
```bash
ln -s ../design-tokens/tokens tokens
```

This allows the application to work with tokens from your main design system repository without copying files.

## Testing

### Test Token Parsing
```bash
node test-api.js
```

### Test Save Functionality (when implemented for Node.js)
```bash
node test-save.js
```

## Token Statistics

Current token set includes:
- **294 total tokens** across **3 sections**
- **brands**: 6 tokens (brand colors and variants)
- **globals**: 120 tokens (borders, fonts, spacing, etc.)
- **palette**: 168 tokens (comprehensive color palette)

## Development Notes

### Adding New Token Types
To add support for new token types, update the `TokenTable.tsx` component's rendering logic in the table row section.

### Modifying Save Behavior
The `TokenUpdater` class in `src/utils/tokenUpdater.ts` handles all file operations and can be extended for custom save behaviors.

### Styling Customization
Tailwind CSS classes are used throughout. Modify components in `src/components/` to customize the appearance.

## Limitations

- Currently requires manual page refresh to see external file changes
- Color picker only supports hex values
- Token reference resolution (`{token.color.base.white.value}`) shows placeholder color
- Node.js version requirement may limit some deployment options

## Future Enhancements

- Token reference resolution and live preview
- Undo/redo functionality
- Export capabilities (CSS, SCSS, JS)
- Search and filter functionality
- Drag-and-drop token organization
- Real-time collaboration features