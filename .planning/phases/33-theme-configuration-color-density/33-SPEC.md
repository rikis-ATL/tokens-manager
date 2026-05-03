---
phase: 33
title: Theme configuration — color/density types and tokens-page consolidation
status: specified
last_updated: "2026-04-25"
---

# Phase 33 — SPEC

## Problem

Themes today are a **single active theme** (`activeThemeId`) with a full token snapshot per theme. Product needs **orthogonal theme axes**: one optional **color** theme and one optional **density** theme, composable on top of the collection default. Theme management should live **under the Tokens page** so all token-related editing and persistence is co-located.

## Goals (falsifiable)

1. **Theme kinds** — Every custom theme has `kind: 'color' | 'density'`.
   - **Color** themes: scope includes all tokens whose `TokenType` is color-related (minimum: `color`; plan phase may extend to `gradient` and other color-adjacent types if product agrees).
   - **Density** themes: scope includes all tokens whose `TokenType` is `dimension` (spacing/sizing). Name in UI: **Density**; storage field name can remain aligned with types (`dimension`).
2. **Dual selection** — The editor can select at most **one active color theme** and **one active density theme** independently (each nullable). If only one kind exists in the collection, only that selector appears or the other is disabled with clear copy.
3. **Color mode** — `colorMode: 'light' | 'dark'` remains on **color** themes only (existing behavior for export/Figma pairing). Density themes do not use color mode.
4. **Effective token set** — Resolved view for tables, graph, and export: start from collection default tokens, then apply overrides from the active color theme (only within color scope), then apply overrides from the active density theme (only within dimension scope). Precedence if a token were in both scopes: should be impossible by type; if data is corrupt/legacy, plan must define deterministic behavior.
5. **Theme UI location** — Theme matrix / theme list / create-delete flows currently on `/collections/[id]/themes` move **into** the Tokens page (tab, panel, or sidebar region — implementation detail for discuss/plan). Sidebar nav entry **Themes** is removed or redirects to Tokens with themes panel focused.
6. **Theme sidebar structure** — Theme sidebar lists **groupings by kind**: e.g. sections **Color themes**, **Density themes**, plus **Base / shared** (or equivalent label) for editing context of tokens **outside** color and density theme scopes (everything that is not `color` nor `dimension` for override purposes, or the collection default layer — plan clarifies UX for “base” vs “default theme”).
7. **Replace single theme selector** — Any UI that today exposes one “Theme” dropdown for the active editing context is replaced with **Color mode** (where relevant) + **Color theme** + **Density** (density theme) controls:
   - Tokens page header / toolbar
   - Configuration (export) page
   - Any “tokens output” flows that currently key off `selectedThemeId`

## Non-goals (this phase)

- Changing billing limits or org scoping.
- AI/MCP tool parity (Phase 32) — may need a follow-up once dual-theme selection exists.

## Data model & migration

- Extend `ITheme` with `kind: 'color' | 'density'`.
- **Migration**: Existing themes default to `kind: 'color'`, preserve `colorMode` and existing `tokens` / `graphState` / `groups`.
- Themes of kind `density` gain `colorMode` stripped or ignored in API/UI (implementation in plan).
- Optional: trim persisted theme token snapshots to scoped types on save to reduce payload; or keep full snapshot for simplicity — **decision in discuss-phase**.

## API expectations (high level)

- `POST /themes` accepts `kind` + existing fields; validates `colorMode` only when `kind === 'color'`.
- Theme token `PATCH` routes apply only to tokens in that theme’s scope (reject or no-op out-of-scope paths — **decide in plan**).
- Export/config endpoints accept **pair** of theme IDs or derive from stored UI prefs — **decide in plan**.

## Acceptance criteria (UAT-oriented)

- [ ] User can create a color theme and a density theme; each only “owns” overrides in its scoped token types.
- [ ] User can select Brand-A as color theme and Compact as density theme simultaneously; token table and graph reflect merged values.
- [ ] Color themes still show light/dark control; density themes do not.
- [ ] Themes management is reachable from Tokens page without a separate top-level nav item (redirect acceptable for old URLs).
- [ ] Config page export preview uses color + density selection instead of a single theme selector.

## Open questions (for `/gsd-discuss-phase 33`)

1. **Base list semantics** — Exact definition of “tokens not applied to color mode or density”: non-color-non-dimension types only vs. “collection default layer” UX.
2. **Graph state** — One graph per theme today; with two active themes, does each theme keep its own `graphState` (yes, likely) and how does the graph panel choose which theme to edit?
3. **Persistence of selection** — Per-collection `lastColorThemeId` / `lastDensityThemeId` in Mongo vs. session-only UI state.
4. **Typography and composite types** — Confirm density is **strictly** `dimension` only; typography tokens stay in base.

## References (code)

- `src/types/theme.types.ts` — `ITheme`
- `src/app/collections/[id]/tokens/page.tsx` — `activeThemeId`, theme saves
- `src/app/collections/[id]/themes/page.tsx` — to be absorbed
- `src/app/collections/[id]/config/page.tsx` — `selectedThemeId`
- `src/components/collections/CollectionSidebar.tsx` — Themes link

## Next step

`/gsd-discuss-phase 33` then `/gsd-plan-phase 33`.
