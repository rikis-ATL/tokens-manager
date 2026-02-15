# Style Dictionary Format Expectations and Transforms

## Overview
This document outlines the format expectations and transformations required to properly parse and display Style Dictionary token structures in the Token Manager application. The Token Manager now supports both recommended (Structure A) and legacy (Structure B) token organization patterns.

## Supported Token Structures

The Token Manager supports two input structures with automatic detection:

### Structure A: Flat/Recommended (Style Dictionary + Platform Prefix)
```json
{
  "brands": {
    "brand1": {
      "colors": { "primary": { "value": "#FF0000" } },
      "globals": { "spacing": { "sm": { "value": "8px" } } }
    }
  },
  "globals": {
    "typography": { "h1": { "value": "32px" } }
  }
}
```
*With Style Dictionary config: `prefix: 'token'`*

### Structure B: Namespace Wrapper/Legacy
```json
{
  "token": {
    "brands": {
      "brand1": {
        "colors": { "primary": { "value": "#FF0000" } },
        "globals": { "spacing": { "sm": { "value": "8px" } } }
      }
    },
    "globals": {
      "typography": { "h1": { "value": "32px" } }
    }
  }
}
```
*Namespace embedded in JSON structure*

## Expected Output Structure (UI Display)
The token manager should transform this into a hierarchical structure matching Style Dictionary build output:

```
📁 brand1 (top-level group)
  📁 colors
    🎨 primary: #FF0000
    🎨 secondary: #00FF00
  📁 globals
    📏 spacing.sm: 8px
  📁 palette
    🎨 red.500: #DC2626

📁 brand2 (top-level group)
  📁 colors
    🎨 primary: #0000FF

📁 globals (shared)
  📝 typography.h1: 32px

📁 palette (shared)
  🎨 blue.100: #DBEAFE
```

## Transform Rules

### 1. Hybrid Structure Detection
- **Auto-Detection**: Identifies Structure A vs Structure B based on top-level keys
- **Structure A**: Multiple top-level keys (brands, globals, palette)
- **Structure B**: Single top-level key that matches namespace patterns (token, design, etc.)

### 2. Global Namespace Handling
- **Structure A**: Uses default "token" namespace or detects from common path prefix
- **Structure B**: Extracts namespace from wrapper key and unwraps token structure
- **Action**: Namespace never appears as a group, only used for global namespace field

### 3. Brand Container Flattening
- **Pattern**: `brands.{brandName}.*` where "brands" is a container
- **Action**: Flatten the brands container and promote brand names to top-level
- **Transform**: `brands.brand1.colors.primary` → `brand1.colors.primary`
- **Applies to**: Both Structure A and Structure B

### 4. Brand Top-Level Promotion
- **Pattern**: Any path starting with a brand identifier
- **Action**: Create brand as top-level group containing all brand-specific tokens
- **Example**: `brand1.colors.primary` becomes a top-level group "brand1" with subgroup "colors"

### 5. Shared Resource Handling
- **Pattern**: Tokens not under a brand container (e.g., `globals.*`, `palette.*`)
- **Action**: Create as separate top-level groups for shared resources
- **Example**: `globals.typography.h1` → top-level "globals" group

## Implementation Details

### Code Location
Transforms are implemented in `/src/components/TokenGeneratorFormNew.tsx` in the `convertToTokenGroups` function.

### Key Transform Logic
```typescript
// 1. Hybrid Structure Detection
let actualTokenSet = tokenSet;
let detectedStructureType = 'A';
let extractedNamespace = '';

const topLevelKeys = Object.keys(tokenSet);
if (topLevelKeys.length === 1) {
  const singleKey = topLevelKeys[0];
  const namespacePatterns = ['token', 'tokens', 'design', 'ds'];
  if (namespacePatterns.some(pattern => singleKey.toLowerCase().includes(pattern))) {
    detectedStructureType = 'B';
    extractedNamespace = singleKey;
    actualTokenSet = tokenSet[singleKey]; // Unwrap namespace
  }
}

// 2. Dual Global Namespace Detection
if (detectedStructureType === 'B') {
  detectedGlobalNamespace = extractedNamespace;
} else {
  // Structure A: Analyze paths for common prefix or use default
  detectedGlobalNamespace = 'token'; // Default Style Dictionary convention
}

// 3. Brand Container Flattening (applies to both structures)
if (groupPath.length >= 3 && groupPath[0].toLowerCase().includes('brand')) {
  semanticGroupPath = [groupPath[1], ...groupPath.slice(2)]; // brands.brand1.color → brand1.color
}
```

### Debugging Output
The transform includes comprehensive console logging:
- `📦 Structure B detected` / `🏗️ Structure A detected` - Shows structure type detection
- `🎯 Using extracted namespace` / `🎯 DETECTED global namespace` - Shows namespace handling
- `✂️ Stripped global namespace` / `📦 Using unwrapped path` - Shows path processing
- `🏗️ Style Dictionary build transform` - Shows semantic group transformations

## Configuration Requirements

### Style Dictionary Config Pattern
```javascript
module.exports = {
  source: [
    'tokens/brands/**/*.json',    // Brand-specific tokens
    'tokens/globals/**/*.json',   // Shared global tokens
    'tokens/palette/**/*.json'    // Shared palette tokens
  ],
  // ...
}
```

### Expected Folder Structure
```
tokens/
├── brands/
│   ├── brand1/
│   │   ├── colors.json
│   │   ├── globals.json
│   │   └── palette.json
│   └── brand2/
│       ├── colors.json
│       ├── globals.json
│       └── palette.json
├── globals/
│   └── typography.json
└── palette/
    └── base.json
```

## Build Output Structure
The transforms ensure the UI matches the actual Style Dictionary build output structure:

```
build/
├── brand1/
│   ├── colors/
│   ├── globals/
│   └── palette/
└── brand2/
    ├── colors/
    ├── globals/
    └── palette/
```

## Testing
To verify transforms are working correctly:
1. Import tokens from GitHub repository
2. Check that brands appear as top-level groups
3. Verify each brand contains colors/globals/palette subgroups
4. Confirm global namespace is properly detected and not shown as a group
5. Ensure shared resources (globals, palette) appear as separate top-level groups when not brand-specific

## Error Handling
- Invalid brand patterns are logged but don't break the transform
- Missing segments are handled gracefully
- Fallback to original structure if transforms fail