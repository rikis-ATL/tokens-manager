# Phase 14: dark-mode-support - Research

**Researched:** 2026-03-25
**Domain:** Design token data model extension + CSS/JS/Figma export augmentation
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Modes are baked into themes — NOT a separate axis. Each theme is either light or dark.
- Every theme (including the default collection) has a `colorMode: "light" | "dark"` field.
- The default/master theme is always `"light"` (not user-changeable).
- Custom themes have an editable `colorMode` — set at creation and changeable after.
- Only Light and Dark modes supported — no custom mode names.
- Each theme has its own token store (consistent with existing theme architecture).
- `colorMode` is selectable in the **Create Theme** dialog (light/dark).
- `colorMode` is also editable on existing themes via a **theme settings panel or popover** (e.g., "..." menu on theme).
- Theme selector badges show a visual indicator of the mode (light/dark) for each theme chip.
- CSS/SCSS: Dark mode tokens wrapped in `[data-color-mode="dark"]` attribute selector. Light and dark combined in a single output file (`:root { }` for light, `[data-color-mode="dark"] { }` for dark). GitHub export follows same combined pattern.
- Figma: `colorMode` maps to a Figma Variable Mode. Themes with same group structure merged into one Figma collection with two modes (Light/Dark). Themes with different group structures = separate Figma collections.
- JS/TS: Dark mode tokens use same key names as light, exported as separate objects (e.g., `tokens.dark`).
- `colorMode` applies per-theme, collection-wide — all groups within a theme share the same mode.
- `colorMode` is primarily metadata for export + a badge in the UI. Token table editing experience does not change.

### Claude's Discretion

- Exact badge design (icon, label, color) on theme chips.
- Positioning of colorMode field within the theme settings popover.
- How to handle edge cases where a collection has only dark themes and no light theme (warn, export as-is, etc.).

### Deferred Ideas (OUT OF SCOPE)

- CSS `light-dark()` function output — combining light and dark values into native CSS `light-dark(color1, color2)` syntax. A future export format enhancement.
</user_constraints>

---

## Summary

Phase 14 adds a `colorMode: "light" | "dark"` field to the `ITheme` interface and propagates that information through the export pipeline. The data model change is minimal — one new optional field on the existing `ITheme` type and the `TokenCollection` Mongoose schema (both already use `Schema.Types.Mixed` so no migration is required). The UI changes involve: adding a light/dark toggle to the create-theme dialog, adding a settings popover to each theme chip for post-creation edits, and rendering a visual badge on theme items in the theme selector.

The export changes are the most substantial part. The CSS/SCSS/LESS build pipeline (via Style Dictionary v5) currently produces a single `:root {}` block per brand. Phase 14 must produce a combined file with `:root {}` for light themes and `[data-color-mode="dark"] {}` for dark themes. The `buildTokens` service in `style-dictionary.service.ts` receives already-merged token JSON with no color mode context, so the service must be extended to accept a `colorMode` parameter and apply the correct CSS selector wrapper. For JS/TS, SD's `javascript/es6` and `typescript/es6-declarations` formatters produce module-level exports — dark tokens must be exported as a separate named object alongside the light object. For Figma, the existing multi-mode payload builder already creates one mode per theme; Phase 14 groups light/dark themes from the same collection into one Figma collection, using mode names "Light" and "Dark" instead of theme names.

The work decomposes cleanly into four streams: (1) data model + API — add `colorMode` to `ITheme`, update POST/PUT endpoints, handle default theme synthetic colorMode; (2) UI — badge on theme chips, colorMode picker in create dialog, settings popover on existing themes; (3) CSS/SCSS/LESS export — combined light/dark file generation using `[data-color-mode="dark"]`; (4) JS/TS and Figma exports — separate dark object structure and colorMode-aware Figma mode grouping.

**Primary recommendation:** Extend `ITheme` with `colorMode`, thread it through existing API patterns, build a `buildColorModeTokens(light, dark)` helper in `style-dictionary.service.ts` that produces combined output, and update the Figma payload builder to group by colorMode rather than theme name.

---

## Standard Stack

### Core (already in use — no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| style-dictionary | ^5.3.2 | Token transformation + format emission | Already used for all CSS/JS/TS/SCSS/JSON output |
| mongoose | ^9.2.2 | MongoDB ODM — `Schema.Types.Mixed` for themes array | Already used; no schema migration needed for new field |
| next | 14.2.18 | API routes + React server components | Existing framework |
| lucide-react | (existing) | Icon library — Sun/Moon icons for colorMode badge | Already imported elsewhere |
| tailwindcss | (existing) | Utility classes for badge styling | Already used throughout |

### No New Dependencies

Phase 14 requires zero new npm packages. All behavior is achieved by extending existing services and types.

---

## Architecture Patterns

### Current Theme Data Flow

```
ITheme {
  id: string
  name: string
  groups: Record<string, ThemeGroupState>
  tokens: TokenGroup[]
  graphState?: CollectionGraphState | null
}
```

### Phase 14 Extended Type

```typescript
// src/types/theme.types.ts — ONLY change
export type ColorMode = 'light' | 'dark';

export interface ITheme {
  id: string;
  name: string;
  colorMode: ColorMode;   // NEW — defaults to 'light' for existing themes
  groups: Record<string, ThemeGroupState>;
  tokens: TokenGroup[];
  graphState?: CollectionGraphState | null;
}
```

**Default theme (`__default__`):** This is a synthetic concept — it has no `ITheme` document in MongoDB. The default is always `colorMode: 'light'`. Export code must treat the absence of a theme as `colorMode: 'light'`.

**Existing themes without `colorMode`:** MongoDB `Schema.Types.Mixed` stores themes as plain objects — existing theme documents lack the `colorMode` field. Reading code must treat `colorMode ?? 'light'` as the fallback. No migration script needed (unlike Phase 10 which required migrating `tokens`).

### Pattern 1: colorMode Propagation Through Build Pipeline

**What:** The `buildTokens` service receives merged token JSON. For combined light+dark export, it must receive BOTH the light token set and the dark token set, then emit a combined output.

**Current signature:**
```typescript
// src/services/style-dictionary.service.ts
export async function buildTokens(request: BuildTokensRequest): Promise<BuildTokensResult>

// src/types/token.types.ts
export interface BuildTokensRequest {
  tokens: Record<string, unknown>;
  namespace: string;
  collectionName: string;
  themeLabel?: string;
}
```

**Extended signature for Phase 14:**
```typescript
export interface BuildTokensRequest {
  tokens: Record<string, unknown>;       // light (or default) token set
  namespace: string;
  collectionName: string;
  themeLabel?: string;
  // Phase 14 additions:
  darkTokens?: Record<string, unknown>;  // dark token set if any dark theme exists
  colorMode?: 'light' | 'dark' | 'combined';  // 'combined' when both light+dark present
}
```

**CSS combined output approach:**

Style Dictionary v5 does not have a built-in "selector wrapper" concept beyond `:root`. The cleanest approach is to run SD twice — once for light, once for dark — then post-process the raw output strings:

```typescript
// After building dark tokens with SD:
const darkCss = capturedContent
  .replace(':root {', '[data-color-mode="dark"] {');
// Then concatenate: lightContent + '\n\n' + darkCssContent
```

This approach is safe because SD's `css/variables` formatter always emits a single `:root { }` block (verified by reading the service code). The string replacement is deterministic and does not require SD customization.

### Pattern 2: Combined CSS File Structure

```css
/* Light tokens (default, :root) */
:root {
  --token-color-primary: #1a73e8;
  /* ... */
}

/* Dark tokens ([data-color-mode="dark"]) */
[data-color-mode="dark"] {
  --token-color-primary: #82b4f5;
  /* ... */
}
```

This is the standard industry approach used by Radix UI, Material Design, and most DS build pipelines. The consuming app applies `data-color-mode="dark"` to `<html>` or a wrapper element.

### Pattern 3: JS/TS Dark Export Structure

**Decision:** Dark tokens exported as a separate named object with matching key structure.

Current SD output for `javascript/es6`:
```javascript
export const TokenColorPrimary = "#1a73e8";
```

The locked decision ("dark tokens exported as separate objects e.g. `tokens.dark`") does not fit cleanly into SD's `javascript/es6` flat export model (which produces individual `export const` statements, not nested objects). The correct approach: run SD for dark tokens with a **different namespace** to produce differently-named exports, then combine:

```typescript
// Light namespace: "token" → exports TokenColorPrimary = "..."
// Dark namespace: "tokenDark" → exports TokenDarkColorPrimary = "..."
// Combined output: both concatenated in one file
```

Alternatively, use SD's `json/nested` format for the dark object and combine with the light JS output:
```javascript
export const TokenColorPrimary = "#1a73e8"; // light
export const tokenDark = { color: { primary: "#82b4f5" } }; // dark
```

**Recommendation:** Use the namespace-prefix approach for JS/TS — it produces valid ES module syntax without custom formatters. The dark namespace would be `${namespace}Dark`. This matches the "same key names, separate objects" requirement while staying within SD v5's standard formatters.

### Pattern 4: Figma colorMode-Aware Grouping

**Current behavior:** One Figma collection per MongoDB collection, one mode per theme (all themes).

**Phase 14 behavior:** One Figma collection per "group structure match". Themes with the same group structure (same enabled/source group IDs) and different colorModes become two modes ("Light", "Dark") in one Figma collection. Themes with different group structures become separate Figma collections.

```typescript
// Figma payload builder pseudocode:
interface ThemeGroup {
  groupKey: string;       // canonical fingerprint of enabled group IDs
  lightTheme: ITheme | null;
  darkTheme: ITheme | null;
}

function groupThemesByStructure(themes: ITheme[]): ThemeGroup[] {
  // For each theme: compute groupKey = sorted enabled/source group IDs
  // Pair themes by groupKey + colorMode
}
```

**Group structure fingerprint:** Sorted array of group IDs where state is `enabled` or `source`, joined as a string. Two themes are "same structure" if their fingerprints match.

**Edge case:** Two dark themes, same structure → second one wins (last write). Warn in console, use last dark theme encountered.

### Pattern 5: theme chip badge UI

The theme selector on the tokens page (`/tokens`) uses a `<Select>` dropdown. The themes page (`/themes`) uses a `<ThemeList>` sidebar list. Both need the colorMode badge.

**Badge approach (Claude's Discretion):**
- Use lucide-react `<Sun size={12} />` for light, `<Moon size={12} />` for dark.
- Badge is a small inline icon+pill next to the theme name.
- Colors: light = amber/yellow tint (`bg-amber-50 text-amber-700`), dark = slate/indigo tint (`bg-slate-100 text-slate-600`).

**Theme settings popover:** Add a "..." trigger to theme items in `ThemeList`. The popover contains a light/dark toggle (radio buttons or a segmented control). On change, PATCH `/api/collections/[id]/themes/[themeId]` with `{ colorMode }`.

**Create theme dialog:** Currently a plain `<input>` for name only. Extend with a radio group or segmented control for colorMode (light/dark), defaulting to light.

### Recommended File Changes

```
src/
├── types/
│   └── theme.types.ts          # Add ColorMode type + colorMode field to ITheme
│   └── token.types.ts          # Extend BuildTokensRequest with darkTokens/colorMode
├── app/api/
│   └── collections/[id]/themes/
│       ├── route.ts             # POST: accept colorMode in body, default 'light'
│       └── [themeId]/
│           └── route.ts         # PUT: accept colorMode in body
├── services/
│   └── style-dictionary.service.ts   # buildCombinedTokens() helper
│   └── themeTokenMerge.ts            # No change needed (returns merged tokens)
├── app/api/
│   ├── build-tokens/route.ts    # Pass colorMode/darkTokens through to service
│   └── export/
│       ├── figma/route.ts       # colorMode-aware Figma grouping
│       └── github/route.ts      # Pass combined output (built on client)
├── components/
│   ├── themes/
│   │   └── ThemeList.tsx        # Add colorMode badge + settings popover
│   └── dev/
│       └── BuildTokensPanel.tsx # Pass dark token context to build API
├── app/collections/[id]/
│   ├── tokens/page.tsx          # colorMode badge in theme selector
│   ├── config/page.tsx          # Combined export when multiple themes present
│   └── themes/page.tsx          # colorMode picker in create dialog
```

### Anti-Patterns to Avoid

- **Running SD with custom formatters for dark mode:** SD v5 allows custom format registration, but this is complex and fragile. Post-processing the output string (replacing `:root {` with `[data-color-mode="dark"] {`) is simpler, verified, and correct.
- **Adding colorMode as a collection-level field:** Per CONTEXT.md decision, colorMode is per-theme. The collection (default theme) is always light.
- **Separate files for light and dark:** CONTEXT.md locked: combined single file for CSS and GitHub export.
- **Renaming dark token keys:** CONTEXT.md locked: same key names, separate object (namespace prefix solves this).
- **Migration scripts:** The `colorMode` field defaults to `'light'` via `?? 'light'` in reading code. No migration needed — unlike Phase 10's `tokens` field (which required a one-time data migration), `colorMode` has a safe default.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSS variable generation | Custom CSS string builder | Style Dictionary v5 (already in use) | Handles transforms, references, type mapping |
| Dark mode CSS selector | Custom SD formatter plugin | Post-process SD output string | Simpler, no formatter registration, SD output is predictable |
| JSON-to-JS object conversion | Custom serializer | SD `javascript/es6` with namespace prefix | SD handles reserved keywords, value transforms |

**Key insight:** Phase 14 is primarily a data-threading problem, not a new technical capability. The export infrastructure already exists — the work is passing the right data to the right places.

---

## Common Pitfalls

### Pitfall 1: Missing colorMode on Legacy Themes

**What goes wrong:** Existing themes in MongoDB have no `colorMode` field. Reading code that doesn't handle `undefined` will produce TypeScript errors or runtime failures.

**Why it happens:** `themes` is stored as `Schema.Types.Mixed` — Mongoose does not validate or default-fill subdocument fields on existing records.

**How to avoid:** In ALL code that reads `theme.colorMode`, use `theme.colorMode ?? 'light'`. Add to `ITheme` as `colorMode: ColorMode` (non-optional in TypeScript) but treat DB reads defensively with the fallback.

**Warning signs:** TypeScript strict mode will catch if `colorMode` is accessed without null check when typed as optional. Make it required in the type but add DB-read helpers.

### Pitfall 2: Combined CSS Build When No Dark Theme Exists

**What goes wrong:** The Config page auto-triggers a build on load. If only one theme (light) is selected, the build should produce the standard single-theme output. If a dark theme is also in the collection, the combined output must include both.

**Why it happens:** The Config page currently builds a single `tokens` payload and sends it to `/api/build-tokens`. Phase 14 must decide: does the combined output always include all light+dark pairs, or only the selected theme's single output?

**Decision to clarify (Claude's Discretion):** Recommend: the Config page's "Export theme" selector selects a theme; if that theme is dark, use it as the dark half and pair with the collection default (light); if it's light, include any dark themes as a combined pair. Most natural behavior.

**How to avoid:** Clearly document the pairing logic in `buildTokens` and test edge cases (only dark, only light, multiple dark themes).

### Pitfall 3: Figma Mode Name Collision

**What goes wrong:** Figma API rejects duplicate mode names within a collection. If two light themes have the same group structure, they would both want to be "Light" mode.

**Why it happens:** The grouping logic produces one collection per group structure, with exactly two modes (Light, Dark). If two themes with the same structure and same colorMode exist, there's a conflict.

**How to avoid:** When grouping, if two themes share structure+colorMode, use the last one (log a console warning). This is a rare edge case given the 10-theme limit.

### Pitfall 4: Style Dictionary `:root` Selector Format

**What goes wrong:** Post-processing assumes SD always emits `:root {` — if the token set uses a custom selector or SD changes its format, the replacement fails silently.

**Why it happens:** SD's `css/variables` format uses `:root {` by default. SD v5 allows a `selector` option in the file config, but we don't use it.

**How to avoid:** Assert the expected format in the post-processor. If the string replacement count is 0, log a warning. Don't use regex with `.replace()` — use `.indexOf(':root {')` to verify presence first.

### Pitfall 5: ThemeList "add theme" inline input has no colorMode field

**What goes wrong:** The current add-theme flow is an inline text input that immediately calls `onAdd(name)`. There's no space for a colorMode picker in that inline input row.

**Why it happens:** Simple inline UX was designed for name-only entry. Phase 14 needs to add a second field.

**How to avoid:** Convert the inline add row to a small dialog (or extend it to a two-field form). The Create Theme dialog pattern is cleaner and matches the locked decision to have a dialog with a colorMode picker.

---

## Code Examples

### Type Extension

```typescript
// src/types/theme.types.ts
import type { TokenGroup } from './token.types';
import type { CollectionGraphState } from './graph-state.types';

export type ThemeGroupState = 'disabled' | 'enabled' | 'source';
export type ColorMode = 'light' | 'dark';

export interface ITheme {
  id: string;
  name: string;
  colorMode: ColorMode;  // NEW — always 'light' for __default__, user-set for custom
  groups: Record<string, ThemeGroupState>;
  tokens: TokenGroup[];
  graphState?: CollectionGraphState | null;
}
```

### DB Read Defensive Pattern

```typescript
// Anywhere ITheme is read from MongoDB (themes array on collection doc):
const theme = rawTheme as ITheme;
const colorMode: ColorMode = (theme.colorMode ?? 'light') as ColorMode;
```

### Theme POST — Accept colorMode

```typescript
// POST /api/collections/[id]/themes/route.ts
const body = await request.json() as { name?: string; colorMode?: string };

const validColorModes = ['light', 'dark'] as const;
const colorMode: ColorMode = (
  body.colorMode && validColorModes.includes(body.colorMode as ColorMode)
    ? body.colorMode
    : 'light'
) as ColorMode;

const theme: ITheme = {
  id: themeId,
  name: body.name!.trim(),
  colorMode,             // NEW
  groups: Object.fromEntries(groupIds.map((gid) => [gid, defaultState])),
  tokens: groupTree,
  graphState,
};
```

### Theme PUT — Accept colorMode

```typescript
// PUT /api/collections/[id]/themes/[themeId]/route.ts
const body = await request.json() as {
  name?: string;
  groups?: Record<string, ThemeGroupState>;
  graphState?: CollectionGraphState | null;
  colorMode?: ColorMode;  // NEW
};

const updatedTheme = {
  ...themes[themeIndex],
  ...(body.name !== undefined ? { name: body.name.trim() } : {}),
  ...(body.groups !== undefined ? { groups: body.groups } : {}),
  ...(body.graphState !== undefined ? { graphState: body.graphState } : {}),
  ...(body.colorMode !== undefined ? { colorMode: body.colorMode } : {}),  // NEW
};
```

### CSS Combined Output Builder

```typescript
// src/services/style-dictionary.service.ts — new helper

/**
 * Build combined light+dark CSS output.
 * Runs SD for each token set, then combines:
 *   - Light: :root { ... } (unchanged SD output)
 *   - Dark:  [data-color-mode="dark"] { ... } (post-processed from :root)
 */
async function buildCombinedCss(
  lightTokens: Record<string, unknown>,
  darkTokens: Record<string, unknown>,
  namespace: string,
  brand: string
): Promise<string> {
  const lightMap = await buildBrandTokens(lightTokens, namespace, brand);
  const darkMap  = await buildBrandTokens(darkTokens, namespace, `${brand}-dark`);

  const lightCss = lightMap.get('css') ?? '';
  const rawDarkCss = darkMap.get('css') ?? '';

  // Replace :root { with [data-color-mode="dark"] {
  const darkSelector = '[data-color-mode="dark"]';
  const darkCss = rawDarkCss.includes(':root {')
    ? rawDarkCss.replace(':root {', `${darkSelector} {`)
    : `${darkSelector} {\n${rawDarkCss}\n}`;

  return `${lightCss}\n\n${darkCss}`;
}
```

### JS/TS Dark Namespace Approach

```typescript
// For JS/TS dark tokens: build with "${namespace}Dark" namespace
// This produces: export const TokenDarkColorPrimary = "#82b4f5";
// Combined file = light exports + dark exports in same file

async function buildCombinedJs(
  lightTokens: Record<string, unknown>,
  darkTokens: Record<string, unknown>,
  namespace: string,
  brand: string
): Promise<string> {
  const lightMap = await buildBrandTokens(lightTokens, namespace, brand);
  const darkMap  = await buildBrandTokens(darkTokens, `${namespace}Dark`, `${brand}-dark`);

  const lightJs = lightMap.get('js') ?? '';
  const darkJs  = darkMap.get('js') ?? '';

  return `${lightJs}\n\n/* Dark mode tokens */\n${darkJs}`;
}
```

### Figma colorMode Grouping

```typescript
// src/app/api/export/figma/route.ts — updated buildMultiModePayload

interface ThemePair {
  groupKey: string;
  lightTheme: ITheme | null;
  darkTheme: ITheme | null;
}

function computeGroupKey(theme: ITheme): string {
  // Fingerprint = sorted enabled+source group IDs
  const activeGroups = Object.entries(theme.groups)
    .filter(([, state]) => state === 'enabled' || state === 'source')
    .map(([id]) => id)
    .sort();
  return activeGroups.join('|');
}

function pairThemesByColorMode(themes: ITheme[]): ThemePair[] {
  const pairMap = new Map<string, ThemePair>();
  for (const theme of themes) {
    const key = computeGroupKey(theme);
    const existing = pairMap.get(key) ?? { groupKey: key, lightTheme: null, darkTheme: null };
    const colorMode = (theme.colorMode ?? 'light') as ColorMode;
    if (colorMode === 'dark') {
      existing.darkTheme = theme;
    } else {
      existing.lightTheme = theme;
    }
    pairMap.set(key, existing);
  }
  return Array.from(pairMap.values());
}
```

### Theme Badge Component

```tsx
// Inline — used in ThemeList items and SelectItem for tokens page theme selector
import { Sun, Moon } from 'lucide-react';
import type { ColorMode } from '@/types/theme.types';

function ColorModeBadge({ colorMode }: { colorMode: ColorMode }) {
  if (colorMode === 'dark') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600">
        <Moon size={9} />
        Dark
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700">
      <Sun size={9} />
      Light
    </span>
  );
}
```

### colorMode Picker in Create Dialog

```tsx
// Replace inline add input in ThemeList with a small dialog:
<Dialog open={isAdding} onOpenChange={setIsAdding}>
  <DialogContent className="w-72">
    <DialogHeader><DialogTitle>New Theme</DialogTitle></DialogHeader>
    <div className="space-y-3">
      <Input
        value={addName}
        onChange={e => setAddName(e.target.value)}
        placeholder="Theme name"
        autoFocus
      />
      <div className="flex gap-2">
        <button
          onClick={() => setAddColorMode('light')}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded border text-xs
            ${addColorMode === 'light' ? 'bg-amber-50 border-amber-400 text-amber-800' : 'border-gray-200 text-gray-500'}`}
        >
          <Sun size={12} /> Light
        </button>
        <button
          onClick={() => setAddColorMode('dark')}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded border text-xs
            ${addColorMode === 'dark' ? 'bg-slate-100 border-slate-400 text-slate-800' : 'border-gray-200 text-gray-500'}`}
        >
          <Moon size={12} /> Dark
        </button>
      </div>
    </div>
    <DialogFooter>
      <Button size="sm" onClick={handleAddConfirm}>Create</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## State of the Art

| Old Approach | Current Approach | Phase 14 Impact |
|--------------|------------------|-----------------|
| Single `:root {}` CSS output | Still used for single-theme export | Combined `:root {} + [data-color-mode="dark"] {}` for collections with light+dark themes |
| One Figma mode per theme (name = theme.name) | Still used for single-colorMode collections | Light/Dark mode pair names for same-structure pairs |
| Theme name as mode label | Theme name (up to 40 chars) | "Light" / "Dark" as Figma mode names for paired themes |
| No colorMode metadata | N/A | `colorMode: "light" | "dark"` on every ITheme |

---

## Open Questions

1. **Config page combined export trigger**
   - What we know: The Config page lets the user select a theme from a dropdown and auto-builds on load.
   - What's unclear: Should combined CSS export always be triggered when the collection has both light and dark themes, or only when the user selects a specific theme?
   - Recommendation: When the selected theme is "Collection default" (light), auto-detect any dark themes in the collection and produce combined output. When a specific theme is selected, produce single-theme output for that theme (useful for previewing one mode). This gives the cleanest UX.

2. **GitHub export combined output**
   - What we know: GitHub export POSTs the current `tokenSet` JSON to the GitHub API as a file. The current route uploads raw JSON, not CSS — the CSS build happens in the browser's BuildTokensPanel.
   - What's unclear: Does "GitHub export follows the same combined pattern" mean the CSS string is pushed to GitHub, or the combined token JSON?
   - Recommendation: The GitHub export currently pushes the raw token JSON (not built CSS). The CONTEXT.md decision about combined CSS format applies to the BuildTokensPanel's CSS output (the preview + download). GitHub pushes the raw token data, not the CSS. Confirm this interpretation with user before implementing.

3. **Multiple dark themes for the same group structure**
   - What we know: The Figma grouping will produce exactly two modes (Light/Dark) per group key.
   - What's unclear: If the user has two dark themes with the same group structure, which one wins?
   - Recommendation: Last-one-wins with a console warning. Document in code. The 10-theme limit bounds the blast radius.

---

## Sources

### Primary (HIGH confidence)

- Direct codebase read: `src/types/theme.types.ts` — current ITheme shape
- Direct codebase read: `src/services/style-dictionary.service.ts` — SD v5 programmatic API usage, `buildBrandTokens` patterns
- Direct codebase read: `src/app/api/export/figma/route.ts` — current Figma multi-mode payload builder
- Direct codebase read: `src/lib/themeTokenMerge.ts` — merge pattern (no change needed)
- Direct codebase read: `src/lib/db/models/TokenCollection.ts` — `Schema.Types.Mixed` for themes (no migration needed)
- Direct codebase read: `src/components/themes/ThemeList.tsx` — inline add pattern to replace with dialog
- Direct codebase read: `src/app/collections/[id]/tokens/page.tsx` — theme selector implementation
- Direct codebase read: `src/app/collections/[id]/config/page.tsx` — export theme selector + BuildTokensPanel wiring
- SD v5 docs (verified in code): `formatPlatform()` returns `[{ output: string, destination: string }]`, `:root {` is the CSS variables formatter's hardcoded selector

### Secondary (MEDIUM confidence)

- `[data-color-mode="dark"]` attribute selector pattern: widely used in Radix UI, shadcn/ui, and similar DS libraries. Standard HTML attribute selector approach for CSS color scheme switching.
- Figma Variables API mode naming: mode names are user-configurable strings (confirmed via existing code: `theme.name.slice(0, 40)` truncation pattern).

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies, all existing libraries
- Data model change: HIGH — minimal, backward-compatible (default to 'light')
- CSS export pattern: HIGH — verified SD output format in service code; string post-processing is safe
- JS/TS export pattern: HIGH — namespace-prefix approach uses existing SD formatters
- Figma grouping logic: HIGH — group fingerprint pattern is straightforward set theory
- UI patterns: HIGH — existing component patterns (Dialog, dropdown, badge) are well-established in codebase

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable domain; no fast-moving dependencies)
