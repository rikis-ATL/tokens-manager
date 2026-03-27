---
phase: 13-groups-ordering-drag-and-drop
verified: 2026-03-21T00:00:00Z
status: passed
score: 9/9 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Drag a group row to a new sibling position and verify immediate UI update and persistence after refresh"
    expected: "Tree reorders immediately; new order survives page refresh"
    why_human: "Cannot drive PointerSensor drag-and-drop events programmatically; persistence requires browser + MongoDB round-trip"
  - test: "Drag a group ONTO another group (into mode) to trigger reparenting"
    expected: "Dropped group becomes a child of the target; its children travel with it; all themes still show the group"
    why_human: "Reparenting with 'into' drop mode requires spatial pointer position in the middle zone of a target row; can't verify without browser"
  - test: "Press Ctrl+Z after a drag reorder"
    expected: "Tree reverts to previous order; refreshing the page shows the reverted order"
    why_human: "Keyboard shortcut handler with state mutation requires interactive browser session"
  - test: "With themes present: reparent a group that has theme-overridden tokens; switch to each theme"
    expected: "Theme tokens for the moved group are still present and correct (not silently dropped)"
    why_human: "Theme cascade correctness after reparent requires data inspection across multiple theme snapshots in a live session"
---

# Phase 13: Groups Ordering Drag and Drop — Verification Report

**Phase Goal:** Users can drag and drop token groups in the sidebar tree to reorder siblings and reparent groups; drag order persists to MongoDB, updates all theme snapshots, and becomes the canonical export sequence
**Verified:** 2026-03-21
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A group row displays a GripVertical handle; dragging more than 8px initiates a drag operation | VERIFIED | `SortableGroupRow.tsx` renders `<GripVertical size={12} />` button with `{...listeners}`; `TokenGroupTree.tsx` uses `PointerSensor` with `activationConstraint: { distance: 8 }` |
| 2 | `applyGroupMove` returns a new `TokenGroup[]` tree with all cascades applied (IDs, paths, aliases, theme maps) | VERIFIED | `groupMove.ts` implements full cascade: `rewriteSubtreeIds`, `rewriteAliasesInTree`, `migrateThemeGroupKeys`, `syncThemeTokenOrder` for both sibling-reorder and reparenting branches |
| 3 | `SortableGroupRow` renders a draggable tree row with a GripVertical handle via `useSortable` | VERIFIED | `SortableGroupRow.tsx` calls `useSortable({ id: node.group.id })` inside `SortableRowInner`; hook result applied to outer div via `setNodeRef`, `attributes`, `listeners` |
| 4 | `TokenGroupTree` renders all groups as a flat sortable list inside a single `DndContext + SortableContext` | VERIFIED | `TokenGroupTree.tsx:138–170` — `DndContext` with `closestCenter`, `SortableContext` with `sortedIds`, `flatNodes.map(...)` rendering `SortableGroupRow` per node |
| 5 | Dragging a group row shows a `DragOverlay` ghost that is never clipped by sidebar overflow | VERIFIED | `DragOverlay` component present at `TokenGroupTree.tsx:160–169`; placed inside the `overflow-y-auto` container but renders at document body portal level (React portal) |
| 6 | Dropping a group calls `onGroupsReordered` with the new `TokenGroup[]` tree, `activeId`, `overId`, and `dropMode` | VERIFIED | `handleDragEnd` at `TokenGroupTree.tsx:99–110` extracts `activeId`, `overId`, resolves `dropMode` from `dropIntent`, calls `applyGroupMove`, then fires `onGroupsReordered?.(newGroups, activeId, overId, dropMode)` |
| 7 | Drag order persists to MongoDB — the new order survives a page refresh | VERIFIED (automated portion) | `handleGroupsReordered` in `page.tsx:326–339` does debounced `fetch(/api/collections/${id}, { method: 'PUT', body: { tokens, themes } })`; `mongo-repository.ts` applies `$set: data` including `themes` field |
| 8 | All existing theme `.tokens` snapshots are reordered/re-keyed to match after every drag | VERIFIED | Page calls `applyGroupMove(masterGroups, activeId, overId, nonDefaultThemes, dropMode)` atomically; result's `updatedThemes` fed to `setThemes`; sibling-reorder path uses `syncThemeTokenOrder`; reparent path uses `rewriteSubtreeIdsInArray + migrateThemeGroupKeys` |
| 9 | Ctrl+Z reverts the last drag operation (up to 20 steps) within the session | VERIFIED | `undoStackRef` (`useRef<TokenGroup[][]>`) at `page.tsx:94`; keyboard handler at `page.tsx:466–487` handles `(e.metaKey \|\| e.ctrlKey) && e.key === 'z'`; pops stack, calls `setMasterGroups(previous)`, persists via debounced PUT |

**Score:** 9/9 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/utils/groupMove.ts` | Pure applyGroupMove cascade utility | VERIFIED | 671 lines; exports `FlatNode`, `flattenTree`, `buildTreeFromFlat`, `applyGroupMove`, `ApplyGroupMoveResult`, `DropMode`, `applyGroupRename`; zero React/Next imports |
| `src/components/tokens/SortableGroupRow.tsx` | Single draggable group row with GripVertical | VERIFIED | 304 lines; exports `SortableGroupRow`; uses `useSortable`, `GripVertical`, inline rename, drop intent ring, insertion line indicators |
| `src/components/tokens/TokenGroupTree.tsx` | DnD-enabled tree with DndContext, SortableContext, DragOverlay, SortableGroupRow | VERIFIED | 174 lines; uses `DndContext`, `SortableContext`, `DragOverlay`; no local `FlatNode` or local `flattenTree`; `onGroupsReordered` prop with 4-arg signature |
| `src/app/collections/[id]/tokens/page.tsx` | `handleGroupsReordered` handler + undo stack + persist call wired to TokenGroupTree | VERIFIED | `undoStackRef`, `MAX_UNDO=20`, `groupReorderSaveTimerRef` declared; `handleGroupsReordered` implemented with full atomic cascade; `onGroupsReordered={handleGroupsReordered}` passed to `<TokenGroupTree>` at line 842 |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `SortableGroupRow.tsx` | `@dnd-kit/sortable` | `useSortable` hook | WIRED | Line 4: `import { useSortable } from '@dnd-kit/sortable'`; called at line 224 `useSortable({ id: node.group.id })` |
| `groupMove.ts` | `src/types/token.types.ts` | `TokenGroup` type import | WIRED | Line 8: `import { TokenGroup, GeneratedToken } from '@/types/token.types'` |
| `TokenGroupTree.tsx` | `src/utils/groupMove.ts` | `applyGroupMove` and `flattenTree` imports | WIRED | Line 19: `import { applyGroupMove, flattenTree, type FlatNode, type DropMode } from '@/utils/groupMove'`; both used in component body |
| `TokenGroupTree.tsx` | `SortableGroupRow.tsx` | `SortableGroupRow` render | WIRED | Line 20: import; rendered at lines 148–158 and 162–168 (DragOverlay) |
| `page.tsx` | `TokenGroupTree.tsx` | `onGroupsReordered` prop | WIRED | Line 842: `onGroupsReordered={handleGroupsReordered}`; callback signature `(newGroups, activeId, overId, dropMode)` matches |
| `page.tsx` | `src/utils/groupMove.ts` | `applyGroupMove(masterGroups, activeId, overId, nonDefaultThemes, dropMode)` | WIRED | Line 28: `import { applyGroupMove, applyGroupRename, type DropMode } from '@/utils/groupMove'`; called at page.tsx:310–316 with all 5 arguments |
| `page.tsx` | `/api/collections/[id]` | PUT fetch with `{ tokens, themes }` after drag | WIRED | Lines 329–333: `fetch(\`/api/collections/${id}\`, { method: 'PUT', body: JSON.stringify({ tokens: rawTokens, themes: updatedThemes }) })`; PUT handler confirmed to accept and persist `themes` via `$set: data` |

---

## Requirements Coverage

| Requirement | Source Plans | Description (Derived from ROADMAP + plan context) | Status | Evidence |
|-------------|-------------|---------------------------------------------------|--------|----------|
| ORD-01 | 13-01, 13-02, 13-03 | User can drag and drop group rows using a GripVertical handle | SATISFIED | `SortableGroupRow.tsx` renders drag handle; `TokenGroupTree.tsx` uses `PointerSensor` with 8px activation constraint; `handleDragEnd` fires `onGroupsReordered` |
| ORD-02 | 13-01, 13-03 | Drag order persists to MongoDB and survives page refresh | SATISFIED | `handleGroupsReordered` in page debounces PUT `/api/collections/[id]` with `tokens + themes`; repo uses `$set: data` including `themes` |
| ORD-03 | 13-01, 13-02, 13-03 | All theme snapshots are updated after every drag (sibling reorder and reparent) | SATISFIED | `applyGroupMove` with `themes` argument called atomically in page handler; sibling path uses `syncThemeTokenOrder`; reparent path uses `rewriteSubtreeIdsInArray + migrateThemeGroupKeys` |
| ORD-04 | 13-03 | Drag order becomes the canonical export sequence (export uses new order) | SATISFIED | `tokenService.generateStyleDictionaryOutput(newGroups, globalNamespace)` called after reorder produces `rawTokens` from the new `newGroups` order; this is the payload sent to MongoDB and used for exports |

### Orphaned Requirements Note

ORD-01 through ORD-04 are **not defined in `.planning/REQUIREMENTS.md`**. They appear only in the ROADMAP.md Phase 13 section (`**Requirements:** ORD-01, ORD-02, ORD-03, ORD-04`) and in PLAN frontmatter. REQUIREMENTS.md covers v1.4 requirements (THEME-*, EDIT-*, EXPORT-*) and ends with Phase 12. The ORD-* IDs are undocumented in the requirements register — no formal requirement definitions exist for them. The implementations clearly satisfy the intent described in the ROADMAP goal and plan objectives, but these IDs should be added to REQUIREMENTS.md for traceability completeness.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `groupMove.ts` | 385 | `return null` | Info | Legitimate — `findGroupInTree` recursive search returning null when ID not found; not a stub |
| `SortableGroupRow.tsx` | 120 | `return null` | Info | Legitimate — `GroupActions` renders nothing when no action props provided; not a stub |

No blockers. No stubs. No TODO/FIXME/PLACEHOLDER markers. No empty implementations.

---

## Human Verification Required

### 1. Sibling drag reorder — persistence

**Test:** Open a collection with multiple groups. Hover a row, confirm GripVertical handle appears. Drag a group to a different sibling position. Release.
**Expected:** Tree reorders immediately with no flash; after page refresh the new order is preserved.
**Why human:** Cannot drive `PointerSensor` drag events programmatically; persistence requires live browser + MongoDB round-trip.

### 2. Reparent via "drop into" (middle-zone drop)

**Test:** Drag a group row slowly onto the center (middle 40%) of another group row to trigger the blue ring intent indicator. Release.
**Expected:** Dropped group moves under the target as a child; all its children travel with it; all themes still show the group in its new location.
**Why human:** Requires spatial pointer position within exact zone; reparenting correctness across themes needs live data inspection.

### 3. Ctrl+Z / Cmd+Z undo

**Test:** Perform a drag reorder. Press Ctrl+Z (Cmd+Z on Mac).
**Expected:** Tree reverts to previous order immediately; page refresh shows the reverted order persisted.
**Why human:** Keyboard shortcut + state mutation requires interactive browser session; cannot simulate keyboard events and state sequences programmatically.

### 4. Theme snapshot integrity after reparent

**Test:** With at least one custom theme, select the theme, note token values for a group. Switch back to default, reparent that group, switch to the custom theme again.
**Expected:** Theme tokens for the moved group are still present and show the correct overridden values (not reverted to default, not missing).
**Why human:** Requires multi-step browser interaction, theme switching, and cross-comparing token values across MongoDB-stored theme snapshots.

---

## Gaps Summary

No gaps. All 9 observable truths verified. All 4 required artifacts exist and are substantive and wired. All 7 key links confirmed present in code. TypeScript compiles cleanly (`yarn tsc --noEmit` exits 0). No blocker anti-patterns found.

**One administrative note:** ORD-01 through ORD-04 are not formally defined in `.planning/REQUIREMENTS.md`. They are used in ROADMAP and PLAN frontmatter but have no entries in the requirements register. This is a documentation gap, not an implementation gap — the feature is fully built and the ROADMAP goal is achieved.

---

_Verified: 2026-03-21_
_Verifier: Claude (gsd-verifier)_
