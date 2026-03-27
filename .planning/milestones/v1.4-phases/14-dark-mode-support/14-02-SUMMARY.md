---
phase: 14-dark-mode-support
plan: 02
subsystem: ui
tags: [react, themes, colorMode, dialog, badge, lucide-react, tailwind]

# Dependency graph
requires:
  - phase: 14-01
    provides: colorMode field on ITheme, API endpoints for reading/writing colorMode
provides:
  - ColorModeBadge component (inline in ThemeList, tokens page, config page)
  - Dialog-based Create Theme flow with name + light/dark picker
  - "Switch to Light/Dark" toggle in theme "..." dropdown (optimistic PUT)
  - colorMode badge in tokens page theme selector SelectItems
  - colorMode badge in config page theme selector SelectItems
  - ThemeGroupMatrix global colorMode selector row (user-requested deviation)
affects: [14-03, 14-04, themes-page, tokens-page, config-page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ColorModeBadge inline per-file — small component duplicated across 3 files rather than extracted, avoids file ownership conflicts in this plan"
    - "Optimistic update + revert pattern for PUT colorMode — setThemes immediately, revert on error with toast"
    - "Dialog-based create replaces inline text input — cleaner multi-field create UX pattern"

key-files:
  created: []
  modified:
    - src/components/themes/ThemeList.tsx
    - src/app/collections/[id]/themes/page.tsx
    - src/app/collections/[id]/tokens/page.tsx
    - src/app/collections/[id]/config/page.tsx
    - src/components/themes/ThemeGroupMatrix.tsx

key-decisions:
  - "ColorModeBadge duplicated inline in 3 files — not extracted to shared component; consolidation deferred to future clean-code phase"
  - "colorMode selector moved into ThemeGroupMatrix as top-row global control (user-requested UI change, not in original plan)"

patterns-established:
  - "Optimistic PUT with revert: update local state immediately, revert on fetch error + show toast"
  - "Dialog create pattern: open dialog on + click, reset fields on open, submit calls onAdd(name, colorMode)"

requirements-completed: [DARK-03]

# Metrics
duration: ~20min
completed: 2026-03-26
---

# Phase 14 Plan 02: colorMode UI — Badge, Dialog, and Selectors Summary

**Dialog-based Create Theme with light/dark picker, ColorModeBadge on all theme surfaces, and optimistic "Switch to Light/Dark" toggle across ThemeList, tokens page, and config page**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-26
- **Completed:** 2026-03-26
- **Tasks:** 2 (+ 1 human-verify checkpoint)
- **Files modified:** 5

## Accomplishments

- ThemeList rewritten with Dialog-based create (replaces inline text input) — dialog includes name field and light/dark segmented control
- ColorModeBadge (sun/amber for light, moon/slate for dark) displayed on each theme row in ThemeList
- "Switch to Light/Dark" item added to the "..." dropdown on each theme; PATCHes colorMode optimistically with revert on error
- Tokens page theme selector SelectItems now show colorMode badge next to theme name
- Config page theme selector SelectItems now show colorMode badge next to theme name
- colorMode selector moved into ThemeGroupMatrix as a top-row global control (user-requested addition)

## Task Commits

1. **Task 1: Refactor ThemeList — Create Theme dialog + ColorModeBadge + settings popover** - `0325856` (feat)
2. **Task 2: Update Themes page and token/config selectors with colorMode** - `5a2caa6` (feat)
3. **Deviation: Move colorMode selector into ThemeGroupMatrix** - `36af71d` (feat)

## Files Created/Modified

- `src/components/themes/ThemeList.tsx` — Dialog-based create, ColorModeBadge per row, Switch colorMode in "..." menu
- `src/app/collections/[id]/themes/page.tsx` — handleAddTheme accepts colorMode, new handleColorModeChange with optimistic update
- `src/app/collections/[id]/tokens/page.tsx` — Local ColorModeBadge, badge in theme SelectItems
- `src/app/collections/[id]/config/page.tsx` — Local ColorModeBadge, badge in theme SelectItems
- `src/components/themes/ThemeGroupMatrix.tsx` — Global colorMode selector added as top row

## Decisions Made

- ColorModeBadge duplicated inline across 3 files rather than extracted to a shared component — avoids file ownership conflicts within this plan; consolidation deferred to a future clean-code phase
- colorMode selector moved into ThemeGroupMatrix as a top-row global control at user request — not in original plan, committed as a separate deviation commit

## Deviations from Plan

### User-Requested Change (Outside Plan Scope)

**1. colorMode selector moved into ThemeGroupMatrix as top-row global control**
- **Found during:** Between Task 1 and Task 2 (user-requested at execution time)
- **Issue:** User requested colorMode selector surface in ThemeGroupMatrix in addition to planned surfaces
- **Fix:** Added global colorMode selector as top row in ThemeGroupMatrix component
- **Files modified:** `src/components/themes/ThemeGroupMatrix.tsx`
- **Committed in:** `36af71d` (separate commit, clearly labeled)

---

**Total deviations:** 1 user-requested UI addition
**Impact on plan:** Additive only — all planned functionality delivered; extra surface adds value without breaking existing behavior.

## Issues Encountered

None — plan executed without TypeScript errors or runtime issues. Human verification passed all 9 scenarios.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- colorMode UI fully implemented across all theme surfaces
- Phase 14 plans 03 and 04 (export pipeline) completed before this plan's summary — no blockers
- Phase 14 complete

---
*Phase: 14-dark-mode-support*
*Completed: 2026-03-26*
