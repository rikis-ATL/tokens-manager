---
phase: 23
plan: 01
subsystem: billing
tags: [billing, limits, organization, mongoose, jest]
dependency_graph:
  requires: []
  provides: [billing-module-skeleton, collection-limit-guard, organization-plan-tier]
  affects: [src/app/api/collections/route.ts, src/lib/db/models/Organization.ts]
tech_stack:
  added: [rate-limiter-flexible@11.0.1]
  patterns: [null-returns-success guard, SELF_HOSTED short-circuit, barrel module isolation]
key_files:
  created:
    - src/lib/billing/tiers.ts
    - src/lib/billing/check-collection-limit.ts
    - src/lib/billing/index.ts
    - src/lib/billing/__tests__/tiers.test.ts
    - src/lib/billing/__tests__/check-collection-limit.test.ts
    - src/lib/db/models/__tests__/organization-plan.test.ts
  modified:
    - package.json
    - yarn.lock
    - .env.local.example
    - src/lib/db/models/Organization.ts
    - src/app/api/collections/route.ts
decisions:
  - "rate-limiter-flexible@^11.0.1 installed with -W flag (workspace root) per monorepo setup"
  - "Mock chain rebuilt in beforeEach (not resetAllMocks) to preserve jest.fn() return value chaining"
  - "Guard inserted before try{} block in POST /api/collections after organizationId resolution"
metrics:
  duration: "~15 minutes"
  completed: "2026-04-20T03:47:29Z"
  tasks_completed: 3
  tasks_total: 3
  files_created: 6
  files_modified: 5
---

# Phase 23 Plan 01: Billing Module Foundation Summary

JWT auth with refresh rotation using jose library — one-liner example. Actual: Billing module foundation with Organization plan tier, LIMITS SSoT, collection limit guard, and POST /api/collections enforcement.

## What Was Built

Rate-limiter-flexible installed, Organization model extended with `planTier` and `usage` fields, `src/lib/billing/` module created with tier config and first guard, guard wired into collection creation API.

## Files Created / Modified

### Created
- `src/lib/billing/tiers.ts` — `LIMITS` Record (free/pro/team) with `TierLimits` interface; single source of truth for all cap values (BILLING-01)
- `src/lib/billing/check-collection-limit.ts` — async guard `checkCollectionLimit(organizationId): Promise<NextResponse | null>`; mirrors `assertOrgOwnership` null-returns-success pattern
- `src/lib/billing/index.ts` — barrel re-exports for all billing guards (D-15)
- `src/lib/billing/__tests__/tiers.test.ts` — 5 tests covering LIMITS shape and values
- `src/lib/billing/__tests__/check-collection-limit.test.ts` — 7 tests covering SELF_HOSTED bypass, null/402/404 paths, Infinity short-circuit
- `src/lib/db/models/__tests__/organization-plan.test.ts` — 4 tests covering planTier default, usage defaults, validation rejection, pro/team acceptance

### Modified
- `package.json` / `yarn.lock` — `rate-limiter-flexible@11.0.1` added under dependencies
- `.env.local.example` — `SELF_HOSTED=false` documented with Phase 23 D-14 comment block
- `src/lib/db/models/Organization.ts` — `PlanTier` type + `IOrganizationUsage` interface exported; `orgSchema` extended with `planTier` enum field (default `'free'`) and `usage` subdoc
- `src/app/api/collections/route.ts` — `checkCollectionLimit` import added; guard call inserted in POST handler after `organizationId` resolution, before `try {`

## Schema Changes on Organization

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `planTier` | `'free' \| 'pro' \| 'team'` | `'free'` | Enum-validated; D-01 |
| `usage.exportsThisMonth` | `Number` | `0` | D-06 |
| `usage.exportResetAt` | `Date` | `new Date(0)` | D-06; lazy reset by Plan 02 |

## Tier Cap Values (for future reference)

| Cap | free | pro | team |
|-----|------|-----|------|
| maxCollections | 1 | 20 | Infinity |
| maxThemesPerCollection | 2 | 10 | Infinity |
| maxTokensTotal | 500 | 5,000 | Infinity |
| maxExportsPerMonth | 10 | 200 | Infinity |
| rateLimitPerMinute | 60 | 120 | 300 |

## Test Coverage Summary

| Test file | Tests | Status |
|-----------|-------|--------|
| `organization-plan.test.ts` | 4 | PASS |
| `billing/__tests__/tiers.test.ts` | 5 | PASS |
| `billing/__tests__/check-collection-limit.test.ts` | 7 | PASS |
| **Total** | **16** | **All green** |

## Commits

| Hash | Message |
|------|---------|
| fe2580e | feat(23-01): install rate-limiter-flexible, add SELF_HOSTED env doc, extend Organization model |
| d791be8 | feat(23-01): create src/lib/billing/ skeleton — tiers SSoT, checkCollectionLimit guard, barrel index |
| 0c93d6f | feat(23-01): wire checkCollectionLimit into POST /api/collections |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed mock chain resetting in beforeEach**
- **Found during:** Task 2 test run
- **Issue:** `jest.resetAllMocks()` cleared the `mockReturnValue` chains on `mockOrgSelect`, causing `TypeError: Cannot read properties of undefined (reading 'select')` in 5 of 7 tests
- **Fix:** Changed to individual `mockReset()`/`mockClear()` per mock fn; kept `mockOrgSelect` returning `{ lean: mockOrgLean }` as a stable factory instead of using `mockReturnValue` inside `beforeEach`
- **Files modified:** `src/lib/billing/__tests__/check-collection-limit.test.ts`

**2. [Rule 3 - Blocking] yarn add required -W flag for workspace root**
- **Found during:** Task 1 package install
- **Issue:** Monorepo workspace setup requires `-W` flag to add dependencies at root level
- **Fix:** Used `yarn add -W rate-limiter-flexible@^11.0.0` — appropriate for this dependency since it's used by a lib module, not a workspace package

## Handoff Notes for Plan 02

`src/lib/billing/check-collection-limit.ts` is the **canonical guard pattern** for all subsequent billing guards. Plan 02 should copy this exact structure for:

- `check-and-increment-export` — same shape but uses `findOneAndUpdate` with `$inc` for atomic export counting + lazy monthly reset
- `check-rate-limit` — same SELF_HOSTED short-circuit, then `RateLimiterMongo` with `session.user.id` as key
- `check-token-limit` — same shape but counts tokens across org collections

Key implementation rules to carry forward:
1. SELF_HOSTED check ALWAYS first, before any DB read
2. Read `planTier` from Organization doc at enforcement time (never from JWT)
3. `Infinity` caps must short-circuit before any MongoDB query (Pitfall 7)
4. Return `null` on success, `NextResponse` on block
5. Import from `@/lib/billing` barrel, never from sub-module paths in route handlers

## Known Stubs

None — all data flows are wired. The `usage.exportsThisMonth` field is initialized to 0 by the schema default; it will be incremented by Plan 02's export guard.

## Threat Flags

No new threat surface beyond what the plan's threat model covers. All endpoints use session-derived `organizationId` (never body/query), plan tier is read fresh from DB on every call.
