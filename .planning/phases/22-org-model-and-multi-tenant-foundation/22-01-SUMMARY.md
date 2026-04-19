---
phase: 22
plan: 01
subsystem: data-layer
tags: [mongoose, organization, multi-tenant, schema, indexes]
dependency_graph:
  requires: []
  provides: [Organization model, User.organizationId, TokenCollection.organizationId]
  affects: [src/lib/db/models/User.ts, src/lib/db/models/TokenCollection.ts, src/types/collection.types.ts]
tech_stack:
  added: []
  patterns: [Mongoose model guard pattern, compound index via schema.index()]
key_files:
  created:
    - src/lib/db/models/Organization.ts
    - src/lib/db/models/__tests__/organization.test.ts
    - src/lib/db/models/__tests__/user-org.test.ts
    - src/lib/db/models/__tests__/tokenCollection-org.test.ts
  modified:
    - src/lib/db/models/User.ts
    - src/lib/db/models/TokenCollection.ts
    - src/types/collection.types.ts
decisions:
  - "D-01: Minimal Organization schema — name + timestamps only; no slug, ownerId, planTier"
  - "D-02: organizationId is required:true on both User and TokenCollection; Plan 04 migration back-fills before deploy"
  - "D-14: Compound indexes (organizationId, _id) on both schemas to prevent COLLSCAN on org-scoped list queries"
  - "Mongoose ObjectId instance string is 'ObjectId' (lowercase d) not 'ObjectID' in this version"
metrics:
  duration: ~15 minutes
  completed: "2026-04-19"
  tasks_completed: 3
  files_changed: 7
---

# Phase 22 Plan 01: Organization Model and Schema Foundation Summary

**One-liner:** Mongoose Organization model (name + timestamps, D-01) created; User and TokenCollection schemas extended with required organizationId ObjectId ref and compound (organizationId, _id) indexes per D-02 and D-14.

## What Was Built

### Task 1: Organization Model (D-01)

Created `src/lib/db/models/Organization.ts` — minimal schema with:
- `name`: required String, trimmed
- `timestamps: true` — auto createdAt/updatedAt
- Hot-reload guard using the standard `mongoose.models.Organization || mongoose.model(...)` pattern
- No slug, ownerId, or planTier (explicitly deferred per D-01)

### Task 2: User Schema Extension (D-02, D-14)

Modified `src/lib/db/models/User.ts`:
- `IUser` interface: added `organizationId: string` (required, no `?`)
- Schema: added `organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: false }`
- Compound index: `userSchema.index({ organizationId: 1, _id: 1 })`
- Existing `userSchema.index({ email: 1 })` preserved

### Task 3: TokenCollection Schema Extension (D-02, D-14)

Modified `src/lib/db/models/TokenCollection.ts`:
- Schema: added `organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: false }`
- Compound index: `tokenCollectionSchema.index({ organizationId: 1, _id: 1 })`
- Existing `tokenCollectionSchema.index({ name: 1 })` preserved
- Dynamic model key pattern (`TokenCollection_${collectionName}`) untouched

Modified `src/types/collection.types.ts`:
- `ITokenCollection` interface: added `organizationId: string` (required, no `?`)

## Test Results

All 19 assertions across 3 test files pass:

| File | Tests | Status |
|------|-------|--------|
| organization.test.ts | 5 | PASS |
| user-org.test.ts | 7 | PASS |
| tokenCollection-org.test.ts | 7 | PASS |

Pre-existing failures in `src/services/ai/__tests__/claude.provider.test.ts` (4 tests) are out of scope — confirmed present before these changes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Mongoose ObjectId instance string is 'ObjectId' not 'ObjectID'**
- **Found during:** Task 2 GREEN phase
- **Issue:** Plan specified `instance === 'ObjectID'` (uppercase D) per Mongoose v9 docs, but empirical test run showed `'ObjectId'` (lowercase d) in the installed version
- **Fix:** Test assertions updated to use `'ObjectId'` (verified empirically); applies to both user-org and tokenCollection-org test files
- **Files modified:** `src/lib/db/models/__tests__/user-org.test.ts`, `src/lib/db/models/__tests__/tokenCollection-org.test.ts`

## Deployment Ordering Note

**CRITICAL:** `organizationId` is `required: true` on both User and TokenCollection schemas. Before deploying this code to production:

1. Run `scripts/migrate-to-org.ts` (Plan 04) against the production MongoDB to back-fill all existing User and TokenCollection documents with an `organizationId`
2. Only then deploy this code

Reversing this order will cause Mongoose to reject all existing documents on read/write. This is documented in the plan's Pitfall 3 and in inline comments in all three modified files.

## Downstream Unblocks

- **Plan 02** (`assertOrgOwnership()`): can now import Organization model and query `collection.organizationId`
- **Plan 03** (self-serve signup): can now create an Organization document and assign its `_id` to a new User
- **Plan 04** (migration script): can now import all three models and back-fill `organizationId` on existing docs; migration is the deployment prerequisite for this plan's `required: true` constraints

## Known Stubs

None — all fields are schema-level constraints with no data wired to UI yet. The organizationId enforcement happens at the API layer (Plans 02/03).

## Threat Flags

No new network endpoints, auth paths, file access patterns, or schema changes at unexpected trust boundaries. The `organizationId` field and compound indexes are entirely schema-level — no new API surfaces introduced in this plan.

## Self-Check

Files created:
- [x] src/lib/db/models/Organization.ts — FOUND
- [x] src/lib/db/models/__tests__/organization.test.ts — FOUND
- [x] src/lib/db/models/__tests__/user-org.test.ts — FOUND
- [x] src/lib/db/models/__tests__/tokenCollection-org.test.ts — FOUND

Files modified:
- [x] src/lib/db/models/User.ts — confirmed organizationId in interface + schema + compound index
- [x] src/lib/db/models/TokenCollection.ts — confirmed organizationId in schema + compound index
- [x] src/types/collection.types.ts — confirmed organizationId in ITokenCollection interface

Commits:
- [x] 5382fd4 — feat(22-01): Create Organization Mongoose model with minimal schema (D-01)
- [x] 7f96387 — feat(22-01): Extend User schema with organizationId + compound index (D-02, D-14)
- [x] a669e26 — feat(22-01): Extend TokenCollection schema with organizationId + compound index (D-02, D-14)

## Self-Check: PASSED
