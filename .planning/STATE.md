# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28)

**Core value:** Token collections are always available and editable — stored in MongoDB, loadable into the generator form, and visible on the view page, with Figma import/export fully integrated.
**Current focus:** v1.1 — Phase 1: ATUI component migration

## Current Position

Phase: 01-update-ui-to-use-shadcn-components-for-common-elements-buttons-tabs-modals (v1.1)
Plan: 3/N complete
Status: Plan 01-03 complete — CollectionSelector (at-select), SharedCollectionHeader (at-button), CollectionActions (at-button + at-dialog + at-input) migrated
Last activity: 2026-03-01 — 01-03 complete; collection picker, save-as, new/delete/rename/duplicate collection all use ATUI

Progress: [████░░░░░░] Phase 1 in progress (3 plans complete)

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

**01-02 (page.tsx ATUI migration):**
- at-tabs with onAtuiChange drives URL-based switchTab — bridges ATUI event API to existing router.push() routing
- Tab content divs with hidden class approach preserved (locked v1.0 decision) — at-tab-content NOT used
- at-button with onAtuiClick replaces native button onClick for all action buttons in page.tsx
- [Phase 01-03]: at-select has no optgroup support — flatten into single options array
- [Phase 01-03]: at-dialog imperative control via useRef<HTMLElement> + openDialog()/closeDialog()
- [Phase 01-03]: at-dialog needs ref?: React.Ref<HTMLElement> in atui.d.ts; at-button needs React.ClassAttributes<HTMLElement> for key prop

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-03-01
Stopped at: Completed 01-03-PLAN.md — Collection management UI trio migrated to ATUI (CollectionSelector, SharedCollectionHeader, CollectionActions)
Resume file: None
