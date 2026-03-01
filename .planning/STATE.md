# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28)

**Core value:** Token collections are always available and editable — stored in MongoDB, loadable into the generator form, and visible on the view page, with Figma import/export fully integrated.
**Current focus:** v1.1 — Phase 1: ATUI component migration

## Current Position

Phase: 01-update-ui-to-use-shadcn-components-for-common-elements-buttons-tabs-modals (v1.1)
Plan: 7/N complete
Status: Plan 01-07 complete — TokenGeneratorFormNew fully migrated to ATUI (at-button, at-input, at-select, native color picker)
Last activity: 2026-03-01 — 01-07 complete; all header actions, token row inputs, type selects, color pickers, inline buttons migrated

Progress: [███████░░░] Phase 1 in progress (7 plans complete)

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

**01-06 (Figma dialog ATUI migration):**
- Both Figma dialogs retain isOpen guard (if (!isOpen) return null) alongside at-dialog ref — defense-in-depth approach
- at-button in .map() lists needs React.Attributes added to at-button type in atui.d.ts to accept key prop
- onKeyDown Enter-to-save shortcut dropped from at-input — ATUI web component does not expose same keyboard events

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-03-01
Stopped at: Completed 01-04-PLAN.md — SaveCollectionDialog, LoadCollectionDialog, BuildTokensModal migrated to at-dialog + at-button + at-input (retroactive execution; BuildTokensModal was the only remaining task)
Resume file: None
