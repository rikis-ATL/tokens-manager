# External Integrations

**Analysis Date:** 2026-02-25

## APIs & External Services

**GitHub API:**
- Service: GitHub REST API v3
- What it's used for: Importing design tokens from GitHub repositories, reading/writing token files, managing branches
- SDK/Client: Native `fetch` API (no official SDK)
- Auth: GitHub Personal Access Token (Bearer token)
- Implementation: `token-manager-angular/src/app/services/github.service.ts`
- Endpoints:
  - `GET /repos/{owner}/{repo}/branches` - List branches
  - `GET /repos/{owner}/{repo}/contents/{path}` - Read file/directory contents
  - `PUT /repos/{owner}/{repo}/contents/{path}` - Create or update files
  - `GET /repos/{owner}/{repo}` - Validate repository access
- Rate Limits: Standard GitHub API rate limits apply (60 requests/hour unauthenticated, 5000/hour authenticated)

**Figma API:**
- Service: Figma REST API
- What it's used for: Importing design tokens from Figma variable collections
- SDK/Client: Native `fetch` API
- Auth: Figma Personal Access Token (X-Figma-Token header)
- Implementation: `token-manager-angular/src/app/services/figma.service.ts`
- Endpoints:
  - `GET /v1/files/{file_key}/variables/local` - Fetch variable collections and variables
  - `GET /v1/me` - Test connection / validate token
- Supported Variable Types: COLOR, FLOAT, STRING, BOOLEAN
- Features:
  - Converts Figma colors (RGBA) to hex format
  - Supports multiple modes within variable collections
  - File key extraction from Figma URLs

## Data Storage

**File System (Local):**
- Type: Local filesystem-based token storage
- Location: `./tokens/` directory in project root
- Format: JSON files organized by sections
- Usage: Token persistence and versioning
- Implementation: `src/utils/tokenUpdater.ts`, `simple-server.js`
- Features:
  - Recursive directory scanning for JSON files
  - Backup creation during token updates (`.backup-{timestamp}` files)
  - Token reference resolution (variables referencing other variables)

**Databases:**
- Not detected - Application uses file-based storage only

**File Storage:**
- Local filesystem only - No cloud storage integration detected

**Caching:**
- None detected

## Authentication & Identity

**Auth Provider:**
- Custom token-based approach using external service tokens
- No user authentication system in place

**Authentication Methods:**
- GitHub Personal Access Token
- Figma Personal Access Token
- Direct token input by user (no server-side storage or management)

## Monitoring & Observability

**Error Tracking:**
- Not detected - No external error tracking service configured

**Logging:**
- Approach: Browser `console.error()`, `console.warn()`, `console.log()`
- Implementation: Distributed throughout services (`github.service.ts`, `figma.service.ts`, `token.service.ts`)
- No centralized logging service

## CI/CD & Deployment

**Hosting:**
- Not detected - No specific hosting configuration found
- Supports multiple deployment targets:
  - Next.js: Self-hosted Node.js or serverless (Vercel, AWS Lambda)
  - Angular: Static hosting (GitHub Pages, Netlify, S3)
  - Stencil: Static hosting (GitHub Pages, Netlify, S3)
  - Vite: Static hosting (Netlify, Vercel, GitHub Pages)

**CI Pipeline:**
- Not detected - No GitHub Actions, GitLab CI, or other CI service configured

## Environment Configuration

**Required env vars:**
- `NPM_AUTH_TOKEN` - For accessing private GitHub npm packages (`@alliedtelesis-labs-nz` scope)
- Application relies on user-provided tokens at runtime for GitHub and Figma APIs

**Secrets location:**
- GitHub: User session storage in browser (not persisted server-side)
- Figma: User session storage in browser (not persisted server-side)
- Package Registry: `NPM_AUTH_TOKEN` configured in `.yarnrc.yml` (scoped to `@alliedtelesis-labs-nz`)
- `.env.local` file exists (specific secrets not disclosed)

## Webhooks & Callbacks

**Incoming:**
- Not detected

**Outgoing:**
- Not detected

## Private NPM Registry

**Provider:** GitHub Package Registry (npm.pkg.github.com)

**Configuration:**
- Location: `.yarnrc.yml`
- Scope: `@alliedtelesis-labs-nz` (scoped packages)
- Authentication: `NPM_AUTH_TOKEN` environment variable
- Always authenticate: `npmAlwaysAuth: true`

**Packages from Registry:**
- `@alliedtelesis-labs-nz/atui-components-stencil` v0.1.174 - Allied Telesis UI components used in Stencil and Vite workspaces

## Token Import/Export Flow

**Import Sources:**
1. **GitHub** - Import tokens from a GitHub repository directory
   - Flow: Validate credentials → List directory → Iterate JSON files recursively → Parse token data → Merge tokens
   - Implementation: `github.service.ts::importTokensFromDirectory()`

2. **Figma** - Import variables from Figma file
   - Flow: Authenticate → Fetch collections & variables → Convert Figma format → Generate token groups
   - Implementation: `figma.service.ts::getVariableCollections()`, `getVariables()`, `convertFigmaVariablesToTokens()`

3. **File Upload** - Import tokens from JSON files
   - Flow: User uploads JSON → Parse → Validate schema → Store in tokens directory
   - Implementation: `file.service.ts`

**Export/Persistence:**
- Tokens stored in local filesystem (`./tokens/` directory)
- Token updates trigger file write with automatic backup creation
- API route: `/api/tokens` (GET for retrieval, PUT for updates)
- Legacy server: Express-based simple server on port 3001

## Cross-Workspace Communication

**Shared Components:**
- `@alliedtelesis-labs-nz/atui-components-stencil` v0.1.174
- Used by: token-manager-stencil, token-manager-vite workspaces
- Provides: Reusable UI components

**Shared Types & Utils:**
- Root workspace contains shared utilities
- `@/*` path alias points to root `src/` directory
- Shared services available across workspaces

---

*Integration audit: 2026-02-25*
