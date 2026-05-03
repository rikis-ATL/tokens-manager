---
phase: 35-demo-hero-phase-2-persist-api-middleware
plan: "01"
subsystem: graph-ui
tags: [demo, fullscreen, url-params, graph]
dependency_graph:
  requires: []
  provides: [initialFullscreen-prop, graph-full-url-param, PLAYGROUND_COLLECTION_ID-env-doc]
  affects: [GraphPanelWithChrome, CollectionTokensPage]
tech_stack:
  added: []
  patterns: [useState-initializer-from-prop, useSearchParams-client]
key_files:
  created: []
  modified:
    - src/components/graph/GraphPanelWithChrome.tsx
    - src/app/collections/[id]/tokens/page.tsx
    - .env.local.example
decisions:
  - "useState(initialFullscreen ?? false) — one-time initialization, no useEffect sync to avoid flicker"
  - "Destructure initialFullscreen from props and spread rest as panelProps to prevent unknown prop forwarding to TokenGraphPanel"
metrics:
  duration: "~10 minutes"
  completed: "2026-05-03T09:40:03Z"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 3
---

# Phase 35 Plan 01: initialFullscreen Prop + ?graph=full URL Wiring Summary

JWT-free, URL-driven graph fullscreen initialisation via `?graph=full` search param wired through `useSearchParams` into `GraphPanelWithChrome.initialFullscreen`.

## What Was Built

GraphPanelWithChrome now accepts an `initialFullscreen?: boolean` prop that seeds `useState` on first render. The tokens page reads `?graph=full` from URL search params via `useSearchParams()` and passes the result as `initialFullscreen`. Navigating to `/collections/[id]/tokens?graph=full` opens the graph panel fullscreen immediately on load with no flicker. PLAYGROUND_COLLECTION_ID is documented in `.env.local.example` as a prerequisite for the middleware work in Plan 35-03.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Add initialFullscreen prop to GraphPanelWithChrome + document PLAYGROUND_COLLECTION_ID | 221ab7f |
| 2 | Wire useSearchParams + initialFullscreen into page.tsx graphPanel prop | d83094d |

## Key Changes

### src/components/graph/GraphPanelWithChrome.tsx

- Added `initialFullscreen?: boolean` as last field in `GraphPanelWithChromeProps` interface
- Changed component signature from `(props: ...)` to `({ initialFullscreen, ...panelProps }: ...)`
- Changed `useState(false)` to `useState(initialFullscreen ?? false)`
- Changed `<TokenGraphPanel {...props} />` to `<TokenGraphPanel {...panelProps} />` — prevents `initialFullscreen` from being forwarded as unknown DOM prop

### src/app/collections/[id]/tokens/page.tsx

- Added `useSearchParams` to the `next/navigation` import
- Added `const searchParams = useSearchParams()` and `const initialFullscreen = searchParams.get('graph') === 'full'` immediately after `const router = useRouter()`
- Added `initialFullscreen={initialFullscreen}` as the last prop on `<GraphPanelWithChrome>` in the `graphPanel` JSX

### .env.local.example

- Added `PLAYGROUND_COLLECTION_ID` entry (commented out) with explanatory comment linking it to middleware auto-sign-in behaviour

## Decisions Made

- **One-time useState initializer** — used `useState(initialFullscreen ?? false)` rather than a `useEffect` sync to avoid a second render cycle that would cause a fullscreen flicker on load. This is the correct React pattern for "prop-seeded initial state".
- **Prop destructuring** — destructured `initialFullscreen` before spreading `...panelProps` to `TokenGraphPanel` so the prop is consumed at this layer and not forwarded. `TokenGraphPanel` does not accept `initialFullscreen` and would generate an unknown prop warning without this pattern.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — `?graph=full` only sets client UI state (boolean fullscreen toggle). No server data is written or read. `PLAYGROUND_COLLECTION_ID` in `.env.local.example` is commented-out documentation; no real value is present.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| GraphPanelWithChrome.tsx exists | FOUND |
| page.tsx exists | FOUND |
| .env.local.example exists | FOUND |
| 35-01-SUMMARY.md exists | FOUND |
| Commit 221ab7f exists | FOUND |
| Commit d83094d exists | FOUND |
