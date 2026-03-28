---
phase: 19-rbac-and-permissions-context
plan: "03"
subsystem: auth
tags: [rbac, permissions, next-auth, route-handlers, next.js]

# Dependency graph
requires:
  - phase: 19-rbac-and-permissions-context
    plan: "01"
    provides: requireRole(action, collectionId?) exported from src/lib/auth/require-auth.ts
  - phase: 16-permissions-model
    provides: Action const object with PushGithub, PushFigma, Write, ManageUsers, Read

provides:
  - requireRole(Action.PushGithub) on POST /api/export/github — Viewer blocked (403)
  - requireRole(Action.PushFigma) on POST /api/export/figma — Viewer blocked (403)
  - requireRole(Action.PushGithub) on POST /api/github/branches — Viewer blocked (403)
  - requireRole(Action.PushFigma) on POST /api/figma/import — Viewer blocked (403)
  - requireRole(Action.PushGithub) on POST /api/import/github — Viewer blocked (403)
  - requireRole(Action.Write) on POST /api/build-tokens — Viewer blocked (403)
  - requireRole(Action.Write) on PUT /api/tokens/[...path] — Viewer blocked (403)
  - requireRole(Action.ManageUsers) on POST /api/database/test — Editor/Viewer blocked (403)
  - requireRole(Action.ManageUsers) on PUT /api/database/config — Editor/Viewer blocked (403)

affects:
  - all future plans relying on requireRole() being the org-level gate for write operations

# Tech tracking
tech-stack:
  added: []
  patterns:
    - requireRole(Action.Xxx) org-level check (no collectionId) for non-collection-scoped routes
    - Action.ManageUsers as Admin-only gate for database utility routes
    - Action.PushGithub / Action.PushFigma as Editor+ gate for external service push/pull

key-files:
  created: []
  modified:
    - src/app/api/export/github/route.ts
    - src/app/api/export/figma/route.ts
    - src/app/api/github/branches/route.ts
    - src/app/api/figma/import/route.ts
    - src/app/api/import/github/route.ts
    - src/app/api/build-tokens/route.ts
    - src/app/api/tokens/[...path]/route.ts
    - src/app/api/database/test/route.ts
    - src/app/api/database/config/route.ts

key-decisions:
  - "Export/import routes use org-level requireRole() with no collectionId — collection-level access gated at UI layer before these operations are triggered"
  - "Action.PushGithub gates both GitHub export and import — symmetrical: if you can push to GitHub you can also import from it"
  - "Action.ManageUsers for database test/config routes — Admin-only by definition; no Editor or Viewer should reconfigure the database"
  - "PUT /api/tokens/[...path] uses Action.Write — it's a direct filesystem token write operation"
  - "POST /api/build-tokens uses Action.Write — building tokens is a server-side write/transform; Viewer cannot trigger builds"
  - "GET /api/database/config left unguarded — consistent with Phase 18 pattern (GET handlers not guarded); config GET returns sanitized/masked data"

patterns-established:
  - "requireRole(Action.Xxx) without collectionId: org-level check for routes not scoped to a specific collection"
  - "All 9 non-collection-scoped write handlers upgraded; only /api/auth/setup remains using requireAuth() as documented bootstrap exception"

requirements-completed: [PERM-01, PERM-02, PERM-03]

# Metrics
duration: 3min
completed: 2026-03-28
---

# Phase 19 Plan 03: Non-Collection Route Guards Summary

**requireRole() with Action-specific org-level gates on all 9 export/import/utility route handlers — Viewer blocked from GitHub/Figma push, database operations Admin-only**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-28T09:25:34Z
- **Completed:** 2026-03-28T09:28:47Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Upgraded 5 export/import routes to requireRole() with Action.PushGithub or Action.PushFigma — Viewer org role returns 403
- Upgraded 4 utility routes: build-tokens and tokens proxy to Action.Write; database test/config to Action.ManageUsers (Admin-only)
- Zero requireAuth() calls remain outside the documented /api/auth/setup bootstrap exception and comment references

## Task Commits

Each task was committed atomically:

1. **Task 1: Upgrade export and import route handlers** - `d6b4f8f` (feat)
2. **Task 2: Upgrade utility route handlers** - `17ceb35` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/app/api/export/github/route.ts` - requireRole(Action.PushGithub) — GitHub push gated to Editor+
- `src/app/api/export/figma/route.ts` - requireRole(Action.PushFigma) — Figma push gated to Editor+
- `src/app/api/github/branches/route.ts` - requireRole(Action.PushGithub) — branch create gated to Editor+
- `src/app/api/figma/import/route.ts` - requireRole(Action.PushFigma) — Figma import gated to Editor+
- `src/app/api/import/github/route.ts` - requireRole(Action.PushGithub) — GitHub import gated to Editor+
- `src/app/api/build-tokens/route.ts` - requireRole(Action.Write) — token build gated to Editor+
- `src/app/api/tokens/[...path]/route.ts` - requireRole(Action.Write) — token file write gated to Editor+
- `src/app/api/database/test/route.ts` - requireRole(Action.ManageUsers) — DB test gated to Admin only
- `src/app/api/database/config/route.ts` - requireRole(Action.ManageUsers) — DB config PUT gated to Admin only

## Decisions Made

- Export/import routes use org-level requireRole() with no collectionId — collection-level access is gated at the UI layer before these operations are triggered
- Action.PushGithub gates both GitHub export and import symmetrically — if you can push to GitHub you can import from it
- Action.ManageUsers for database test/config routes — Admin-only by definition; no Editor or Viewer should reconfigure the database
- PUT /api/tokens/[...path] uses Action.Write — it directly modifies filesystem token files
- GET /api/database/config left unguarded — Phase 18 pattern; returns sanitized/masked config data; no security concern

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Cleared stale tsconfig.tsbuildinfo causing false TypeScript errors**
- **Found during:** Task 1 verification (TypeScript check)
- **Issue:** tsc reported "Cannot find name 'requireAuth'" at a line in themes/[themeId]/tokens/route.ts that already used requireRole() — stale tsbuildinfo cache from uncommitted changes in git status
- **Fix:** Deleted tsconfig.tsbuildinfo to force full recompile; zero errors after cache clear
- **Files modified:** tsconfig.tsbuildinfo (deleted, regenerated)
- **Verification:** npx tsc --noEmit exits 0 after clearing cache
- **Committed in:** Not staged separately — tsbuildinfo is generated artifact

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking)
**Impact on plan:** Cache clear was necessary to confirm TypeScript validity. No scope creep.

## Issues Encountered

Stale tsconfig.tsbuildinfo from previous session's uncommitted changes caused misleading TypeScript error during verification. Resolved by deleting the cache file and rerunning tsc.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 9 non-collection-scoped write routes now use requireRole() — no requireAuth() remains in the codebase outside the bootstrap exception
- Phase 19 RBAC upgrade complete: collection routes (19-02), export/import/utility routes (19-03) all use role-appropriate gates
- PermissionsContext (Phase 17 scaffold) can now be expanded to fetch and expose collection-scoped roles to the UI

## Self-Check: PASSED

- FOUND: src/app/api/export/github/route.ts
- FOUND: src/app/api/export/figma/route.ts
- FOUND: src/app/api/github/branches/route.ts
- FOUND: src/app/api/figma/import/route.ts
- FOUND: src/app/api/import/github/route.ts
- FOUND: src/app/api/build-tokens/route.ts
- FOUND: src/app/api/tokens/[...path]/route.ts
- FOUND: src/app/api/database/test/route.ts
- FOUND: src/app/api/database/config/route.ts
- Commit d6b4f8f verified (Task 1)
- Commit 17ceb35 verified (Task 2)

---
*Phase: 19-rbac-and-permissions-context*
*Completed: 2026-03-28*
