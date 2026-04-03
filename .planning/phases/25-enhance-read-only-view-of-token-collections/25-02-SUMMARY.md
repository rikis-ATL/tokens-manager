---
phase: 25-enhance-read-only-view-of-token-collections
plan: "02"
subsystem: tokens-page
tags: [style-guide, tabs, ui, read-only, tokens]
depends_on:
  requires: ["25-01"]
  provides: ["style-guide-wired-to-live-data"]
  affects: ["src/app/collections/[id]/tokens/page.tsx"]
tech_stack:
  added: []
  patterns:
    - shadcn Tabs wrapping master-detail layout at collection level
    - filteredGroups as D-05-compliant token source for StyleGuidePanel
    - allCollectionTokens memo for collection-wide style guide rendering
key_files:
  created: []
  modified:
    - src/app/collections/[id]/tokens/page.tsx
    - src/components/graph/TokenGraphPanel.tsx
decisions:
  - filteredGroups used as StyleGuidePanel token source — applies group visibility rules (D-05 compliant) without extra filtering logic
  - Style Guide tab placed at collection level wrapping entire master-detail layout — not scoped to per-group detail panel; shows all collection tokens
  - forceMount removed from TabsContent — not needed; tabs mount/unmount on selection without side effects
  - Orphan prop removed from TokenGraphPanel in post-checkpoint cleanup commit
metrics:
  duration: ~15 min
  completed: "2026-04-03"
  tasks: 2
  files_modified: 1
---

# Phase 25 Plan 02: Wire StyleGuidePanel to Tokens Page Summary

Style Guide tab wired to live token data on the Tokens page using shadcn Tabs at collection level, passing filteredGroups-sourced tokens to StyleGuidePanel for D-05-compliant rendering across all token types.

## Tasks Completed

### Task 1: Add Tabs wrapper and StyleGuidePanel to the Tokens page

**Commit:** `64c28de`
**Files:** `src/app/collections/[id]/tokens/page.tsx`

Added `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` imports from `@/components/ui/tabs` and `StyleGuidePanel` from `@/components/tokens/StyleGuidePanel`. Wrapped the detail panel in a Tabs component with two tabs: "Tokens" (existing TokenGeneratorForm) and "Style Guide" (new StyleGuidePanel).

Added `styleGuideTokens`, `styleGuideAllGroups`, and `selectedGroupName` memos sourced from `filteredGroups` — satisfying D-05 by using the already-filtered group state that excludes disabled groups. GroupBreadcrumb placed outside Tabs so it remains visible and functional in both tab views. Build passed with zero TypeScript errors.

### Task 2: Human Verification (checkpoint:human-verify)

**Status:** Approved
**Outcome:** Style Guide tab renders correctly. Token types display with correct visual treatments. Theme switching updates displayed values. Group selection filters tokens. No regressions in the existing Tokens tab.

### Post-Checkpoint: Style Guide moved to collection level

**Commit:** `95d2478`
**Files:** `src/app/collections/[id]/tokens/page.tsx`, `src/components/graph/TokenGraphPanel.tsx`

After human approval, the implementation was updated to move the Style Guide from per-group scope to collection level. The Tabs wrapper now wraps the entire master-detail layout (sidebar + detail panel). An `allCollectionTokens` memo was added to provide all collection tokens (not just the selected group's tokens) to StyleGuidePanel for collection-wide rendering. Per-group `styleGuide*` memos were removed in favour of this approach.

An orphan prop that had been passed to `TokenGraphPanel` without a matching interface definition was also removed in this commit.

## Deviations from Plan

### Post-checkpoint architectural refinement (user-initiated)

**Found during:** Post-checkpoint
**Issue:** Initial per-group Style Guide scope (Task 1) was technically correct but the desired UX was collection-level — showing all tokens across groups in a single view rather than filtered by the selected group.
**Fix:** Tabs wrapper moved up to wrap the full master-detail layout. `allCollectionTokens` memo added. Per-group memos removed. This change was committed by the user directly (commit `95d2478`).
**Files modified:** `src/app/collections/[id]/tokens/page.tsx`, `src/components/graph/TokenGraphPanel.tsx`
**Commit:** `95d2478`

## Known Stubs

None — StyleGuidePanel receives live token data from filteredGroups / allCollectionTokens. No hardcoded placeholders or mock data in the data path.

## Verification

- `yarn build` passes with zero TypeScript errors
- Style Guide tab appears on the Tokens page at collection level
- All token types render with designated visual treatments (color swatches, spacing bars, typography samples, shadow/border-radius tiles, text cards)
- Theme switching updates displayed values
- Disabled groups excluded from Style Guide via filteredGroups (D-05)
- No regression to existing Tokens tab functionality

## Self-Check: PASSED

- `src/app/collections/[id]/tokens/page.tsx` — exists and modified
- Commit `64c28de` — verified in git log
- Commit `95d2478` — verified in git log
