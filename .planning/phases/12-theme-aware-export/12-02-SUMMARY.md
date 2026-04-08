---
phase: 12-theme-aware-export
plan: "02"
subsystem: config-ui
tags: [theme-selector, sd-build, figma-export, config-page]
dependency_graph:
  requires: [12-01]
  provides: [theme-selector-ui, theme-aware-sd-trigger, figma-enterprise-note]
  affects: [config-page, build-tokens-panel, figma-export-dialog]
tech_stack:
  added: []
  patterns: [parallel-fetch, derived-state, conditional-render]
key_files:
  created: []
  modified:
    - src/app/collections/[id]/config/page.tsx
    - src/components/dev/BuildTokensPanel.tsx
    - src/components/figma/ExportToFigmaDialog.tsx
decisions:
  - "Theme selector hidden when collection has no themes (themes.length > 0 guard)"
  - "overflow-hidden changed to overflow-auto on right column to accommodate selector"
  - "Selector padding placed inside the column div (px-4 pt-4) above BuildTokensPanel"
metrics:
  duration: "~2 min"
  completed: "2026-03-20"
  tasks_completed: 2
  files_modified: 3
---

# Phase 12 Plan 02: Theme Selector UI and Figma Enterprise Note Summary

**One-liner:** Config page theme selector with mergeThemeTokens wiring and inline Enterprise plan note in Figma export dialog.

## What Was Built

### Task 1: Config page theme selector + BuildTokensPanel themeLabel prop

**Config page (`src/app/collections/[id]/config/page.tsx`):**
- Added parallel themes fetch from `/api/collections/${id}/themes` in the same `useEffect` as collection data fetch
- Added `themes: ITheme[]` state (defaults `[]`) and `selectedThemeId: string` state (defaults `'__default__'`)
- Derived `selectedTheme`, `themeLabel`, and `mergedTokens` before the JSX return — `mergeThemeTokens` called client-side when a theme is selected; falls back to raw `tokens` for "Collection default"
- "Export theme:" selector renders only when `themes.length > 0`; selector value defaults to `'__default__'` on every page load (not persisted)
- `BuildTokensPanel` now receives `mergedTokens` (instead of `tokens`) and `themeLabel`

**BuildTokensPanel (`src/components/dev/BuildTokensPanel.tsx`):**
- Added `themeLabel?: string` to `BuildTokensPanelProps`
- `runBuild` spreads `themeLabel` into POST body only when defined
- `themeLabel` added to `useCallback` dependency array for `runBuild`
- `themeLabel` added to `useEffect` dependency array — changing the selector triggers a rebuild automatically

### Task 2: Figma Enterprise plan note

**ExportToFigmaDialog (`src/components/figma/ExportToFigmaDialog.tsx`):**
- Wrapped `DialogFooter` in a `flex flex-col gap-2 w-full` div
- Added `<p className="text-xs text-gray-500">Figma Variables API requires Enterprise plan.</p>` above the footer
- Export button remains active — note is purely informational

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check

### Files Exist
- `src/app/collections/[id]/config/page.tsx` - modified
- `src/components/dev/BuildTokensPanel.tsx` - modified
- `src/components/figma/ExportToFigmaDialog.tsx` - modified

### Commits
- `58c555a` - feat(12-02): upgrade config page with theme selector and theme-aware SD build
- `ded54b2` - feat(12-02): add Figma Enterprise plan note to ExportToFigmaDialog

## Self-Check: PASSED
