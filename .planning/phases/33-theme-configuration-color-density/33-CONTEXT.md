# Phase 33: Theme configuration — color/density types and tokens-page consolidation - Context

**Gathered:** 2026-04-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Split themes into `color` and `density` kinds. Allow one active theme per kind simultaneously (multi-dimensional theming). Resolved token view merges: collection default → active color theme overrides → active density theme overrides. Move theme management UI into the Tokens page; remove the standalone Themes nav entry.

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**5 goals are locked.** See `33-SPEC.md` for full requirements, boundaries, and acceptance criteria.

Downstream agents MUST read `33-SPEC.md` before planning or implementing.

**In scope (from SPEC.md):**
- Theme kinds: `color` | `density` on every custom theme; migration assigns legacy themes to `color`
- Dual independent selection (one per kind, each nullable); merged effective token set
- Color mode (`light` | `dark`) stays on color themes only; density themes have no colorMode
- Theme management UI moves into Tokens page; sidebar Themes link removed/redirects
- Theme sidebar groups themes by kind; separate Color themes and Density themes sections
- Replace single theme selector on Tokens, Config, and export flows with color + density controls

**Out of scope (from SPEC.md):**
- Billing limits or org scoping
- AI/MCP tool parity (may need follow-up phase once dual-selection exists)

</spec_lock>

<decisions>
## Implementation Decisions

### Base / shared token semantics
- **D-01:** Base = the collection default, unchanged. It contains all token types (color, dimension, typography, etc). No new "base" concept is introduced — this is exactly the existing `__default__` layer. When no custom theme is active, the collection default is the sole source of truth.
- **D-02:** The sidebar section label can be "Base" or "Default" — it maps 1:1 to the collection's canonical tokens.

### Multi-dimensional theming model
- **D-03:** Multiple custom themes can be active simultaneously — one color theme and one density theme at a time. Together they form a matrix: e.g. Brand-A (color) + Compact (density) is one combination; Brand-A + Comfortable is another.
- **D-04:** When a custom theme is selected, all groups/tokens in that theme replace the corresponding scoped tokens in the resolved view. The merge order is: collection default → color theme overrides → density theme overrides.

### Token scope boundaries
- **D-05:** **Color theme scope**: tokens whose type is `color`, `gradient`, and other color-adjacent types.
- **D-06:** **Density theme scope**: tokens whose type is `dimension`, `fontSize`, `fontWeight`, `borderRadius`, and any other sizing/layout types. Density is NOT strictly `dimension` only — it covers the full range of sizing and typographic scale tokens.
- **D-07:** Tokens outside both color and density scopes (e.g. pure semantic aliases, composite types not covered above) remain in the collection default layer and are not overridden by custom themes.

### Graph panel with dual active themes
- **D-08:** The graph panel's edit target is determined by the **selected group's dominant token type**:
  - Group contains color tokens → graph edits the active color theme's `graphState`
  - Group contains dimension / fontSize / fontWeight / borderRadius tokens → graph edits the active density theme's `graphState`
  - If no custom theme of the matching kind is active, graph falls back to editing the collection default (existing behavior)
- **D-09:** No extra toolbar toggle needed — the group selection implicitly determines which theme is being edited.

### Selection persistence
- **D-10:** Active color theme + active density theme selections are **session-only UI state**. They do not persist to MongoDB. On page refresh the user re-selects. No schema change required for this.

### Token snapshot storage
- **D-11:** Custom theme token snapshots are **trimmed to scoped types** on save. A color theme stores only color/gradient tokens; a density theme stores only dimension/fontSize/fontWeight/borderRadius tokens. Out-of-scope token values are not written into the theme document.
- **D-12:** Migration for existing themes: assign `kind: 'color'` and trim snapshot to color-scoped tokens on next save (or via a migration script — plan phase decides the migration approach).

### Claude's Discretion
- Exact label for the base/default section in the sidebar ("Base", "Default", "Collection default") — use whatever reads most clearly in context.
- Whether snapshot trimming happens eagerly (on migration) or lazily (on next save) — implementation detail for planning.
- How to handle mixed-type groups in graph routing (D-08) — plan may define a tiebreaker (e.g. dominant type by token count).
- PATCH route behavior for out-of-scope token paths (reject vs. no-op) — decide in plan.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### SPEC and requirements
- `.planning/phases/33-theme-configuration-color-density/33-SPEC.md` — Locked requirements, acceptance criteria, non-goals. MUST read before planning.

### Core type definitions
- `src/types/theme.types.ts` — `ITheme` interface to extend with `kind`; `ColorMode`, `ThemeGroupState`
- `src/types/token.types.ts` — `TokenGroup`, `TokenType` — used to determine color vs. density scope

### Pages being modified
- `src/app/collections/[id]/tokens/page.tsx` — Main edit surface; `activeThemeId` → becomes dual `activeColorThemeId` / `activeDensityThemeId`
- `src/app/collections/[id]/themes/page.tsx` — To be absorbed into the Tokens page
- `src/app/collections/[id]/config/page.tsx` — `selectedThemeId` → replaced with color + density selectors

### Components
- `src/components/collections/CollectionSidebar.tsx` — Themes nav entry to remove/redirect
- `src/components/themes/ThemeList.tsx` — To be restructured into grouped Color / Density sections
- `src/components/graph/TokenGraphPanel.tsx` — `activeThemeId` prop → needs dual-theme routing logic (D-08)

### API routes
- `src/app/api/collections/[id]/themes/` — POST to accept `kind`; PATCH routes to enforce scoped types

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ITheme` in `src/types/theme.types.ts` — extend with `kind: 'color' | 'density'`; `colorMode` becomes conditional on kind
- `ThemeList` component — reusable but needs grouping by kind (Color themes / Density themes sections)
- `TokenGraphPanel` — already receives `activeThemeId` prop; routing logic (D-08) goes here
- `tokenService.processImportedTokens` — used in themes page; reusable for token type classification

### Established Patterns
- Single `activeThemeId` state in `tokens/page.tsx` drives theme-aware rendering — will become two parallel state values
- `key={group.id}-{activeThemeId}` pattern on `GroupStructureGraph` for remounting on theme change — will need to incorporate both theme IDs
- Theme creation via `POST /api/collections/[id]/themes` with `{ name, colorMode }` — extend to include `kind`
- `graphState` is per-theme, inherited from collection on creation via `remapGraphStateForTheme()`

### Integration Points
- `tokens/page.tsx` is the primary integration point — dual theme selection state lives here
- Config page (`config/page.tsx`) currently takes a single `selectedThemeId` for export — will receive color + density pair
- `CollectionSidebar.tsx` — remove the `href: /collections/${id}/themes` nav item

</code_context>

<specifics>
## Specific Ideas

- **Multi-dimensional matrix framing**: Each combination of (color theme, density theme) is one "variant" of the design. The resolved token set for that combination is what gets exported.
- **Density scope is broad**: User confirmed density covers `dimension`, `fontSize`, `fontWeight`, `borderRadius` — not just spacing. Plan phase should enumerate the full list of `TokenType` values that map to density scope.
- **Snapshot trimming on save**: Trim is applied when saving theme tokens, not just at creation. Keeps the document lean as tokens evolve.

</specifics>

<deferred>
## Deferred Ideas

- **AI/MCP tool parity for dual themes** — Phase 32 tools currently reference a single `themeId`. Once dual selection exists, a follow-up phase will update MCP tools to accept color + density theme IDs separately.
- **Export pair representation** — Config/export endpoints accepting a pair of theme IDs vs. deriving from stored prefs is flagged in SPEC as a plan-phase decision.

</deferred>

---

*Phase: 33-theme-configuration-color-density*
*Context gathered: 2026-04-26*
