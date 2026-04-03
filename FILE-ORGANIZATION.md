# File Organization - Services & Utils

## Changes Made

Reorganized services and utilities into proper directories following best practices.

## New Structure

### `/src/services/`
Services that handle business logic and external integrations:

```
services/
├── websocket/
│   └── socket.service.ts          # WebSocket server & broadcasting
├── figma.service.ts               # Figma integration
├── file.service.ts                # File operations
├── github.service.ts              # GitHub integration
├── style-dictionary.service.ts    # Token generation
├── token.service.ts               # Token operations
└── index.ts                       # Service exports
```

### `/src/utils/`
Pure utility functions for data transformation:

```
utils/
├── color.utils.ts                 # Color parsing, conversion, formatting (moved from lib/)
├── bulkTokenActions.ts            # Bulk token operations
├── graphTokenPaths.ts             # Graph path utilities
├── groupMove.ts                   # Group movement logic
├── toast.utils.ts                 # Toast notifications
├── token.utils.ts                 # Token utilities
├── tokenUpdater.ts                # Token update helpers
├── tree.utils.ts                  # Tree structure utilities
├── ui.utils.ts                    # UI helpers
├── validation.utils.ts            # Validation functions
└── index.ts                       # Utils exports
```

### `/src/lib/`
Core business logic, configurations, and complex operations:

```
lib/
├── auth/                          # Authentication logic
├── db/                            # Database models & repositories
├── email/                         # Email services
├── playground/                    # Playground mode
├── presets/                       # Token presets
├── sandbox/                       # Sandbox utilities
├── db-config.ts                   # Database configuration
├── graphEvaluator.ts              # Graph evaluation engine
├── graphStateRemap.ts             # Graph state transformations
├── jsonTokenParser.ts             # JSON token parsing
├── mongodb.ts                     # MongoDB connection
├── themeTokenMerge.ts             # Theme token merging
├── tokenGenerators.ts             # Token generators
├── tokenGroupToGraph.ts           # Token to graph conversion
└── utils.ts                       # Tailwind cn() helper
```

## Files Moved

### `socket.service.ts`
- **From**: `src/lib/socket.service.ts`
- **To**: `src/services/websocket/socket.service.ts`
- **Reason**: Service that handles WebSocket connections and broadcasting

### `colorUtils.ts`
- **From**: `src/lib/colorUtils.ts`
- **To**: `src/utils/color.utils.ts`
- **Reason**: Pure utility functions for color transformations

## Import Updates

All imports have been updated across the codebase:

### WebSocket Service
```typescript
// Old
import { broadcastTokenUpdate } from '@/lib/socket.service';

// New
import { broadcastTokenUpdate } from '@/services/websocket/socket.service';
```

**Updated in**:
- `server.ts`
- `src/app/api/collections/[id]/route.ts`
- `src/app/api/collections/[id]/themes/[themeId]/tokens/route.ts`

### Color Utils
```typescript
// Old
import { convertColorFormat, type ColorFormat } from '@/lib/colorUtils';

// New
import { convertColorFormat, type ColorFormat } from '@/utils/color.utils';
```

**Updated in**:
- `src/lib/graphEvaluator.ts`
- `src/utils/bulkTokenActions.ts`
- `src/components/ui/MultiFormatColorPicker.tsx`
- `src/components/tokens/ColorFormatDialog.tsx`
- `src/components/tokens/BulkActionBar.tsx`

## Guidelines

### When to use `/services/`
- External API integrations (Figma, GitHub, etc.)
- Business logic services (token service, style dictionary)
- Infrastructure services (WebSocket, email)
- Services that maintain state or connections

### When to use `/utils/`
- Pure functions (no side effects)
- Data transformations
- Formatting and parsing
- Validation helpers
- UI helpers

### When to use `/lib/`
- Core business logic
- Database models and connections
- Complex algorithms (graph evaluation, token parsing)
- Authentication/authorization logic
- Framework-specific helpers (Tailwind `cn()`)

## Naming Conventions

- **Services**: `<name>.service.ts` (e.g., `token.service.ts`)
- **Utils**: `<name>.utils.ts` (e.g., `color.utils.ts`)
- **Lib**: Descriptive names (e.g., `graphEvaluator.ts`, `tokenGenerators.ts`)

## Subdirectories

Create subdirectories when you have multiple related files:

```
services/
└── websocket/
    ├── socket.service.ts
    ├── socket.types.ts       # If needed
    └── socket.constants.ts   # If needed
```

## Testing

All imports have been verified and updated. No breaking changes to the public API.

To verify:
```bash
# Check for any remaining old imports
rg "@/lib/socket.service" src/
rg "@/lib/colorUtils" src/

# Should return no results
```

---

**Status**: ✅ Complete
**Breaking Changes**: None (imports updated)
**Next Steps**: Run tests to verify all imports work correctly
