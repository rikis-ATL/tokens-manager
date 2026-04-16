---
phase: 01-review-math-node-features
plan: "03"
subsystem: graph-evaluation
tags: [graph, math-node, expression-mode, token-resolver, path-discovery]
dependency_graph:
  requires:
    - src/lib/graphEvaluator.ts (EvaluateGraphOptions, options param)
    - src/lib/mathExpression.ts (evaluateExpression)
    - src/types/graph-nodes.types.ts (MathMode, MathConfig.mathMode/expression)
  provides:
    - getTokenPathsFromGraphState accepts resolveTokenReference option
    - tokens/page.tsx passes collection resolver at both call sites
  affects:
    - Token path mismatch detection for expression-mode Math nodes
    - Theme vs default graph comparison for groups with {token.path} refs
tech_stack:
  added: []
  patterns:
    - Optional resolver callback forwarded through utility signature
    - useMemo resolver pattern matching GroupStructureGraph reference implementation
key_files:
  created:
    - src/lib/mathExpression.ts
  modified:
    - src/utils/graphTokenPaths.ts
    - src/lib/graphEvaluator.ts
    - src/types/graph-nodes.types.ts
    - src/app/collections/[id]/tokens/page.tsx
decisions:
  - Used masterGroups (in-scope collection token groups in page.tsx) instead of collectionTokenGroups (GroupStructureGraph prop name); semantically equivalent
  - Guarded resolver creation on masterGroups.length to match GroupStructureGraph pattern
metrics:
  duration: ~20 minutes
  completed: "2026-04-16"
  tasks_completed: 2
  files_changed: 5
---

# Phase 01 Plan 03: Plumb resolveTokenReference Through graphTokenPaths — Summary

**One-liner:** Wired `resolveTokenReference` through `getTokenPathsFromGraphState` so expression-mode Math nodes with `{token.path}` refs produce correct token paths during theme vs default graph comparison.

## What Was Built

Closed the D-08 gap: `getTokenPathsFromGraphState` now accepts an optional `options.resolveTokenReference` callback and forwards it to `evaluateGraph`, so expression-mode Math nodes that reference token paths evaluate correctly during path-discovery.

The `tokens/page.tsx` `tokenNameMismatch` useMemo now builds a resolver from `masterGroups` (the collection's token groups) and passes it to both `getTokenPathsFromGraphState` call sites, matching the reference pattern from `GroupStructureGraph`.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Add resolveTokenReference option to getTokenPathsFromGraphState | b235670 |
| 2 | Pass collection resolver from tokens/page.tsx into getTokenPathsFromGraphState | 95b3865 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] graphEvaluator.ts missing EvaluateGraphOptions prerequisite**
- **Found during:** Task 1 — worktree was initialized from committed HEAD (5feac13) which predates the EvaluateGraphOptions additions
- **Issue:** The plan expected `evaluateGraph` to already accept an `options` parameter with `EvaluateGraphOptions`, but the worktree's `graphEvaluator.ts` was from the committed state without those changes. Also `mathExpression.ts` was missing (untracked in main project, not in worktree).
- **Fix:** Applied the prerequisite changes: added `mathExpression.ts`, added `EvaluateGraphOptions` interface, added `options` param to `evaluateGraph` and `evaluateNode`, added expression mode branch to `evalMath`, added `MathMode` type and `mathMode`/`expression` fields to `MathConfig`.
- **Files modified:** `src/lib/graphEvaluator.ts`, `src/lib/mathExpression.ts`, `src/types/graph-nodes.types.ts`
- **Commit:** b235670

**2. [Rule 1 - Adaptation] Used masterGroups instead of collectionTokenGroups in page.tsx**
- **Found during:** Task 2
- **Issue:** `collectionTokenGroups` is the prop name in `GroupStructureGraph`, but `tokens/page.tsx` uses `masterGroups` for the same data (collection's token groups as `TokenGroup[]`).
- **Fix:** Used `masterGroups` directly — semantically identical, already in scope, passes the same type to `tokenService.resolveTokenReference`.
- **Files modified:** `src/app/collections/[id]/tokens/page.tsx`
- **Commit:** 95b3865

**3. [Environment] yarn tsc --noEmit OOM**
- **Issue:** Full TypeScript compilation ran out of memory (~4GB heap) in the parallel worktree environment. This is an environment constraint, not a code issue.
- **Mitigation:** Code changes verified manually for type correctness. Main project context confirms "zero TypeScript errors" baseline. Changes follow existing patterns exactly.

## Known Stubs

None. All changes wire real data.

## Threat Flags

None. The resolver callback follows the same trust boundary as GroupStructureGraph (same data plane, same user-authored graph state).

## Self-Check

### Files created/modified
- [x] FOUND: src/lib/mathExpression.ts
- [x] FOUND: src/utils/graphTokenPaths.ts
- [x] FOUND: src/lib/graphEvaluator.ts
- [x] FOUND: src/types/graph-nodes.types.ts
- [x] FOUND: src/app/collections/[id]/tokens/page.tsx

### Commits exist
- [x] FOUND: b235670
- [x] FOUND: 95b3865

## Self-Check: PASSED
