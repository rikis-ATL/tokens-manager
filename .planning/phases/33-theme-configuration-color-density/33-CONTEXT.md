# Phase 33: Theme configuration — color/density types and tokens-page consolidation - Context

**Gathered:** 2026-04-26  
**Updated:** 2026-05-03  
**Status:** Ready for planning

<domain>
## Phase Boundary

Split themes into `color` and `density` kinds. Allow one active theme per kind simultaneously (multi-dimensional theming). Resolved token view merges: collection default → active color theme overrides → active density theme overrides. Move theme management UI into the Tokens page; remove the standalone Themes nav entry.

**Evolution note:** Phase 33 was executed (Plans 01–05) and the UI iterated post-execution. This context reflects the final evolved design, not just the original plan.

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

### UI navigation model (evolved from original plan)
- **D-13:** **Hybrid tab model** — The Tokens page has two dedicated tabs:
  - **Tokens tab**: token table + graph panel. Color/Density theme selectors live in the group tree sidebar (conditional — only appear when themes of the respective kind exist). This is the primary editing surface.
  - **Themes tab**: create, delete, and configure themes. ThemeGroupMatrix (group state matrix) lives here. No theme-editing graph; no token table.
- **D-14:** Dual selectors (Color/Density) are **in the group tree sidebar** within the Tokens tab, not in the page header. They only render when at least one theme of the relevant kind exists. This keeps the header clean.
- **D-15:** The original collapsible panel approach (isThemePanelOpen) was superseded by the dedicated Themes tab. Do not reintroduce the panel.

### ThemeGroupMatrix display (evolved from Plan 05 dialog approach)
- **D-16:** ThemeGroupMatrix is **always-visible inline** in a two-panel Themes tab layout: left panel = flat theme list (w-52, flat mode, no kind grouping); right panel = ThemeGroupMatrix for the selected theme.
- **D-17:** The per-theme "Configure groups" dialog approach (Plan 05) was superseded by the always-visible inline panel. The `onConfigure` dialog in tokens/page.tsx is no longer the active path — the Themes tab panel is.
- **D-18:** **ThemeGroupMatrix must show all subgroups** — the current implementation only shows top-level groups. All `TokenGroup.children` must be recursively flattened into a flat table (no indentation, no hierarchy). A group named `typography/fontSize` should appear as a distinct row. This is a **code gap** to close.
- **D-19:** Group states (`enabled` / `source` / `disabled`) are **still meaningful and required**. Example: `typography/fontSize` may need `source` state on a color theme (because it's not a color-scoped token). Users must be able to set per-group states including subgroups.

### Output generator
- **D-20:** Dual theme handling in the output/export generator is **deferred to a future phase**. The current output page has basic dual selectors but decisions about export format and merged output structure belong in a follow-up.

### Claude's Discretion
- Exact label for the base/default section in the sidebar ("Base", "Default", "Collection default") — use whatever reads most clearly in context.
- Whether snapshot trimming happens eagerly (on migration) or lazily (on next save) — implementation detail for planning.
- How to handle mixed-type groups in graph routing (D-08) — plan may define a tiebreaker (e.g. dominant type by token count).
- PATCH route behavior for out-of-scope token paths (reject vs. no-op) — decide in plan.
- Whether to flatten groups in `ThemeGroupMatrix` component itself (via internal recursive flatten) or at the call site in `tokens/page.tsx` — either is fine.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### SPEC and requirements
- `.planning/phases/33-theme-configuration-color-density/33-SPEC.md` — Locked requirements, acceptance criteria, non-goals. MUST read before planning.

### Core type definitions
- `src/types/theme.types.ts` — `ITheme` interface (with `kind: ThemeKind`); `ColorMode`, `ThemeGroupState`, `ThemeKind`
- `src/types/token.types.ts` — `TokenGroup` (note: `children?: TokenGroup[]` for subgroups), `TokenType` — used to determine color vs. density scope

### Pages being modified
- `src/app/collections/[id]/tokens/page.tsx` — Main edit surface; dual `activeColorThemeId` / `activeDensityThemeId` state; Tokens + Themes + Style Guide tabset
- `src/app/collections/[id]/output/page.tsx` — Dual `selectedColorThemeId` + `selectedDensityThemeId` for export (further decisions deferred)

### Components
- `src/components/themes/ThemeList.tsx` — Supports `flat` mode with `matrixSelectedId` / `onMatrixSelect` for the Themes tab left panel
- `src/components/themes/ThemeGroupMatrix.tsx` — Group state matrix; **needs subgroup flattening fix** (D-18)

### Utilities
- `src/utils/tokenScope.ts` — `COLOR_SCOPE_TYPES`, `DENSITY_SCOPE_TYPES`, `dominantScopeForTokenTypes`
- `src/lib/themeTokenMerge.ts` — `mergeDualThemeTokens`
- `src/utils/resolveActiveThemeForGroup.ts` — `resolveActiveThemeIdForGroup`
- `src/utils/filterGroupsForActiveTheme.ts` — `filterGroupsForDualThemes`

### API routes
- `src/app/api/collections/[id]/themes/route.ts` — POST validates kind; density themes skip colorMode
- `src/app/api/collections/[id]/themes/[themeId]/route.ts` — PUT with kind-aware colorMode handling
- `src/app/api/collections/[id]/themes/[themeId]/tokens/route.ts` — PATCH with scope enforcement (rejects 400 on cross-scope writes)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ITheme` in `src/types/theme.types.ts` — extended with `kind: ThemeKind`; `colorMode` is optional on color themes
- `ThemeList` component — supports `flat` mode via `flat` prop; `matrixSelectedId` / `onMatrixSelect` for two-panel layout
- `ThemeGroupMatrix` — group state matrix; currently only renders top-level groups; needs recursive flatten (D-18)
- `dominantScopeForTokenTypes` in `tokenScope.ts` — already used in `ThemeGroupMatrix` for "Type" column

### Established Patterns
- `activeColorThemeId` + `activeDensityThemeId` state in `tokens/page.tsx` (replacing the original single `activeThemeId`)
- `key={${activeColorThemeId ?? 'c0'}-${activeDensityThemeId ?? 'd0'}}` pattern on `GroupStructureGraph` for remounting on theme change
- Group tree sidebar `sidebarHeader` prop in `CollectionTokensWorkspace` — used to inject the dual selectors
- `configuringThemeId` state in tokens/page.tsx drives which theme the Themes tab matrix shows

### Integration Points
- `tokens/page.tsx` Themes tab: left = `<ThemeList flat matrixSelectedId={configuringThemeId} onMatrixSelect={setConfiguringThemeId} />`; right = `<ThemeGroupMatrix theme={selectedTheme} groups={masterGroups} />`
- **The `groups` prop passed to `ThemeGroupMatrix` is `masterGroups` — a tree with nested `children`**. The fix (D-18) should flatten this before rendering rows.

</code_context>

<specifics>
## Specific Ideas

- **Multi-dimensional matrix framing**: Each combination of (color theme, density theme) is one "variant" of the design. The resolved token set for that combination is what gets exported.
- **Density scope is broad**: User confirmed density covers `dimension`, `fontSize`, `fontWeight`, `borderRadius` — not just spacing. Plan phase should enumerate the full list of `TokenType` values that map to density scope.
- **Snapshot trimming on save**: Trim is applied when saving theme tokens, not just at creation. Keeps the document lean as tokens evolve.
- **Subgroup example**: `typography/fontSize` and `typography/family` may need `source` state on a color theme (they're not color tokens). Users must be able to find and set these in the matrix — requires the flat-all-groups fix.
- **Flat table, no indentation**: All groups and subgroups appear as equal rows in the ThemeGroupMatrix table. No visual hierarchy. The full path name (e.g. `typography / fontSize`) is shown via `parseGroupPath`.

</specifics>

<deferred>
## Deferred Ideas

- **Output generator dual theme handling** — Further decisions about how color + density theme pair is represented in the export file format. Belongs in a follow-up phase.
- **AI/MCP tool parity for dual themes** — Phase 32 tools currently reference a single `themeId`. Once dual selection exists, a follow-up phase will update MCP tools to accept color + density theme IDs separately.
- **Export pair representation** — Config/export endpoints accepting a pair of theme IDs vs. deriving from stored prefs is flagged in SPEC as a plan-phase decision; further deferred.

</deferred>

---

*Phase: 33-theme-configuration-color-density*  
*Context gathered: 2026-04-26*  
*Context updated: 2026-05-03*
