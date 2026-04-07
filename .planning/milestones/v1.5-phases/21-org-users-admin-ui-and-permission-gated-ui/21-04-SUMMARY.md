---
phase: 21-org-users-admin-ui-and-permission-gated-ui
plan: 04
subsystem: ui
tags: [next-auth, react, radix-ui, shadcn, rbac, permissions]

# Dependency graph
requires:
  - phase: 21-02
    provides: GET /api/org/users, PATCH /api/org/users/[id]/role, DELETE /api/org/users/[id] with isSuperAdmin flag
  - phase: 20-03
    provides: /org/users page with pending invites table and InviteModal

provides:
  - Members section on /org/users showing all active+invited org members
  - Inline role selector per member row with optimistic update and revert on failure
  - Remove user flow with AlertDialog confirmation dialog
  - alert-dialog.tsx shadcn component wrapping @radix-ui/react-alert-dialog

affects: []

# Tech tracking
tech-stack:
  added:
    - "@radix-ui/react-alert-dialog@1.1.15"
  patterns:
    - "Optimistic update pattern: update state immediately, revert via re-fetch on API failure"
    - "isSuperAdmin + isSelf guard: canAct = !user.isSuperAdmin && !isSelf disables both role selector and remove button"
    - "Promise.all([fetchUsers(), fetchInvites()]) for parallel on-mount data fetching"

key-files:
  created:
    - src/components/ui/alert-dialog.tsx
  modified:
    - src/app/org/users/page.tsx

key-decisions:
  - "alert-dialog.tsx created as new shadcn-style component — @radix-ui/react-alert-dialog was not installed; added as blocking deviation (Rule 3)"
  - "canAct = !user.isSuperAdmin && !isSelf — single boolean gate controls both role selector disabled and remove button disabled"
  - "fetchUsers re-fetch on role change failure — simpler than tracking original value for revert; consistent with existing patterns"

patterns-established:
  - "AlertDialog for destructive confirmations: open={target !== null}, onOpenChange clears target on close"
  - "Inline Select for role changes: optimistic update + error toast + re-fetch revert"

requirements-completed:
  - USER-01
  - USER-05
  - USER-06

# Metrics
duration: 2min
completed: 2026-03-28
---

# Phase 21 Plan 04: Org Users Admin UI Summary

**Members table on /org/users with inline role selector (optimistic update), AlertDialog remove confirmation, and superadmin/self-removal guards**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-28T21:56:49Z
- **Completed:** 2026-03-28T21:59:38Z
- **Tasks:** 1
- **Files modified:** 2 (+ 1 created)

## Accomplishments
- Members section renders above Pending Invitations showing all active and invited org members
- Inline role selector per row with optimistic state update; reverts via re-fetch on PATCH failure with error toast
- Remove button opens AlertDialog confirmation; DELETE /api/org/users/[id] called on confirm; row disappears on success
- Superadmin row and Admin's own row have both role selector and Remove button disabled
- Created `alert-dialog.tsx` component and installed `@radix-ui/react-alert-dialog`

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend /org/users page with active members section, role selector, and remove flow** - `2d543f6` (feat)

## Files Created/Modified
- `src/app/org/users/page.tsx` - Extended with Members table, fetchUsers, handleRoleChange, handleRemoveUser, AlertDialog
- `src/components/ui/alert-dialog.tsx` - New shadcn-style AlertDialog component using @radix-ui/react-alert-dialog

## Decisions Made
- `alert-dialog.tsx` created as a blocking deviation — the plan referenced `@/components/ui/alert-dialog` but the package was not installed and the file did not exist
- `canAct = !user.isSuperAdmin && !isSelf` used as a single boolean gate for both interactive elements per row
- `fetchUsers()` re-fetch used to revert optimistic role update rather than tracking the previous value — simpler and consistent with the fetch-on-mount pattern

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed @radix-ui/react-alert-dialog and created alert-dialog.tsx**
- **Found during:** Task 1 (page implementation)
- **Issue:** Plan imports `@/components/ui/alert-dialog` but the package `@radix-ui/react-alert-dialog` was not in package.json and `alert-dialog.tsx` did not exist in `src/components/ui/`
- **Fix:** Ran `yarn add @radix-ui/react-alert-dialog`, created `src/components/ui/alert-dialog.tsx` following the same shadcn pattern as `dialog.tsx`
- **Files modified:** package.json, yarn.lock, src/components/ui/alert-dialog.tsx
- **Verification:** TypeScript compiles with zero errors; `yarn build` passes
- **Committed in:** 2d543f6 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Blocking dependency — component could not be imported without it. No scope creep; alert-dialog.tsx is the standard shadcn pattern expected by the plan.

## Issues Encountered
None beyond the blocking deviation above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 21 is now complete — all plans (01, 02, 03, 04) executed
- /org/users page has full Admin UI: view members, change roles, remove users, invite new users
- All three USER requirements (USER-01, USER-05, USER-06) satisfied end-to-end

## Self-Check: PASSED

- FOUND: src/app/org/users/page.tsx
- FOUND: src/components/ui/alert-dialog.tsx
- FOUND commit: 2d543f6

---
*Phase: 21-org-users-admin-ui-and-permission-gated-ui*
*Completed: 2026-03-28*
