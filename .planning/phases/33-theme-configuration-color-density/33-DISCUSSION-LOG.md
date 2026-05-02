# Phase 33: Theme configuration — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-26 (initial) / 2026-05-03 (update)
**Phase:** 33-theme-configuration-color-density
**Areas discussed:** Base token semantics, Multi-dimensional theming model, Token scope boundaries, Graph panel with dual themes, Selection persistence, Token snapshot storage

---

## Base Token Semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Collection default (no label change) | Base = existing collection default, no new concept | ✓ |
| Separate 'Base' concept | Base as a distinct named state separate from collection default | |

**User's choice:** Collection default — base IS the collection default layer. Full token set, no scoping restrictions.
**Notes:** User clarified that the default theme should keep all color and dimension tokens for the case where no custom themes are active. The multi-dimensional theming model means multiple themes (one per kind) can be active simultaneously to create a matrix of possible style combinations.

---

## Token Scope Boundaries

| Option | Description | Selected |
|--------|-------------|----------|
| Dimension only | Density = strictly `dimension` type tokens | |
| Dimension + borderRadius + shadow | Density extends to layout-adjacent types | |
| Dimension + fontSize + fontWeight + borderRadius + ... | Density covers all sizing/typographic scale types | ✓ |

**User's choice:** Density theme scope is broad — includes `dimension`, `fontSize`, `fontWeight`, `borderRadius`, and other sizing/layout types.
**Notes:** User confirmed density is not strictly `dimension` only. Color scope = `color`, `gradient`, color-adjacent types.

---

## Graph Panel with Dual Active Themes

| Option | Description | Selected |
|--------|-------------|----------|
| Follows the selected group's type | Group type determines which theme the graph edits | ✓ |
| User picks via graph toolbar | Explicit toggle in graph panel header | |
| Last-selected theme wins | Most recently interacted theme is the edit target | |

**User's choice:** Follows the selected group's type — color group → edits color theme; spacing/typography group → edits density theme.
**Notes:** No extra toolbar needed. Implicit routing via group type.

---

## Selection Persistence

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — save to MongoDB per-collection | Store lastColorThemeId + lastDensityThemeId on collection doc | |
| No — session state only | Resets on refresh, no schema change | ✓ |

**User's choice:** Session-only. No persistence to MongoDB.
**Notes:** Simpler — no schema change required for selection state.

---

## Token Snapshot Storage

| Option | Description | Selected |
|--------|-------------|----------|
| Trim to scoped types | Color theme stores only color tokens; density stores only density tokens | ✓ |
| Keep full snapshot | Keep existing behavior, ignore out-of-scope at read time | |

**User's choice:** Trimmed subset — store only scoped token types per theme.
**Notes:** User asked for use case explanation before deciding. After understanding the tradeoff (cleaner/smaller vs. simpler migration), chose trimmed subset.

---

## [2026-05-03 Update] — Evolved UI Design Decisions

### Themes Tab Model

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated tab is final | Tokens = editing, Themes = managing | |
| Revisit — themes back in Tokens tab | Collapsible panel approach | |
| Hybrid — selectors in Tokens, tab for config only | Tokens tab has active selectors; Themes tab is purely create/delete/configure | ✓ |

**User's choice:** Hybrid model — confirmed this is what the current implementation already does.
**Notes:** Tokens tab contains the dual Color/Density selectors (in group sidebar). Themes tab is purely for theme management and group state configuration.

---

### Dual Selector Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Sidebar is correct | Selectors in group tree sidebar, conditional on kind existence | ✓ |
| Toolbar strip above token table | Horizontal compact bar, always visible when any theme exists | |
| Back to page header | Always visible regardless of tab | |

**User's choice:** Sidebar placement confirmed as final.
**Notes:** Selectors only render when at least one theme of the relevant kind exists. Contextually placed next to the group tree they affect.

---

### ThemeGroupMatrix Display

**User's clarification:** The matrix is still useful because group states (enabled/source/disabled) are needed — e.g. `typography/fontSize` may need `source` state on a color theme. However, the current matrix **only shows top-level groups**. Subgroups must appear as flat rows in the table (no indentation, no hierarchy). All `TokenGroup.children` must be recursively flattened.

**Decisions captured:**
- Two-panel inline approach confirmed (no dialog)
- Group states (enabled/source/disabled) are still required — NOT to be removed
- ThemeGroupMatrix needs a subgroup flattening fix (flat table, no indentation)

---

### DragScrubberHandle Scope

**User's clarification:** Already committed and pushed as part of Phase 33 (commit 4749df7 "dimension drag and full screen graph"). Adds drag-to-scrub for numeric token values in TokenGeneratorForm.

---

### Output Generator

**Topic raised by user** — flagged that output generator may need decisions about how dual themes are handled in export.
**Decision:** Deferred to a future phase. Output/export dual theme format decisions are out of Phase 33 scope.

---

## Claude's Discretion

- Sidebar label for base/default section ("Base", "Default", "Collection default")
- Whether snapshot trimming is eager (migration script) or lazy (on next save)
- Tiebreaker for mixed-type groups in graph routing (D-08)
- PATCH route behavior for out-of-scope token paths (reject vs. no-op)
- Whether to flatten subgroups inside `ThemeGroupMatrix` component or at the call site

## Deferred Ideas

- AI/MCP tool parity for dual themes (follow-up phase after Phase 32)
- Export pair representation / output generator dual theme handling (future phase)
