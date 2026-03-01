# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28)

**Core value:** Token collections are always available and editable — stored in MongoDB, loadable into the generator form, and visible on the view page, with Figma import/export fully integrated.
**Current focus:** v1.1 — Phase 1: ATUI component migration

## Current Position

Phase: 01-update-ui-to-use-shadcn-components-for-common-elements-buttons-tabs-modals (v1.1)
Plan: 1/N complete
Status: Plan 01-01 complete — ATUI global integration foundation established (AtuiProvider, atui.d.ts, layout update)
Last activity: 2026-03-01 — 01-01 complete; AtuiProvider registered globally, JSX types declared, build passes

Progress: [██░░░░░░░░] Phase 1 in progress (1 plan complete)

## Accumulated Context

### Roadmap Evolution

- Phase 1 (v1.1) added: ATUI component migration (buttons, tabs, modals, inputs, selects) + color picker inputs
- Phase 2 (v1.1) added: Test ATUI component library — confirm Button can be imported and used

### Decisions

All v1.0 decisions logged in PROJECT.md Key Decisions table.

**02-01 (ATUI Stencil integration):**
- Use `next/dynamic` with `ssr: false` for Stencil components — avoids hydration mismatch (window unavailable in SSR)
- Import ATUI CSS via relative path to node_modules — package exports field blocks direct subpath import
- Call `defineCustomElements(window)` inside `useEffect` — ensures client-only registration

**01-01 (ATUI global integration foundation):**
- AtuiProvider registered in root layout via useEffect + dynamic import — no per-component setup needed in subsequent plans
- Global atui.d.ts covers all at-* element types — no local declare blocks in individual components
- tsconfig.json now excludes token-manager-angular/stencil/vite workspaces — prevents pre-existing TS errors from blocking build
- Per-component next/dynamic ssr:false is NOT needed when AtuiProvider is in layout (confirmed working without it)

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-03-01
Stopped at: Completed 01-01-PLAN.md — ATUI global foundation (AtuiProvider, atui.d.ts, layout update)
Resume file: None
