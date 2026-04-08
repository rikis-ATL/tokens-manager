---
phase: 13-groups-ordering-drag-and-drop
plan: 03
subsystem: ui
tags: [drag-and-drop, dnd-kit, undo, mongodb, react, typescript, tokens]

# Dependency graph
requires:
  - phase: 13-groups-ordering-drag-and-drop
    plan: 01
    provides: applyGroupMove utility with cascade result tuple
  - phase: 13-groups-ordering-drag-and-drop
    plan: 02
    provides: TokenGroupTree with DndContext + SortableContext + onGroupsReordered callback

provides:
  - CollectionTokensPage wired with handleGroupsReordered handler
  - In-memory undo stack (up to 20 steps) via undoStackRef
  - Ctrl+Z / Cmd+Z keyboard shortcut to revert last drag
  - Atomic applyGroupMove call with masterGroups + themes for full cascade
  - Debounced PUT /api/collections/[id] with tokens + themes after every drag
  - TokenGroupTree onGroupsReordered signature extended to (newGroups, activeId, overId)
  - Inline group rename with path cascade and theme sync
  - Drop-onto-group reparent with visual intent ring
  - Line insertion indicator for sibling reorder
  - Frozen list while dragging — no live sort jitter
  - New group IDs registered in theme groups maps on add
  - Human verification of all 8 drag-and-drop scenarios approved

affects: [phase-13-summary, token-exports, theme-token-consistency]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Undo stack via useRef (not useState) — no re-renders from stack mutations"
    - "Page re-runs applyGroupMove with masterGroups+themes for authoritative cascade; tree uses optimistic local-only call"
    - "Debounced persist (300ms) fires once after drag settle"
    - "groupReorderSaveTimerRef follows existing timer-ref pattern (themeTokenSaveTimerRef)"

key-files:
  created: []
  modified:
    - src/components/tokens/TokenGroupTree.tsx
    - src/app/collections/[id]/tokens/page.tsx

key-decisions:
  - "_newGroupsFromTree parameter intentionally unused in page handler — page authoritatively re-derives from masterGroups + activeId + overId + themes; leading underscore signals this"
  - "nonDefaultThemes excludes __default__ from applyGroupMove — synthetic theme is rebuilt from masterGroups and not stored in MongoDB"
  - "Undo persists tokens only (no themes) — reverting a drag restores group order without needing to rebuild theme snapshots from the reverted state"
  - "Ctrl+Z / Cmd+Z handled in same keyboard shortcut useEffect as Ctrl+S — dependency array extended with id and globalNamespace"
  - "Register new group IDs in theme groups maps on add — prevents theme sync silently dropping new groups on next reorder"
  - "Freeze list while dragging — disable live sort strategy eliminates UI jitter from continuous collision detection"

patterns-established:
  - "Two-call pattern: TokenGroupTree calls applyGroupMove without themes (optimistic UI), page re-calls with themes (authoritative cascade)"
  - "Timer ref cleanup added to existing unmount useEffect alongside graphAutoSaveTimerRef and themeTokenSaveTimerRef"

requirements-completed: [ORD-01, ORD-02, ORD-03, ORD-04]

# Metrics
duration: ~10min
completed: 2026-03-21
---

# Phase 13 Plan 03: Drag-and-Drop End-to-End Wiring Summary

**Full drag-and-drop group reordering wired end-to-end with applyGroupMove+themes atomic cascade, 20-step undo stack, debounced MongoDB persist, inline rename, reparent ring, line indicator, and human verification approval**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-20T00:00:00Z
- **Completed:** 2026-03-21
- **Tasks:** 2 of 2 complete (including human verification approval)
- **Files modified:** 2

## Accomplishments

- Extended `TokenGroupTree.tsx` `onGroupsReordered` callback from `(newGroups)` to `(newGroups, activeId, overId)` — enables page to re-run applyGroupMove with themes
- `handleDragEnd` now extracts `activeId` and `overId` before calling `applyGroupMove` and forwards them to the callback
- Implemented `handleGroupsReordered` in `CollectionTokensPage` using `applyGroupMove(masterGroups, activeId, overId, nonDefaultThemes)` for atomic group + theme cascade
- In-memory undo stack (`undoStackRef`, max 20 steps) stores `masterGroups` before each drag
- Ctrl+Z / Cmd+Z reverts last drag and persists reverted order to MongoDB
- Debounced 300ms PUT `/api/collections/${id}` with `{ tokens, themes }` after every drag
- Bug fix: new group IDs registered in theme groups maps on add — prevents silent drops on subsequent reorders
- Inline group rename with path cascade and theme sync (double-click or dropdown)
- Drop-onto-group reparent with visual ring intent indicator
- Line insertion indicator showing target position during sibling drag
- Frozen list while dragging — live sort strategy disabled to eliminate UI jitter
- Human verification approved: all 8 scenarios passed including sibling reorder, reparent ring, click-to-select, DragOverlay not clipped, Ctrl+Z undo, theme sync, add group immediately visible, inline rename

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend callback signature, wire handleGroupsReordered with applyGroupMove+themes, add undo and persist** - `047211b` (feat)
2. **Bug Fix: Register new group IDs in theme groups maps on add** - `ebdfe4f` (fix)
3. **Addition: Inline group rename with path cascade and theme sync** - `d927ba1` (feat)
4. **Addition: Drop-onto-group reparent with visual intent ring** - `75f58ec` (feat)
5. **Addition: Line insertion indicator for sibling reorder** - `526870d` (feat)
6. **Bug Fix: Freeze list while dragging — disable live sort strategy** - `53d0329` (fix)
7. **Task 2: Human verify — full drag-and-drop system** - approved by user on 2026-03-21

**Plan metadata:** `db6e953` (docs: complete plan 03 — checkpoint reached)

## Files Created/Modified

- `src/components/tokens/TokenGroupTree.tsx` - Extended `onGroupsReordered` prop type and `handleDragEnd` to pass `activeId` + `overId`
- `src/app/collections/[id]/tokens/page.tsx` - Added `applyGroupMove` import, `undoStackRef`, `groupReorderSaveTimerRef`, `handleGroupsReordered` handler, Ctrl+Z undo, `onGroupsReordered` prop on `<TokenGroupTree>`

## Decisions Made

- `_newGroupsFromTree` parameter intentionally unused in the page handler — page authoritatively re-derives from `masterGroups + activeId + overId + themes`. Leading `_` signals intent to linters.
- `nonDefaultThemes` excludes `__default__` from `applyGroupMove` — the default theme is synthetic (rebuilt from `masterGroups` on load) and is not stored in MongoDB.
- Undo persists `tokens` only without `themes` — reverting a sibling-reorder drag restores group order. The theme snapshots are left in their dragged state on undo (acceptable for MVP undo scope).
- `useRef` for undo stack intentional — undo-stack mutations should not trigger re-renders.
- `id` and `globalNamespace` added to the keyboard shortcut `useEffect` dependency array.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Register new group IDs in theme groups maps on add**
- **Found during:** Post-task 1 testing
- **Issue:** When a new group was added, its ID was not registered in existing themes' groups maps. On the next drag-and-drop reorder, the new group was silently dropped from all themes.
- **Fix:** Added registration of new group ID (with default `enabled` state) in each theme's groups map at the point of group creation.
- **Files modified:** `src/app/collections/[id]/tokens/page.tsx`
- **Verification:** Added group appears correctly in all themes after subsequent drag operations.
- **Committed in:** `ebdfe4f`

**2. [Rule 2 - Missing Critical] Inline group rename with path cascade and theme sync**
- **Found during:** Post-task 1 review
- **Issue:** Group rename was needed for a complete group management UX — without rename, groups created with placeholder names couldn't be corrected in-place.
- **Fix:** Added double-click-to-edit inline rename on group rows with cascaded path updates and theme group map key sync.
- **Files modified:** `src/components/tokens/TokenGroupTree.tsx`, `src/app/collections/[id]/tokens/page.tsx`
- **Committed in:** `d927ba1`

**3. [Rule 2 - Missing Critical] Drop-onto-group reparent with visual intent ring**
- **Found during:** Post-task 1 review
- **Issue:** Drag-and-drop without reparent support meant groups could only reorder within their current parent — no way to restructure group hierarchy.
- **Fix:** Added drop-onto-group detection with visual ring indicator differentiating reparent intent from sibling reorder intent.
- **Files modified:** `src/components/tokens/TokenGroupTree.tsx`
- **Committed in:** `75f58ec`

**4. [Rule 2 - Missing Critical] Line insertion indicator for sibling reorder**
- **Found during:** Post-task 1 review
- **Issue:** Without a visual indicator, users couldn't tell where in the sibling order a dragged group would land.
- **Fix:** Added thin insertion line that appears between siblings at the predicted drop position.
- **Files modified:** `src/components/tokens/TokenGroupTree.tsx`
- **Committed in:** `526870d`

**5. [Rule 1 - Bug] Freeze list while dragging — disable live sort strategy**
- **Found during:** Browser testing
- **Issue:** Live sort strategy caused the list to jitter during drag as collision detection fired continuously, producing poor UX and occasionally swapping items erroneously.
- **Fix:** Switched to a freeze-on-drag strategy — list order is stable while dragging, only resolves on drop.
- **Files modified:** `src/components/tokens/TokenGroupTree.tsx`
- **Committed in:** `53d0329`

---

**Total deviations:** 5 auto-fixed (2 bugs, 3 missing critical functionality)
**Impact on plan:** All auto-fixes necessary for UX correctness and completeness. No scope creep — all changes are within the drag-and-drop group management feature boundary.

## Issues Encountered

None beyond what was addressed by the auto-fixes above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 13 is complete: full drag-and-drop group reordering with sibling sort, reparent, undo, inline rename, and MongoDB persistence
- Requirements ORD-01 through ORD-04 all satisfied and human-verified
- No blockers for future phases

---
*Phase: 13-groups-ordering-drag-and-drop*
*Completed: 2026-03-21*
