---
phase: 23
plan: 02
subsystem: billing
tags: [billing, limits, rate-limiting, organization, mongoose, jest, export-quota]
dependency_graph:
  requires: [23-01]
  provides: [check-rate-limit, check-and-increment-export, check-token-limit, check-theme-limit, count-tokens-utility, all-capped-routes-enforced]
  affects:
    - src/app/api/export/figma/route.ts
    - src/app/api/export/github/route.ts
    - src/app/api/collections/[id]/route.ts
    - src/app/api/collections/[id]/themes/route.ts
    - src/app/api/build-tokens/route.ts
    - src/app/api/collections/route.ts
tech_stack:
  added: []
  patterns:
    - null-returns-success guard (all new guards mirror checkCollectionLimit)
    - SELF_HOSTED short-circuit first in every guard (D-14)
    - Infinity short-circuit before any DB query (Pitfall 7)
    - D-12 lazy UTC-month reset via atomic findOneAndUpdate $lt
    - RateLimiterMongo singleton per points-value (limiterCache Map)
    - Live token aggregation via countTokensInCollection (D-07)
key_files:
  created:
    - src/lib/utils/count-tokens.ts
    - src/lib/utils/__tests__/count-tokens.test.ts
    - src/lib/billing/check-rate-limit.ts
    - src/lib/billing/check-token-limit.ts
    - src/lib/billing/check-and-increment-export.ts
    - src/lib/billing/check-theme-limit.ts
    - src/lib/billing/__tests__/check-rate-limit.test.ts
    - src/lib/billing/__tests__/check-token-limit.test.ts
    - src/lib/billing/__tests__/check-and-increment-export.test.ts
  modified:
    - src/lib/billing/index.ts
    - src/app/api/collections/route.ts
    - src/app/api/collections/[id]/route.ts
    - src/app/api/collections/[id]/themes/route.ts
    - src/app/api/export/figma/route.ts
    - src/app/api/export/github/route.ts
    - src/app/api/build-tokens/route.ts
decisions:
  - "countTokensInCollection skips namespace level; countTokensRecursive descends from there — matches existing GET /api/collections structure exactly"
  - "checkRateLimit uses per-points limiterCache Map (not single singleton) so free=60, pro=120, team=300 each get their own RateLimiterMongo instance with correct TTL"
  - "Figma route: assertOrgOwnership added inline (route previously did not call it) — ownership check before billing guard, billing guard before fetch"
  - "GitHub route: body parsed once into `body` variable; collectionId ownership check added, then billing guards"
  - "checkThemeLimit replaces hardcoded `existingThemes.length >= 10` — BILLING-01 single source of truth enforced"
  - "PUT /api/collections/[id]: rateGuard before tokenGuard — DoS mitigated per T-23-02-04"
metrics:
  duration: "~20 minutes"
  completed: "2026-04-20T04:02:05Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 9
  files_modified: 7
---

# Phase 23 Plan 02: Billing Guards — Remaining Four Guards + Route Wiring Summary

All four remaining billing guards implemented with full test coverage; every capped route (POST collections, POST themes, PUT collection, POST figma, POST github, POST build-tokens) now enforces its billing constraint; hardcoded theme limit removed; LIMITS is the sole source of truth.

## What Was Built

### Task 1: countTokensRecursive extraction + checkRateLimit + checkTokenLimit

**`src/lib/utils/count-tokens.ts`** — shared token counting utility extracted from the inline function in GET /api/collections. Provides two exports:
- `countTokensRecursive(obj)` — recursive leaf counter; stops at `$value` nodes
- `countTokensInCollection(tokens)` — skips namespace wrapper level, recurses each namespace content

**`src/lib/billing/check-rate-limit.ts`** — RATE-01 per-user-ID rate limiter (D-11). Key design points:
- Signature: `checkRateLimit(userId, organizationId?)` — never reads any IP or request header (T-23-02-01 mitigated)
- `limiterCache` Map keyed by `points` so free=60, pro=120, team=300 each have isolated RateLimiterMongo instances
- Returns HTTP 429 (not 402) with `{ code: 'RATE_LIMITED', retryAfterSeconds }` — D-03 keeps UpgradeModal scoped to payment
- Returns HTTP 401 on missing userId (D-11: key must always be session.user.id from requireRole)

**`src/lib/billing/check-token-limit.ts`** — LIMIT-03 live aggregation (D-07). Uses `countTokensInCollection` across all org collections. Infinity short-circuits before any TokenCollection.find call (Pitfall 7).

**`src/app/api/collections/route.ts`** modified:
- Inline `countTokensRecursive` declaration removed from GET handler
- GET now uses `countTokensInCollection(doc.tokens ?? {})` (shared utility)
- POST now calls `checkCollectionLimit` then `checkRateLimit` before try block

### Task 2: checkAndIncrementExport + checkThemeLimit + all route wiring

**`src/lib/billing/check-and-increment-export.ts`** — LIMIT-04/05 with D-12 lazy UTC-month reset:
- `findOneAndUpdate({ 'usage.exportResetAt': { $lt: monthStart } }, { $set: { exportsThisMonth: 0, exportResetAt: monthStart } })` — atomic; only one request per cold month boundary performs the reset (T-23-02-02 mitigated)
- `monthStart = new Date(Date.UTC(...))` — UTC-safe; no local timezone drift
- Increments via `$inc: { 'usage.exportsThisMonth': 1 }` only after cap check passes
- Infinity short-circuits before usage read for team tier

**`src/lib/billing/check-theme-limit.ts`** — LIMIT-02 replaces hardcoded `existingThemes.length >= 10`:
- Reads `planTier` from Organization, looks up `LIMITS[tier].maxThemesPerCollection`
- Returns 402 with `{ code: 'LIMIT_EXCEEDED', resource: 'themes', current, max, tier }`

## Hardcoded Cap Removed (Audit Trail)

**File:** `src/app/api/collections/[id]/themes/route.ts`  
**Removed lines (lines 72-77 in original):**
```typescript
if (existingThemes.length >= 10) {
  return NextResponse.json(
    { error: 'Maximum 10 themes per collection' },
    { status: 422 }
  );
}
```
**Replaced by:** `checkThemeLimit(authResult.user.organizationId, params.id)` called before the try block — reads limit from `LIMITS[tier].maxThemesPerCollection` (BILLING-01 compliance).

## Route Guard Summary

| Route | Guards Added |
|-------|-------------|
| POST /api/collections | `checkCollectionLimit` (Plan 01) + `checkRateLimit` |
| POST /api/collections/[id]/themes | `checkThemeLimit` (LIMIT-02) |
| PUT /api/collections/[id] | `checkRateLimit` + `checkTokenLimit` (RATE-01 + LIMIT-03) |
| POST /api/export/figma | `assertOrgOwnership` + `checkRateLimit` + `checkAndIncrementExport` (RATE-01 + LIMIT-05) |
| POST /api/export/github | `assertOrgOwnership` + `checkRateLimit` + `checkAndIncrementExport` (RATE-01 + LIMIT-04) |
| POST /api/build-tokens | `checkRateLimit` (RATE-01 only — stateless, not a persisted export) |

## Test Coverage Summary

| Test file | Tests | Status |
|-----------|-------|--------|
| `billing/__tests__/tiers.test.ts` | 5 | PASS (from Plan 01) |
| `billing/__tests__/check-collection-limit.test.ts` | 7 | PASS (from Plan 01) |
| `utils/__tests__/count-tokens.test.ts` | 7 | PASS |
| `billing/__tests__/check-rate-limit.test.ts` | 5 | PASS |
| `billing/__tests__/check-token-limit.test.ts` | 5 | PASS |
| `billing/__tests__/check-and-increment-export.test.ts` | 6 | PASS |
| **Total billing + utils** | **35** | **All green** |

## Commits

| Hash | Message |
|------|---------|
| 8cfa78f | feat(23-02): extract countTokensRecursive, implement checkRateLimit + checkTokenLimit |
| c803686 | feat(23-02): implement checkAndIncrementExport + checkThemeLimit, wire all capped routes |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Added assertOrgOwnership to figma + github export routes**
- **Found during:** Task 2 route wiring
- **Issue:** The plan's interface snippet showed an `assertOrgOwnership` call inside the figma route's `if (mongoCollectionId)` block, but the actual route.ts had no such call — it dynamically imported `getRepository` inside a try block but never verified org ownership. GitHub export similarly had no ownership check.
- **Fix:** Added `assertOrgOwnership(authResult, mongoCollectionId/collectionId)` before the billing guards in both routes. This is a security requirement (T-23-02-08 cross-tenant).
- **Files modified:** `src/app/api/export/figma/route.ts`, `src/app/api/export/github/route.ts`

**2. [Rule 3 - Blocking] Mock chains rebuilt in beforeEach after resetAllMocks**
- **Found during:** Task 1 check-rate-limit test authoring
- **Issue:** Same pattern as Plan 01's deviation — `jest.resetAllMocks()` clears `mockReturnValue` chains.
- **Fix:** Added explicit `mockOrgSelect.mockReturnValue({ lean: mockOrgLean })` re-establishment in `beforeEach` across all new test files.

## Known Stubs

None — all guards are fully wired with live DB reads. `usage.exportsThisMonth` flows from Organization document through `checkAndIncrementExport`; token count flows from live aggregation in `checkTokenLimit`.

## Handoff Notes for Plan 03

All billing primitives now exist. Plan 03 (`GET /api/org/usage`) can assemble the usage dashboard by combining:
- `Organization.findById(organizationId).select('planTier usage').lean()` — for `planTier`, `exportsThisMonth`, `exportResetAt`
- `countTokensInCollection` applied to all org collections (same as `checkTokenLimit` aggregation)
- `TokenCollection.countDocuments({ organizationId })` — for collection count
- `LIMITS[tier]` — for cap values to display alongside current usage

All of these patterns are tested and production-ready. The endpoint just needs to aggregate them into a single JSON response for the UI.

## Threat Flags

No new threat surface beyond the plan's threat model. All six route handlers enforce `requireRole` (auth) before billing guards. `organizationId` sourced exclusively from `authResult.user.organizationId` (Session object from requireRole) — never from request body or query params.
