# Phase 22: Org Model and Multi-Tenant Foundation - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a first-class Organization model so every User and TokenCollection is scoped to an org, with a self-serve signup flow, JWT extension, and full API-layer ownership enforcement via `assertOrgOwnership()`. Creating new orgs starts fresh — no data migration needed for new orgs. Existing single-tenant data (super admin's user + collections) is migrated via a committed one-off utility script.

</domain>

<decisions>
## Implementation Decisions

### Organization Model
- **D-01:** Minimal schema — `name` (String, required), `createdAt`, `updatedAt` (via timestamps). No slug, ownerId, or planTier yet — planTier added in Phase 23 when billing module exists.
- **D-02:** `organizationId` on User and TokenCollection schemas is `required: true`. Migration script back-fills existing docs before this constraint is enforced in production.

### Self-Serve Signup Flow
- **D-03:** New dedicated `/signup` page — not an extension of `/api/auth/setup`. Anyone can create an org by signing up.
- **D-04:** Signup form collects four fields: org name, display name, email, password. Creates Organization first, then creates User as Admin scoped to that org.
- **D-05:** Existing `/api/auth/setup` bootstrap remains unchanged — it is the fallback for the very first system admin only (no org concept in that flow).

### assertOrgOwnership()
- **D-06:** Standalone function called *after* `requireAuth()` in route handlers — does not modify or replace `requireAuth()`. Explicit, composable, follows existing pattern.
- **D-07:** Signature: `assertOrgOwnership(session: Session, collectionId: string): Promise<NextResponse | null>` — returns `null` on success (caller continues), `NextResponse 403` on org mismatch.
- **D-08:** Must be applied to all collection routes: `GET/PUT /api/collections/[id]`, themes CRUD, export, Figma, GitHub routes.

### JWT Extension
- **D-09:** `organizationId` is stored in the JWT token alongside `id`, `role`, `name`. Added in the `jwt` callback in `nextauth.config.ts` at initial sign-in. `assertOrgOwnership()` reads it from `session.user.organizationId` — no DB hit per request.
- **D-10:** Demo mode session (`getDemoUserSession()`) returns `organizationId` from `DEMO_ORG_ID` env var so `assertOrgOwnership()` passes for demo collections.

### Migration Approach
- **D-11:** No runtime migration code in the app. Migration is a committed one-off utility script at `scripts/migrate-to-org.ts`.
- **D-12:** Script creates one Organization document (name from `INITIAL_ORG_NAME` env var), then back-fills `organizationId` on all existing User docs and TokenCollection docs. Outputs the seeded org `_id` so it can be set as `DEMO_ORG_ID` in `.env`.
- **D-13:** Script is idempotent via a simple guard: if `Organization.countDocuments() > 0`, skip and exit. Run once, then forget.

### Compound Indexes
- **D-14:** Add compound indexes `(organizationId, _id)` on User and TokenCollection collections as specified in success criteria.

### Claude's Discretion
- API route for org creation during signup (likely `POST /api/orgs` or handled inline in `POST /api/auth/signup`)
- Whether signup API route is a new `/api/auth/signup` or `/api/orgs/create`
- Exact error messages for 403 responses from `assertOrgOwnership()`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — TENANT-01, TENANT-02, TENANT-03 requirements (organizationId enforcement, self-serve signup, data migration)

### Existing Auth Patterns
- `src/lib/auth/require-auth.ts` — `requireAuth()` pattern that `assertOrgOwnership()` must compose with
- `src/lib/auth/nextauth.config.ts` — JWT callback where `organizationId` must be added
- `src/lib/auth/demo-session.ts` — Demo session that must return `organizationId` from `DEMO_ORG_ID` env var

### Existing Models (to be extended)
- `src/lib/db/models/User.ts` — Add `organizationId` field
- `src/lib/db/models/TokenCollection.ts` — Add `organizationId` field

### Existing Bootstrap Route (reference only — do not modify)
- `src/app/api/auth/setup/route.ts` — First-admin bootstrap; stays unchanged in this phase

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `requireAuth()` in `src/lib/auth/require-auth.ts` — Call this first; `assertOrgOwnership()` receives the returned session
- `requireRole()` in `src/lib/auth/require-auth.ts` — Pattern reference for how ownership functions compose
- Existing User and TokenCollection Mongoose models — extend with `organizationId`, add compound indexes
- `getDemoUserSession()` in `src/lib/auth/demo-session.ts` — Extend to include `organizationId` from `DEMO_ORG_ID`

### Established Patterns
- JWT carries `id`, `role`, `name`, `roleLastFetched` — add `organizationId` in the same `jwt` callback pattern
- Route handlers follow: `requireAuth()` → business logic. New pattern: `requireAuth()` → `assertOrgOwnership()` → business logic
- Mongoose model guard pattern: `(mongoose.models.X as Model<XDoc>) || mongoose.model<XDoc>('X', schema)` — use for new Organization model

### Integration Points
- All 17 guarded collection route handlers need `assertOrgOwnership()` added
- `POST /api/auth/signup` (new) — creates Org + Admin User atomically
- `scripts/migrate-to-org.ts` (new) — one-off back-fill script, not imported by app code

</code_context>

<specifics>
## Specific Ideas

- Demo mode uses the super admin's real org — `DEMO_ORG_ID` env var set to the output of the migration script
- New orgs are completely empty on creation — no seeding, no copy of existing data
- The migration script is "run once and forget" — committed to the repo as a utility but not wired into app startup or any API route

</specifics>

<deferred>
## Deferred Ideas

- Org slug / URL-scoped routes (e.g. `/orgs/acme/...`) — future phase if needed
- `planTier` on Organization model — Phase 23 (billing module)
- `ownerId` field on Organization — not required for Phase 22 enforcement model
- Multiple orgs per user — out of scope; each user belongs to exactly one org

</deferred>

---

*Phase: 22-org-model-and-multi-tenant-foundation*
*Context gathered: 2026-04-18*
