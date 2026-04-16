---
phase: 01-review-math-node-features
plan: 02
subsystem: ui
tags: [react, graph, math-node, validation, expression]

# Dependency graph
requires:
  - phase: 01-review-math-node-features
    provides: mathExpression.ts evaluator and ExpressionContext interface
provides:
  - validateExpression function in mathExpression.ts for blur-time expression validation
  - MathNode expression textarea with red border + inline error on blur
affects: [graph nodes, expression mode, math-node UI]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Blur-only validation — error state set on blur, cleared on valid blur, never on keystroke"
    - "Local error state kept out of persisted config — exprError is useState, not onConfigChange"
    - "validateExpression mirrors evaluateExpression path but re-throws to surface error messages"

key-files:
  created: []
  modified:
    - src/lib/mathExpression.ts
    - src/components/graph/nodes/MathNode.tsx

key-decisions:
  - "validateExpression added as sibling export (Option 1 from plan) — reuses stripCalc/substituteRefs/parseExpr without duplicating parser"
  - "ctx left empty on blur call — 'Unresolved token reference' is intentional and informative for v1"
  - "Error state is local UI only (useState) — not persisted via onConfigChange"

patterns-established:
  - "Blur-only validation pattern: onBlur runs validator, onChange only updates config value"

requirements-completed: [PHASE1-UI-ERROR]

# Metrics
duration: 8min
completed: 2026-04-16
---

# Phase 01 Plan 02: MathNode Expression Error Feedback Summary

**Red border + inline parser error message on the MathNode expression textarea, triggered on blur using a new `validateExpression` export that surfaces specific parser error strings.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-16T03:08:00Z
- **Completed:** 2026-04-16T03:16:00Z
- **Tasks:** 2 completed
- **Files modified:** 2

## Accomplishments

- Added `validateExpression(raw, ctx?)` to `src/lib/mathExpression.ts` — returns null on valid/empty, specific parser error strings on failure, 'Unresolved token reference' for unresolvable refs, 'Invalid expression' as fallback
- Wired blur-time validation into MathNode expression textarea: red border (`border-red-400`) and inline error message replace the hint text when invalid
- Validation fires on `onBlur` only — typing does not flash error state (D-04 compliance)
- Error state is local `useState`, not persisted to graph config

## Task Commits

1. **Task 1: Expose parser error message from mathExpression** - `d0932e7` (feat)
2. **Task 2: Wire blur-time validation + red border + error message in MathNode** - `82df884` (feat)

## Files Created/Modified

- `src/lib/mathExpression.ts` — Added `validateExpression` export above `evaluateExpression`; no changes to existing function signatures
- `src/components/graph/nodes/MathNode.tsx` — Added useState import, exprError state, onBlur handler, conditional border class, conditional error/hint span

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — no new network endpoints or persistence paths introduced. Error messages come from the parser's own throw statements; React auto-escapes text content (T-01-04 mitigated as planned).

## Self-Check: PASSED

- `src/lib/mathExpression.ts` contains `export function validateExpression` at line 21
- `src/components/graph/nodes/MathNode.tsx` contains validateExpression import, onBlur, border-red-400, exprError (4 occurrences), useState
- Commits d0932e7 and 82df884 present in git log
- `yarn tsc --noEmit` exits 0 (verified via tsc -p tsconfig.json)
