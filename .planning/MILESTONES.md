# Milestones

## v1.7 AI Integration (Shipped: 2026-04-06)

**Phases completed:** 7 phases, 27 plans, 44 tasks

**Key accomplishments:**

- next@13.5.9 CVE-2025-29927 security patch, next-auth@4.24.13 and bcryptjs@2.4.3 installed, and session.user.id/role strongly typed via next-auth.d.ts module augmentation
- Role-based permission system (permissions.ts + canPerform) and three Mongoose models (User, Invite, CollectionPermission) providing the data layer for all subsequent auth phases
- NextAuth CredentialsProvider config with bcrypt password verification, SUPER_ADMIN_EMAIL JWT override, and App Router /api/auth handler enabling all NextAuth endpoints
- throw-based authorize() errors with specific messages, displayName in session, and first-user bootstrap API via GET+POST /api/auth/setup
- SessionProvider and PermissionsProvider wired into the app via AuthProviders wrapper, making useSession() and usePermissions() available to all client components with correct provider nesting order
- Sign-in page, first-user setup page, and UserMenu component complete the auth round-trip: credentials form with inline errors, setup bootstrap with auto sign-in, and initials avatar with sign-out dropdown in OrgHeader
- All 5 auth scenarios verified in browser: sign-in inline errors, session persistence across refresh, sign-out redirect, first-user setup bootstrap with auto sign-in, and setup redirect guard after setup is complete
- Next.js withAuth middleware for page-route UX gating plus requireAuth() JWT-only API guard utility establishing the dual-layer security model
- All 4 auth guard scenarios verified end-to-end; middleware bug fixed to enable authenticated-user redirect from sign-in page
- requireRole() gate with Admin bypass + 404-for-no-grant, bootstrapCollectionGrants() idempotent backfill, and GET /permissions/me endpoint using CollectionPermission model
- All 7 collection route handlers upgraded from requireAuth() to requireRole() with correct action+collectionId, plus Admin-only grant/revoke permissions API at /api/collections/[id]/permissions
- requireRole() with Action-specific org-level gates on all 9 export/import/utility route handlers — Viewer blocked from GitHub/Figma push, database operations Admin-only
- Collection-aware PermissionsContext rewritten from scaffold { role, canPerform } to named boolean API { canEdit, canCreate, isAdmin, canGitHub, canFigma } with usePathname()-based collection detection and /permissions/me fetch
- Phase 19 RBAC end-to-end verified and signed off — zero TypeScript errors, 35 requireRole() usages, 401 on unauthenticated requests, and all 4 browser scenarios approved by human
- Single-line gap closure: added requireRole(Action.PushGithub) guard to GET /api/github/branches, satisfying PERM-03 fully — Viewer cannot list or create branches
- One-liner:
- Atomic invite-to-account setup flow: bcrypt user creation with findOneAndUpdate race guard, token-validate-on-mount UI, and auto sign-in redirect.
- 1. [Rule 1 - Bug] Fixed TypeScript cast error for Record<string, unknown> to InviteRow
- Pre-flight build clean + human approval of all 6 end-to-end invite flow scenarios — Phase 20 complete.
- JWT callback extended with 60-second roleLastFetched TTL: re-fetches role/status from MongoDB on stale tokens, invalidates session (return {}) for disabled users, with SUPER_ADMIN_EMAIL early-return before any DB hit
- Three Admin-only API routes for user management: list members with isSuperAdmin flag, change role with superadmin protection, and soft-delete with self-removal guard
- Conditional rendering wired to usePermissions() booleans — Viewer users see no write controls in collections grid or tokens page
- Members table on /org/users with inline role selector (optimistic update), AlertDialog remove confirmation, and superadmin/self-removal guards
- All 7 Phase 21 org-users admin and permission-gated UI scenarios verified by human against a clean production build
- One-liner:
- Commit:

---

## v1.0 MVP (Shipped: 2026-02-28)

**Phases completed:** 7 phases, 23 plans
**Timeline:** 2026-02-25 → 2026-02-28 (3 days)
**Files changed:** 91 files, ~13,200 insertions
**Codebase:** ~16,868 LOC TypeScript

**Key accomplishments:**

1. MongoDB persistence layer with Mongoose singleton connection, TokenCollection schema, and one-time seed script for local `tokens/` files
2. View Tokens page collection selector — browse and display any MongoDB collection alongside local files
3. Generator form full save/load/update cycle — SaveCollectionDialog, LoadCollectionDialog, dirty-flag tracking, and overwrite confirmation
4. Collection management actions — delete (with confirmation), rename, and duplicate via CollectionActions component
5. Style-dictionary build pipeline — CSS, SCSS, LESS, JS, TS, JSON output in a BuildTokensModal with per-tab copy and ZIP download
6. Unified tabbed interface at `/` — View and Generate tabs with SharedCollectionHeader providing consistent collection CRUD on both tabs
7. Complete Figma integration fix — persistent FigmaConfig credentials, Figma API proxy routes, ExportToFigmaDialog, ImportFromFigmaDialog, and SourceContextBar for upstream source visibility

**Delivered:** Full MongoDB-backed token collection management layered on top of the existing Next.js design token tool — collections are persistent, shareable, and manageable from both the View and Generate tabs with Figma import/export fully functional.

---

## v1.1 shadcn UI (Shipped: 2026-03-12)

**Phases completed:** 4 phases, 16 plans
**Timeline:** 2026-03-08 → 2026-03-12 (4 days)
**Files changed:** 179 files, ~21,749 insertions
**Codebase:** ~12,000 LOC TypeScript

**Key accomplishments:**

1. Migrated all UI elements (buttons, tabs, modals, inputs, selects) to shadcn/ui via Radix UI primitives across the entire app
2. Established ATUI Stencil web component integration pattern for Next.js 13.5.6 App Router (`next/dynamic` + `ssr:false` + `useEffect` registration)
3. Restructured app navigation with persistent 200px left sidebar, collection selector, and 3 nav items (Tokens, Config, Settings)
4. Full collection management flow: browseable card grid at `/collections` with CRUD, collection-scoped routing at `/collections/[id]/tokens|config|settings`
5. Extended MongoDB collection schema with `description`, `tags`, `figmaToken`, `figmaFileId`, `githubRepo`, `githubBranch` per-collection config fields
6. Auto-saving per-collection Settings page with debounced config persistence to MongoDB and localStorage pre-population

**Delivered:** Complete UI modernization with shadcn/ui, a new sidebar-driven navigation architecture, and collection-scoped pages with per-collection Figma/GitHub config stored in MongoDB.

---

## v1.3 Add Tokens Modes (Shipped: 2026-03-19)

**Phases completed:** 2 phases (8-9), 9 plans
**Timeline:** 2026-03-13 → 2026-03-19 (4 active days)
**Source files changed:** 86 files, ~3,063 insertions / 1,278 deletions
**Codebase:** ~22,000 LOC TypeScript

**Key accomplishments:**

1. Deleted 5 legacy files and renamed `TokenGeneratorFormNew` → `TokenGeneratorForm` — eliminated duplicate component naming and stale app routes
2. Fixed all TypeScript errors and replaced broken ATUI Stencil loader in `AtuiDevTest` with a working shadcn Button sandbox
3. Reorganized 35+ components into 6 feature domain subdirectories (`collections/`, `tokens/`, `layout/`, `figma/`, `github/`, `dev/`) with barrel exports and all import sites updated
4. SRP pass: extracted `parseTokenValue` and `countTokensRecursive` to `token.utils.ts`; documented DB factory; produced `REFACTOR-SUGGESTIONS.md`; Phase 8 verified e2e with zero regressions
5. Themes data model (`ITheme`, `ThemeGroupState`), MongoDB schema extension, and full CRUD REST API at `/api/collections/[id]/themes` with first-theme/subsequent-theme default state logic
6. Themes page UI (`ThemeList` + `ThemeGroupMatrix`), Themes nav item (Layers icon) in collection sidebar, and theme selector on Tokens page filtering the group tree — full feature verified e2e across 14 steps

**Delivered:** Clean, well-organized codebase with zero TypeScript errors, feature-domain component folders, and a full per-collection Themes system — users can create named themes, assign per-group Disabled/Enabled/Source states, and filter the token group tree on the Tokens page by selecting an active theme.

### Known Gaps

Deferred from v1.2 Phase 7 (Mutations) — never executed:

- **TREE-04**: Add group from tree sidebar (child of any node, or at root level)
- **TREE-05**: Tree nodes expand/collapse toggle (explicitly deferred in Phase 5)
- **CONT-02**: Add tokens to the currently selected group
- **CONT-03**: Edit token values inline in the selected group

---

## v1.4 Theme Token Sets (Shipped: 2026-03-27)

**Phases completed:** 6 phases (10-15), 21 plans
**Timeline:** 2026-03-19 → 2026-03-27 (8 days)
**Codebase:** ~27,300 LOC TypeScript

**Key accomplishments:**

1. Themes embed full token snapshots — each theme holds a deep copy of all collection token groups; creation triggers the copy, a 10-theme cap enforced at the API prevents BSON overflow (Phase 10)
2. Inline theme editing on Tokens page — Enabled groups are editable and route saves to the theme's embedded tokens; Source groups are read-only; Disabled groups hidden; override indicator on any differing value (Phase 11)
3. Theme-aware Style Dictionary export — Config page theme selector; SD build uses theme values for Enabled groups and master values for Source groups; comment header identifies the theme (Phase 12)
4. Figma multi-mode export — Figma Variables route generates one variable mode per enabled theme; each theme's merged token values populate the mode (Phase 12)
5. Drag-and-drop group reordering — @dnd-kit sidebar tree with sibling reorder and reparent; drop order persists to MongoDB and cascades to all theme token snapshots; 20-step undo stack (Phase 13)
6. Dark mode support — `colorMode` (light/dark) on every theme with badge UI; CSS/SCSS/LESS export combines light (`:root`) and dark (`[data-color-mode=dark]`) in one file; Figma export pairs Light+Dark themes as variable modes (Phase 14)
7. Multi-row bulk actions — always-visible checkboxes, shift-click range, floating shadcn Menubar action bar; bulk delete/move/change-type/prefix with live prefix editing and single-step Ctrl+Z undo in both default and theme modes (Phase 15)

**Delivered:** Themes are now first-class token value sets. Users can author per-theme token overrides inline on the Tokens page, export any theme through Style Dictionary, generate Figma variable modes per theme, drag-reorder groups, support light/dark color modes, and perform bulk token operations — all with full undo support.

---
