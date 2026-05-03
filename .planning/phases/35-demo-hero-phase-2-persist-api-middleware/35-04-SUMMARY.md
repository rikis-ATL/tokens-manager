---
phase: 35-demo-hero-phase-2-persist-api-middleware
plan: "04"
subsystem: demo
tags: [demo, overlay, cta, graph, nextauth]
dependency_graph:
  requires:
    - 35-01-PLAN.md  # GraphPanelWithChrome with initialFullscreen prop
  provides:
    - DemoOverlayCTA component with role-gated rendering
    - "Get started free" overlay CTA inside GraphPanelWithChrome
  affects:
    - src/components/graph/GraphPanelWithChrome.tsx
    - src/components/demo/DemoOverlayCTA.tsx
tech_stack:
  added: []
  patterns:
    - useSession() role check for Demo-gated UI
    - Button asChild + Link CTA pattern (from DemoLanding.tsx)
    - absolute positioning inside relative container for overlay
key_files:
  created:
    - src/components/demo/DemoOverlayCTA.tsx
  modified:
    - src/components/graph/GraphPanelWithChrome.tsx
decisions:
  - "Use useSession() directly (not PermissionsContext) because role is not exposed via PermissionsContext"
  - "z-10 for overlay — above graph canvas, below fullscreen z-50 outer wrapper"
  - "No dismiss mechanism per D-14 (MVP scope)"
  - "size=sm Button to minimize visual intrusion on graph panel"
metrics:
  duration: "~8 minutes"
  completed: "2026-05-03T09:56:52Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 1
---

# Phase 35 Plan 04: Demo Overlay CTA Summary

DemoOverlayCTA component role-gates a "Get started free" sign-up button to Demo users and renders it absolutely positioned over the GraphPanelWithChrome panel in both normal and fullscreen modes.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create DemoOverlayCTA component | cb2957f | src/components/demo/DemoOverlayCTA.tsx |
| 2 | Inject DemoOverlayCTA into GraphPanelWithChrome | a34f6b2 | src/components/graph/GraphPanelWithChrome.tsx |

## What Was Built

**DemoOverlayCTA** (`src/components/demo/DemoOverlayCTA.tsx`):
- `'use client'` component; uses `useSession()` from `next-auth/react`
- Returns `null` when `session?.user?.role !== 'Demo'` — no DOM output for non-demo users (D-13)
- Renders a `Button asChild size="sm"` wrapping `Link href="/auth/signup"` with label "Get started free"
- Positioned `absolute top-3 right-3 z-10` — relies on parent container having `relative`
- No dismiss mechanism per MVP spec (D-14)

**GraphPanelWithChrome** (`src/components/graph/GraphPanelWithChrome.tsx`):
- Added `import { DemoOverlayCTA } from '@/components/demo/DemoOverlayCTA'`
- Added `relative` to the `flex-1 min-h-0` container className to anchor absolute overlay
- Rendered `<DemoOverlayCTA />` as sibling of `<TokenGraphPanel />` inside the container
- Overlay travels with the graph into fullscreen because it is a child of the `fixed inset-0 z-50` outer subtree

## Deviations from Plan

None — plan executed exactly as written. The current state of GraphPanelWithChrome already had the correct `{...panelProps}` spread and no duplicate button (the plan's note about the duplicate button did not apply to the actual file state after 35-01).

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. The `DemoOverlayCTA` reads session role from the NextAuth JWT (server-issued, tamper-resistant) and links to the public `/auth/signup` route. Threat register items T-35-04-01 through T-35-04-03 are all accepted per the plan's threat model.

## Self-Check: PASSED

- FOUND: src/components/demo/DemoOverlayCTA.tsx
- FOUND: commit cb2957f (feat(35-04): create DemoOverlayCTA component)
- FOUND: commit a34f6b2 (feat(35-04): inject DemoOverlayCTA into GraphPanelWithChrome)
- FOUND: .planning/phases/35-demo-hero-phase-2-persist-api-middleware/35-04-SUMMARY.md
- TypeScript: exits 0, no errors
