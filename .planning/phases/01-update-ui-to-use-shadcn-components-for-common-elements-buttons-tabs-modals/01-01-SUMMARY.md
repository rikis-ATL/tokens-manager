---
phase: 01-update-ui-to-use-shadcn-components-for-common-elements-buttons-tabs-modals
plan: 01
subsystem: ui
tags: [atui, stencil, web-components, typescript, next-js, jsx]

# Dependency graph
requires:
  - phase: 02-test-atui-component-library-confirm-button-can-be-imported-and-used
    provides: Confirmed ATUI Stencil integration pattern (defineCustomElements, relative CSS import, useEffect registration)
provides:
  - AtuiProvider client component — global ATUI registration in layout root
  - src/types/atui.d.ts — global JSX namespace for all at-* elements
  - Updated root layout wrapping children in AtuiProvider
  - Single-call ATUI registration (no per-component defineCustomElements needed)
affects:
  - 01-02 through 01-N (all subsequent Phase 1 plans that use at-* ATUI elements)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - AtuiProvider pattern: register ATUI web components once in root layout using useEffect + dynamic import
    - Global JSX types via atui.d.ts — declare global { namespace JSX { interface IntrinsicElements } }
    - Relative path CSS import for packages with restrictive exports field

key-files:
  created:
    - src/components/AtuiProvider.tsx
    - src/types/atui.d.ts
  modified:
    - src/app/layout.tsx
    - src/components/AtuiDevTest.tsx
    - src/services/token.service.ts
    - src/utils/ui.utils.ts
    - tsconfig.json

key-decisions:
  - "AtuiProvider uses useEffect + dynamic import of loader — avoids SSR window reference errors"
  - "CSS imported via relative path to node_modules — package exports field blocks subpath import"
  - "Global atui.d.ts covers all at-* elements — per-component declare blocks removed"
  - "tsconfig.json excludes token-manager-angular, token-manager-stencil, token-manager-vite — prevents pre-existing workspace TS errors from blocking Next.js build"

patterns-established:
  - "Any 'use client' component can use at-* elements without per-component setup — AtuiProvider handles global registration"
  - "New at-* element types go in src/types/atui.d.ts only — no local declare global blocks"

requirements-completed: [ATUI-UI-01]

# Metrics
duration: 10min
completed: 2026-03-01
---

# Phase 01 Plan 01: ATUI Global Integration Foundation Summary

**Global ATUI Stencil registration via AtuiProvider in root layout with JSX type declarations covering all at-* elements used across the app**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-01T03:16:23Z
- **Completed:** 2026-03-01T03:25:55Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- AtuiProvider client component with useEffect-based defineCustomElements registration and single relative-path CSS import
- Global TypeScript JSX declarations in atui.d.ts covering at-button, at-input, at-select, at-tabs, at-tab-trigger, at-tab-content, at-dialog
- Root layout updated to wrap all children in AtuiProvider — every page now has ATUI registered
- Build passes and dev server starts without Stencil SSR hydration errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Create AtuiProvider client component** - `072349c` (feat)
2. **Task 2: Create global TypeScript JSX declarations and update root layout** - `e8e3e0a` (feat)
3. **Task 3: Remove shadcn artifacts** - `dc13a45` (chore — no-op verification)

## Files Created/Modified
- `src/components/AtuiProvider.tsx` - 'use client' component that registers ATUI globally via useEffect and imports CSS once
- `src/types/atui.d.ts` - Global JSX namespace declarations for all at-* elements used in this project
- `src/app/layout.tsx` - Root layout now wraps children in AtuiProvider
- `src/components/AtuiDevTest.tsx` - Removed conflicting per-component JSX declare block (now covered by atui.d.ts)
- `src/services/token.service.ts` - Fixed implicit any on Record-typed indexed objects (auto-fix)
- `src/utils/ui.utils.ts` - Fixed property access on object-typed loop variable (auto-fix)
- `tsconfig.json` - Excluded token-manager-angular/stencil/vite sub-workspaces (auto-fix)

## Decisions Made
- AtuiProvider uses `useEffect` + dynamic import of `@alliedtelesis-labs-nz/atui-components-stencil/loader` — this is the confirmed Phase 2 pattern that avoids SSR hydration errors (window is only accessed client-side)
- CSS uses relative path `../../node_modules/@alliedtelesis-labs-nz/atui-components-stencil/dist/atui-components-stencil/atui-components-stencil.css` — package exports field blocks subpath import
- atui.d.ts uses `declare global { namespace JSX { interface IntrinsicElements } }` — a `/// <reference types />` directive cannot bridge Stencil's JSX namespace into React's JSX namespace

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed conflicting at-button JSX declaration in AtuiDevTest.tsx**
- **Found during:** Task 2 (create global TypeScript JSX declarations)
- **Issue:** AtuiDevTest.tsx had a local `declare global { namespace JSX { interface IntrinsicElements { 'at-button': ... } } }` with fewer props than the new global atui.d.ts declaration. TypeScript error TS2717: "Subsequent property declarations must have the same type"
- **Fix:** Removed the per-component declare block from AtuiDevTest.tsx — atui.d.ts now covers it globally with the full prop set
- **Files modified:** src/components/AtuiDevTest.tsx
- **Verification:** `npx tsc --noEmit` shows no at-button type conflict after fix
- **Committed in:** e8e3e0a (Task 2 commit)

**2. [Rule 3 - Blocking] Fixed pre-existing TypeScript errors blocking npm run build**
- **Found during:** Task 2 (verification: npm run build)
- **Issue:** token.service.ts had `processed[key] = value` on a `const processed = {}` (no index signature). ui.utils.ts had `value.$value` on a value typed as `object`. Both were pre-existing errors that npm run build surfaced as failures.
- **Fix:** Added `Record<string, any>` type to `processed` and `result` in token.service.ts; cast loop variable to `any` in ui.utils.ts
- **Files modified:** src/services/token.service.ts, src/utils/ui.utils.ts
- **Verification:** `npx tsc --noEmit` shows no src/ errors after fix
- **Committed in:** e8e3e0a (Task 2 commit)

**3. [Rule 3 - Blocking] Excluded sub-workspace directories from tsconfig.json**
- **Found during:** Task 2 (verification: npm run build)
- **Issue:** tsconfig.json had `include: ["**/*.ts", "**/*.tsx"]` with `exclude: ["node_modules"]` only. This caused Next.js build type-checking to pick up token-manager-angular, token-manager-stencil, and token-manager-vite sub-workspaces, which have pre-existing incompatible TypeScript errors (Angular decorator types, etc.)
- **Fix:** Added `"token-manager-angular"`, `"token-manager-stencil"`, `"token-manager-vite"` to tsconfig.json `exclude` array
- **Files modified:** tsconfig.json
- **Verification:** `npm run build` succeeds after exclusions
- **Committed in:** e8e3e0a (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 type conflict bug, 2 blocking pre-existing build failures)
**Impact on plan:** All auto-fixes were necessary for build verification to pass. No scope creep — all fixes were in files directly affected by the task changes or blocking task completion.

## Issues Encountered
- None beyond the auto-fixed items above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ATUI global registration is complete. All subsequent Phase 1 plans can use at-* elements in any 'use client' component without per-component setup.
- Any new at-* element types should be added to `src/types/atui.d.ts` only.
- The /dev-test sandbox page remains available as a reference for ATUI integration patterns.

---
*Phase: 01-update-ui-to-use-shadcn-components-for-common-elements-buttons-tabs-modals*
*Completed: 2026-03-01*
