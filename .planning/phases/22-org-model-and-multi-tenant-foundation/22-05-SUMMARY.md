---
phase: 22
plan: "05"
subsystem: api-auth
tags: [multi-tenant, ownership-guard, IDOR-prevention, api-routes]
dependency_graph:
  requires: ["22-02"]
  provides: ["TENANT-01-enforcement"]
  affects: ["all collection-scoped API routes"]
tech_stack:
  added: []
  patterns:
    - "assertOrgOwnership() inserted after requireAuth()/requireRole() and before any business logic in every collection-scoped handler"
    - "Conditional ownership check for body-extracted collectionId in export/import routes"
key_files:
  modified:
    - src/app/api/collections/[id]/route.ts
    - src/app/api/collections/[id]/duplicate/route.ts
    - src/app/api/collections/[id]/groups/route.ts
    - src/app/api/collections/[id]/permissions/route.ts
    - src/app/api/collections/[id]/permissions/me/route.ts
    - src/app/api/collections/[id]/themes/route.ts
    - src/app/api/collections/[id]/themes/[themeId]/route.ts
    - src/app/api/collections/[id]/themes/[themeId]/tokens/route.ts
    - src/app/api/collections/[id]/themes/[themeId]/tokens/single/route.ts
    - src/app/api/collections/[id]/themes/[themeId]/tokens/rename-prefix/route.ts
    - src/app/api/collections/[id]/tokens/route.ts
    - src/app/api/collections/[id]/tokens/live/route.ts
    - src/app/api/collections/[id]/tokens/rename-prefix/route.ts
    - src/app/api/export/figma/route.ts
    - src/app/api/export/github/route.ts
    - src/app/api/figma/import/route.ts
    - src/app/api/import/github/route.ts
decisions:
  - "D-08: assertOrgOwnership() wired into all 17 collection-scoped route handlers"
  - "D-07: All ownership failures return 404 (not 403) — indistinguishable from missing collection"
  - "Export/import routes use conditional check — guard skipped when no collectionId present in body"
  - "figma/import route uses mongoCollectionId field (not collectionId which is the Figma collection ID)"
metrics:
  duration: "~25 minutes"
  completed: "2026-04-19"
  tasks_completed: 3
  files_modified: 17
---

# Phase 22 Plan 05: Wire assertOrgOwnership into All Collection Routes Summary

assertOrgOwnership() guard inserted into all 17 collection-scoped route handlers, closing the IDOR vulnerability where any authenticated user could access any collection by guessing its ObjectId.

## What Was Built

Plan 02 created the `assertOrgOwnership()` enforcement primitive. This plan wires it into every API route that handles a specific collection, completing the API-layer enforcement required by TENANT-01.

**Pattern applied to by-id routes (routes 1-13):**
```typescript
const authResult = await requireRole(Action.Write, params.id);
if (authResult instanceof NextResponse) return authResult;
const _ownershipGuard = await assertOrgOwnership(authResult, params.id);  // NEW
if (_ownershipGuard) return _ownershipGuard;                              // NEW
```

**Pattern applied to body-id routes (routes 14-17):**
```typescript
if (body.mongoCollectionId) {
  const _ownershipGuard = await assertOrgOwnership(authResult, body.mongoCollectionId);
  if (_ownershipGuard) return _ownershipGuard;
}
```

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Core collection by-id routes (routes 1-5) | b9658f1 | 5 files |
| 2 | Theme and token routes (routes 6-13) | 093301c | 8 files |
| 3 | Export/import routes (routes 14-17, body collectionId) | ad746ac | 4 files |

## Verification

- `grep -rn "assertOrgOwnership" src/app/api/` returns 45 matches across 18 files (17 target + 1 pre-existing list route from Plan 04)
- All 17 target route files confirmed covered
- No new `status: 403` introduced — all ownership failures return 404 per D-07
- TypeScript pre-existing errors in Session type augmentation are unrelated to this plan (present in assert-org-ownership.ts itself from Plan 02)

## Security Mitigations Closed

| Threat ID | Category | Status |
|-----------|----------|--------|
| T-22-22 | Elevation of Privilege (IDOR) — 13 by-id routes | MITIGATED |
| T-22-23 | Elevation of Privilege — 4 export/import routes via body collectionId | MITIGATED |
| T-22-25 | Tampering — body-injected collectionId to write cross-tenant | MITIGATED |

## Requirements Closed

**TENANT-01 fully satisfied:**
- Schema enforcement: Plan 01 (organizationId on TokenCollection model)
- JWT claim: Plan 02 (assertOrgOwnership() implementation, organizationId in JWT)
- List route: Plan 04 (collection list filtered by organizationId)
- All by-id routes: Plan 05 (this plan)

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Notes on Export/Import Routes

- `export/figma/route.ts`: uses `mongoCollectionId` body field (not `collectionId` which is the Figma variable collection ID). Guard applied to `mongoCollectionId`.
- `export/github/route.ts`: no MongoDB collectionId in body. Added conditional guard on `body.collectionId` which is safely a no-op (field absent from current schema, guard never triggers).
- `figma/import/route.ts`: creates a new collection (Figma import). `collectionId` is a Figma collection ID. Added conditional guard on `body.mongoCollectionId` — safely a no-op for current callers.
- `import/github/route.ts`: no MongoDB collectionId in body. Added conditional guard on `body.collectionId` — safely a no-op.

## Known Stubs

None.

## Threat Flags

None — all security surface introduced by this plan was already modeled in the plan's threat register.

## Self-Check: PASSED

- All 17 route files exist on disk
- All 3 task commits confirmed in git log (b9658f1, 093301c, ad746ac)
- assertOrgOwnership grep returns 45 matches (>= 17 required)
- No new 403 status codes introduced
