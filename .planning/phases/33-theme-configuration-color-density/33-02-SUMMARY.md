---
phase: 33
plan: 02
status: complete
completed: 2026-04-26
subsystem: theme-ui
tags: [dual-theme, state-refactor, tokens-page, graph-panel]
dependency_graph:
  requires: [33-01]
  provides: [dual-theme-state, dual-theme-selectors, dual-graph-keys]
  affects: [tokens-page, token-graph-panel]
tech_stack:
  added: []
  patterns: [dual-ref-sync, resolveActiveThemeIdForGroup, mergeDualThemeTokens, filterGroupsForDualThemes]
key_files:
  modified:
    - src/app/collections/[id]/tokens/page.tsx
    - src/components/graph/TokenGraphPanel.tsx
decisions:
  - filterGroupsForActiveTheme import removed — no remaining usages after dual refactor
  - AIChatPanel receives activeColorThemeId as primary theme; density not applicable to AI context
  - tokenNameMismatch/activeGroupState/isGroupSource use local const activeThemeId via resolveActiveThemeIdForGroup to minimize diff surface
metrics:
  duration: "~25 min"
  completed: 2026-04-26
  tasks_completed: 2
  files_modified: 2
---

# Phase 33 Plan 02: Dual Theme State + UI Selectors — Summary

## One-liner

Refactored tokens/page.tsx from single `activeThemeId` to dual `activeColorThemeId`/`activeDensityThemeId` state with matching refs, memos, handlers, and header selectors; updated TokenGraphPanel graph remount keys.

## What Was Built

### Task 1: Dual state + refs + all logic (tokens/page.tsx)

- Replaced `activeThemeIdRef` with `activeColorThemeIdRef` + `activeDensityThemeIdRef`
- Replaced `activeThemeId`/`setActiveThemeId` state with `activeColorThemeId`/`activeDensityThemeId`
- `filteredGroups` memo now calls `filterGroupsForDualThemes`
- `effectiveThemeTokens` memo replaced with `mergeDualThemeTokens` three-way merge
- `persistGraphState` routes to correct theme via `resolveActiveThemeIdForGroup` on selected group
- `handleThemeTokenChange` PATCH routes to resolved target theme
- `handleSave` resolves target theme for selected group
- `handleThemeChange` replaced with `handleColorThemeChange` + `handleDensityThemeChange`
- `tokenNameMismatch`, `activeGroupState`, `isGroupSource` use local `const activeThemeId` via resolver
- All `TokenGeneratorForm` dual-theme-gated props updated
- `StyleGuideTabPanel.colorGroupsTree` updated
- `AIChatPanel.activeThemeId` passes `activeColorThemeId`
- `TokenGeneratorForm` key encodes both theme IDs
- Header dual selectors: Color (filtered to `kind === 'color'`) + Density (filtered to `kind === 'density'`)

### Task 2: TokenGraphPanel dual props

- `activeThemeId` prop replaced with `activeColorThemeId` + `activeDensityThemeId`
- Both `GroupStructureGraph` keys encode both theme IDs: `__all_groups__-${colorId}-${densityId}` and `${groupId}-${colorId}-${densityId}`
- Zero `activeThemeId` references remain

## Must-Have Verification

| Must-Have | Status |
|-----------|--------|
| `activeColorThemeId` + `activeDensityThemeId` state + refs (no `activeThemeId`) | ✓ |
| `filteredGroups` calls `filterGroupsForDualThemes` | ✓ |
| `effectiveThemeTokens` calls `mergeDualThemeTokens` | ✓ |
| `persistGraphState` routes via `resolveActiveThemeIdForGroup` | ✓ |
| `handleThemeTokenChange` routes PATCH to resolved target theme | ✓ |
| `handleSave` handles dual-theme case | ✓ |
| Two Select dropdowns in header: Color and Density, each filtered by kind | ✓ |
| `TokenGraphPanel` uses `activeColorThemeId` + `activeDensityThemeId`; GroupStructureGraph key uses both | ✓ |

## Acceptance Criteria Verification

```
grep -c "activeThemeId" src/components/graph/TokenGraphPanel.tsx → 0
grep -c "activeColorThemeId|activeDensityThemeId" src/components/graph/TokenGraphPanel.tsx → 6
grep "Color:|Density:" src/app/collections/[id]/tokens/page.tsx → both present
grep "colorThemes|densityThemes" src/app/collections/[id]/tokens/page.tsx → filtering logic present
yarn tsc --noEmit → zero errors
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed stale `activeThemeId` dep in `allCollectionTokens` memo**
- Found during: Task 1 post-edit grep
- Issue: `useMemo` deps array still referenced `activeThemeId` after the condition was updated to use `activeColorThemeId || activeDensityThemeId`
- Fix: Updated deps array to `[activeColorThemeId, activeDensityThemeId, effectiveThemeTokens, filteredGroups]`
- Files modified: `src/app/collections/[id]/tokens/page.tsx`
- Commit: dbe8d5b

**2. [Rule 2 - Cleanup] Removed unused `filterGroupsForActiveTheme` import**
- Found during: Task 1 post-edit verification
- Issue: Import no longer used after dual-theme refactor
- Fix: Removed from import statement, kept only `filterGroupsForDualThemes`
- Files modified: `src/app/collections/[id]/tokens/page.tsx`
- Commit: dbe8d5b

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1: Dual state + refs + handlers + selectors | dbe8d5b | src/app/collections/[id]/tokens/page.tsx |
| Task 2: TokenGraphPanel dual props | 0d840c1 | src/components/graph/TokenGraphPanel.tsx |

## Known Stubs

None — all logic wired through live utility functions from Plan 01.

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes introduced. Client-side kind filter `(t.kind ?? 'color') === 'color'` ensures density themes cannot appear in the color dropdown (T-33-02-02 mitigated).

## Self-Check: PASSED
