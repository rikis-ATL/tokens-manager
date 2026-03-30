# ATUI Tokens Manager

## What This Is

A Next.js design token management tool for the Allied Telesis ATUI design system. It allows designers and developers to view, create, edit, and persist design tokens — importing from GitHub repositories and Figma, storing collections in MongoDB for durable access, and exporting to GitHub PRs, Figma, and multiple CSS/JS format files (CSS, SCSS, LESS, JS, TS, JSON). Collections are browseable in a card grid; each collection has scoped pages (Tokens, Themes, Config, Settings) with per-collection Figma/GitHub config persisted to MongoDB. The Tokens page shows all groups as a draggable hierarchical tree with breadcrumb navigation. Themes are first-class token value sets: each theme embeds a full copy of token data, group states control per-theme edit permissions (Enabled/Source/Disabled), and the Tokens page routes inline edits to the active theme. Export targets a chosen theme; Figma export generates one variable mode per enabled theme. Each theme carries a colorMode (light/dark) for combined CSS and Figma mode-pair export. Multi-row bulk actions on the token table let users delete, move, change type, or rename tokens across selections.

## Core Value

Token collections are always available and editable: stored in MongoDB, accessible via collection-scoped URLs, with per-collection Figma/GitHub config, full CRUD from the collections grid, Figma import/export fully integrated, and a Themes system where each theme is a complete token value set with per-group edit permissions, dark-mode awareness, and theme-targeted export.

## Requirements

### Validated

- ✓ User can view all tokens from local `tokens/` directory — existing
- ✓ User can edit individual token values in the token table — existing
- ✓ User can import tokens from a GitHub repository (recursive directory fetch) — existing
- ✓ User can generate/create new token definitions via the generator form — existing
- ✓ User can export tokens to GitHub as a pull request — existing
- ✓ User can export tokens to Figma — existing (fixed and improved in v1.0)
- ✓ User can export tokens in multiple formats (JSON, JS, TS, CSS, SCSS, LESS) — existing
- ✓ App connects to MongoDB for persistent token collection storage — v1.0
- ✓ Local `tokens/` directory files are seeded into MongoDB as default collections on first setup — v1.0
- ✓ User can save a token collection from the generator form to MongoDB (requires naming the collection) — v1.0
- ✓ User can view MongoDB collections on the View Tokens page via a select input — v1.0
- ✓ User can load a collection from MongoDB into the generator form (via dialog listing all collections) — v1.0
- ✓ User can edit a loaded collection's full token data in the generator form — v1.0
- ✓ User can save edits back to MongoDB (update existing collection) — v1.0
- ✓ User can delete a collection from MongoDB — v1.0
- ✓ User can rename a collection in MongoDB — v1.0
- ✓ User can duplicate a collection in MongoDB — v1.0
- ✓ User can build tokens via style-dictionary and download all formats as ZIP — v1.0
- ✓ View and Generate are unified into a single tabbed interface at `/` — v1.0
- ✓ User can import a Figma variable collection and save it as a MongoDB token collection — v1.0
- ✓ User can see which upstream source (GitHub or Figma) a collection came from — v1.0
- ✓ UI uses shadcn/ui components (buttons, tabs, modals, inputs, selects) throughout — v1.1
- ✓ Color token fields use native color picker inputs — v1.1
- ✓ App has persistent left sidebar with collection selector and nav items (Tokens, Config, Settings) — v1.1
- ✓ Collections are browseable in a card grid at `/collections` with CRUD (rename, delete, duplicate) — v1.1
- ✓ Each collection has scoped pages at `/collections/[id]/tokens`, `/collections/[id]/config`, `/collections/[id]/settings` — v1.1
- ✓ Per-collection Figma and GitHub config fields are persisted to MongoDB — v1.1
- ✓ Per-collection Settings page auto-saves config to MongoDB with debounce — v1.1
- ✓ Token groups sidebar displays a hierarchical tree built from parsed path names — v1.2
- ✓ Tree node display names parsed from group path (segments split, `.json` stripped) — v1.2
- ✓ Selecting a tree node highlights it and scopes content area to that group's direct tokens — v1.2
- ✓ Breadcrumb trail above content area reflects full path; each segment navigates to ancestor — v1.2
- ✓ Codebase has zero TypeScript errors; no `@ts-ignore`/`as any` suppressors — v1.3
- ✓ Components organized into feature domain subdirectories with barrel exports — v1.3
- ✓ Dead code and legacy routes removed; single canonical form component — v1.3
- ✓ User can create and manage named themes per collection on a dedicated Themes page — v1.3
- ✓ Each theme assigns every token group a state: Disabled, Enabled, or Source — v1.3
- ✓ Themes page is accessible via a Themes nav tab in the collection sidebar — v1.3
- ✓ Theme selector on Tokens page filters the group tree to show only Enabled/Source groups — v1.3
- ✓ First new theme defaults all groups to Enabled; subsequent themes default to Disabled — v1.3
- ✓ Visual graph editor (React Flow) for composing token-generation pipelines per group — v1.2+
- ✓ Graph state persisted per theme and per group; themes have isolated graph state — v1.4
- ✓ Each theme stores a full copy of all collection token groups embedded in the theme document — v1.4
- ✓ Theme creation initializes embedded token data as a 1:1 deep copy of the collection's current tokens — v1.4
- ✓ Theme creation enforces a maximum of 10 themes per collection to prevent MongoDB document overflow — v1.4
- ✓ Enabled group tokens are editable inline on the Tokens page and saved to the active theme's data — v1.4
- ✓ Source group tokens are read-only and always show the collection-default values — v1.4
- ✓ Tokens whose values differ from the collection default show a visible override indicator — v1.4
- ✓ User can select which theme (or collection default) to export on the Config page — v1.4
- ✓ Style Dictionary export uses the selected theme's token values for the active export — v1.4
- ✓ Figma Variables export generates one mode per enabled theme in the collection — v1.4
- ✓ Groups in the sidebar tree are draggable to reorder siblings and reparent; drop order persists to MongoDB — v1.4
- ✓ Drag-and-drop reorder updates all theme token snapshots and becomes canonical export sequence — v1.4
- ✓ Every theme carries a colorMode (light/dark); colorMode is visible as a badge and configurable at creation — v1.4
- ✓ CSS/SCSS/LESS export combines light tokens in `:root {}` and dark tokens in `[data-color-mode="dark"] {}` — v1.4
- ✓ Figma Variables export pairs themes by colorMode: same group structure + different colorMode = one variable collection with Light and Dark modes — v1.4
- ✓ Token table has always-visible checkbox column; header checkbox toggles all; shift-click for range selection — v1.4
- ✓ Floating action bar appears when tokens are selected; supports bulk delete, move, change type, and prefix rename — v1.4
- ✓ All bulk operations are undoable via Ctrl+Z as a single step; route through theme tokens when a theme is active — v1.4

### Active

<!-- v1.7 AI Integration -->
- [ ] User can open an AI chat panel on the Tokens page for the active collection — AI-01
- [ ] User enters their own AI provider API key in user settings; key stored encrypted in MongoDB — AI-02
- [ ] All AI API calls are made server-side; API key never exposed to the browser — AI-03
- [ ] AI service layer is provider-agnostic; Claude (Anthropic SDK) is the initial provider — AI-04
- [ ] AI agent can create tokens in the active collection via tool use — AI-05
- [ ] AI agent can edit token values in the active collection via tool use — AI-06
- [ ] AI agent can delete tokens in the active collection via tool use — AI-07
- [ ] AI agent can create token groups in the active collection via tool use — AI-08
- [ ] AI agent can rename token groups in the active collection via tool use — AI-09
- [ ] AI agent can delete token groups in the active collection via tool use — AI-10
- [ ] AI agent can create themes with AI-suggested token values via tool use — AI-11
- [ ] User can query tokens in natural language ("which tokens use #0056D2?") — AI-12
- [ ] User can request natural language edits ("rename all sm spacing tokens to small") — AI-13
- [ ] User can paste token values and receive AI-suggested canonical names and group structure — AI-14
- [ ] AI tool calls map to existing app API endpoints; AI does not write to the database directly — AI-15

<!-- v1.6 Multi-Tenant SaaS (planned, not yet executed) -->
- [ ] All users and collections are scoped to an organization via organizationId — TENANT-01
- [ ] User can create a new organization during self-serve signup — TENANT-02
- [ ] Existing data is migrated to an org seeded from INITIAL_ORG_NAME env var on first boot — TENANT-03
- [ ] Tier limits are defined in a configurable LIMITS config (not hardcoded per-route) — BILLING-01
- [ ] Organization stores plan, stripeCustomerId, and subscriptionStatus — BILLING-02
- [ ] Free tier enforces: max 1 collection, 500 tokens, 1 theme, 10 exports/mo, 100 KB export size, no integrations — BILLING-03
- [ ] Pro tier enforces: max 10 collections, 5,000 tokens, 5 themes, 100 exports/mo, integrations enabled — BILLING-04
- [ ] Team tier extends Pro with max 10 seats — BILLING-05
- [ ] Self-hosted mode (SELF_HOSTED=true env var) bypasses all limits and Stripe — BILLING-06
- [ ] Per-org usage is tracked: exportsThisMonth, tokenCount, lastReset — USAGE-01
- [ ] Export count resets monthly (cron or lazy reset on request) — USAGE-02
- [ ] All Stripe and billing logic lives in src/lib/billing/ — isolated from app routes — BILLING-07
- [ ] Stripe Checkout flow is available for upgrade from Free to Pro or Team — STRIPE-01
- [ ] Stripe billing portal allows org admin to manage subscription — STRIPE-02
- [ ] Webhooks handle: checkout.session.completed, invoice.payment_failed, customer.subscription.deleted — STRIPE-03
- [ ] Collection creation is blocked (with upgrade prompt) when org is at Free-tier collection limit — LIMIT-01
- [ ] Token save is blocked (with upgrade prompt) when org is at Free-tier token limit — LIMIT-02
- [ ] Theme creation is blocked (with upgrade prompt) when org is at Free-tier theme limit — LIMIT-03
- [ ] Export is blocked (with upgrade prompt) when export count or file size limit is reached — LIMIT-04
- [ ] GitHub and Figma integrations are blocked (with upgrade prompt) for Free-tier orgs — LIMIT-05
- [ ] Upgrade modal appears when any limit is hit — UXUP-01
- [ ] Rate limiting: 60 req/min per user on export and token-update endpoints — RATE-01

<!-- Deferred from v1.2/v1.3 -->
- [ ] Tree nodes can be expanded and collapsed (expand/collapse toggle per node) — TREE-05
- [ ] User can add a new group from the tree sidebar (child of any node, or at root level) — TREE-04
- [ ] User can add tokens to the currently selected group inline — CONT-02

## Planned Milestone: v1.6 Multi-Tenant SaaS (roadmap ready, not yet executed)

**Goal:** Convert the app into a multi-org SaaS with configurable free/pro/team tiers enforced at the API layer and paid upgrades via Stripe Checkout.

**Target features:**
- Organization data model — all users and collections scoped by `organizationId`; existing data migrated via `INITIAL_ORG_NAME` env var
- Self-serve org signup — any user creates an org at registration and becomes its Admin
- Configurable tier limits (`LIMITS` config) — Free / Pro / Team tiers with per-org enforcement
- Usage tracking — per-org `exportsThisMonth` + `tokenCount`; lazy monthly reset
- Stripe subscriptions — Checkout flow, billing portal, webhooks
- Upgrade prompts and rate limiting
- Payment code isolation — all Stripe/billing logic in `src/lib/billing/`

## Current Milestone: v1.7 AI Integration

**Goal:** Embed a Claude-powered AI agent in each collection's Tokens page that understands natural language and uses tool calls to create, edit, and delete tokens and groups directly in the app.

**Target features:**
- Per-collection AI chat panel on the Tokens page
- Claude API via Anthropic SDK — provider-agnostic architecture (Claude first, extensible to others)
- Per-user API key stored encrypted in user settings (MongoDB); all AI calls server-side
- AI tool use — agent can call: create/edit/delete tokens, create/rename/delete groups, create themes with suggested token values
- Natural language token queries ("which tokens use #0056D2?")
- Natural language edits ("rename all spacing tokens with sm → small")
- AI-assisted naming: user pastes values, AI suggests canonical token names and group structure
- Tools map directly to existing app API endpoints (AI calls app methods, not raw DB)

### Out of Scope (v1.7)

- Documentation / changelog generation — deferred to v1.8+
- Cross-collection AI queries — per-collection only
- Shared org-level API key — per-user key only
- AI-triggered export to GitHub/Figma — deferred
- Fine-tuned models or custom embeddings — standard chat completions only
- Angular / Stencil / Vite workspaces — excluded

## Context

- **Shipped:** v1.4 on 2026-03-27 — 6 phases (10-15), 21 plans, 8-day build
- **Prior:** v1.3 on 2026-03-19 — 2 phases (8-9), 9 plans, 86 source files changed
- **Prior:** v1.2 phases (5-6) on 2026-03-13 — tree sidebar + breadcrumbs shipped; Phase 7 (Mutations) deferred
- **Prior:** v1.1 on 2026-03-12 — 4 phases, 16 plans, 4-day build
- **Prior:** v1.0 on 2026-02-28 — 7 phases, 23 plans, 3-day build
- **Codebase:** ~27,300 LOC TypeScript; Next.js 13.5.6 + Mongoose + Style Dictionary v5 + JSZip + shadcn/ui (Radix UI) + @dnd-kit/core
- **Component structure:** Feature domain folders: `collections/`, `tokens/`, `layout/`, `figma/`, `github/`, `dev/` — each with `index.ts` barrel exports; new `src/utils/bulkTokenActions.ts` (pure, tested)
- **Brownfield:** Existing tool with GitHub import/export; MongoDB layer added in v1.0; UI modernized and routing restructured in v1.1
- **Monorepo:** Yarn 3 workspaces; Angular, Stencil, Vite variants exist but are out of scope (excluded from root tsconfig)
- **Token format:** W3C Design Token Specification; two structure variants
- **Architecture:** API routes in `src/app/api/`; Mongoose models in `src/lib/db/models/`; UI components in `src/components/[domain]/`; shadcn primitives in `src/components/ui/`; graph components in `src/components/graph/`; collection-scoped routes in `src/app/collections/[id]/`; Themes API at `src/app/api/collections/[id]/themes/`
- **Angular parity doc:** `.planning/ANGULAR_PARITY.md` documents all new API routes and UI patterns for future Angular port
- **Refactor backlog:** `.planning/phases/08-clean-code/REFACTOR-SUGGESTIONS.md` — out-of-scope ideas from Phase 8 SRP audit
- **Clean code ruleset:** `.planning/codebase/CLEAN-CODE.md` — SOLID, separation of concerns, function/component size; baked into CONVENTIONS, ARCHITECTURE, STRUCTURE
- **Build:** Zero TypeScript errors (5 pre-existing in non-critical files); `yarn build` passes cleanly
- **Known issues:** Figma Variables POST API requires Figma Enterprise plan — surfaced in export UI with note

## Graph Design

The Tokens page includes a **visual graph editor** (React Flow) in the right-hand split pane. Users compose pipelines of nodes (Constant, Harmonic, Array, Math, TokenOutput, etc.) that generate design token values and push them into token groups.

**Per-theme, per-group isolation:** Graph state is stored per theme and per group, matching the tokens table:
- **Default:** `collection.graphState` — `Record<groupId, GraphGroupState>`
- **Custom themes:** `theme.graphState` — each theme has its own graph per group; node IDs remapped on theme creation via `remapGraphStateForTheme()`

**Key components:** `TokenGraphPanel` → `GroupStructureGraph` (key includes `activeThemeId` so it remounts on theme change). Unmount flush with `flushImmediate: true` saves the current theme's state before switching. Debounced auto-save persists to the correct theme via `activeThemeIdRef`.

**Documentation:** `documentation/graph-system-summary.md`, `documentation/themes-and-graph-data-model.md`, `documentation/graph-architecture.md`

## Constraints

- **Tech stack:** Next.js 13.5.6 + TypeScript; must not require framework upgrade
- **Database:** MongoDB via Mongoose; connection string via environment variable `MONGODB_URI`
- **Styling:** Tailwind CSS + shadcn/ui (Radix UI primitives) — no additional UI libraries
- **Scope:** Next.js app only — do not touch Angular, Stencil, or Vite workspaces

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| MongoDB as persistence layer | User specified; natural fit for JSON token documents | ✓ Good — Mongoose ODM provided schema validation and convenient model layer |
| Seed from local files once at setup | Keep local `tokens/` as reference without continuous sync | ✓ Good — ts-node + dotenv approach works cleanly |
| Store source config as metadata field (not JSON comment) | Queryable and structured; easier to display in UI | ✓ Good — sourceMetadata used for Figma source context bar |
| userId field nullable in schema | Single-user now, multi-user later — avoids breaking migration | ✓ Good — no friction in v1 |
| Use `TokenGeneratorFormNew` as base | Active component with most features | ✓ Good — saved significant rework |
| Mongoose ODM over native driver | Schema validation + model layer convenience | ✓ Good — used across all API routes |
| Schema.Types.Mixed for tokens field | W3C DTCG format is arbitrary nested JSON | ✓ Good — no issues with arbitrary token structures |
| flattenMongoTokens() inline in page.tsx | Single consumer; avoid premature abstraction | ✓ Good — stayed simple |
| Unified tabbed page (`/`) | Avoid route split between view and generate | ✓ Good (v1.0); superseded by collection-scoped routing in v1.1 |
| FigmaConfig before GitHubConfig in header | Locked decision per CONTEXT.md | ✓ Good — consistent layout |
| Dynamic import of dbConnect in export route | Avoids top-level module coupling | ✓ Good — consistent with Next.js patterns |
| hidden CSS class for tabs (not unmount) | Preserve TokenGeneratorFormNew state across tab switches | ✓ Good — no state loss on tab switch |
| shadcn/ui components manually created | CLI requires interactive input; used canonical source directly | ✓ Good — no hand-rolled implementations, matches shadcn docs |
| shadcn Tabs as UI-only (not TabsContent) | Preserves form state across tab switches | ✓ Good — consistent with v1.0 hidden-tab pattern |
| ATUI Stencil: `next/dynamic` + `ssr:false` | Avoids hydration mismatch in App Router | ✓ Good — established integration pattern for future ATUI adoption |
| `LayoutShell` as 'use client' component | Keeps root layout.tsx as server component (required for metadata export) | ✓ Good — clean server/client boundary |
| `pathname.startsWith('/collections')` in LayoutShell | Suppresses root sidebar for all collection-scoped routes | ✓ Good — clean conditional layout without duplication |
| `CollectionLayoutClient` for collection name fetch | Keeps collection layout.tsx as server component | ✓ Good — proper App Router pattern |
| Per-collection config in MongoDB | Config scoped to collection — no cross-collection leakage | ✓ Good — removes localStorage ambiguity for multi-collection setup |
| `didMountRef` in Settings page | Prevents auto-save firing during initial data load | ✓ Good — avoids overwriting DB data with empty form on mount |
| Exclude sub-workspaces from root tsconfig | Angular/Stencil/Vite TS errors blocked yarn build | ✓ Good — build clean; sub-projects have own TS configs |
| Flat-node rendering for TokenGroupTree | FlatNode[] list, not nested JSX recursion | ✓ Good — simpler to maintain; dynamic indent via inline paddingLeft |
| No expand/collapse in Phase 5 | All nodes always visible; deferred toggle to later milestone | ⚠ Revisit — TREE-05 still open; tree gets long with many groups |
| Background-only highlight for selected node | User decision: bg-gray-200, no left border | ✓ Good — clean minimal styling |
| Recursive group resolution in tokens page | Fast path for top-level, findGroupById fallback for nested | ✓ Good — handles both cases without code duplication |
| Feature domain component folders | collections/, tokens/, layout/, figma/, github/, dev/ each with barrel | ✓ Good — cross-domain imports use absolute @/components/[domain] paths |
| Pure utils in src/utils/ | No React/Next.js imports; framework-agnostic | ✓ Good — parseTokenValue, countTokensRecursive moved cleanly |
| Schema.Types.Mixed for themes array | Same pattern as graphState; avoids TS errors from array notation | ✓ Good — works correctly with default: [] |
| Repository layer bypass for theme mutations | ICollectionRepository lacks $push/$pull; direct TokenCollection import | ✓ Good — pragmatic; GET still uses repository for portability |
| First theme defaults all groups to enabled | Clear onboarding — everything visible on first theme creation | ✓ Good — fixed by guard in 09-04 so only first theme gets this treatment |
| tokenService for path-based group IDs | Canonical group key derivation consistent across all theme operations | ✓ Good — fixed in 09-04; prevents key mismatch bugs |
| Themes nav item: Layers icon between Tokens and Config | Visual metaphor for themes/modes; consistent nav ordering | ✓ Good — clean sidebar layout |
| filteredGroups falls back to masterGroups when no theme active | Preserves "all groups" default; no empty state when theme deselected | ✓ Good — seamless UX |
| Graph state per theme and per group | Matches tokens table isolation; each theme has its own graph nodes and state | ✓ Good — `remapGraphStateForTheme()` on theme creation; flush on unmount |
| GroupStructureGraph key includes activeThemeId | Ensures remount on theme switch; unmount flush saves before sync loads next theme | ✓ Good — no cross-theme state leakage |
| Whole-array `$set: { themes: updatedArray }` for all theme mutations | Positional `$set` on Mixed-typed arrays is unreliable (Mongoose bugs #14595, #12530) | ✓ Good — reliable, no stale sub-document writes |
| `ITheme.tokens` required (not optional) | Backward compat handled solely in `toDoc()` normalization with `?? []`; consuming code stays clean | ✓ Good — clear contract; no defensive nullchecks in consumers |
| Theme count limit (max 10) at POST handler | HTTP 422 before BSON document size becomes a problem; UI surfaces it | ✓ Good — enforced at API level, UI guard redundant-but-friendly |
| Store full `groupTree` as `theme.tokens` | Flat list from `flattenAllGroups` strips children hierarchy needed by Phase 11 | ✓ Good — tree structure preserved for all downstream consumers |
| Cast `.lean()` result through `unknown` | TypeScript strict overlap check rejects direct cast from typed Mongoose document arrays | ✓ Good — pattern documented; standard workaround |
| PATCH `/themes/[themeId]/tokens` whole-array `$set` | Simpler than positional update; source-group 422 guard at root level only | ✓ Good — root-level guard sufficient; children governed by parent |
| mergeThemeTokens pure helper (not in route) | Merge done before calling SD build; route reads themeLabel for comment injection only | ✓ Good — style-dictionary.service.ts stays pure |
| COMMENT_FORMATS excludes JSON | JSON spec forbids comments | ✓ Good — no comment injection in JSON output |
| Figma export always includes ALL enabled themes as modes | Config page theme selector ignored for Figma; multi-mode is Figma's purpose | ✓ Good — correct semantics for Figma Variables |
| applyGroupMove returns `{ groups, themes }` tuple | Callers receive updated tree and theme snapshots atomically | ✓ Good — no split-update bugs |
| DndContext inside overflow-y-auto div | DragOverlay portal renders at body level so ghost is never clipped by sidebar overflow | ✓ Good — ghost displays correctly outside clipping ancestor |
| colorMode non-optional on ITheme with `?? 'light'` at DB read sites | No migration script needed; backward compat at read | ✓ Good — existing themes get light by default without touching DB |
| buildCombinedOutput: only first light+dark pair as primary for Figma | Multiple pairs with different group structures not yet multi-collection (Figma API limitation) | ⚠ Revisit — v2+ when Figma supports multiple collections per export call |
| Dark JS/TS export uses namespace-prefix (e.g. `Dark`) | SD flat model doesn't support nested objects; namespace-prefix is standard SD multi-mode pattern | ✓ Good — consistent with Style Dictionary conventions |
| resolveTokenPathConflict: candidate-2..10 then Date.now() fallback | Mirrors resolveCollisionFreeId from groupMove.ts; consistent collision resolution | ✓ Good — no duplicate path bugs in bulk rename |
| Alias rewrite scoped to within-group tokens only | Cross-group alias rewrite is scope-creep; within-group covers 90% of cases | ✓ Good — clear, predictable behavior |
| jest.config.ts with ts-jest CommonJS override | Next.js tsconfig `bundler` moduleResolution incompatible with Jest | ✓ Good — Jest + TypeScript path aliases work correctly |
| Live prefix editing: base snapshot + original prefix frozen at focus | Always recompute from base — no compounding effect from per-keystroke mutation | ✓ Good — correct result at every keystroke; single Ctrl+Z undo |
| BulkActionBar uses shadcn Menubar as container | Menubar visual style (bordered horizontal bar with shadow) suits floating action bar | ✓ Good — consistent with shadcn component system |
| Prefix control: single input replacing add/remove buttons | Shows current common prefix; editing applies live; no preview list needed (table updates live) | ✓ Good — simpler, more direct UX |

---
*Last updated: 2026-03-31 after v1.7 milestone start*
