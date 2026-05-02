# Phase 34 — Demo Hero: Graph Fullscreen Shell — User Decisions

## Scope (Phase 1 of 2)

This phase is scoped to extracting the graph shell and proving fullscreen before touching demo auth, public routes, or persistence. Phase 2 (session draft, API guards, hero route) follows after this ships.

## What to build

### Component extraction

Extract a presenter + behavior component (`GraphPanelWithChrome` or `TokensGraphSection`) from `TokenGraphPanel` (`src/components/graph/TokenGraphPanel.tsx`).

- Accepts the same props surface as `TokenGraphPanel` today (or a thin wrapper that only forwards props).
- Adds a **fullscreen toggle** — a control in the graph column header area (or beside existing workspace layout controls).
- Fullscreen layout: `fixed inset-0 z-50 bg-background`.
- Escape key exits fullscreen.
- Focus trap is optional (a11y follow-up).
- **Single mounted graph instance** — fullscreen is achieved via CSS/portal layout, NOT a second `TokenGraphPanel` mount. Graph state and callbacks must stay consistent.

### Wiring

- `CollectionTokensWorkspace` (`src/components/tokens/CollectionTokensWorkspace.tsx`) — or the tokens page (`src/app/collections/[id]/tokens/page.tsx`) — uses the new wrapper.
- Split/tabs layout is unchanged until fullscreen is toggled.

### Test

Manual pass on `/collections/[playgroundId]/tokens`:
- Toggle fullscreen → confirm graph expands correctly
- Edit graph in fullscreen → exit → confirm edits persist in normal view
- Switch groups/tabs → confirm no duplicate remount keys fighting `GroupStructureGraph`

### Optional

Persist fullscreen preference via `localStorage` key alongside `tokens-workspace-main-layout` — not required for MVP.

## Hero clarification (plan constraint)

Hero UI = same playground collection screen; default state = graph expanded (fullscreen or maximized graph column) — **not** a separate marketing layout. No onboarding cards in this phase.

## Out of scope for Phase 1

- Public anonymous snapshot API
- Signup flow changes
- Persistence (session draft / sessionStorage)
- Demo auth / middleware / public routes
- Overlay CTAs

## Phase 2 (recap only, for planning context)

- `persistMode`: wire `src/lib/playground/session-storage.ts`; client-only saves for hero + signed-in Demo on playground
- API: block `POST /api/collections` and `PUT`/theme writes for Demo on playground
- Middleware: public hero path when `DEMO_MODE`
- Hero default: open playground collection with graph expanded + overlay CTAs

## Key files

- `src/components/graph/TokenGraphPanel.tsx` — component to extract from
- `src/components/tokens/CollectionTokensWorkspace.tsx` — wire the new wrapper here
- `src/app/collections/[id]/tokens/page.tsx` — passes `graphPanel` into workspace (~line 1541+)
