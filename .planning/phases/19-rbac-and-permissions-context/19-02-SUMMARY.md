---
phase: 19-rbac-and-permissions-context
plan: "02"
subsystem: auth
tags: [rbac, next-auth, permissions, api, route-handlers, collection-scoped]

# Dependency graph
requires:
  - phase: 19-01
    provides: requireRole(), CollectionPermission model, bootstrapCollectionGrants()
  - phase: 18-02
    provides: requireAuth() pattern applied to all write handlers
provides:
  - Auth-gated GET /api/collections with bootstrapCollectionGrants + non-Admin grant filtering
  - requireRole(Action.CreateCollection) on POST /api/collections
  - Session-gated GET /api/collections/[id] with 404 for non-Admin without grant
  - requireRole(Action.Write, id) on PUT /api/collections/[id]
  - requireRole(Action.DeleteCollection, id) on DELETE /api/collections/[id]
  - requireRole(Action.CreateCollection, id) on POST /api/collections/[id]/duplicate
  - requireRole(Action.Write, id) on POST/PUT/DELETE /api/collections/[id]/themes/*
  - requireRole(Action.Write, id) on PATCH /api/collections/[id]/themes/[themeId]/tokens
  - POST+DELETE /api/collections/[id]/permissions — Admin-only grant/revoke endpoint
affects: [19-03, 19-04, 19-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - requireRole(action, collectionId) replaces requireAuth() on all collection write handlers
    - GET handlers that return user-scoped data use direct getServerSession() + manual grant check (not requireRole)
    - Admin org role bypasses CollectionPermission lookup; non-Admin requires explicit grant or receives 404

key-files:
  created:
    - src/app/api/collections/[id]/permissions/route.ts
  modified:
    - src/app/api/collections/route.ts
    - src/app/api/collections/[id]/route.ts
    - src/app/api/collections/[id]/duplicate/route.ts
    - src/app/api/collections/[id]/themes/route.ts
    - src/app/api/collections/[id]/themes/[themeId]/route.ts
    - src/app/api/collections/[id]/themes/[themeId]/tokens/route.ts

key-decisions:
  - "GET /api/collections calls bootstrapCollectionGrants() at the top of every request — idempotent no-op after first run (module-level flag + countDocuments guard)"
  - "GET /api/collections returns 401 for no session; filters docs by CollectionPermission grants for non-Admins"
  - "GET /api/collections/[id] returns 404 (not 403) for non-Admin without grant — collection invisible to user"
  - "POST /api/collections/[id]/duplicate uses requireRole(Action.CreateCollection, params.id) — duplicating creates a new collection"
  - "POST+DELETE /api/collections/[id]/permissions uses requireRole(Action.ManageUsers) with no collectionId — Admin-only org-level check"
  - "permissions/route.ts is a sibling of permissions/me/route.ts in the [id]/permissions/ directory"

patterns-established:
  - "requireRole(action, collectionId) is the standard gate for all collection write handlers — replaces requireAuth()"
  - "GET handlers returning user-scoped lists use getServerSession() directly + manual filtering (not requireRole)"
  - "404 for invisible collections — non-Admin users with no grant see 404, not 403"

requirements-completed: [PERM-01, PERM-02, PERM-03, PERM-04, PERM-05]

# Metrics
duration: 3min
completed: 2026-03-28
---

# Phase 19 Plan 02: Collection Route RBAC Enforcement Summary

**All 7 collection route handlers upgraded from requireAuth() to requireRole() with correct action+collectionId, plus Admin-only grant/revoke permissions API at /api/collections/[id]/permissions**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-28T09:25:36Z
- **Completed:** 2026-03-28T09:28:54Z
- **Tasks:** 2
- **Files modified:** 7 (6 modified, 1 created)

## Accomplishments
- GET /api/collections now calls bootstrapCollectionGrants(), requires session (401), and filters collections list by CollectionPermission grants for non-Admin users
- All 6 collection write handlers (collections, [id], duplicate, themes, [themeId], tokens) replaced requireAuth() with requireRole(action, collectionId) using correct action mappings
- New /api/collections/[id]/permissions route with POST (grant) and DELETE (revoke) handlers, Admin-only via Action.ManageUsers

## Task Commits

Each task was committed atomically:

1. **Task 1: Upgrade GET+POST /api/collections and GET/PUT/DELETE /api/collections/[id]** - `2aabe0b` (feat)
2. **Task 2: Upgrade themes routes and create permissions grant API** - `493165b` (feat)

## Files Created/Modified
- `src/app/api/collections/route.ts` - GET: bootstrapCollectionGrants + session check + grant filtering for non-Admins; POST: requireRole(Action.CreateCollection)
- `src/app/api/collections/[id]/route.ts` - GET: session check + 404 for non-Admin without grant; PUT: requireRole(Action.Write, id); DELETE: requireRole(Action.DeleteCollection, id)
- `src/app/api/collections/[id]/duplicate/route.ts` - POST: requireRole(Action.CreateCollection, id)
- `src/app/api/collections/[id]/themes/route.ts` - POST: requireRole(Action.Write, id)
- `src/app/api/collections/[id]/themes/[themeId]/route.ts` - PUT/DELETE: requireRole(Action.Write, id)
- `src/app/api/collections/[id]/themes/[themeId]/tokens/route.ts` - PATCH: requireRole(Action.Write, id)
- `src/app/api/collections/[id]/permissions/route.ts` (NEW) - POST (grant) and DELETE (revoke) Admin-only endpoints

## Decisions Made
- GET /api/collections/[id] returns 404 (not 403) for non-Admin without grant — matches CONTEXT.md: "collections not granted to a user are completely invisible"
- POST /api/collections/[id]/duplicate uses requireRole(Action.CreateCollection, params.id) — treating duplicate as CreateCollection matches the plan spec
- permissions/route.ts created as sibling to the existing permissions/me/route.ts from Plan 01

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All collection routes are now RBAC-enforced; Phase 19-03 can add RBAC to export/import routes
- /api/collections/[id]/permissions endpoint ready for Admin UI integration in later phases

---
*Phase: 19-rbac-and-permissions-context*
*Completed: 2026-03-28*
