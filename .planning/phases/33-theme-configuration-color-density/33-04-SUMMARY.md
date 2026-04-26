---
phase: 33
plan: 04
status: complete
completed: 2026-04-26
duration: ~15min
tasks_completed: 2
tasks_total: 2
commits:
  - hash: d58b035
    message: "feat(33-04): API kind validation + scope enforcement on theme routes"
  - hash: bedc90d
    message: "feat(33-04): output page dual theme selectors + mergeDualThemeTokens"
key_files:
  modified:
    - src/app/api/collections/[id]/themes/route.ts
    - src/app/api/collections/[id]/themes/[themeId]/route.ts
    - src/app/api/collections/[id]/themes/[themeId]/tokens/route.ts
    - src/app/collections/[id]/output/page.tsx
decisions:
  - "Out-of-scope token types in PATCH /themes/[id]/tokens rejected with 400 (not silently trimmed) per CONTEXT.md discretion"
  - "Legacy themes without kind field default to 'color' scope — consistent with D-12 migration strategy"
  - "colorMode prop on BuildTokensPanel uses selectedColorTheme (density themes never have colorMode)"
---

# Phase 33 Plan 04: API Kind Enforcement + Output Page Dual Selectors — Summary

## What Was Built

API enforcement of theme kind/scope model and Output page update to dual theme selection. Three API routes now validate and persist `kind`, strip `colorMode` from density themes, and reject cross-scope token writes. The Output page replaced its single theme selector with two filtered dropdowns (Color theme / Density theme) and uses `mergeDualThemeTokens` for export.

## Key Files

### Modified
- `src/app/api/collections/[id]/themes/route.ts` — POST validates `kind` ('color'|'density', defaults 'color'); density themes stored without `colorMode`; color themes default `colorMode` to 'light'
- `src/app/api/collections/[id]/themes/[themeId]/route.ts` — PUT accepts `kind` in body; strips `colorMode` when `incomingKind === 'density'`; preserves it for color themes; backward-compat: existing themes without `kind` treated as 'color'
- `src/app/api/collections/[id]/themes/[themeId]/tokens/route.ts` — PATCH enforces scope: rejects out-of-scope token types with 400 + descriptive message before DB write
- `src/app/collections/[id]/output/page.tsx` — Dual `selectedColorThemeId` + `selectedDensityThemeId` state; two Select dropdowns filtered by kind; `mergeDualThemeTokens` for both `mergedTokens` and `darkTokens`; `darkTheme` only considers color-kind themes

## Must-Have Verification

| Must-Have | Status |
|-----------|--------|
| POST /themes validates kind; defaults 'color' | ✓ |
| POST /themes: density themes have no colorMode in DB | ✓ |
| PUT /themes/[id]: updates kind; strips colorMode when kind=density | ✓ |
| PATCH /themes/[id]/tokens: rejects out-of-scope types with 400 | ✓ |
| output/page.tsx: dual selectedColorThemeId + selectedDensityThemeId | ✓ |
| output/page.tsx: two dropdowns filtered by kind | ✓ |
| output/page.tsx: mergedTokens uses mergeDualThemeTokens | ✓ |
| output/page.tsx: darkTheme only considers color themes | ✓ |
| Zero TypeScript errors | ✓ |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed stale `selectedTheme` reference in BuildTokensPanel colorMode prop**
- **Found during:** Task 2 — after replacing `selectedThemeId` with dual state, the `colorMode` prop on `BuildTokensPanel` (line 161) still referenced `selectedTheme` which no longer existed
- **Fix:** Changed to `selectedColorTheme` — semantically correct since only color themes have a `colorMode`
- **Files modified:** `src/app/collections/[id]/output/page.tsx`
- **Commit:** bedc90d

## Threat Surface Scan

No new network endpoints or auth paths introduced. Changes are confined to existing route handlers and a client-side page component. STRIDE mitigations T-33-04-01 through T-33-04-03 are fully implemented.

## Self-Check: PASSED

- `d58b035` present: `git log --oneline | grep d58b035` ✓
- `bedc90d` present: `git log --oneline | grep bedc90d` ✓
- All 4 modified files exist on disk ✓
- `yarn tsc --noEmit` returned zero errors ✓
