---
phase: 34-demo-hero-graph-fullscreen
plan: "01"
subsystem: graph
tags: [fullscreen, graph, ui, wrapper-component]
dependency_graph:
  requires: []
  provides: [GraphPanelWithChrome]
  affects: [src/app/collections/[id]/tokens/page.tsx, src/components/graph/GraphPanelWithChrome.tsx]
tech_stack:
  added: []
  patterns: [css-layout-fullscreen, use-effect-event-listener, props-forwarding-spread]
key_files:
  created:
    - src/components/graph/GraphPanelWithChrome.tsx
  modified:
    - src/app/collections/[id]/tokens/page.tsx
decisions:
  - "CSS-only fullscreen (fixed inset-0 z-50) — single mounted TokenGraphPanel instance, no remount on toggle"
  - "Escape key listener scoped to useEffect with isFullscreen dependency — auto-removed on exit or unmount"
  - "localStorage persistence excluded — optional per spec, deferred"
metrics:
  duration: "~10 minutes"
  completed: "2026-05-02T12:38:30Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 1
---

# Phase 34 Plan 01: GraphPanelWithChrome Fullscreen Shell Summary

## One-liner

Thin `GraphPanelWithChrome` wrapper adds a ghost icon-button fullscreen toggle (Maximize/Minimize Carbon icons) and CSS-only `fixed inset-0 z-50` overlay to `TokenGraphPanel` without remounting the graph.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create GraphPanelWithChrome component | c1397cd | src/components/graph/GraphPanelWithChrome.tsx (created) |
| 2 | Wire GraphPanelWithChrome into tokens page | 379884c | src/app/collections/[id]/tokens/page.tsx (modified) |

## What Was Built

**`GraphPanelWithChrome`** (`src/components/graph/GraphPanelWithChrome.tsx`):
- `'use client'` wrapper around `TokenGraphPanel`
- `isFullscreen: boolean` state with toggle handler
- Outer container class switches between `'fixed inset-0 z-50 bg-background flex flex-col'` (fullscreen) and `'flex flex-col h-full'` (normal) — instant layout change, no animation
- Header row with a single `Button` (variant=ghost, size=icon, h-8 w-8, text-muted-foreground) using Carbon `Maximize`/`Minimize` icons at size 16
- `aria-label` and `title` copy: "Enter fullscreen graph view" / "Exit fullscreen graph view"
- `useEffect` adds `keydown` listener on `window` when fullscreen is active; cleaned up on exit or unmount
- All props forwarded to `TokenGraphPanel` via spread — single instance, no duplicate mount

**`page.tsx`** (`src/app/collections/[id]/tokens/page.tsx`):
- Replaced `import { TokenGraphPanel }` with `import { GraphPanelWithChrome }`
- Swapped `<TokenGraphPanel` to `<GraphPanelWithChrome` in the `graphPanel` prop — all props unchanged
- `CollectionTokensWorkspace` not touched

## Decisions Made

- **CSS-only fullscreen**: Single `TokenGraphPanel` (and therefore single `GroupStructureGraph`) stays mounted throughout. Fullscreen is purely a container class change — no second mount, no React key change, no graph state loss.
- **Escape key via useEffect**: Listener added only when fullscreen is active (`if (!isFullscreen) return`), ensuring zero overhead in normal mode and guaranteed cleanup via the effect's return function.
- **localStorage deferred**: Spec marks persistence as optional for MVP. Not implemented in this plan.

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. `GraphPanelWithChrome` is a pure client-side UI state component. Threat register items T-34-01 and T-34-02 are both `accept` dispositions with no mitigation actions required.

## Self-Check: PASSED

- `src/components/graph/GraphPanelWithChrome.tsx` exists: FOUND
- `src/app/collections/[id]/tokens/page.tsx` modified: FOUND (GraphPanelWithChrome import + JSX, no TokenGraphPanel)
- Task 1 commit c1397cd: FOUND
- Task 2 commit 379884c: FOUND
- TypeScript compilation: exit code 0, no errors
