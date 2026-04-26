---
phase: 33
plan: 03
subsystem: theme-ui
tags: [themes, themelist, navigation, inline-panel, sidebar]
dependency_graph:
  requires: [33-01, 33-02]
  provides: [ThemeList-grouped, inline-theme-panel, themes-redirect, sidebar-trimmed]
  affects: [tokens-page, themes-page, collection-sidebar]
tech_stack:
  added: []
  patterns: [AlertDialog-for-delete, collapsible-panel, kind-aware-dialog]
key_files:
  created: []
  modified:
    - src/components/themes/ThemeList.tsx
    - src/app/collections/[id]/tokens/page.tsx
    - src/app/collections/[id]/themes/page.tsx
    - src/components/collections/CollectionSidebar.tsx
decisions:
  - "Themes toggle button placed left of the Prefix label in header for proximity to theme selectors"
  - "ThemeSection rendered as inner function component to keep JSX composable without prop drilling"
  - "handleColorModeChange added fresh to tokens/page.tsx (not ported from themes/page.tsx) to match tokens-page pattern with useCallback + showErrorToast"
metrics:
  duration: ~20 minutes
  completed: 2026-04-26T20:39:55Z
  tasks_completed: 2
  tasks_total: 2
  files_modified: 4
---

# Phase 33 Plan 03: Theme UI Restructure Summary

Restructured the theme management UI so all theme browsing, creation, and deletion lives inline on the Tokens page. ThemeList now groups themes by kind with KindBadge and uses AlertDialog for safe deletion. The old /themes route redirects seamlessly, and the sidebar Themes item is removed.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Restructure ThemeList | 4fe07e9 | src/components/themes/ThemeList.tsx |
| 2 | Inline ThemeList panel + redirect + sidebar trim | fe9ad16 | tokens/page.tsx, themes/page.tsx, CollectionSidebar.tsx |

## What Was Built

**ThemeList (complete rewrite):**
- Three sections: Base (static, shows "Collection default tokens"), Color Themes, Density Themes
- Each section has its own Plus button disabled at limit of 10
- `KindBadge` — `bg-primary/10 text-primary` for color, `bg-secondary text-secondary-foreground` for density
- `ColorModeBadge` only rendered on color theme rows, never on density rows
- Create dialog title changes: "Create Color Theme" / "Create Density Theme" per `addingKind`
- Color mode Light/Dark toggle only shown in dialog when `addingKind === 'color'`
- Delete now gates through `AlertDialog` with destructive CTA "Delete Theme" instead of immediate callback
- Props updated: `selectedColorThemeId + selectedDensityThemeId` replace `selectedThemeId`; `onSelect(id, kind)` and `onAdd(name, kind, colorMode?)` replace old signatures

**tokens/page.tsx:**
- Added `handleAddTheme`, `handleDeleteTheme`, `handleColorModeChange` CRUD handlers (all `useCallback`)
- Added `isThemePanelOpen` state
- Added `Layers` toggle button in header (left side, before Prefix label) — `variant="default"` when open, `"outline"` when closed
- Collapsible `ThemeList` panel renders below `SourceContextBar` when open (`max-h-80 overflow-y-auto`)
- `ThemeList` wired to `activeColorThemeId` + `activeDensityThemeId` and all three CRUD handlers

**themes/page.tsx:** Replaced with single-line `redirect()` to `/collections/[id]/tokens`

**CollectionSidebar.tsx:** Removed Themes nav item and unused `Layers` import

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All ThemeList props are wired to real state and API handlers.

## Threat Flags

None. The redirect destination is constructed from `params.id` (Next.js route param) plus a static path suffix — no open redirect vector. AlertDialog gate prevents accidental single-click deletion.

## Self-Check: PASSED

All 4 source files present. Both task commits (4fe07e9, fe9ad16) verified in git log.
