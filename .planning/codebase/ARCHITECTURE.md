# Architecture

**Analysis Date:** 2026-02-25  
**Clean Code Alignment:** 2026-03-19

## Clean Code Alignment

Architecture follows **separation of concerns** and **SOLID** (see `CLEAN-CODE.md`):

- **Presentation** → Components only render and delegate; no business logic
- **API/Route** → Thin handlers; delegate to services
- **Service** → Business logic, external integrations
- **Utility** → Pure helpers; no framework imports
- **Types** → Shared contracts; no implementation

When adding code, place it in the correct layer. Extract logic from components to utils/services when it grows.

## Pattern Overview

**Overall:** Layered Client-Server Architecture with Next.js App Router

**Key Characteristics:**
- Frontend/Backend separation with Next.js as full-stack framework
- Client components manage UI state and user interactions
- Server-side API routes handle file I/O and external integrations
- Service layer encapsulates business logic (token processing, GitHub operations, file handling)
- Token-centric domain with W3C Design Token Specification compliance

## Layers

**Presentation Layer (Client-Side):**
- Purpose: Render UI components, manage client state, display tokens and generation forms
- Location: `src/app/page.tsx`, `src/app/generate/page.tsx`, `src/components/`
- Contains: React components (TokenTable, TokenGeneratorForm, GitHubConfig, etc.)
- Depends on: Service layer (via API calls), types
- Used by: Browser/users

**API/Route Handler Layer (Server-Side):**
- Purpose: Process HTTP requests, orchestrate services, handle client requests
- Location: `src/app/api/`
- Contains: Next.js route handlers using App Router conventions
- Depends on: Utils (TokenUpdater), Services (token, file, github)
- Used by: Frontend components via fetch()

**Service Layer:**
- Purpose: Encapsulate business logic for tokens, file operations, GitHub integration, Figma integration
- Location: `src/services/`
- Contains: TokenService, GitHubService, FileService, FigmaService
- Depends on: Types, external APIs
- Used by: API routes, components

**Utility Layer:**
- Purpose: Helper functions for token updates, validation, UI utilities, token utilities
- Location: `src/utils/`
- Contains: TokenUpdater class, validation functions, UI helpers, token manipulation functions
- Depends on: Types, fs (file system for server-side operations)
- Used by: API routes, services

**Type/Contract Layer:**
- Purpose: TypeScript interfaces and type definitions for all domain objects
- Location: `src/types/token.types.ts`
- Contains: Token types, GitHub types, Figma types, validation types, UI state types
- Used by: All other layers

## Data Flow

**Token Viewing (Home Page):**

1. Client renders `/` page with `'use client'` directive (client component)
2. useEffect triggers `GET /api/tokens` on mount
3. API route `src/app/api/tokens/route.ts`:
   - Creates TokenUpdater instance pointing to `tokens/` directory
   - Calls `getAllTokensWithResolvedRefs()` to read all JSON files recursively
   - Flattens token structure using `flattenTokens()`
   - Resolves token references (e.g., `{token.color.base.teal}` → actual value)
   - Groups tokens by file section and returns as nested structure
4. Frontend displays TokenTable components, one per section
5. User can refresh tokens via "Refresh" button

**Token Saving (Update Flow):**

1. User edits token value in TokenTable component
2. Component calls `saveToken(filePath, tokenData)`
3. Sends `PUT /api/tokens/{filePath}` with tokenPath and newValue
4. API route `src/app/api/tokens/[...path]/route.ts`:
   - Extracts file path from params and token data from body
   - Creates TokenUpdater instance
   - Calls `updateToken()` which:
     - Reads current file content
     - Creates backup with timestamp
     - Navigates to token location using dotted path
     - Updates value in place
     - Writes updated JSON back to filesystem
   - Returns success response
5. Frontend receives confirmation

**Token Import from GitHub:**

1. User navigates to `/generate` page
2. User configures GitHub credentials via GitHubConfig component
3. GitHubDirectoryPicker allows browsing repository structure
4. User submits import via TokenGeneratorFormNew
5. Sends `POST /api/import/github` with repository, branch, path, githubToken
6. API route recursively:
   - Fetches directory contents from GitHub API
   - For each .json file: fetches content, decodes base64, parses JSON
   - For each directory: recursively processes subdirectories
   - Builds hierarchical combined token structure
   - Returns all tokens with metadata
7. Frontend displays imported tokens for review/generation

**Token Generation (New Token Creation):**

1. User fills TokenGeneratorFormNew with token details (name, value, type, attributes)
2. User can optionally export to GitHub or local format
3. On submit:
   - Frontend validates token structure
   - Creates token following W3C Design Token specification format
   - Optionally exports to different formats (JSON, JS, TS, CSS, SCSS, LESS)
   - Can post to `POST /api/export/github` to create pull request

**State Management:**

- No centralized state management (Redux, Zustand, etc.)
- Client state managed locally in React components using useState/useEffect
- Server state persisted in filesystem (`tokens/` directory)
- Token resolution happens at read-time in API layer to ensure fresh references

## Key Abstractions

**TokenService (src/services/token.service.ts):**
- Purpose: Core token processing engine - handles structure detection, grouping, validation, reference resolution
- Examples: `processImportedTokens()`, `resolveTokenReference()`, `validateTokenStructure()`, `generateStyleDictionaryOutput()`
- Pattern: Static methods on singleton service class; immutable transformations
- Key responsibilities:
  - Detect token structure (Style Dictionary format "A" vs namespace wrapper "B")
  - Create hierarchical token groups from flat JSON
  - Resolve token references with circular reference guard
  - Validate token definitions
  - Generate Style Dictionary compatible output

**TokenUpdater (src/utils/tokenUpdater.ts):**
- Purpose: Low-level token file operations on filesystem
- Examples: `updateToken()`, `getAllTokens()`, `flattenTokens()`, `resolveTokenReference()`
- Pattern: Class-based with direct filesystem access (fs module)
- Key responsibilities:
  - Read/write JSON token files
  - Create backups before updates
  - Flatten hierarchical token structures for display
  - Resolve token references during read operations

**GitHubService (src/services/github.service.ts):**
- Purpose: GitHub API integration for repository operations
- Examples: `getBranches()`, `getDirectoryContents()`, `getFileContent()`, `createPullRequest()`
- Pattern: Class-based with standardized error handling via `GitHubApiResponse` wrapper
- Key responsibilities:
  - Fetch repository information
  - Browse directory structures
  - Handle authentication via token
  - Create pull requests for token changes

**FileService (src/services/file.service.ts):**
- Purpose: File import/export with format support
- Examples: `importFromFile()`, `exportTokens()` (with json/js/ts/css/scss/less formats)
- Pattern: Class-based service delegating validation to TokenService
- Key responsibilities:
  - Parse JSON token files
  - Validate imported tokens
  - Export tokens in multiple formats

## Entry Points

**Home Page (Token Viewer):**
- Location: `src/app/page.tsx`
- Triggers: User navigates to `/`, or clicks "View Tokens" nav link
- Responsibilities:
  - Fetch tokens from API
  - Display tokens in sections (grouped by source file)
  - Enable token refresh
  - Show loading/error states
  - Pass save callbacks to TokenTable

**Generate Page (Token Generator):**
- Location: `src/app/generate/page.tsx`
- Triggers: User navigates to `/generate` or clicks "Generate Tokens" nav link
- Responsibilities:
  - Display GitHub configuration UI (GitHubConfig)
  - Display token generation form (TokenGeneratorFormNew)
  - Allow GitHub import and token creation
  - Show documentation (TokenGeneratorDocs)

**API Routes:**
- `GET /api/tokens` - Fetch all tokens with resolved references
- `PUT /api/tokens/[...path]` - Update single token value
- `POST /api/import/github` - Import tokens from GitHub repository
- `POST /api/export/github` - Export tokens to GitHub as pull request
- `POST /api/export/figma` - Export tokens to Figma
- `GET /api/github/branches` - Fetch repository branches

**Root Layout:**
- Location: `src/app/layout.tsx`
- Triggers: App initialization
- Responsibilities:
  - Set up global HTML structure
  - Configure fonts and metadata
  - Initialize body styling with Tailwind

## Error Handling

**Strategy:** Try-catch blocks with structured error responses

**Patterns:**
- API routes: Return 400/500 status codes with error messages in NextResponse
- Services: Throw errors caught by calling code (API routes or components)
- Token operations: Backups created before mutations; failed updates don't corrupt files
- GitHub operations: Wrapped in `handleApiResponse()` which parses error details from GitHub API
- Frontend: Display toast notifications or error messages; retry buttons for fetch failures

Example error handling in API route:
```typescript
try {
  const result = await updater.updateToken(filePath, tokenPath, newValue);
  if (!success) {
    return NextResponse.json({ error: 'Failed to update token' }, { status: 500 });
  }
} catch (error) {
  console.error('Error:', error);
  return NextResponse.json({ error: 'Failed to update token' }, { status: 500 });
}
```

## Cross-Cutting Concerns

**Logging:** Console methods (console.log, console.error) throughout for debugging; emoji prefixes used in TokenService for visual distinction

**Validation:**
- TokenService.validateTokenStructure() validates all tokens before import
- FileService checks JSON validity before parsing
- Token definitions checked with isTokenDefinition() to distinguish groups from tokens

**Authentication:**
- GitHub token passed as environment variable or user input
- No centralized auth layer; each service handles token passing
- Figma token similarly passed per-service

**Type Safety:**
- Full TypeScript strict mode enabled
- All external data typed with interfaces from token.types.ts
- API responses wrapped in standardized response types (GitHubApiResponse, FileImportResult, etc.)

---

*Architecture analysis: 2026-02-25*
