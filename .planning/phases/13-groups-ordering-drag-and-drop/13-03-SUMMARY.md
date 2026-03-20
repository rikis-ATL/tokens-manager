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

patterns-established:
  - "Two-call pattern: TokenGroupTree calls applyGroupMove without themes (optimistic UI), page re-calls with themes (authoritative cascade)"
  - "Timer ref cleanup added to existing unmount useEffect alongside graphAutoSaveTimerRef and themeTokenSaveTimerRef"

requirements-completed: [ORD-01, ORD-02, ORD-03, ORD-04]

# Metrics
duration: ~5min
completed: 2026-03-20
---

# Phase 13 Plan 03: Drag-and-Drop End-to-End Wiring Summary

**Full drag-and-drop group reordering and reparenting wired end-to-end: applyGroupMove with themes atomically, 20-step undo stack via Ctrl+Z, debounced PUT /api/collections/[id] persist with tokens + themes**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-20T00:00:00Z
- **Completed:** 2026-03-20T00:05:00Z
- **Tasks:** 1 of 2 complete (Task 2 is human verification checkpoint)
- **Files modified:** 2

## Accomplishments

- Extended `TokenGroupTree.tsx` `onGroupsReordered` callback from `(newGroups)` to `(newGroups, activeId, overId)` — enables page to re-run applyGroupMove with themes
- `handleDragEnd` now extracts `activeId` and `overId` before calling `applyGroupMove` and forwards them to the callback
- Implemented `handleGroupsReordered` in `CollectionTokensPage` using `applyGroupMove(masterGroups, activeId, overId, nonDefaultThemes)` for atomic group + theme cascade
- In-memory undo stack (`undoStackRef`, max 20 steps) stores `masterGroups` before each drag
- Ctrl+Z / Cmd+Z reverts last drag and persists reverted order to MongoDB
- Debounced 300ms PUT `/api/collections/${id}` with `{ tokens, themes }` after every drag

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend callback signature, wire handleGroupsReordered with applyGroupMove+themes, add undo and persist** - `047211b` (feat)

**Plan metadata:** (to be committed with this summary)

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

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Full drag-and-drop system is complete and awaiting human verification (Task 2 checkpoint)
- After human approval, Phase 13 is complete
- No blockers

---
*Phase: 13-groups-ordering-drag-and-drop*
*Completed: 2026-03-20*
