# Phase 25: Enhance Read-Only View of Token Collections - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a "Style Guide" tab to the Tokens page that renders token values visually rather than as an editable table — essentially a design spec view. Each token type gets a purpose-built visual treatment (color palettes, spacing boxes, typography specimens, etc.). The tab is available to all logged-in users and respects the active theme and group tree selection.

</domain>

<decisions>
## Implementation Decisions

### Tab placement
- **D-01:** New "Style Guide" tab on the Tokens page (`/collections/[id]/tokens`) alongside the existing table tab
- **D-02:** No new routes — it's a view mode on the existing page, not a separate `/style-guide` route
- **D-03:** Available to all logged-in users (Admin, Editor, Viewer) — not Viewer-only

### Group navigation
- **D-04:** The existing left sidebar group tree drives navigation — selecting a group shows its tokens in the style guide layout (reuses existing tree, no new navigation)
- **D-05:** Group visibility follows the same rules as the token table: disabled groups hidden, source and enabled groups shown when a theme is active

### Theme integration
- **D-06:** The existing theme selector is active in the style guide tab — switching themes updates the displayed token values, enabling light/dark comparison

### Token type visuals
Each token type gets a distinct visual treatment:

- **D-07 — Color:** Horizontal palette row (Tailwind-style). One row per token group. Each token is a colored swatch box (background = resolved color value). No inline label; hover tooltip shows token name + resolved hex value.
- **D-08 — Spacing:** Grey div with fixed 10px height and `{spacing value}px` width (horizontal axis). For tokens that represent height, swap to fixed width + variable height. The actual resolved pixel/rem value is shown as a label.
- **D-09 — Typography:** Sample text rendered with the applied font styles (font-family, font-size, font-weight, line-height from the token value). Shows the token name + sample text.
- **D-10 — Shadow:** 30×30px div with the shadow value applied as `box-shadow`. Token name shown as label.
- **D-11 — Border-radius:** 30×30px div with the border-radius value applied. Token name shown as label.
- **D-12 — All other / abstract types:** Name + resolved value displayed as a text card (no visual element). No types are hidden — everything renders in some form.

### Claude's Discretion
- Exact spacing between swatches in the color palette row
- Whether spacing tokens distinguish width-spacing vs height-spacing automatically based on token path/name, or use a single fixed axis
- Typography sample text content (e.g., "Ag" / "The quick brown fox" / token name)
- Color swatch size (width/height dimensions)
- Whether unresolved references (tokens pointing to another token) show the reference chain or resolve transitively

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Tokens page (main integration point)
- `src/app/collections/[id]/tokens/page.tsx` — The Tokens page where the new tab will be added; contains theme selector, group tree, theme-aware token derivation (`activeThemeTokens`, `themeTokens`), `isThemeReadOnly`, `activeGroupState`

### Token display components
- `src/components/tokens/TokenGroupTree.tsx` — Left sidebar group tree; same component drives navigation in style guide view
- `src/components/tokens/TokenTable.tsx` — Existing table component; style guide view is a parallel alternative, not a modification of this

### Types
- `src/types/token.types.ts` — Token type definitions (check what token types exist: `color`, `spacing`, `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `shadow`, `borderRadius`, etc.)
- `src/types/theme.types.ts` — Theme and group state types

### Architecture docs
- `documentation/themes-and-graph-data-model.md` — Theme tokens, group states, how `activeThemeTokens` is derived
- `CLAUDE.md` — Project conventions, theme token routing rules

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `activeThemeTokens` / `themeTokens` (tokens page): Already computed theme-aware token values — style guide tab reads from the same derived state, no new data fetching needed
- `isGroupSource` / `activeGroupState` (tokens page): Already determines read-only vs editable state per group — style guide view respects the same state
- `TokenGroupTree` component: Existing tree drives navigation; style guide view plugs into `selectedGroupId` / `onGroupSelect` already wired on the tokens page
- `ColorSwatch` in `TokenTable.tsx`: Existing color swatch pattern — can inform the style guide color swatch rendering

### Established Patterns
- Tab UI: shadcn/ui `Tabs` component already used elsewhere in the app
- Tooltip: shadcn/ui `Tooltip` for hover token name + value on color swatches
- Token type detection: token objects have a `type` field — style guide switches rendering on `token.type`

### Integration Points
- Tabs are added to the Tokens page layout (the content area above/alongside the table)
- Style guide tab reads from `activeThemeTokens` (or `themeTokens` + `masterGroups` depending on active theme) — same data the table uses
- `selectedGroupId` filters which group's tokens are shown — same prop that drives the table

</code_context>

<specifics>
## Specific Ideas

- Color palette row: "like Tailwind palettes" — each group is a row, tokens in that group are swatches in a horizontal strip. Hover a swatch → tooltip shows `{tokenName}: {hexValue}`.
- Spacing example: "a grey div 10px height and {spacing}px wide" — visual bar showing the spacing value proportionally.
- Typography: "show text with applied styles" — render sample text using the token's font properties directly.
- Shadow / border-radius: "just use a common element e.g. div 30x30 with style applied" — small preview tile with the value applied.
- Abstract remaining tokens: show as string (name + value card, no visual element).

</specifics>

<deferred>
## Deferred Ideas

- Public/shareable link (unauthenticated access to style guide) — out of scope for this phase; would require a separate auth bypass mechanism
- Collections grid style guide preview card — out of scope; this phase is Tokens page only

</deferred>

---

*Phase: 25-enhance-read-only-view-of-token-collections*
*Context gathered: 2026-04-03*
