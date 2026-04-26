# Phase 33: Theme configuration — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-26
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

## Claude's Discretion

- Sidebar label for base/default section ("Base", "Default", "Collection default")
- Whether snapshot trimming is eager (migration script) or lazy (on next save)
- Tiebreaker for mixed-type groups in graph routing (D-08)
- PATCH route behavior for out-of-scope token paths (reject vs. no-op)

## Deferred Ideas

- AI/MCP tool parity for dual themes (follow-up phase after Phase 32)
- Export pair representation for config/export endpoints (plan-phase decision)
