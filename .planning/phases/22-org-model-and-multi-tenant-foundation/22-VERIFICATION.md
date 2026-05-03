---
phase: 22-org-model-and-multi-tenant-foundation
verified: 2026-04-19T12:00:00Z
status: human_needed
score: 12/12 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 7/12
  gaps_closed:
    - "User documents require organizationId referencing an Organization"
    - "TokenCollection documents require organizationId referencing an Organization"
    - "Compound index (organizationId, _id) exists on User and TokenCollection schemas"
    - "TypeScript types (IUser, ITokenCollection) include organizationId"
    - "Model unit tests for Plan 01 exist (organization.test.ts, user-org.test.ts, tokenCollection-org.test.ts)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Verify /auth/signup end-to-end browser flow"
    expected: "Four-field form renders; valid submission creates Organization + Admin User in MongoDB with organizationId set; auto-signin redirects to /; duplicate email shows 409 error"
    why_human: "Requires live browser session, incognito window, and MongoDB inspection to verify actual doc creation. Cannot confirm programmatically."

  - test: "Verify JWT carries organizationId after sign-in"
    expected: "After sign-in, /api/auth/session returns session.user.organizationId equal to the user's Organization._id (non-empty 24-hex ObjectId string)"
    why_human: "Requires live browser login and real MongoDB data. Schema restoration (c206dd9) makes this viable again — needs confirmation with restored schema in place."

  - test: "Verify assertOrgOwnership() blocks cross-tenant collection access"
    expected: "Accessing /api/collections/[other-tenant-id] with a valid session from a different org returns 404 Not Found with body { error: 'Not Found' }, indistinguishable from a genuinely missing collection"
    why_human: "Integration-level check requiring two real org accounts and live DB data."

  - test: "Verify migration script execution results in DB"
    expected: "db.users.find({ organizationId: { $exists: false } }).count() === 0 and db.tokencollections.find({ organizationId: { $exists: false } }).count() === 0"
    why_human: "SUMMARY reports script ran (5 users, 15 collections back-filled). Requires mongosh verification — cannot confirm programmatically."
---

# Phase 22: org-model-and-multi-tenant-foundation Verification Report

**Phase Goal:** Establish multi-tenant data isolation foundation — Organization model, auth layer with assertOrgOwnership, self-serve signup, migration script, and enforcement on all collection routes.
**Verified:** 2026-04-19
**Status:** human_needed
**Re-verification:** Yes — after commit c206dd9 restored Plan 01 schema additions reverted by worktree merge in d928a26

## Re-verification Summary

All 5 gaps from the initial verification are now closed. Commit c206dd9 restored:
- `organizationId` field (ObjectId, ref: 'Organization', required: true) to both `User.ts` and `TokenCollection.ts`
- Compound index `{ organizationId: 1, _id: 1 }` on both schemas
- `organizationId: string` to `IUser` interface in `User.ts` and `ITokenCollection` in `src/types/collection.types.ts`
- All three model test files under `src/lib/db/models/__tests__/`

No regressions were found in the previously-passing items.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Organization Mongoose model exists with minimal schema (name + timestamps, D-01) | VERIFIED | `src/lib/db/models/Organization.ts` exports `mongoose.model<OrgDoc>('Organization', orgSchema)` with `{ name: String, required: true, trim: true }` and `{ timestamps: true }`. No slug/ownerId/planTier. |
| 2 | User documents require organizationId referencing an Organization | VERIFIED | `src/lib/db/models/User.ts` line 35: `organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: false }`. IUser interface line 19: `organizationId: string` (required, no ?). |
| 3 | TokenCollection documents require organizationId referencing an Organization | VERIFIED | `src/lib/db/models/TokenCollection.ts` line 47: `organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: false }`. |
| 4 | Compound index (organizationId, _id) on both User and TokenCollection schemas | VERIFIED | User.ts line 47: `userSchema.index({ organizationId: 1, _id: 1 })`. TokenCollection.ts line 63: `tokenCollectionSchema.index({ organizationId: 1, _id: 1 })`. |
| 5 | TypeScript types (IUser, ITokenCollection) include organizationId | VERIFIED | `src/lib/db/models/User.ts` line 19: `organizationId: string` in IUser. `src/types/collection.types.ts` line 59: `organizationId: string` in ITokenCollection. |
| 6 | Model unit tests for Plan 01 exist | VERIFIED | `src/lib/db/models/__tests__/` directory exists with organization.test.ts (40 lines), user-org.test.ts (51 lines), tokenCollection-org.test.ts (43 lines). |
| 7 | JWT session carries organizationId from first sign-in onward (D-09) | VERIFIED | `src/lib/auth/nextauth.config.ts` has `organizationId` in `authorize()` return, `token.organizationId` in jwt callback, `session.user.organizationId` in session callback. `src/types/next-auth.d.ts` declares both Session.user.organizationId and JWT.organizationId. |
| 8 | assertOrgOwnership() returns null on match, 404 on every failure mode (D-07) | VERIFIED | `src/lib/auth/assert-org-ownership.ts` exists with correct D-07 signature. Uses `String(collection.organizationId ?? '') !== sessionOrgId` (Pitfall 2). Returns NOT_FOUND() for empty collectionId, missing session claim, missing collection, and mismatch. No 403 anywhere. |
| 9 | Demo session returns organizationId from DEMO_ORG_ID env var (D-10) | VERIFIED | `src/lib/auth/demo-session.ts`: `organizationId: process.env.DEMO_ORG_ID ?? ''`. |
| 10 | Self-serve signup creates Organization + Admin User atomically; UI has 4 fields | VERIFIED | `src/app/api/auth/signup/route.ts` exists with zod validation, `Organization.create()`, `User.create()` with `role:'Admin'`, and catch-and-delete rollback. `src/app/auth/signup/page.tsx` has all 4 fields (orgName, displayName, email, password) + auto-signin + `signIn('credentials')`. |
| 11 | GET /api/collections filters by session.user.organizationId | VERIFIED | `src/app/api/collections/route.ts` line 27: `repo.list({ organizationId: session.user.organizationId })`. Interface and MongoCollectionRepository implementation both updated. |
| 12 | All 17 collection-scoped by-id and export/import routes call assertOrgOwnership() | VERIFIED | `grep -rn "assertOrgOwnership" src/app/api/` returns 45 matches. All 13 by-id routes and 4 export/import routes confirmed. No 403 status codes introduced (only 404 per D-07). |

**Score:** 12/12 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/db/models/Organization.ts` | Organization model with name + timestamps | VERIFIED | Correct schema, hot-reload guard |
| `src/lib/db/models/User.ts` | User model with required organizationId + compound index | VERIFIED | Restored by c206dd9 |
| `src/lib/db/models/TokenCollection.ts` | TokenCollection model with required organizationId + compound index | VERIFIED | Restored by c206dd9 |
| `src/lib/db/models/__tests__/organization.test.ts` | 5 unit tests for Organization model | VERIFIED | 40 lines — restored by c206dd9 |
| `src/lib/db/models/__tests__/user-org.test.ts` | 7 unit tests for User organizationId | VERIFIED | 51 lines — restored by c206dd9 |
| `src/lib/db/models/__tests__/tokenCollection-org.test.ts` | 7 unit tests for TokenCollection organizationId | VERIFIED | 43 lines — restored by c206dd9 |
| `src/types/collection.types.ts` | ITokenCollection.organizationId field | VERIFIED | Line 59: `organizationId: string` — restored by c206dd9 |
| `src/lib/auth/assert-org-ownership.ts` | assertOrgOwnership() guard function | VERIFIED | Correct signature and implementation (no regression) |
| `src/types/next-auth.d.ts` | Session.user.organizationId + JWT.organizationId | VERIFIED | Both declared correctly (no regression) |
| `src/lib/auth/nextauth.config.ts` | JWT carries organizationId from authorize() | VERIFIED | All three callback points updated (no regression) |
| `src/lib/auth/demo-session.ts` | organizationId from DEMO_ORG_ID | VERIFIED | No regression |
| `src/lib/auth/__tests__/jwt-org.test.ts` | 5 JWT auth tests | VERIFIED | File exists (no regression) |
| `src/lib/auth/__tests__/demo-session-org.test.ts` | 3 demo session tests | VERIFIED | File exists (no regression) |
| `src/lib/auth/__tests__/assert-org-ownership.test.ts` | 7 ownership guard tests | VERIFIED | File exists (no regression) |
| `src/app/api/auth/signup/route.ts` | POST signup endpoint | VERIFIED | No regression |
| `src/app/auth/signup/page.tsx` | 4-field signup UI | VERIFIED | No regression |
| `src/app/api/auth/signup/__tests__/route.test.ts` | 10 signup route tests | VERIFIED | No regression |
| `scripts/migrate-to-org.ts` | Idempotent migration script | VERIFIED | No regression |
| `scripts/__tests__/migrate-to-org.test.ts` | 8 migration script tests | VERIFIED | No regression |
| `src/lib/db/repository.ts` | list() with organizationId filter | VERIFIED | No regression |
| `src/lib/db/mongo-repository.ts` | list() implementation with filter | VERIFIED | No regression |
| `src/lib/db/supabase-repository.ts` | list() signature parity | VERIFIED | No regression |
| `src/lib/db/__tests__/mongo-repository-list.test.ts` | 5 repo list tests | VERIFIED | No regression |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| User.ts | Organization.ts | Schema.Types.ObjectId, ref:'Organization', required:true | VERIFIED | Line 37: `ref: 'Organization'`, line 38: `required: true` — restored by c206dd9 |
| TokenCollection.ts | Organization.ts | Schema.Types.ObjectId, ref:'Organization', required:true | VERIFIED | Line 49: `ref: 'Organization'`, line 50: `required: true` — restored by c206dd9 |
| assert-org-ownership.ts | TokenCollection model | .findById().select('organizationId').lean() | VERIFIED | Correct query with field projection (no regression) |
| nextauth.config.ts | JWT token | token.organizationId set on initial sign-in | VERIFIED | All three callback points confirmed (no regression) |
| demo-session.ts | process.env.DEMO_ORG_ID | organizationId: process.env.DEMO_ORG_ID ?? '' | VERIFIED | Confirmed (no regression) |
| signup/route.ts | Organization + User models | Organization.create() then User.create({organizationId}) | VERIFIED | Atomic create with rollback (no regression) |
| signup/page.tsx | /api/auth/signup | fetch('/api/auth/signup', { method: 'POST' }) | VERIFIED | No regression |
| signup/page.tsx | signIn('credentials') | Auto-signin after 201 response | VERIFIED | No regression |
| migrate-to-org.ts | Organization, User, TokenCollection | import from '../src/lib/db/models/...' | VERIFIED | Avoids mongoose.models[] (Pitfall 4) — no regression |
| GET /api/collections | repo.list() | repo.list({ organizationId: session.user.organizationId }) | VERIFIED | Line 27 confirmed (no regression) |
| All 17 routes | assert-org-ownership.ts | import { assertOrgOwnership } | VERIFIED | 45 grep matches across 17+ files (no regression) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| assertOrgOwnership.ts | collection.organizationId | TokenCollection.findById().select('organizationId').lean() | Yes (DB query) | VERIFIED — schema now has organizationId field so the query will return real data |
| GET /api/collections | docs | repo.list({ organizationId }) → TokenCollection.find({ organizationId }) | Yes (DB query with org filter) | VERIFIED — schema restoration means the compound index will be used for the filter |
| nextauth.config.ts | token.organizationId | user.organizationId from DB (authorize()) | Yes — User schema now has organizationId field | VERIFIED — previously HOLLOW due to missing schema field; now restored |

### Behavioral Spot-Checks

Step 7b: SKIPPED for routes (requires running server + real MongoDB). Test files are the primary automated check.

| Behavior | Check | Status |
|----------|-------|--------|
| Organization model registers correctly | `Organization.ts` exists with mongoose.model call | PASS |
| User.ts organizationId field restored | 3 grep matches (interface + schema + compound index) | PASS |
| TokenCollection.ts organizationId field restored | 2 grep matches (schema + compound index) | PASS |
| Model test directory exists | `src/lib/db/models/__tests__/` contains 3 test files | PASS |
| collection.types.ts organizationId restored | line 59: `organizationId: string` | PASS |
| assertOrgOwnership() exported | `export async function assertOrgOwnership` present | PASS |
| No 403 in Phase 22 routes | grep `status: 403` in /api/collections/ — no new matches from Phase 22 | PASS |
| All 17 routes covered | 45 assertOrgOwnership matches across src/app/api/ | PASS |
| ref: 'Organization' on User schema | line 37 confirmed | PASS |
| ref: 'Organization' on TokenCollection schema | line 49 confirmed | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| TENANT-01 | Plans 01, 02, 04, 05 | All users and collections scoped to org via organizationId | VERIFIED | Schema-level enforcement (required organizationId on User + TokenCollection) restored. assertOrgOwnership() wired to all 17 routes. GET /api/collections filters by organizationId. JWT carries organizationId from authorize(). |
| TENANT-02 | Plan 03 | User can create new org during self-serve signup | VERIFIED (pending human) | POST /api/auth/signup route and /auth/signup page exist with atomic Org+User creation. Human browser verification still needed. |
| TENANT-03 | Plan 04 | Existing data migrated to org from INITIAL_ORG_NAME env var on first boot | VERIFIED (code only) | `scripts/migrate-to-org.ts` exists with correct idempotent logic. SUMMARY reports script ran (5 users, 15 collections back-filled). DB state requires mongosh verification. |

### Anti-Patterns Found

None. All previously-identified blockers are resolved. No new anti-patterns introduced by c206dd9:
- `src/lib/db/models/User.ts` — organizationId field, IUser type, and compound index all present and correct
- `src/lib/db/models/TokenCollection.ts` — organizationId field and compound index present and correct
- `src/types/collection.types.ts` — ITokenCollection.organizationId field present
- `src/lib/db/models/__tests__/` — all 3 test files present and substantive

### Human Verification Required

#### 1. Verify /auth/signup end-to-end browser flow

**Test:** Start dev server, navigate to http://localhost:3000/auth/signup in an incognito window, submit a valid org signup (org name, display name, fresh email, password >= 8 chars)
**Expected:** Four-field form renders; successful submission creates Organization + Admin User in MongoDB with organizationId set; auto-signin redirects to /; duplicate email shows "Email already in use" error (409); password < 8 chars shows inline client-side error
**Why human:** Requires live browser session and MongoDB inspection. Schema is now correct on disk; this verifies the end-to-end data path is working with the restored schema.

#### 2. Verify JWT organizationId claim after sign-in

**Test:** Sign in with an existing account (one that was back-filled by the migration script); inspect `/api/auth/session` in browser DevTools Network tab
**Expected:** `session.user.organizationId` is a non-empty 24-hex-char MongoDB ObjectId string matching the org created by the migration script
**Why human:** The auth layer code is correctly wired and the User schema now has the organizationId field. This verifies the authorize() → JWT → session pipeline carries the value end-to-end with real DB data.

#### 3. Verify assertOrgOwnership() blocks cross-tenant collection access

**Test:** With two org accounts (or one account and a known other-org collection ObjectId), attempt to access `/api/collections/[other-org-collection-id]`
**Expected:** 404 response with `{ error: 'Not Found' }` body — indistinguishable from a genuinely missing collection
**Why human:** Integration-level check requiring two real org users and real DB data.

#### 4. Verify migration script execution results in DB

**Test:** In mongosh: `db.users.find({ organizationId: { $exists: false } }).count()` and `db.tokencollections.find({ organizationId: { $exists: false } }).count()`
**Expected:** Both return 0 (all docs have been back-filled by scripts/migrate-to-org.ts)
**Why human:** SUMMARY reports the script ran successfully. Requires mongosh verification against the actual DB.

### Gaps Summary

No gaps remain. All 5 previously-identified blockers were resolved by commit c206dd9:

1. `User.ts` — organizationId schema field, IUser interface field, and compound index restored
2. `TokenCollection.ts` — organizationId schema field and compound index restored
3. `src/types/collection.types.ts` — ITokenCollection.organizationId field restored
4. `src/lib/db/models/__tests__/` — all three model test files recreated

The phase goal is structurally complete. The human verification items above are the remaining gate before full sign-off.

---

_Verified: 2026-04-19_
_Verifier: Claude (gsd-verifier)_
_Re-verification: Yes — after commit c206dd9 targeted fix_
