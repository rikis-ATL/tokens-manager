# Roadmap: ATUI Tokens Manager

## Milestones

- ✅ **v1.0 MVP** — Phases 1-7 (shipped 2026-02-28)
- ✅ **v1.1 shadcn UI** — Phases 1-4 (shipped 2026-03-12)
- ✅ **v1.2 Token Groups Tree** — Phases 5-6 (shipped 2026-03-13; Phase 7 Mutations deferred)
- ✅ **v1.3 Add Tokens Modes** — Phases 8-9 (shipped 2026-03-19)
- ✅ **v1.4 Theme Token Sets** — Phases 10-15 (shipped 2026-03-27)
- ✅ **v1.5 Org User Management** — Phases 16-21 (shipped 2026-03-29)
- 🔜 **v1.6 Multi-Tenant SaaS** — Phases 22-24 (next — begins after v1.9)
- ✅ **v1.7 AI Integration** — Phases 25-28 (shipped 2026-04-06; known gaps — see milestones/v1.7-ROADMAP.md)
- ✅ **v1.8 AI Fix + Completion** — Phase 29 (shipped 2026-04-08)
- 🔄 **v1.9 AI Completion + MCP Alignment** — Phases 30-32 (active)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-7) — SHIPPED 2026-02-28</summary>

- [x] **Phase 1: Database Foundation** — MongoDB connection, Mongoose schema, seed script
- [x] **Phase 2: View Integration** — Browse and display collections from MongoDB
- [x] **Phase 3: Generator Form** — Save/load/update/dirty-flag cycle
- [x] **Phase 4: Collection Management** — Delete, rename, duplicate actions
- [x] **Phase 5: Export Style Dictionary** — Build pipeline + ZIP download
- [x] **Phase 6: Collection UX Improvements** — UX polish across collection flows
- [x] **Phase 7: Fix Figma Integration** — Figma import/export, proxy routes, source context bar

See: `.planning/milestones/v1.0-ROADMAP.md` for full phase details.

</details>

<details>
<summary>✅ v1.1 shadcn UI (Phases 1-4) — SHIPPED 2026-03-12</summary>

- [x] **Phase 1: shadcn UI + Color Pickers** — All UI migrated to shadcn/ui, color pickers
- [x] **Phase 2: Test ATUI Component Library** — ATUI Stencil integration pattern established
- [x] **Phase 3: App Layout UX** — Persistent sidebar, scoped pages, collection-scoped routing
- [x] **Phase 4: Collection Management** — Card grid, CRUD, per-collection config persistence

See: `.planning/milestones/v1.1-ROADMAP.md` for full phase details.

</details>

<details>
<summary>✅ v1.2 Token Groups Tree (Phases 5-6) — SHIPPED 2026-03-13</summary>

- [x] **Phase 5: Tree Data Model** — Parse group path names into `TokenGroup[]` tree; render collapsible nodes in sidebar
- [x] **Phase 6: Selection + Breadcrumbs + Content Scoping** — Node selection drives breadcrumbs; content scoped to selected group's direct tokens

See: `.planning/milestones/v1.3-ROADMAP.md` for archived phase details.

</details>

<details>
<summary>✅ v1.3 Add Tokens Modes (Phases 8-9) — SHIPPED 2026-03-19</summary>

- [x] **Phase 8: Clean Code** — Dead code removal, TS errors fixed, component domain reorganization, SRP extraction, e2e verified
- [x] **Phase 9: Add Tokens Modes** — Themes data model + CRUD API, Themes page UI, Themes nav + token page theme selector, e2e verified

See: `.planning/milestones/v1.3-ROADMAP.md` for full phase details.

</details>

<details>
<summary>✅ v1.4 Theme Token Sets (Phases 10-15) — SHIPPED 2026-03-27</summary>

- [x] **Phase 10: Data Model Foundation** — Extend ITheme with embedded tokens, deep-copy on creation, migration script, theme count guard (completed 2026-03-19)
- [x] **Phase 11: Inline Token Editing UI** — PATCH API endpoint + theme token overlay, group-state-aware save routing, override indicator (completed 2026-03-19)
- [x] **Phase 12: Theme-Aware Export** — Config page theme selector, SD export uses theme tokens, Figma export generates one mode per enabled theme (completed 2026-03-20)
- [x] **Phase 13: Groups Ordering Drag and Drop** — @dnd-kit sidebar tree, sibling reorder + reparent, MongoDB persist, theme cascade, undo stack (completed 2026-03-21)
- [x] **Phase 14: Dark Mode Support** — colorMode field + badge UI, combined CSS export, Figma Light/Dark mode pairing (completed 2026-03-26)
- [x] **Phase 15: Multi-Row Actions** — Always-visible checkboxes, floating Menubar action bar, bulk delete/move/change-type/prefix with live editing and undo (completed 2026-03-27)

See: `.planning/milestones/v1.4-ROADMAP.md` for full phase details.

</details>

<details>
<summary>✅ v1.5 Org User Management (Phases 16-21) — SHIPPED 2026-03-29</summary>

- [x] **Phase 16: Auth Infrastructure and Security Baseline** — Patch CVE-2025-29927, install packages, Mongoose models, authOptions, permissions pure function (completed 2026-03-28)
- [x] **Phase 17: Auth API Routes and Sign-In Flow** — NextAuth route handler, first-user bootstrap, sign-in and sign-out pages, SessionProvider wiring (completed 2026-03-28)
- [x] **Phase 18: Middleware and Route Handler Guards** — withAuth middleware, requireAuth() utility, all 18 existing write Route Handlers guarded (completed 2026-03-28)
- [x] **Phase 19: RBAC and Permissions Context** — PermissionsProvider, usePermissions() hook, role enforcement on write routes, JWT role re-fetch, per-collection overrides (completed 2026-03-28)
- [x] **Phase 20: Email Invite Flow and Account Setup** — Resend invite email, invite token generation, account setup page, invite management (completed 2026-03-28)
- [x] **Phase 21: Org Users Admin UI and Permission-Gated UI** — /org/users admin page, role change and removal API, write controls hidden for Viewer (completed 2026-03-29)

</details>

<details>
<summary>✅ v1.7 AI Integration (Phases 25-28) — SHIPPED 2026-04-06</summary>

- [x] **Phase 25: Enhance Read-Only View of Token Collections** — Style Guide tab with per-type token previews (color palette, spacing bars, typography, shadow, border-radius) (completed 2026-04-03)
- [x] **Phase 26: AI Service Layer Foundation** — Provider-agnostic AI service, ClaudeProvider + Anthropic SDK, AES-256-GCM encrypted per-user API key, MCP server, server-side chat proxy (completed 2026-04-03)
- [x] **Phase 27: AI Chat Panel UI** — Absorbed into Phase 28; AIChatPanel slide-over wired to Tokens page header (completed 2026-04-06)
- [x] **Phase 28: AI Tool Use — Token and Group CRUD** — Tool definitions + HTTP-based handler map, token/group CRUD API endpoints, Anthropic SDK tool use loop wired end-to-end (completed 2026-04-06; AI feature disabled pending bug fix — see v1.8)

**Known gaps:** Phase 29 (AI-Assisted Naming and Queries) deferred to v1.8. AI chat disabled due to bug (chat clears tokens table). See `.planning/milestones/v1.7-ROADMAP.md` for full audit.

</details>

<details>
<summary>✅ v1.8 AI Fix + Completion (Phase 29) — SHIPPED 2026-04-08</summary>

- [x] **Phase 29: Fix AI Chat + Verify Phase 28** — BUG-01 fixed; AI chat panel re-enabled; Phase 28 tool-use behavior verified by human (completed 2026-04-08)

</details>

### 🔜 v1.6 Multi-Tenant SaaS (Next — begins after v1.9)

**Milestone Goal:** Convert the app into a multi-org SaaS with configurable free/pro/team tiers enforced at the API layer and paid upgrades via Stripe Checkout.

- [ ] **Phase 22: Org Model and Multi-Tenant Foundation** — Organization model, organizationId on User+TokenCollection, JWT extension, idempotent migration bootstrap, assertOrgOwnership() on all collection routes, compound indexes, self-serve org signup
- [ ] **Phase 23: Billing Module and Limit Enforcement** — src/lib/billing/ module skeleton, LIMITS config (tiers.ts), check functions, usage tracking with lazy UTC-month reset, rate limiter (per user ID, never IP), SELF_HOSTED bypass, 402 responses on all capped routes, UpgradeModal
- [ ] **Phase 24: Stripe Checkout and Webhook Integration** — Stripe singleton, checkout session creation, billing portal session, webhook handler (req.text() — CRITICAL), ProcessedWebhookEvent idempotency guard, all three webhook event types, success page session refresh

### Phase 22: Org Model and Multi-Tenant Foundation
**Goal**: Add a first-class Organization model so every user and collection is scoped to an org, with a self-serve signup flow and full API-layer ownership enforcement.
**Depends on**: Phase 21 (Org User Management)
**Requirements**: TENANT-01, TENANT-02, TENANT-03
**Success Criteria** (what must be TRUE):
  1. Every TokenCollection and User document has an `organizationId` field enforced at the API layer via `assertOrgOwnership()` (TENANT-01)
  2. A new user can create an organization during self-serve signup without admin intervention (TENANT-02)
  3. Existing single-tenant data is migrated to a seeded org on first boot via idempotent migration bootstrap (TENANT-03)
  4. Compound indexes on `(organizationId, _id)` exist on User and TokenCollection collections
  5. JWT tokens include `organizationId` claim and all route handlers validate it
**Plans**: 4 plans
- [ ] 22-01-PLAN.md — Organization model + User/TokenCollection schemas with required organizationId + compound indexes (D-01, D-02, D-14)
- [ ] 22-02-PLAN.md — JWT organizationId claim, demo session extension, assertOrgOwnership() utility (D-06, D-07, D-09, D-10)
- [ ] 22-03-PLAN.md — Self-serve signup flow: POST /api/auth/signup + /auth/signup page with atomic Org+User creation (D-03, D-04)
- [ ] 22-04-PLAN.md — scripts/migrate-to-org.ts idempotent back-fill + GET /api/collections org-scoping (D-11, D-12, D-13 + TENANT-01 closure)

### Phase 23: Billing Module and Limit Enforcement
**Goal**: Enforce configurable free/pro/team tier limits at the API layer with 402 responses and an in-app upgrade prompt.
**Depends on**: Phase 22
**Requirements**: BILLING-01, BILLING-07, LIMIT-01, LIMIT-05, RATE-01
**Success Criteria** (what must be TRUE):
  1. `src/lib/billing/tiers.ts` defines LIMITS config for free/pro/team tiers and is the single source of truth
  2. All capped API routes respond 402 with a structured error when the org exceeds its tier limit
  3. Usage tracking resets lazily on UTC-month boundary — no cron job required
  4. Rate limiter enforces per-user-ID limits on export and token-update endpoints (never per-IP)
  5. `SELF_HOSTED=true` env var bypasses all limit checks
  6. UpgradeModal surfaces in the UI when a 402 is received
**Plans**: TBD

### Phase 24: Stripe Checkout and Webhook Integration
**Goal**: Wire Stripe Checkout for plan upgrades and a webhook handler to keep org billing state in sync.
**Depends on**: Phase 23
**Requirements**: STRIPE-01, STRIPE-02, STRIPE-03
**Success Criteria** (what must be TRUE):
  1. User can initiate a Stripe Checkout session from the UpgradeModal and complete a plan upgrade
  2. Billing portal session creation allows users to manage their subscription
  3. Webhook handler uses `req.text()` (not `req.json()`) for Stripe signature verification — CRITICAL
  4. `ProcessedWebhookEvent` idempotency guard prevents duplicate processing
  5. All three webhook event types handled: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
  6. Successful checkout triggers a session refresh so the UI reflects the new tier immediately
**Plans**: TBD

### 🔄 v1.9 AI Completion + MCP Alignment (Active)

**Milestone Goal:** Complete the AI feature set, verify the Style Guide, and unify MCP and in-app chat behind a shared tool service layer.

- [ ] **Phase 30: AI-Assisted Naming and Queries** — AI theme creation, natural language token queries and bulk edits, canonical naming suggestions
- [x] **Phase 31: Style Guide Verification** — Browser verification of Phase 25 Style Guide tab; fix any regressions or nyquist coverage gaps (completed 2026-04-09)
- [ ] **Phase 32: MCP Tool Service Layer** — Extract shared token/group/theme service functions; add theme mutation tools to MCP server

## Phase Details

### Phase 30: AI-Assisted Naming and Queries
**Goal**: Users can leverage AI to create themes with suggested values, query tokens in natural language, request bulk edits via natural language, and receive canonical naming suggestions for pasted token values
**Depends on**: Phase 29
**Requirements**: AI-11, AI-12, AI-13, AI-14
**Success Criteria** (what must be TRUE):
  1. User can ask the AI to create a new theme and the theme is created with AI-suggested token values populated (AI-11)
  2. User can type a natural language query ("which tokens use #0056D2?") and receive a correct, complete result from the AI (AI-12)
  3. User can request a natural language bulk edit ("rename all sm spacing tokens to small") and the tokens table updates accordingly without error (AI-13)
  4. User can paste raw token values into the chat and the AI responds with suggested canonical names and group structure (AI-14)
**Plans**: 3 plans
Plans:
- [ ] 30-01-PLAN.md — System prompt fix (theme-aware tokens, query/naming guidance) + AIChatPanel text
- [ ] 30-02-PLAN.md — rename_prefix tool (bulkReplacePrefix + API endpoints + tool wiring)
- [ ] 30-03-PLAN.md — Theme creation tools (create_theme, update_theme_token, delete_theme_token + endpoint + human verify)
**UI hint**: yes

### Phase 31: Style Guide Verification
**Goal**: Phase 25 (Style Guide tab) is fully verified in the browser with no regressions and nyquist coverage in place
**Depends on**: Phase 25 (completed in v1.7)
**Requirements**: VERIFY-25
**Success Criteria** (what must be TRUE):
  1. All browser verification steps from the Phase 25 test guide pass without errors or visual regressions
  2. StyleGuidePanel renders correct previews for all token types (color, spacing, typography, shadow, border-radius) in a real browser session
  3. Any regressions or nyquist coverage gaps discovered during verification are fixed and re-verified before the phase is signed off
**Plans**: 3 plans
Plans:
- [x] 31-01-PLAN.md — Run automated test baseline (Jest/RTL for Style Guide components + filterGroupsForActiveTheme)
- [x] 31-02-PLAN.md — Create browser verification checklist (8 items from D-05 covering all token types, themes, disabled groups)
- [x] 31-03-PLAN.md — Browser verification session + HUMAN-UAT.md documentation (human-verify checkpoint)

### Phase 32: MCP Tool Service Layer
**Goal**: Extract shared token/group/theme service functions used by both the MCP server and the in-app HTTP tool handlers; add theme mutation tools to the MCP server for feature parity with in-app chat
**Depends on**: Phase 28 (AI tool use), Phase 29 (AI chat fix)
**Requirements**: MCP-01, MCP-02
**Success Criteria** (what must be TRUE):
  1. Token, group, and theme mutation logic lives in shared service modules with no duplicate implementation between the MCP server and the in-app HTTP tool handlers (MCP-01)
  2. A code-level audit confirms the MCP server and in-app handlers call the same underlying service functions for every shared operation (MCP-01)
  3. MCP server exposes create-theme, update-theme, and delete-theme tools that a Claude Desktop session can invoke successfully (MCP-02)
  4. MCP theme tools produce the same database outcomes as their in-app chat equivalents (MCP-02)
**Plans**: TBD

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 22. Org Model and Multi-Tenant Foundation | 0/? | Not started | - |
| 23. Billing Module and Limit Enforcement | 0/? | Not started | - |
| 24. Stripe Checkout and Webhook Integration | 0/? | Not started | - |
| 30. AI-Assisted Naming and Queries | 0/3 | Not started | - |
| 31. Style Guide Verification | 3/3 | Complete   | 2026-04-09 |
| 32. MCP Tool Service Layer | 0/? | Not started | - |

### Phase 1: review math node features

**Goal:** Verify and complete the Math node Expression mode — unit tests, UI error feedback on invalid expressions, graphTokenPaths resolver wiring, and browser-verified end-to-end
**Requirements**: PHASE1-TEST, PHASE1-UI-ERROR, PHASE1-GRAPHPATHS, PHASE1-VERIFY
**Depends on:** Phase 0
**Plans:** 4 plans

Plans:
- [x] 01-01-PLAN.md — Jest unit tests for evaluateExpression (D-06, D-07)
- [x] 01-02-PLAN.md — Invalid-expression error feedback on MathNode (red border + message on blur; D-03, D-04, D-05)
- [x] 01-03-PLAN.md — graphTokenPaths resolveTokenReference plumbing (D-08)
- [x] 01-04-PLAN.md — Browser UAT + phase commit (D-01, D-02)

## Backlog

### Phase 999.2: Versioning and NPM publish (BACKLOG)

**Goal:** Immutable semver snapshots of each token collection (default tokens + `graphState` + all themes) with list/detail/restore; publish Style Dictionary outputs to a user-configured npm registry (or GitHub Packages) from the GUI with per-collection encrypted NPM token and package identity.

**Requirements:** VERSION-01 (snapshots + restore), NPM-01 (publish + registry auth) — formal REQ IDs at promotion  
**Plans:** 1 plan (`999.2-PLAN.md`)

Plans:
- [ ] [999.2-PLAN.md](phases/999.2-versioning-and-npm-publish/999.2-PLAN.md) — Versions API + NPM publish service + Settings/Versions UI (promote with /gsd-review-backlog when ready)

### Phase 999.1: CSS/HTML pattern token types (BACKLOG)

**Goal:** Extend the app with **non–W3C-design-token** types used as **CSS/HTML pattern storage** alongside existing tokens: (1) **CSS class** — table type + dedicated graph node; stores CSS class patterns. (2) **HTML template** — tokenized HTML that may reference CSS classes or variables inline. (3) **HTML/CSS component** — combined model: CSS and HTML held as structured string fields (object shape TBD at planning time), previewed in a **minimal third-party sandbox** (e.g. iframe with strict isolation). Official export pipelines may treat these as out-of-band or separate artifacts — decide at promotion.

**Problem / motivation:** Linear text editing of HTML/CSS/JS makes structure and relationships hard to see; future work may explore **visual, navigable** representations (e.g. block-oriented HTML, library-style CSS) — **not** in scope for this backlog item until promoted and scoped.

**Requirements:** TBD (promote to milestone and add REQ-* IDs as needed)
**Plans:** 3 plans

Plans:
- [ ] [999.1-01-PLAN.md](phases/999.1-css-html-pattern-token-types/999.1-01-PLAN.md) — Token types + `PatternTokenValue` + table editors
- [ ] [999.1-02-PLAN.md](phases/999.1-css-html-pattern-token-types/999.1-02-PLAN.md) — Graph `patternCss` / `patternHtml` nodes + evaluator + Token Output wiring
- [ ] [999.1-03-PLAN.md](phases/999.1-css-html-pattern-token-types/999.1-03-PLAN.md) — SD strip + non-exported badge + tests
