# Phase 25: Enhance Read-Only View of Token Collections - Research

**Researched:** 2026-04-03
**Domain:** React/Next.js component composition, design token visualization, shadcn/ui Tabs
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** New "Style Guide" tab on the Tokens page (`/collections/[id]/tokens`) alongside the existing table tab
- **D-02:** No new routes — it's a view mode on the existing page, not a separate `/style-guide` route
- **D-03:** Available to all logged-in users (Admin, Editor, Viewer) — not Viewer-only
- **D-04:** The existing left sidebar group tree drives navigation — selecting a group shows its tokens in the style guide layout (reuses existing tree, no new navigation)
- **D-05:** Group visibility follows the same rules as the token table: disabled groups hidden, source and enabled groups shown when a theme is active
- **D-06:** The existing theme selector is active in the style guide tab — switching themes updates the displayed token values, enabling light/dark comparison
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

### Deferred Ideas (OUT OF SCOPE)

- Public/shareable link (unauthenticated access to style guide) — out of scope for this phase; would require a separate auth bypass mechanism
- Collections grid style guide preview card — out of scope; this phase is Tokens page only
</user_constraints>

---

## Summary

Phase 25 adds a "Style Guide" tab to the existing Tokens page (`/collections/[id]/tokens`). The tab renders the same token data the token table already shows, but as purpose-built visual specimens rather than an editable table. No new data fetching, no new routes, no new API endpoints — this is entirely a presentational layer built on top of already-derived state.

The integration point is the `TokenGeneratorForm` / main content panel within the existing resizable layout. Currently that panel has two sections (form + graph), with a sidebar driving group navigation. The style guide replaces the centre-panel content when the "Style Guide" tab is active — the sidebar (group tree + theme selector) and header remain untouched.

The primary technical challenge is: (1) implementing type-dispatch rendering (a switch on `token.type` producing different visual treatments), and (2) resolving token references transitively before display. Both have clear precedents in the existing codebase — `tokenService.resolveTokenReference()` already handles transitive resolution, and the `ColorSwatch` pattern in `TokenGeneratorForm.tsx` already does type-conditional display.

**Primary recommendation:** Build `StyleGuidePanel` as a new component in `src/components/tokens/`, dispatching to per-type sub-components, reading from the same `activeThemeTokens` / `masterGroups` state the table uses, and wired into the Tokens page with the existing shadcn `Tabs` component.

---

## Standard Stack

### Core (already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@radix-ui/react-tabs` | already installed (tabs.tsx uses it) | Tab primitive | Already wired; `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` exported from `src/components/ui/tabs.tsx` |
| `@radix-ui/react-tooltip` | check below | Hover tooltips on color swatches | shadcn Tooltip already used in app per CONTEXT.md |
| React (Next.js 13.5.9) | 13.5.9 locked | Component framework | Project constraint |
| Tailwind CSS | project standard | Utility classes for swatch layouts | Already used throughout |

### Tooltip availability check

The CONTEXT.md notes `Tooltip` is already used for hover token name + value. The component likely exists at `src/components/ui/tooltip.tsx` (standard shadcn pattern). This must be verified before planning — if it does not exist, Wave 0 needs to add it via `npx shadcn-ui@latest add tooltip`.

**No new npm packages required.** All visual treatments are achievable with inline `style` props + Tailwind classes.

### Installation

None needed — all dependencies already in project.

---

## Architecture Patterns

### Recommended File Structure

```
src/components/tokens/
├── StyleGuidePanel.tsx          # Root: receives tokens[], resolveRef, renders by type
├── style-guide/
│   ├── ColorPaletteRow.tsx      # D-07: horizontal swatch strip for a group
│   ├── SpacingPreview.tsx       # D-08: grey bar proportional to spacing value
│   ├── TypographySpecimen.tsx   # D-09: sample text with applied font styles
│   ├── ShadowPreview.tsx        # D-10: 30x30 div with box-shadow applied
│   ├── BorderRadiusPreview.tsx  # D-11: 30x30 div with border-radius applied
│   └── TokenValueCard.tsx       # D-12: fallback — name + resolved value text card
```

### Pattern 1: Type-Dispatch Rendering

`StyleGuidePanel` receives `tokens: GeneratedToken[]` (already filtered to the selected group by the page) and a `resolveRef` function. It iterates tokens and renders the correct sub-component based on `token.type`.

```typescript
// Source: pattern derived from existing TokenGeneratorForm.tsx ColorSwatch dispatch
function StyleGuidePanel({ tokens, resolveRef }: StyleGuidePanelProps) {
  return (
    <div className="p-6 flex flex-col gap-8">
      {tokens.map(token => {
        const resolved = resolveRef(token.value?.toString() ?? '');
        switch (token.type) {
          case 'color':
            return <ColorSwatch key={token.id} token={token} resolvedValue={resolved} />;
          case 'spacing':
          case 'dimension':
            return <SpacingPreview key={token.id} token={token} resolvedValue={resolved} />;
          case 'fontFamily':
          case 'fontSize':
          case 'fontWeight':
          case 'lineHeight':
          case 'letterSpacing':
          case 'typography':
            return <TypographySpecimen key={token.id} token={token} resolvedValue={resolved} />;
          case 'boxShadow':
          case 'shadow':
          case 'textShadow':
            return <ShadowPreview key={token.id} token={token} resolvedValue={resolved} />;
          case 'borderRadius':
            return <BorderRadiusPreview key={token.id} token={token} resolvedValue={resolved} />;
          default:
            return <TokenValueCard key={token.id} token={token} resolvedValue={resolved} />;
        }
      })}
    </div>
  );
}
```

### Pattern 2: Color Palette Row (D-07)

Color tokens in the same group are rendered as a horizontal strip. The style guide groups all `color` tokens from the selected group into a single palette row.

```tsx
// Tailwind-style palette row: one row of colored boxes
<div className="flex flex-wrap gap-1">
  {colorTokens.map(token => (
    <Tooltip key={token.id}>
      <TooltipTrigger asChild>
        <div
          className="w-12 h-12 rounded border border-gray-200 cursor-default"
          style={{ backgroundColor: resolveRef(token.value?.toString() ?? '') }}
        />
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-mono text-xs">{token.path}: {resolveRef(token.value?.toString() ?? '')}</p>
      </TooltipContent>
    </Tooltip>
  ))}
</div>
```

### Pattern 3: Tab Integration in the Tokens Page

The current page render at ~line 1216 has the `ResizablePanelGroup` filling the detail pane. The tab switch wraps the left panel content:

```tsx
// In page.tsx, replace the <main> content in the left ResizablePanel:
<Tabs defaultValue="tokens">
  <TabsList>
    <TabsTrigger value="tokens">Tokens</TabsTrigger>
    <TabsTrigger value="style-guide">Style Guide</TabsTrigger>
  </TabsList>
  <TabsContent value="tokens">
    {/* existing TokenGeneratorForm */}
  </TabsContent>
  <TabsContent value="style-guide">
    <StyleGuidePanel
      tokens={tokensForSelectedGroup}
      resolveRef={resolveTokenReference}
    />
  </TabsContent>
</Tabs>
```

The `resolveTokenReference` function already exists at line 1323 of `page.tsx` (within `TokenGeneratorForm`) — the page needs to expose this function or replicate the `tokenService.resolveTokenReference(value, activeGroups)` call directly.

### Pattern 4: Deriving Tokens for the Selected Group

The page already maintains:
- `masterGroups: TokenGroup[]` — collection default tokens
- `activeThemeTokens: TokenGroup[]` — theme-overridden token copy (set when `activeThemeId` is non-null)
- `selectedGroupId: string` — the currently selected group

The style guide uses the same "which tokens to show" logic the table uses. The correct group to render is `findGroupById(themeTokens, selectedGroupId)` where `themeTokens = activeThemeId ? activeThemeTokens : masterGroups`.

```typescript
// Derive displayable token groups for selected group:
const displayGroups = activeThemeId ? activeThemeTokens : masterGroups;
const selectedGroup = findGroupById(displayGroups, selectedGroupId);
const tokensToDisplay = selectedGroup?.tokens ?? [];
```

`findGroupById` is already imported from `@/utils` in `page.tsx`.

### Anti-Patterns to Avoid

- **Don't add a new API fetch in StyleGuidePanel.** All data is already in page state — pass it as props.
- **Don't modify TokenGeneratorForm.** The style guide is a parallel alternative view, not a modification of the existing form. CONTEXT.md decision confirmed this.
- **Don't use `token.value` directly for display.** Always call `resolveRef(token.value)` — values may be `{token.color.base.red}` references that must be resolved before rendering.
- **Don't hide unresolved references.** If `resolveRef` returns the raw `{...}` string (circular or missing source), render the raw string in the fallback `TokenValueCard` rather than crashing or hiding.
- **Don't filter out token types.** D-12 requires all types render in some form — the `default` branch of the switch must always produce a `TokenValueCard`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tab switching | Custom state + visibility toggling | shadcn `Tabs` (`src/components/ui/tabs.tsx`) | Already installed; handles keyboard navigation, ARIA, active state styling |
| Hover tooltips on swatches | Custom hover state + positioned div | shadcn `Tooltip` (verify exists at `src/components/ui/tooltip.tsx`) | Handles portal rendering, positioning, pointer events correctly |
| Transitive token reference resolution | Custom recursive resolver | `tokenService.resolveTokenReference(value, groups)` | Already handles circular refs, namespace stripping, depth-first search across nested groups |

**Key insight:** The resolution of `{token.color.base.red}` to `#ef4444` is already solved. The only job of the style guide components is to consume the resolved value and apply it visually.

---

## Common Pitfalls

### Pitfall 1: Passing the Wrong Token Source to StyleGuidePanel

**What goes wrong:** Passing `masterGroups` tokens when a theme is active — Viewer sees collection default values rather than theme overrides.

**Why it happens:** `masterGroups` is always populated; `activeThemeTokens` is only populated when `activeThemeId` is non-null. It is easy to grab the wrong one.

**How to avoid:** Use the same conditional the table uses: `activeThemeId ? activeThemeTokens : masterGroups`. The `filteredGroups` variable (already computed for the tree) already applies theme visibility rules — use `findGroupById(activeThemeId ? activeThemeTokens : masterGroups, selectedGroupId)` for the token payload.

**Warning signs:** Style guide shows outdated colors when theme is switched.

### Pitfall 2: Rendering Raw `{...}` Reference Strings as CSS Values

**What goes wrong:** Using `token.value` directly as a CSS `backgroundColor` — the browser cannot parse `{token.color.base.red}` as a color, producing a transparent or broken swatch.

**Why it happens:** Some tokens alias other tokens. `token.value` stores the raw reference string, not the resolved color.

**How to avoid:** Always call `resolveRef(token.value?.toString() ?? '')` before passing to any CSS style prop. The `ColorSwatch` component in `TokenGeneratorForm.tsx` (line ~39) already guards this with `displayValue.startsWith('{') ? '#cccccc' : displayValue`.

**Warning signs:** Swatches render transparent / grey when they should be colored.

### Pitfall 3: Tab Content Scrolling vs. Page Layout

**What goes wrong:** The `TabsContent` div does not scroll; long token lists overflow and are clipped.

**Why it happens:** The `<main>` panel in the resizable pane has `overflow-y-auto` applied to it. If `TabsContent` renders inside a `flex` container without its own scroll, content is clipped.

**How to avoid:** The `StyleGuidePanel` root div should have `overflow-y-auto h-full` — or the `TabsContent` itself should. Keep the same scroll container pattern as the existing `<main className="h-full overflow-y-auto p-6 ...">`.

**Warning signs:** Only a few tokens visible; scrolling does nothing.

### Pitfall 4: Tooltip Component Not Installed

**What goes wrong:** Plan imports `Tooltip` from `src/components/ui/tooltip.tsx` but the file does not exist — the file list shows no `tooltip.tsx` in `src/components/ui/`.

**Why it happens:** The CONTEXT.md mentions shadcn `Tooltip` is used elsewhere in the app, but inspection of `src/components/ui/` shows only: `alert-dialog.tsx`, `badge.tsx`, `button.tsx`, `checkbox.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `input.tsx`, `menubar.tsx`, `popover.tsx`, `resizable.tsx`, `select.tsx`, `tabs.tsx`. No `tooltip.tsx`.

**How to avoid:** Wave 0 of the plan must add `tooltip.tsx` via shadcn CLI: `npx shadcn-ui@latest add tooltip` — or hand-author a minimal Radix tooltip wrapper. This is a prerequisite before D-07 color swatch hover is implementable.

**Warning signs:** Import error at build time: `Cannot find module '@/components/ui/tooltip'`.

### Pitfall 5: Typography Token Rendering — Individual vs. Composite

**What goes wrong:** A `typography` composite token (type=`typography`) stores an object value (e.g. `{ fontFamily: "...", fontSize: "...", fontWeight: "..." }`), not a plain string. Passing it as a CSS property directly breaks.

**Why it happens:** The DTCG spec allows `typography` as a composite type whose value is an object. The existing `TokenType` enum includes both individual font tokens (`fontFamily`, `fontSize`, etc.) AND the composite `typography` type.

**How to avoid:** In `TypographySpecimen`, check `typeof token.value === 'object'` — if composite, destructure the object into individual CSS props. If a plain string, apply it as-is.

**Warning signs:** Typography specimen renders nothing or throws `objects are not valid as React children`.

---

## Code Examples

### Verified: resolveTokenReference API

```typescript
// Source: src/services/token.service.ts line 344
resolveTokenReference(reference: string, allGroups: TokenGroup[]): string
// Handles: transitive resolution, circular refs (returns raw string), namespace prefix stripping
// Returns: the resolved scalar value string, or the original reference string if unresolvable
```

### Verified: Tabs Component API

```tsx
// Source: src/components/ui/tabs.tsx (Radix TabsPrimitive)
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

<Tabs defaultValue="tokens">
  <TabsList>
    <TabsTrigger value="tokens">Tokens</TabsTrigger>
    <TabsTrigger value="style-guide">Style Guide</TabsTrigger>
  </TabsList>
  <TabsContent value="tokens">...</TabsContent>
  <TabsContent value="style-guide">...</TabsContent>
</Tabs>
```

### Verified: Token Type Enum (all types requiring dispatch)

```typescript
// Source: src/types/token.types.ts lines 2-24
type TokenType =
  | 'color'
  | 'dimension'       // maps to spacing/dimension visual
  | 'fontFamily' | 'fontWeight' | 'fontSize' | 'lineHeight' | 'letterSpacing'
  | 'borderRadius' | 'borderWidth'
  | 'opacity'
  | 'boxShadow' | 'textShadow' | 'shadow'
  | 'duration' | 'cubicBezier'
  | 'number' | 'string' | 'strokeStyle' | 'border' | 'transition' | 'gradient' | 'typography';
```

### Verified: findGroupById usage pattern

```typescript
// Source: already imported in page.tsx from '@/utils'
import { findGroupById } from '@/utils';

const selectedGroup = findGroupById(
  activeThemeId ? activeThemeTokens : masterGroups,
  selectedGroupId
);
const tokens = selectedGroup?.tokens ?? [];
```

### Verified: TokenGeneratorForm tab position in page layout

The tabs wrapping must go around the content of the left `ResizablePanel` (the `<main>` element at line 1221). The graph panel (`TokenGraphPanel`) in the right `ResizablePanel` stays unchanged. The sidebar (`<aside>`) stays unchanged. Only the left panel content switches between the existing form view and the new style guide view.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| No style guide — only editable table | Style Guide tab with visual specimens | Viewers get a design-spec-quality view; lighter than a full Storybook integration |
| Color shown as hex string in table | Rendered as colored swatch with hover tooltip | Visual at-a-glance; matches Tailwind docs / Figma palette UX |

---

## Open Questions

1. **Tooltip component existence**
   - What we know: `src/components/ui/` does not currently contain `tooltip.tsx` (verified from file listing)
   - What's unclear: Whether tooltip is available via another import path (e.g., Radix direct import) or truly absent
   - Recommendation: Wave 0 task must add it — either via shadcn CLI or hand-authored Radix wrapper before implementing D-07

2. **Typography composite token value shape**
   - What we know: `typography` type exists in `TokenType`; DTCG spec allows object values for composite types
   - What's unclear: Whether the existing generator ever produces composite `typography` tokens (object values) or whether all typography tokens are individual scalar types in this project
   - Recommendation: `TypographySpecimen` should handle both shapes defensively — check `typeof resolvedValue === 'object'` and render object properties individually if so

3. **Spacing unit parsing**
   - What we know: D-08 says "a grey div {spacing value}px wide" — the spec says `{spacing value}px width`
   - What's unclear: Are spacing token values stored as `"16px"`, `"16"`, `"1rem"`, or bare numbers? The width rendering logic needs to handle unit parsing
   - Recommendation: Strip non-numeric suffix for rendering the bar width, display the raw resolved value as the label. Cap the rendered bar at a max width (e.g., 300px) to avoid overflow for large spacing values.

---

## Environment Availability

Step 2.6: SKIPPED — this phase has no external runtime dependencies. All work is React component composition on top of existing project code and installed packages.

---

## Validation Architecture

### Test Framework

No `workflow.nyquist_validation` key found in `.planning/config.json` — treating as enabled.

| Property | Value |
|----------|-------|
| Framework | Not detected (no pytest.ini, jest.config.*, vitest.config.* found) |
| Config file | None found |
| Quick run command | `yarn build` (TypeScript compile — zero-error gate) |
| Full suite command | `yarn build` + manual smoke test in browser |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D-01 | Style Guide tab appears on Tokens page | smoke | `yarn build` (TypeScript) | N/A |
| D-07 | Color tokens render as colored swatches | manual | Browser smoke test | N/A |
| D-08 | Spacing tokens render as proportional grey bar | manual | Browser smoke test | N/A |
| D-09 | Typography tokens render sample text with font styles | manual | Browser smoke test | N/A |
| D-10/D-11 | Shadow / border-radius render as 30×30 preview tile | manual | Browser smoke test | N/A |
| D-12 | All other types render as text card (nothing hidden) | manual | Browser smoke test | N/A |
| D-06 | Theme switch updates displayed values in Style Guide | manual | Browser smoke test | N/A |
| D-04/D-05 | Group tree selection and disabled group rules respected | manual | Browser smoke test | N/A |

### Sampling Rate

- **Per task commit:** `yarn build` — zero TypeScript errors required
- **Per wave merge:** `yarn build` + browser smoke on a real collection
- **Phase gate:** All visual specimens render correctly before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/components/ui/tooltip.tsx` — required for color swatch hover (D-07); add via `npx shadcn-ui@latest add tooltip` or hand-author Radix wrapper
- [ ] No automated test files needed — all validation is manual smoke + TypeScript gate

---

## Sources

### Primary (HIGH confidence)

- Direct source read: `src/app/collections/[id]/tokens/page.tsx` — page layout, state variables (`activeThemeTokens`, `masterGroups`, `filteredGroups`, `selectedGroupId`, `isThemeReadOnly`, `activeGroupState`), `handleThemeChange`, `findMasterValue`
- Direct source read: `src/types/token.types.ts` — full `TokenType` union, `GeneratedToken` and `TokenGroup` interfaces
- Direct source read: `src/types/theme.types.ts` — `ITheme`, `ThemeGroupState`, `ColorMode`
- Direct source read: `src/components/ui/tabs.tsx` — confirmed `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` API
- Direct source read: `src/services/token.service.ts` — `resolveTokenReference` signature and behavior (transitive, circular-ref safe)
- Direct source read: `src/components/tokens/TokenGeneratorForm.tsx` — existing `resolveTokenReference` call pattern, `ColorSwatch` component inline pattern

### Secondary (MEDIUM confidence)

- CONTEXT.md canonical refs — confirms `activeThemeTokens`, `isGroupSource`, `activeGroupState` patterns

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all dependencies verified present in codebase; no new packages required (caveat: tooltip.tsx needs verification/addition)
- Architecture: HIGH — integration points verified directly in page.tsx source; all state variables confirmed
- Pitfalls: HIGH — all pitfalls derived from direct source inspection (ColorSwatch pattern, file listing, type system)

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable codebase; no fast-moving dependencies)
