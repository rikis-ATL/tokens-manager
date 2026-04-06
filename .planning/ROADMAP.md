# Roadmap: ATUI Tokens Manager

## Milestones

- ✅ **v1.0 MVP** — Phases 1-7 (shipped 2026-02-28)
- ✅ **v1.1 shadcn UI** — Phases 1-4 (shipped 2026-03-12)
- ✅ **v1.2 Token Groups Tree** — Phases 5-6 (shipped 2026-03-13; Phase 7 Mutations deferred)
- ✅ **v1.3 Add Tokens Modes** — Phases 8-9 (shipped 2026-03-19)
- ✅ **v1.4 Theme Token Sets** — Phases 10-15 (shipped 2026-03-27)
- ✅ **v1.5 Org User Management** — Phases 16-21 (shipped 2026-03-29)
- ⏸ **v1.6 Multi-Tenant SaaS** — Phases 22-24 (deferred — resume after v1.8)
- ✅ **v1.7 AI Integration** — Phases 25-28 (shipped 2026-04-06; known gaps — see milestones/v1.7-ROADMAP.md)

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

### ⏸ v1.6 Multi-Tenant SaaS (Deferred — resumes after v1.8)

**Milestone Goal:** Convert the app into a multi-org SaaS with configurable free/pro/team tiers enforced at the API layer and paid upgrades via Stripe Checkout.

**Branch:** `feature/v1.6-multi-tenant-saas` — all v1.6 work must be done in this branch.

- [ ] **Phase 22: Org Model and Multi-Tenant Foundation** — Organization model, organizationId on User+TokenCollection, JWT extension, idempotent migration bootstrap, assertOrgOwnership() on all collection routes, compound indexes, self-serve org signup
- [ ] **Phase 23: Billing Module and Limit Enforcement** — src/lib/billing/ module skeleton, LIMITS config (tiers.ts), check functions, usage tracking with lazy UTC-month reset, rate limiter (per user ID, never IP), SELF_HOSTED bypass, 402 responses on all capped routes, UpgradeModal
- [ ] **Phase 24: Stripe Checkout and Webhook Integration** — Stripe singleton, checkout session creation, billing portal session, webhook handler (req.text() — CRITICAL), ProcessedWebhookEvent idempotency guard, all three webhook event types, success page session refresh
