---
phase: 19-rbac-and-permissions-context
plan: "01"
subsystem: auth
tags: [rbac, permissions, next-auth, mongodb, mongoose, next.js]

# Dependency graph
requires:
  - phase: 18-middleware-and-route-handler-guards
    provides: requireAuth() pattern, getServerSession(authOptions) single-argument form
  - phase: 16-permissions-model
    provides: canPerform(), Role type, ActionType, CollectionPermission model

provides:
  - requireRole(action, collectionId?) exported from src/lib/auth/require-auth.ts
  - bootstrapCollectionGrants() idempotent backfill from src/lib/auth/collection-bootstrap.ts
  - GET /api/collections/[id]/permissions/me endpoint

affects:
  - 19-02-plan (collection list API)
  - 19-03-plan (collection detail and write APIs)
  - all future plans using requireRole() as auth gate

# Tech tracking
tech-stack:
  added: []
  patterns:
    - requireRole() as drop-in upgrade over requireAuth() for collection-scoped access control
    - 404-not-403 for invisible resources (collection not visible to user with no grant)
    - Admin org role bypasses collection grant lookup entirely
    - Module-level idempotency flag (bootstrapComplete) avoids redundant DB queries

key-files:
  created:
    - src/lib/auth/collection-bootstrap.ts
    - src/app/api/collections/[id]/permissions/me/route.ts
  modified:
    - src/lib/auth/require-auth.ts

key-decisions:
  - "requireRole() uses 404 (not 403) for non-Admin with no grant — collection is invisible to user per CONTEXT.md"
  - "Admin org role short-circuits collection grant lookup — no DB query needed for Admins"
  - "bootstrapCollectionGrants() uses countDocuments() guard + module-level flag for double idempotency"
  - "Dynamic import for TokenCollection in bootstrap avoids potential circular dependency"
  - "GET /me uses direct getServerSession() (no requireAuth()) consistent with Phase 18 read-endpoint pattern"

patterns-established:
  - "requireRole(action, collectionId?) pattern: call at top of handler, check instanceof NextResponse, use session"
  - "404-for-invisible-resource: non-Admin users get 404 not 403 when they have no collection grant"

requirements-completed: [PERM-01, PERM-02, PERM-03, PERM-04, PERM-05]

# Metrics
duration: 2min
completed: 2026-03-28
---

# Phase 19 Plan 01: RBAC Foundation Summary

**requireRole() gate with Admin bypass + 404-for-no-grant, bootstrapCollectionGrants() idempotent backfill, and GET /permissions/me endpoint using CollectionPermission model**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-28T09:20:17Z
- **Completed:** 2026-03-28T09:22:51Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Extended require-auth.ts with requireRole() that enforces collection-scoped roles using CollectionPermission.findOne()
- Created bootstrapCollectionGrants() to backfill Admin grants for all pre-RBAC collections on first app startup
- Created GET /api/collections/[id]/permissions/me returning effective role (Admin bypass, grant lookup, 404 for no grant)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend require-auth.ts with requireRole()** - `2e14415` (feat)
2. **Task 2: Create collection-bootstrap.ts and /me endpoint** - `89feee1` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/lib/auth/require-auth.ts` - Added requireRole(action, collectionId?) with 401/403/404 logic; requireAuth() and AuthResult unchanged
- `src/lib/auth/collection-bootstrap.ts` - bootstrapCollectionGrants() with countDocuments guard and module-level idempotency flag
- `src/app/api/collections/[id]/permissions/me/route.ts` - GET handler returning { role } for authenticated user

## Decisions Made

- requireRole() returns 404 (not 403) when non-Admin user has no CollectionPermission grant — collection is invisible to them per CONTEXT.md visibility model
- Admin org role bypasses CollectionPermission lookup entirely; canPerform('Admin', action) is the only check needed
- bootstrapCollectionGrants() uses both countDocuments() guard (cross-process safety) and module-level bootstrapComplete flag (same-process idempotency)
- Dynamic import of TokenCollection inside bootstrap avoids potential circular dependency
- GET /me uses direct getServerSession() instead of requireAuth() — consistent with Phase 18 pattern of leaving GET handlers unguarded with requireAuth()

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- requireRole() is ready for use in all Phase 19 plans (19-02, 19-03, etc.)
- bootstrapCollectionGrants() ready to be called from collections list route on app startup
- GET /permissions/me ready for client-side PermissionsContext to fetch effective role per collection

## Self-Check: PASSED

- FOUND: src/lib/auth/require-auth.ts
- FOUND: src/lib/auth/collection-bootstrap.ts
- FOUND: src/app/api/collections/[id]/permissions/me/route.ts
- FOUND: .planning/phases/19-rbac-and-permissions-context/19-01-SUMMARY.md
- Commit 2e14415 verified (Task 1)
- Commit 89feee1 verified (Task 2)

---
*Phase: 19-rbac-and-permissions-context*
*Completed: 2026-03-28*
