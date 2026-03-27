---
phase: 14-dark-mode-support
plan: 03
subsystem: api
tags: [style-dictionary, dark-mode, css, build-tokens, combined-output]

# Dependency graph
requires:
  - phase: 14-01
    provides: colorMode field on ITheme and ColorMode type

provides:
  - buildCombinedOutput helper combining light+dark CSS with [data-color-mode="dark"] selector
  - darkTokens field on BuildTokensRequest
  - Config page auto-detects dark theme and passes darkTokens to build pipeline
  - BuildTokensPanel includes darkTokens in POST body

affects:
  - 14-dark-mode-support phase completion

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CSS dark mode: post-process SD :root output → [data-color-mode=\"dark\"] selector"
    - "JS/TS dark mode: ${namespace}Dark prefix for dark exports (namespace-prefix approach)"
    - "Auto-detect dark theme when Collection default is selected; single-theme export when specific theme selected"

key-files:
  created: []
  modified:
    - src/types/token.types.ts
    - src/services/style-dictionary.service.ts
    - src/app/api/build-tokens/route.ts
    - src/app/collections/[id]/config/page.tsx
    - src/components/dev/BuildTokensPanel.tsx

key-decisions:
  - "JS/TS dark exports use ${namespace}Dark prefix (e.g. TokenDarkColorPrimary) — SD flat export model does not natively support nested objects; namespace-prefix is the standard SD multi-mode pattern"
  - "JSON format omits dark tokens — JSON spec forbids comments; no dark block structure needed for JSON consumers"
  - "Safety fallback in buildCombinedOutput: if ':root {' not found in dark SD output, wrap manually and console.warn — protects against SD format changes"
  - "darkTokens derived from dark theme only when selectedThemeId === '__default__'; single-theme exports remain unchanged"

patterns-established:
  - "buildCombinedOutput: run SD twice (light + dark), then post-process CSS/SCSS/LESS string to replace selector, concatenate JS/TS"
  - "detectBrands + mergeGlobalsIntoBrands applied to darkTokens before brand matching — same globals merge logic applied consistently"

requirements-completed: [DARK-04]

# Metrics
duration: 3min
completed: 2026-03-25
---

# Phase 14 Plan 03: Dark Mode Build Pipeline Summary

**Combined light+dark CSS/SCSS/LESS output via :root → [data-color-mode="dark"] post-processing with JS/TS namespace-prefix approach in style-dictionary.service.ts**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-25T10:57:39Z
- **Completed:** 2026-03-25T11:01:06Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Added `darkTokens` and `colorMode` optional fields to `BuildTokensRequest` interface
- Implemented `buildCombinedOutput` helper that runs SD twice and combines CSS/SCSS/LESS with dark selector replacement and JS/TS with namespace-prefix concatenation
- Updated `buildTokens` to call `buildCombinedOutput` when `darkTokens` is present, with brand matching across light and dark token sets
- Config page auto-detects dark theme using `useMemo` and derives `darkTokens` via `mergeThemeTokens` — only for Collection default selection
- Wired `darkTokens` from config page through `BuildTokensPanel` props and POST body to the build-tokens API route

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend BuildTokensRequest and add buildCombinedOutput helper** - `e8811ae` (feat)
2. **Task 2: Wire darkTokens through build-tokens route and config page** - `1ce7d80` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `src/types/token.types.ts` - Added `darkTokens` and `colorMode` optional fields to `BuildTokensRequest`
- `src/services/style-dictionary.service.ts` - Added `buildCombinedOutput` function; updated `buildTokens` to use it when `darkTokens` provided
- `src/app/api/build-tokens/route.ts` - Passes `body.darkTokens` to `buildTokens` call
- `src/app/collections/[id]/config/page.tsx` - Added `useMemo` import; added dark theme detection + `darkTokens` derivation; passes `darkTokens` to `BuildTokensPanel`
- `src/components/dev/BuildTokensPanel.tsx` - Added `darkTokens` prop; includes in POST body; added to dependency arrays

## Decisions Made
- JS/TS dark exports use `${namespace}Dark` prefix (e.g. `TokenDarkColorPrimary`) — SD flat export model does not natively support nested objects; the namespace-prefix approach achieves clear separation while remaining statically typed and tree-shakeable
- JSON format omits dark tokens — JSON spec forbids comments; no dark block needed for JSON consumers
- Safety fallback: if `:root {` not found in dark SD output, wrap manually with `console.warn` — protects against future SD format changes
- `darkTokens` derived only when `selectedThemeId === '__default__'`; single-theme exports remain unchanged for specific theme selection

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Build pipeline now produces combined light+dark CSS/SCSS/LESS output with `[data-color-mode="dark"]` selector
- JS/TS output uses `${namespace}Dark` prefix for dark exports — statically typed, tree-shakeable
- Phase 14 plan 03 (DARK-04) complete; ready for final phase verification

---
*Phase: 14-dark-mode-support*
*Completed: 2026-03-25*
