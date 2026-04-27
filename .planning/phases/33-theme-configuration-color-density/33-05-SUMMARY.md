---
phase: 33
plan: 05
status: complete
tasks_total: 2
tasks_completed: 2
deviations: 0
key-files:
  created: []
  modified:
    - src/components/themes/ThemeList.tsx
    - src/app/collections/[id]/tokens/page.tsx
---

# Plan 33-05 Summary: Wire ThemeGroupMatrix Configure Dialog

## What Was Built

Closed the two verification gaps from Phase 33 by wiring `ThemeGroupMatrix` into the Tokens page via a per-theme "Configure groups" dialog.

**Task 1 — ThemeList `onConfigure` prop:**
- Added `SlidersHorizontal` to lucide-react imports
- Added `onConfigure?: (themeId: string) => void` to `ThemeListProps`
- Added "Configure groups" `DropdownMenuItem` (with `SlidersHorizontal` icon) before the Delete item in `ThemeSection` — rendered conditionally when `onConfigure` prop is provided, with a `DropdownMenuSeparator` before Delete

**Task 2 — tokens/page.tsx configure dialog:**
- Added `ThemeGroupMatrix` import and `ThemeGroupState` to the theme.types import
- Added `configuringThemeId` state (`useState<string | null>(null)`) after `isThemePanelOpen`
- Added `handleGroupStateChange` callback: optimistically updates `themes` state then PUTs `{ groups: updatedGroups }` to `/api/collections/[id]/themes/[themeId]`
- Passed `onConfigure={setConfiguringThemeId}` to `ThemeList`
- Added `ThemeGroupMatrix` `Dialog` (rendered via IIFE when `configuringThemeId` is set): shows `Configure groups — {theme.name}` header, scrollable `ThemeGroupMatrix` body

## Acceptance Criteria Met

- `grep "onConfigure" ThemeList.tsx` → 4 lines (interface, destructure, conditional, callback)
- `grep "SlidersHorizontal" ThemeList.tsx` → 2 lines (import + JSX)
- `grep "Configure groups" ThemeList.tsx` → 1 line
- `grep "ThemeGroupMatrix" tokens/page.tsx` → 2 lines (import + JSX)
- `grep "configuringThemeId" tokens/page.tsx` → 8 lines
- `grep "handleGroupStateChange" tokens/page.tsx` → 2 lines
- `grep "onConfigure" tokens/page.tsx` → 1 line
- `grep "ThemeGroupState" tokens/page.tsx` → 2 lines
- `yarn tsc --noEmit` → 0 errors

## Self-Check: PASSED
