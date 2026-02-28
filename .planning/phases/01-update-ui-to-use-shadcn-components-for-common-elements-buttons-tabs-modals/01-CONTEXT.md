# Phase 1: ATUI Component Migration - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace all common UI elements (buttons, tabs, modals/dialogs, inputs, selects) across the entire app with ATUI Stencil components (`@alliedtelesis-labs-nz/atui-components-stencil`). Also replace all color token fields with native `<input type="color">` pickers. The package is already installed and the integration pattern is confirmed (see Phase 2 SUMMARY).

**Note:** The phase directory is named "shadcn" but the implementation uses ATUI components — the name is a legacy artifact of the original plan.

</domain>

<decisions>
## Implementation Decisions

### Component coverage
- Replace `<button>` with `at-button` everywhere
- Replace `<input>` with `at-input` everywhere
- Replace `<select>` with `at-select` everywhere
- Replace tabs UI with `at-tabs` / `at-tab-trigger` / `at-tab-content` — ATUI DOES have a tabs component
- Replace modals/dialogs with `at-dialog` — ATUI DOES have a dialog component
- Tabs and modals that have no ATUI equivalent: keep existing implementation (do not force a replacement)
- Map existing button variants to ATUI `variant` prop where the mapping is obvious (e.g. primary, secondary)
- Keep Tailwind classes on replaced elements as overrides/fallbacks (do not strip className from ATUI components)

### Color picker fields
- Replace color token text inputs with `<input type="color">` entirely — no side-by-side text input
- Update live (`oninput`) — value updates as the user drags the picker, not just on close
- Show color picker ONLY on fields explicitly typed as color (use token `type: 'color'` metadata, not hex heuristics)

### Migration scope
- Replace everywhere — all components and pages in `src/` (skip `/dev-test` sandbox page)
- Adapt surrounding code to ATUI's event/value API (do not wrap ATUI to mimic native element API)
- Remove any shadcn-related config/packages if found (e.g. `components.json`, shadcn imports, shadcn npm packages)

### Registration strategy
- Call `defineCustomElements(window)` **once** in a new `AtuiProvider` client component rendered in `src/app/layout.tsx`
- Individual components using ATUI elements are marked `'use client'` — no `next/dynamic ssr:false` needed per-page
- CSS: use the relative path import pattern confirmed in Phase 2 (`../../node_modules/@alliedtelesis-labs-nz/atui-components-stencil/dist/atui-components-stencil/atui-components-stencil.css`) — import once in `AtuiProvider`

### TypeScript types
- The package ships full JSX type declarations in `dist/types/components.d.ts` (Stencil-generated, covers all `at-*` elements)
- Create a single `src/types/atui.d.ts` file for the global JSX namespace declarations
- **Researcher task:** Investigate whether a `/// <reference types="@alliedtelesis-labs-nz/atui-components-stencil" />` directive in `atui.d.ts` is sufficient, or whether manual `declare global { namespace JSX { interface IntrinsicElements ... } }` entries are still needed for React's JSX transform

### Claude's Discretion
- Exact `AtuiProvider` component implementation
- How to handle ATUI component event naming differences from native (e.g. `onAtChange` vs `onChange`) — adapt per component
- Whether to create thin React wrapper components for heavily-used ATUI elements or use them directly

</decisions>

<specifics>
## Specific Ideas

- See `src/components/AtuiDevTest.tsx` and `src/app/dev-test/page.tsx` for the confirmed integration pattern from Phase 2
- The `/dev-test` sandbox page is intentionally kept as a reference — do not delete it
- Phase 2 SUMMARY documents the two deviations to be aware of: CSS via relative path (not package subpath), and `ssr:false` only needed if NOT using a global `AtuiProvider` in layout

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-update-ui-to-use-shadcn-components-for-common-elements-buttons-tabs-modals*
*Context gathered: 2026-03-01*
