---
phase: 15-multi-row-actions
plan: "03"
subsystem: tokens-ui
tags: [multi-row-select, bulk-actions, undo, integration, checkbox, TokenGeneratorForm]
dependency_graph:
  requires: [15-01, 15-02]
  provides: [multi-row selection in token table, bulk action wiring, undo propagation to page]
  affects: [src/components/tokens/TokenGeneratorForm.tsx, src/app/collections/[id]/tokens/page.tsx]
tech_stack:
  added: []
  patterns: [dual-source-routing (themeTokens vs tokenGroups), applyBulkMutation factory, tokenUndoStackRef for theme undo, onUndoSnapshot for default undo, shift-range-select with lastSelectedIndexRef]
key_files:
  created: []
  modified:
    - src/components/tokens/TokenGeneratorForm.tsx
    - src/app/collections/[id]/tokens/page.tsx
decisions:
  - "TokenTableRow receives isMultiSelected, tokenIndex, onMultiSelectClick props — avoids inline tr rendering, keeps TokenTableRow self-contained"
  - "onChange handler on checkbox is a no-op — onClick is used exclusively to capture shiftKey for range selection"
  - "activeGroupTokens derived from themeTokens/tokenGroups at renderGroup call site — single variable reused for header checkbox, row checkbox, and BulkActionBar"
  - "BulkActionBar mount wrapped in px-2 pt-2 div inside overflow-x-auto — consistent with existing table container"
  - "applyBulkMutation pushes snapshot to both tokenUndoStackRef AND onUndoSnapshot in default mode for dual coverage"
metrics:
  duration: "~5 min"
  completed: "2026-03-27"
  tasks_completed: 2
  files_changed: 2
---

# Phase 15 Plan 03: TokenGeneratorForm Integration Summary

**Multi-row selection wired end-to-end in TokenGeneratorForm with BulkActionBar mount, bulk action handlers, and undo propagation to page.tsx — TypeScript zero new errors.**

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Selection state, checkbox column, BulkActionBar mount, bulk handlers, Ctrl+Z theme undo | 96c476e | TokenGeneratorForm.tsx |
| 2 | onUndoSnapshot wiring in page.tsx | 829b242 | page.tsx |

## What Was Built

**Task 1 (TokenGeneratorForm.tsx):**
- Imported `BulkActionBar` component and six bulk util functions from `@/utils`
- Added `onUndoSnapshot?: (groups: TokenGroup[]) => void` to `TokenGeneratorFormProps`
- Selection state: `selectedTokenIds` (Set), `lastSelectedIndexRef`, `tokenUndoStackRef` (max 20)
- Clear-selection `useEffect` on `selectedGroupId` change
- `applyBulkMutation` factory: handles dual-path routing (themeTokens vs tokenGroups), pushes undo snapshot, calls `onUndoSnapshot` in default mode
- Five bulk handlers: `handleBulkDelete`, `handleBulkMove`, `handleBulkChangeType`, `handleBulkAddPrefix`, `handleBulkRemovePrefix`
- `handleTokenMultiSelect`: shift-range select using `lastSelectedIndexRef` and active group token array
- Ctrl+Z theme-mode undo via `window.addEventListener('keydown', ...)` — only intercepts when `tokenUndoStackRef` has entries AND in theme mode
- `TokenTableRowProps` extended with `isMultiSelected`, `tokenIndex`, `onMultiSelectClick`
- `TokenTableRow` renders checkbox `<td>` as first cell (hidden in readOnly mode)
- `renderGroup` extracts `activeGroupTokens` from themeTokens/tokenGroups
- Header checkbox `<th>` with select-all/deselect-all
- `BulkActionBar` mounted in `px-2 pt-2` wrapper above `<table>` when `selectedGroupId` is set and not readOnly
- Rows pass `isMultiSelected`, `tokenIndex`, `onMultiSelectClick` to `TokenTableRow`

**Task 2 (page.tsx):**
- Added `onUndoSnapshot` prop to `<TokenGeneratorForm>` JSX
- Pushes pre-bulk-mutation snapshot into `undoStackRef.current` (reuses `MAX_UNDO` constant)
- Existing Ctrl+Z handler in page.tsx already restores `masterGroups` from `undoStackRef` — no additional code needed

## Decisions Made

1. **TokenTableRow receives checkbox props** — keeps the `<tr>` fully inside `TokenTableRow`, avoids wrapping map with custom tr rendering.
2. **onChange is a no-op on checkbox** — `onClick` is used exclusively to access `e.shiftKey` for range select. Standard pattern.
3. **activeGroupTokens computed at renderGroup** — single variable reused for header check state, BulkActionBar paths, and row iteration. Prefers `themeTokens` over `tokenGroups` (dual-source pattern from CLAUDE.md).
4. **applyBulkMutation pushes to both stacks** — `tokenUndoStackRef` always gets the snapshot; `onUndoSnapshot` is additionally called in default mode for page-level undo.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files exist:
- FOUND: src/components/tokens/TokenGeneratorForm.tsx (modified)
- FOUND: src/app/collections/[id]/tokens/page.tsx (modified)

Commits exist:
- FOUND: 96c476e — feat(15-03): add selection state, checkbox column, BulkActionBar, bulk handlers to TokenGeneratorForm
- FOUND: 829b242 — feat(15-03): wire onUndoSnapshot prop in page.tsx TokenGeneratorForm call

TypeScript: 5 errors — all pre-existing (SharedCollectionHeader.tsx, supabase-repository.ts, graphEvaluator.ts ×3); zero new errors from plan-03 files.

Verification commands passed:
- `grep -n "BulkActionBar" TokenGeneratorForm.tsx` — found import + mount
- `grep -n "onUndoSnapshot" page.tsx` — found wired prop
- `grep -n 'type="checkbox"' TokenGeneratorForm.tsx` — found 2 (row + header)
