# Phase 25: Enhance Read-Only View of Token Collections - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 25-enhance-read-only-view-of-token-collections
**Areas discussed:** Audience & access model, What makes it 'enhanced', Collections grid vs. token view, Theme browsing in read-only, Token types, Layout, Color display

---

## Phase Vision (user-provided upfront)

**User's choice:** "This phase adds a read-only tab view to the tokens table. Instead of listing tokens vertically we want to layout color pallets in a horizontal row like Tailwind palettes. For spacing and type we want to show examples. E.g spacing shows a grey div 10px height and {spacing}px wide (change layout axis for height). Type tokens show text with applied styles. This is essentially a style guide view."

---

## Audience

| Option | Description | Selected |
|--------|-------------|----------|
| All logged-in users | Admins, Editors, and Viewers all get the tab — view mode, not Viewer-only | ✓ |
| Viewers only | Only read-only users see the tab | |
| Public shareable link too | Also accessible without login via shareable URL | |

**User's choice:** All logged-in users
**Notes:** This is a view mode, not a permission feature — all roles benefit from the visual token reference.

---

## Token Types

| Option | Description | Selected |
|--------|-------------|----------|
| Generic fallback | Color/spacing/type custom; everything else falls back to name+value card | |
| Custom for all supported types | Shadow and border-radius get a 30×30 div with style applied; abstract tokens show as string | ✓ |
| Just color, spacing, type | Other types hidden from style guide | |

**User's choice:** Custom for all types that can be supported — shadow and border-radius use a 30×30 div with the style applied; remaining abstract tokens show as string.

---

## Tab Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Tokens page only | Tab alongside existing table on /collections/[id]/tokens | ✓ |
| Collections grid too | Preview on each collection card | |
| Separate route | Dedicated /collections/[id]/style-guide route | |

**User's choice:** Tokens page only — same page, new view mode tab.

---

## Theme Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, theme selector active | Theme selector works in style guide tab | ✓ |
| No, always collection default | Style guide pinned to base collection tokens | |
| You decide | Claude picks | |

**User's choice:** Theme selector active — switching themes updates the displayed values.

---

## Group Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Same group tree, different rendering | Existing sidebar tree drives navigation | ✓ |
| All groups in one scrollable page | Long scroll with section headings | |
| You decide | Claude picks | |

**User's choice:** Same group tree — existing tree drives navigation, no new navigation to build.

---

## Group Visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Same as token table | Disabled hidden, source and enabled shown | ✓ |
| Always show all groups | All groups regardless of theme state | |
| You decide | Claude picks | |

**User's choice:** Same visibility rules as the token table.

---

## Color Palette Layout

| Option | Description | Selected |
|--------|-------------|----------|
| One row per token group | Each group = horizontal row of swatches | ✓ |
| All colors in one grid | Single flat grid | |
| You decide | Claude picks | |

**User's choice:** One row per token group — matches Tailwind palette pattern.

---

## Color Swatch Labels

| Option | Description | Selected |
|--------|-------------|----------|
| Token name + hex (recommended) | Short name + hex value below swatch | |
| Full token path | Complete dot-notation path | |
| Just the value | Only resolved hex | |
| Swatch only + tooltip (user custom) | Swatch box only in row; hover tooltip shows token name + hex value | ✓ |

**User's choice:** Swatch box only (no inline label). Hover tooltip shows token name + resolved color value.

---

## Claude's Discretion

- Exact spacing between swatches in the color palette row
- Whether spacing tokens distinguish width vs height automatically from token path/name
- Typography sample text content
- Color swatch dimensions
- Transitive resolution of token references in visual previews

## Deferred Ideas

- Public/shareable links to style guide (unauthenticated access)
- Collections grid style guide preview
