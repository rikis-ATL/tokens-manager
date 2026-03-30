# Roadmap: ATUI Tokens Manager

## Milestones

- ✅ **v1.0 MVP** — Phases 1-7 (shipped 2026-02-28)
- ✅ **v1.1 shadcn UI** — Phases 1-4 (shipped 2026-03-12)
- ✅ **v1.2 Token Groups Tree** — Phases 5-6 (shipped 2026-03-13; Phase 7 Mutations deferred)
- ✅ **v1.3 Add Tokens Modes** — Phases 8-9 (shipped 2026-03-19)
- ✅ **v1.4 Theme Token Sets** — Phases 10-15 (shipped 2026-03-27)
- ✅ **v1.5 Org User Management** — Phases 16-21 (shipped 2026-03-29)
- 🚧 **v1.6 Multi-Tenant SaaS** — Phases 22-24 (in progress)

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
- [ ] ~~**Phase 7: Mutations**~~ — *(deferred: add group from tree, add/edit tokens in selected group — moved to v1.5)*

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

### 🚧 v1.6 Multi-Tenant SaaS (In Progress)

**Milestone Goal:** Convert the app into a multi-org SaaS with configurable free/pro/team tiers enforced at the API layer and paid upgrades via Stripe Checkout.

**Branch:** `feature/v1.6-multi-tenant-saas` — all v1.6 work must be done in this branch.

- [ ] **Phase 22: Org Model and Multi-Tenant Foundation** — Organization model, organizationId on User+TokenCollection, JWT extension, idempotent migration bootstrap, assertOrgOwnership() on all collection routes, compound indexes, self-serve org signup
- [ ] **Phase 23: Billing Module and Limit Enforcement** — src/lib/billing/ module skeleton, LIMITS config (tiers.ts), check functions, usage tracking with lazy UTC-month reset, rate limiter (per user ID, never IP), SELF_HOSTED bypass, 402 responses on all capped routes, UpgradeModal
- [ ] **Phase 24: Stripe Checkout and Webhook Integration** — Stripe singleton, checkout session creation, billing portal session, webhook handler (req.text() — CRITICAL), ProcessedWebhookEvent idempotency guard, all three webhook event types, success page session refresh

## Phase Details

### Phase 16: Auth Infrastructure and Security Baseline
**Goal**: Secure foundation is in place — CVE patched, packages installed, Mongoose models defined, authOptions configured with JWT strategy and superadmin enforcement, permissions pure function established
**Depends on**: Phase 15 (v1.4 complete)
**Requirements**: ARCH-01, AUTH-06
**Success Criteria** (what must be TRUE):
  1. `next@13.5.9` is installed and `yarn build` passes with zero TypeScript errors
  2. `User`, `Invite`, and `CollectionPermission` Mongoose models exist in `src/lib/db/models/` with correct schemas
  3. `src/lib/auth/` module exists with `nextauth.config.ts` (authOptions), `permissions.ts` (pure canPerform function), and `invite.ts` (token utility) — no auth code outside this module
  4. JWT and session TypeScript module augmentation compiles and carries `id` and `role` fields at runtime (verified with a live sign-in smoke test)
  5. `SUPER_ADMIN_EMAIL` env var is read in the jwt callback; signing in as that email always produces role=Admin in the JWT regardless of what is stored in the DB
**Plans**: 3 plans

Plans:
- [ ] 16-01-PLAN.md — Patch CVE-2025-29927, install next-auth + bcryptjs, add TypeScript module augmentation
- [ ] 16-02-PLAN.md — Create permissions.ts, invite.ts, and three Mongoose models (User, Invite, CollectionPermission)
- [ ] 16-03-PLAN.md — Create authOptions (nextauth.config.ts), NextAuth route handler, add env vars to .env.local

### Phase 17: Auth API Routes and Sign-In Flow
**Goal**: Users can sign in, stay signed in across refresh, and sign out — the full auth round-trip works end to end
**Depends on**: Phase 16
**Requirements**: AUTH-01, AUTH-03, AUTH-04, AUTH-05
**Success Criteria** (what must be TRUE):
  1. User can navigate to `/auth/sign-in`, enter email and password, and be redirected to the app on success
  2. After signing in, refreshing the browser keeps the user signed in (JWT session persists)
  3. User can sign out from any page and is redirected to `/auth/sign-in`
  4. The first user to complete registration (no other users exist in the DB) is automatically assigned the Admin role
  5. `SessionProvider` and `PermissionsProvider` are wired into `LayoutShell` so session data is available to all client components
**Plans**: 4 plans

Plans:
- [ ] 17-01-PLAN.md — Modify authorize() for specific errors + create /api/auth/setup route (AUTH-01, AUTH-05)
- [ ] 17-02-PLAN.md — PermissionsContext + AuthProviders wrapper + layout.tsx wiring (AUTH-03)
- [ ] 17-03-PLAN.md — /auth/sign-in page + /auth/setup page + UserMenu in OrgHeader (AUTH-01, AUTH-03, AUTH-04, AUTH-05)
- [ ] 17-04-PLAN.md — Human verification of full auth round-trip (checkpoint)

### Phase 18: Middleware and Route Handler Guards
**Goal**: Unauthenticated users are blocked at every entry point — middleware redirects unauthenticated page requests and all 18 write Route Handlers return 401 without a valid session
**Depends on**: Phase 17
**Requirements**: AUTH-02, ARCH-02
**Success Criteria** (what must be TRUE):
  1. Visiting any app page without a session cookie redirects to `/auth/sign-in`
  2. Sending a write request (PUT, POST, PATCH, DELETE) to any existing collection or theme API route without a session cookie returns HTTP 401
  3. A curl request with a crafted `x-middleware-subrequest` header (CVE-2025-29927 exploit vector) does not bypass auth on Next.js 13.5.9
  4. `requireAuth()` utility exists in `src/lib/auth/` and is called at the top of all 18 write Route Handlers
**Plans**: 3 plans

Plans:
- [ ] 18-01-PLAN.md — Create src/middleware.ts (withAuth page protection) and src/lib/auth/require-auth.ts (requireAuth utility)
- [ ] 18-02-PLAN.md — Apply requireAuth() guards to all 17 write Route Handlers; document POST /api/auth/setup exception
- [ ] 18-03-PLAN.md — Human verification of all 4 auth guard scenarios (checkpoint)

### Phase 19: RBAC and Permissions Context
**Goal**: Roles are enforced on all write API routes and available globally in the React tree — every component can check permissions without prop drilling
**Depends on**: Phase 18
**Requirements**: PERM-01, PERM-02, PERM-03, PERM-04, PERM-05, PERM-06
**Success Criteria** (what must be TRUE):
  1. A Viewer session receives HTTP 403 when attempting any write operation (token edit, collection create/delete, GitHub push, Figma push)
  2. An Editor session can perform all write operations except user management (invite, role change, remove user)
  3. An Admin session has unrestricted access to all operations including user management
  4. `usePermissions()` hook is accessible from any client component and returns pre-computed booleans (`canEdit`, `canCreate`, `isAdmin`, `canGitHub`, `canFigma`) without additional props
  5. An Admin can set a per-collection override for a specific user; that override is reflected in the permissions context within 60 seconds without requiring sign-out
  6. All existing MongoDB collections are backfilled to the first Admin user at bootstrap
**Plans**: 6 plans

Plans:
- [ ] 19-01-PLAN.md — Add requireRole() to require-auth.ts, create collection-bootstrap.ts, create /api/collections/[id]/permissions/me endpoint
- [ ] 19-02-PLAN.md — Upgrade collection route handlers to requireRole(); add collection list filtering; create permissions grant/revoke API
- [ ] 19-03-PLAN.md — Upgrade export/import/utility route handlers to requireRole() with org-level action checks
- [ ] 19-04-PLAN.md — Rewrite PermissionsContext.tsx with collection-aware usePermissions() returning named booleans
- [ ] 19-05-PLAN.md — Build verification, curl tests, and human sign-off checkpoint
- [ ] 19-06-PLAN.md — Gap closure: add requireRole(Action.PushGithub) to GET /api/github/branches handler

### Phase 20: Email Invite Flow and Account Setup
**Goal**: An Admin can invite a new user by email; the invited user receives a link, sets their display name and password, and gains access — pending invites are visible with expiry status
**Depends on**: Phase 19
**Requirements**: USER-02, USER-03, USER-04, USER-07
**Success Criteria** (what must be TRUE):
  1. Admin can enter an email address and role, submit the invite form, and a Resend email is delivered to that address containing a unique setup link
  2. Clicking the setup link opens an account setup page where the invited user can enter their display name and password
  3. After completing account setup, the invited user is signed in and can access the app with their assigned role
  4. The invite link is single-use (clicking it a second time after account setup returns an error page)
  5. Pending invitations appear in the org users list with an expiry badge showing whether the invite is active or expired
**Plans**: 4 plans

Plans:
- [x] 20-01-PLAN.md — Invite model + email utility + all invite API routes (POST/GET/DELETE/resend/validate)
- [ ] 20-02-PLAN.md — POST /api/auth/invite-setup handler + /auth/invite-setup page
- [ ] 20-03-PLAN.md — /org/users page + InviteModal + OrgSidebar/LayoutShell/middleware plumbing
- [ ] 20-04-PLAN.md — Human verification of complete invite flow end-to-end

### Phase 21: Org Users Admin UI and Permission-Gated UI
**Goal**: Admin can manage all org members from a dedicated page, and write controls in existing collection UI are hidden for users who cannot perform those actions
**Depends on**: Phase 20
**Requirements**: USER-01, USER-05, USER-06, UI-01, UI-02, UI-03, UI-04
**Success Criteria** (what must be TRUE):
  1. Admin can navigate to `/org/users` and see a table of all org members with their name, email, role, and status (active / pending invite)
  2. Admin can change any non-superadmin user's org-level role using a role selector; the change takes effect within 60 seconds for the affected user without requiring sign-out
  3. Admin can remove any non-superadmin user from the org; removed users are immediately redirected to sign-in on their next request
  4. Token table edit fields and bulk action controls are visible but non-interactive (disabled) for users with read-only access on the active collection
  5. The create-collection button and flow are not visible to Viewer users
  6. GitHub push/pull controls are not visible to Viewer users
  7. Figma push/pull controls are not visible to Viewer users
**Plans**: 5 plans

Plans:
- [ ] 21-01-PLAN.md — JWT role propagation: extend jwt callback with roleLastFetched + 60s DB re-fetch
- [ ] 21-02-PLAN.md — Org users API routes: GET /api/org/users, PATCH /api/org/users/[id]/role, DELETE /api/org/users/[id]
- [ ] 21-03-PLAN.md — Permission-gated UI: hide New Collection for Viewers; hide GitHub/Figma items; wire canEdit to TokenGeneratorForm
- [ ] 21-04-PLAN.md — Extend /org/users page with active members section, inline role selector, and remove confirmation
- [x] 21-05-PLAN.md — Human verification of all 7 Phase 21 success criteria (completed 2026-03-29)

### Phase 22: Org Model and Multi-Tenant Foundation
**Goal**: Every user and collection belongs to an organization — the data model is scoped, existing data is migrated, and all collection routes enforce org ownership before any billing work begins
**Depends on**: Phase 21
**Requirements**: TENANT-01, TENANT-02, TENANT-03
**Success Criteria** (what must be TRUE):
  1. Every `TokenCollection` and `User` document in the database has an `organizationId` field; a boot-time assertion aborts startup if any unscoped document remains
  2. A new user registering via the sign-up flow creates an organization atomically, is assigned Admin for that org, and has `organizationId` embedded in their JWT session at first sign-in
  3. Any API request that references a collection by ID returns 404 (not 403) if the collection does not belong to the requesting user's org — cross-tenant resource enumeration is not possible
  4. Compound `{ _id, organizationId }` indexes exist on `User` and `TokenCollection`; collection list queries include an `organizationId` filter visible in MongoDB explain output
**Plans**: TBD

### Phase 23: Billing Module and Limit Enforcement
**Goal**: Every write operation is gated by tier limits defined in a single config — Free-tier orgs cannot exceed their caps, usage is tracked atomically, rate limiting is enforced per user, and the upgrade modal surfaces the correct context when any limit is hit
**Depends on**: Phase 22
**Requirements**: BILLING-01, BILLING-02, BILLING-03, BILLING-04, BILLING-05, BILLING-06, BILLING-07, USAGE-01, USAGE-02, LIMIT-01, LIMIT-02, LIMIT-03, LIMIT-04, LIMIT-05, UXUP-01, RATE-01
**Success Criteria** (what must be TRUE):
  1. A Free-tier org attempting to create a second collection, a second theme, a token write that would exceed 500 tokens, an 11th export, or a GitHub/Figma integration call receives HTTP 402 with a structured `{ limitType, current, limit, upgradePlans }` payload; no limit values are hardcoded in any route handler
  2. Export count resets automatically on the first export request after a UTC month boundary without any cron job — verified by manipulating `usageResetAt` in the database and confirming the counter resets before the limit check proceeds
  3. When `SELF_HOSTED=true` is set server-side, all limit check functions return `{ allowed: true }` immediately and the Stripe SDK is never imported or initialized
  4. Export and token-update endpoints reject a user who sends more than 60 requests within a 60-second window with HTTP 429; the rate limit key is `session.user.id` (verified by inspecting the limiter key, never the client IP)
  5. The `UpgradeModal` appears automatically when any 402 response is received; it displays the limit type, current usage vs. cap, and a CTA button that initiates an upgrade flow
**Plans**: TBD
**UI hint**: yes

### Phase 24: Stripe Checkout and Webhook Integration
**Goal**: An org Admin can upgrade to Pro or Team via Stripe Checkout and manage their subscription via the billing portal — plan changes are applied reliably via webhook with full idempotency
**Depends on**: Phase 23
**Requirements**: STRIPE-01, STRIPE-02, STRIPE-03
**Success Criteria** (what must be TRUE):
  1. An org Admin clicking "Upgrade to Pro" is redirected to a Stripe-hosted Checkout page; completing payment redirects back to the app where the session is refreshed and the org plan reads "pro" immediately
  2. An org Admin clicking "Manage Billing" is redirected to the Stripe billing portal where they can cancel, update payment method, or view invoices — returning to the app reflects any plan changes
  3. Sending a test `checkout.session.completed` webhook event to `POST /api/billing/webhooks` updates the org's `plan` and stores `stripeCustomerId`; sending the same event ID a second time returns 200 without re-processing (idempotency guard confirmed via `ProcessedWebhookEvent` collection)
  4. A test `invoice.payment_failed` event sets the org's `subscriptionStatus` to `"past_due"`; a test `customer.subscription.deleted` event reverts the org to `plan: "free"` — both verified against the database
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Database Foundation | v1.0 | 3/3 | Complete | 2026-02-25 |
| 2. View Integration | v1.0 | 2/2 | Complete | 2026-02-25 |
| 3. Generator Form | v1.0 | 4/4 | Complete | 2026-02-26 |
| 4. Collection Management | v1.0 | 3/3 | Complete | 2026-02-26 |
| 5. Export Style Dictionary | v1.0 | 2/2 | Complete | 2026-02-26 |
| 6. Collection UX Improvements | v1.0 | 2/3 | Complete | 2026-02-28 |
| 7. Fix Figma Integration | v1.0 | 6/6 | Complete | 2026-02-28 |
| 1. shadcn UI Components | v1.1 | 5/5 | Complete | 2026-03-09 |
| 2. Test ATUI Component Library | v1.1 | 1/1 | Complete | 2026-03-01 |
| 3. App Layout UX | v1.1 | 4/4 | Complete | 2026-03-11 |
| 4. Collection Management (grid + routing + config) | v1.1 | 6/6 | Complete | 2026-03-12 |
| 5. Tree Data Model | v1.2 | 2/2 | Complete | 2026-03-13 |
| 6. Selection + Breadcrumbs + Content Scoping | v1.2 | 3/3 | Complete | 2026-03-13 |
| 8. Clean Code | v1.3 | 5/5 | Complete | 2026-03-16 |
| 9. Add Tokens Modes | v1.3 | 4/4 | Complete | 2026-03-19 |
| 10. Data Model Foundation | v1.4 | 2/2 | Complete | 2026-03-19 |
| 11. Inline Token Editing UI | v1.4 | 3/3 | Complete | 2026-03-19 |
| 12. Theme-Aware Export | v1.4 | 4/4 | Complete | 2026-03-20 |
| 13. Groups Ordering Drag and Drop | v1.4 | 3/3 | Complete | 2026-03-21 |
| 14. Dark Mode Support | v1.4 | 5/5 | Complete | 2026-03-26 |
| 15. Multi-Row Actions | v1.4 | 4/4 | Complete | 2026-03-27 |
| 16. Auth Infrastructure and Security Baseline | v1.5 | 3/3 | Complete | 2026-03-28 |
| 17. Auth API Routes and Sign-In Flow | v1.5 | 4/4 | Complete | 2026-03-28 |
| 18. Middleware and Route Handler Guards | v1.5 | 3/3 | Complete | 2026-03-28 |
| 19. RBAC and Permissions Context | v1.5 | 6/6 | Complete | 2026-03-28 |
| 20. Email Invite Flow and Account Setup | v1.5 | 4/4 | Complete | 2026-03-28 |
| 21. Org Users Admin UI and Permission-Gated UI | v1.5 | 5/5 | Complete | 2026-03-29 |
| 22. Org Model and Multi-Tenant Foundation | v1.6 | 0/TBD | Not started | - |
| 23. Billing Module and Limit Enforcement | v1.6 | 0/TBD | Not started | - |
| 24. Stripe Checkout and Webhook Integration | v1.6 | 0/TBD | Not started | - |
