# Phase 33: Theme configuration — color/density types and tokens-page consolidation - Research

**Researched:** 2026-04-26
**Domain:** TypeScript / Next.js — theme data model extension, multi-dimensional token merge, React state management, MongoDB array mutations
**Confidence:** HIGH — all findings verified directly from codebase source files

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Base = the collection default (`__default__`), unchanged. No new "base" concept introduced.
- **D-02:** Sidebar section label "Base" or "Default" — maps to collection's canonical tokens.
- **D-03:** Multiple custom themes active simultaneously: one color theme + one density theme at a time.
- **D-04:** Merge order: collection default → color theme overrides → density theme overrides.
- **D-05:** Color theme scope: `color`, `gradient`, and other color-adjacent types.
- **D-06:** Density theme scope: `dimension`, `fontSize`, `fontWeight`, `borderRadius`, and other sizing/layout types.
- **D-07:** Tokens outside both scopes remain in collection default only; not overridden by custom themes.
- **D-08:** Graph panel edit target determined by selected group's dominant token type. Color-type group → edits active color theme's `graphState`; density-type group → edits active density theme's `graphState`. Fallback to collection default if no matching theme active.
- **D-09:** No extra toolbar toggle — group selection implicitly determines which theme is edited.
- **D-10:** Active color + active density theme selections are session-only UI state; not persisted to MongoDB.
- **D-11:** Custom theme token snapshots trimmed to scoped types on save.
- **D-12:** Migration: assign `kind: 'color'` to existing themes; trim to color-scoped tokens on next save (or migration script).

### Claude's Discretion
- Exact label for base/default section ("Base", "Default", "Collection default").
- Snapshot trimming: eager (migration script) or lazy (on next save).
- Mixed-type group tiebreaker for graph routing (e.g. dominant type by token count).
- PATCH route behavior for out-of-scope token paths: reject vs. no-op.

### Deferred Ideas (OUT OF SCOPE)
- AI/MCP tool parity for dual themes (Phase 32 follow-up).
- Export pair representation in config/export endpoints accepting a pair of theme IDs vs. derived from stored prefs.
</user_constraints>

---

## Summary

Phase 33 extends the existing single-theme system to a two-dimensional model (color + density), with dual independent selections replacing the current single `activeThemeId` state. The current codebase is well-structured for this change: all theme state flows through `tokens/page.tsx` as a single source of truth, and the theme data model (`ITheme`) needs only a new `kind` discriminant field. The standalone `themes/page.tsx` provides the CRUD operations to be absorbed, and the sidebar just needs one nav item removed.

The highest-complexity work is (1) the effective token merge across two active themes, and (2) graph state routing when a group's dominant type determines which theme's `graphState` to edit. Both have well-established patterns in the codebase to build on.

The migration is low-risk because `kind` can be added as an optional field at the TypeScript layer and defaulted on read, while a one-time MongoDB update sets `kind: 'color'` on all existing theme documents.

**Primary recommendation:** Build in four sequential waves — (1) type/data model + migration, (2) dual state in tokens/page.tsx + merged effective token view, (3) ThemeList restructuring + Tokens page CRUD absorption, (4) Output page + sidebar cleanup.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `ITheme.kind` discriminant | TypeScript types layer | API validation | Field originates in types, enforced at API boundary |
| Dual active theme selection state | Frontend (tokens/page.tsx) | — | Session-only UI state (D-10); no backend storage |
| Three-way token merge (default → color → density) | Frontend utility (`themeTokenMerge.ts`) | API (export) | Merge logic used in UI table, graph, and export build |
| Snapshot trimming to scoped types | Frontend (on save) + API (guard) | — | Trim on write ensures lean documents |
| Graph `graphState` routing to correct theme | Frontend (`TokenGraphPanel.tsx`) | — | Edit target is UI-time decision based on group type |
| Theme CRUD (create/delete/update kind) | API (`/api/collections/[id]/themes`) | Frontend | API owns persistence; frontend calls API |
| Migration of existing themes to `kind: 'color'` | API (migration script or lazy) | — | One-time data fix in MongoDB |
| CollectionSidebar Themes nav removal | Frontend (`CollectionSidebar.tsx`) | Next.js route | Sidebar removes link; route-level redirect for old URL |
| Output page dual-selector for export | Frontend (output/page.tsx) | API | UI selects pair; mergeThemeTokens called client-side |

---

## Current Theme Data Model (VERIFIED)

### `ITheme` interface — `src/types/theme.types.ts`
```typescript
export interface ITheme {
  id: string;
  name: string;
  colorMode: ColorMode;         // 'light' | 'dark' — currently required for all themes
  groups: Record<string, ThemeGroupState>;
  tokens: TokenGroup[];         // full snapshot at creation; per-theme
  graphState?: CollectionGraphState | null;
}
```
[VERIFIED: src/types/theme.types.ts]

**Required change:** Add `kind: 'color' | 'density'` field. Make `colorMode` conditional (`colorMode?: ColorMode` — optional, or only meaningful when `kind === 'color'`).

**Extended interface for this phase:**
```typescript
export type ThemeKind = 'color' | 'density';

export interface ITheme {
  id: string;
  name: string;
  kind: ThemeKind;              // NEW — discriminant
  colorMode?: ColorMode;        // optional; only used when kind === 'color'
  groups: Record<string, ThemeGroupState>;
  tokens: TokenGroup[];
  graphState?: CollectionGraphState | null;
}
```

---

## Token Type Classification (VERIFIED)

Full `TokenType` enum from `src/types/token.types.ts`:
[VERIFIED: src/types/token.types.ts]

| TokenType | Scope | Rationale |
|-----------|-------|-----------|
| `color` | Color | Direct color value |
| `gradient` | Color | Color-adjacent (D-05) |
| `dimension` | Density | Spacing/sizing |
| `fontSize` | Density | Typography scale (D-06) |
| `fontWeight` | Density | Typography scale (D-06) |
| `borderRadius` | Density | Sizing/layout (D-06) |
| `borderWidth` | Density | Sizing/layout — recommend including (same category as borderRadius) |
| `lineHeight` | Base (unscoped) | D-07: stays in collection default only |
| `letterSpacing` | Base (unscoped) | D-07 |
| `fontFamily` | Base (unscoped) | D-07 |
| `opacity` | Base (unscoped) | D-07 |
| `boxShadow` | Base (unscoped) | D-07 — consider color-adjacent; plan decides |
| `textShadow` | Base (unscoped) | D-07 |
| `duration` | Base (unscoped) | D-07 |
| `cubicBezier` | Base (unscoped) | D-07 |
| `number` | Base (unscoped) | D-07 |
| `string` | Base (unscoped) | D-07 |
| `strokeStyle` | Base (unscoped) | D-07 |
| `border` | Base (unscoped) | D-07 — composite; could be color-adjacent; plan decides |
| `transition` | Base (unscoped) | D-07 |
| `shadow` | Base (unscoped) | D-07 |
| `typography` | Base (unscoped) | D-07 — composite |
| `cssClass` | Base (unscoped) | Pattern token — not a design token value |
| `htmlTemplate` | Base (unscoped) | Pattern token |
| `htmlCssComponent` | Base (unscoped) | Pattern token |

**Planning decision needed:** `boxShadow`, `shadow`, and `border` contain color values (e.g. `0 0 4px rgba(0,0,0,0.5)`). Plan phase should decide whether they are Color scope or Base (unscoped). The CONTEXT.md decisions only list `color` and `gradient` explicitly for color scope, so defaulting to Base unless product confirms is safe.

**Recommended scope constants (new utility):**
```typescript
export const COLOR_SCOPE_TYPES: TokenType[] = ['color', 'gradient'];
export const DENSITY_SCOPE_TYPES: TokenType[] = [
  'dimension', 'fontSize', 'fontWeight', 'borderRadius', 'borderWidth'
];
```

---

## Standard Stack

### Core (all already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | (current) | Page routing, server components | Project framework |
| React | (current) | UI state management | Project framework |
| shadcn/ui | (current) | `Select`, `AlertDialog`, `Dialog`, `Button`, `Input` | UI-SPEC approved |
| Mongoose / MongoDB | (current) | Theme document persistence | Project ORM |
| Lucide React | (current) | `Palette`, `Layers` icons for kind badges | UI-SPEC approved |

**No new packages required for this phase.** [VERIFIED: UI-SPEC.md]

---

## Architecture Patterns

### System Architecture Diagram

```
User selects Color selector (tokens page header)
         │
         ▼
  activeColorThemeId (React state)
         │
User selects Density selector (tokens page header)
         │
         ▼
  activeDensityThemeId (React state)
         │
         ├──► filteredGroups (group tree filtering — uses both active themes)
         │
         ├──► effectiveThemeTokens (3-way merge: default → color → density)
         │          │
         │          ▼
         │    TokenGeneratorForm / token table display
         │
         ├──► graphStateMap (switches based on selectedGroup dominant type)
         │          │
         │          ▼
         │    TokenGraphPanel → GroupStructureGraph
         │         (key: group.id + colorThemeId + densityThemeId)
         │
         └──► handleThemeTokenChange
                    │
                    ├── if colorType group → PATCH .../themes/{colorThemeId}/tokens
                    └── if densityType group → PATCH .../themes/{densityThemeId}/tokens
```

### Pattern 1: Dual State Replacing Single `activeThemeId`

**What:** Replace single `activeThemeId: string | null` with two independent state values.
**When to use:** Everywhere `activeThemeId` is currently read.

```typescript
// Before
const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
const activeThemeIdRef = useRef<string | null>(null);

// After
const [activeColorThemeId, setActiveColorThemeId] = useState<string | null>(null);
const [activeDensityThemeId, setActiveDensityThemeId] = useState<string | null>(null);
const activeColorThemeIdRef = useRef<string | null>(null);
const activeDensityThemeIdRef = useRef<string | null>(null);
```

[VERIFIED: src/app/collections/[id]/tokens/page.tsx line 153-159]

### Pattern 2: Three-Way Token Merge

**What:** New `mergeThemeTokensForDualSelection` (or extend `mergeThemeTokens`) to handle three layers.
**When to use:** `effectiveThemeTokens` computation in tokens/page.tsx and `mergedTokens` in output/page.tsx.

```typescript
// src/lib/themeTokenMerge.ts — new overload
export function mergeDualThemeTokens(
  masterTokens: Record<string, unknown>,
  colorTheme: ITheme | null,
  densityTheme: ITheme | null,
  namespace: string
): Record<string, unknown> {
  // 1. Parse master into groups
  // 2. Apply color theme overrides (color + gradient token types only)
  // 3. Apply density theme overrides (dimension + fontSize + fontWeight + borderRadius + borderWidth only)
  // 4. Return merged SD output
}
```

[ASSUMED — based on existing mergeThemeTokens pattern in src/lib/themeTokenMerge.ts]

### Pattern 3: Graph State Routing by Group Dominant Type

**What:** Determine which theme's `graphState` the graph panel should read/write based on the selected group.
**When to use:** `persistGraphState` callback and `graphStateMap` sync effect in tokens/page.tsx.

```typescript
// New utility: src/utils/resolveActiveThemeForGroup.ts
import { COLOR_SCOPE_TYPES, DENSITY_SCOPE_TYPES } from '@/utils/tokenScope';

export function resolveActiveThemeIdForGroup(
  group: TokenGroup,
  activeColorThemeId: string | null,
  activeDensityThemeId: string | null
): string | null {
  const tokenTypes = group.tokens.map(t => t.type);
  const colorCount = tokenTypes.filter(t => COLOR_SCOPE_TYPES.includes(t)).length;
  const densityCount = tokenTypes.filter(t => DENSITY_SCOPE_TYPES.includes(t)).length;
  
  if (colorCount >= densityCount && colorCount > 0) return activeColorThemeId;
  if (densityCount > colorCount && densityCount > 0) return activeDensityThemeId;
  return null; // collection default
}
```

[ASSUMED — tiebreaker by token count is one of the Claude's Discretion items from CONTEXT.md]

### Pattern 4: `graphStateMap` Dual-Theme Sync

**Current pattern** (single theme): one `useEffect` syncs `graphStateMap` when `activeThemeId` changes.
[VERIFIED: src/app/collections/[id]/tokens/page.tsx lines 746-756]

**New pattern:** `graphStateMap` must be computed from whichever theme is "active for the selected group" at any given moment. This means the sync effect depends on `selectedGroupId`, `activeColorThemeId`, `activeDensityThemeId`, and the themes array.

```typescript
useEffect(() => {
  const activeId = resolveActiveThemeIdForGroup(
    selectedGroup,
    activeColorThemeId,
    activeDensityThemeId
  );
  if (!activeId) {
    setGraphStateMap(collectionGraphState);
    graphStateMapRef.current = collectionGraphState;
    return;
  }
  const theme = themes.find(t => t.id === activeId);
  const gs = (theme?.graphState ?? {}) as CollectionGraphState;
  setGraphStateMap(gs);
  graphStateMapRef.current = gs;
}, [activeColorThemeId, activeDensityThemeId, selectedGroupId, themes, collectionGraphState]);
```

### Pattern 5: `key` Prop for GroupStructureGraph Remount

**Current:** `key={group.id}-{activeThemeId ?? 'default'}`
[VERIFIED: src/app/collections/[id]/tokens/page.tsx via TokenGraphPanel.tsx line 115]

**New:** Include both active theme IDs so the graph remounts when either changes and the resolved edit target changes.
```typescript
key={`${group.id}-${activeColorThemeId ?? 'c0'}-${activeDensityThemeId ?? 'd0'}`}
```

### Pattern 6: `persistGraphState` Routing

**Current:** `persistGraphState` uses `activeThemeIdRef.current` to decide whether to write to collection or theme.
[VERIFIED: src/app/collections/[id]/tokens/page.tsx lines 527-562]

**New:** Must resolve the correct theme ID based on the selected group's dominant type:
```typescript
const persistGraphState = useCallback((gs: CollectionGraphState) => {
  const selectedGroup = findGroupById(masterGroups, selectedGroupId);
  const targetThemeId = selectedGroup
    ? resolveActiveThemeIdForGroup(selectedGroup, activeColorThemeIdRef.current, activeDensityThemeIdRef.current)
    : null;
  
  if (targetThemeId) {
    // PUT to themes/{targetThemeId}
  } else {
    // PUT to collection
  }
}, [id, masterGroups, selectedGroupId, ...]);
```

### Pattern 7: API `POST /themes` — Accept `kind`

**Current:** Body accepts `{ name, colorMode }`.
[VERIFIED: src/app/api/collections/[id]/themes/route.ts line 47]

**New:** Body accepts `{ name, kind, colorMode? }`. `colorMode` validated only when `kind === 'color'`.

```typescript
const body = await request.json() as { name?: string; kind?: string; colorMode?: string };
// Validate kind
const validKinds = ['color', 'density'] as const;
const kind: ThemeKind = (body.kind && validKinds.includes(body.kind as ThemeKind))
  ? body.kind as ThemeKind
  : 'color'; // default for migration safety
// colorMode only set for color themes
const colorMode: ColorMode | undefined = kind === 'color' ? resolveColorMode(body.colorMode) : undefined;
const theme: ITheme = { id: themeId, name, kind, colorMode, groups, tokens: groupTree, graphState };
```

### Pattern 8: Snapshot Trimming on PATCH Tokens

**Current:** `PATCH /themes/[themeId]/tokens` accepts `tokens` array with no type filtering.
[VERIFIED: src/app/api/collections/[id]/themes/[themeId]/tokens/route.ts]

**New:** After fetching the theme document, read `theme.kind`. Filter the incoming `body.tokens` (or individual token values) to only include types in scope for that kind. Decision per CONTEXT.md: plan decides between reject vs. no-op. Recommend no-op (silently strip out-of-scope tokens) to avoid breaking existing callers.

### Pattern 9: `ThemeList` — Grouped Sections

**Current:** Flat list, single "Themes" section header.
[VERIFIED: src/components/themes/ThemeList.tsx]

**New:** Three sections in order: Base (static row), Color Themes (list), Density Themes (list).
- Each section has its own `+` button opening a "Create Color Theme" or "Create Density Theme" dialog.
- `kind` is set implicitly by which button was pressed (not a user choice inside the dialog).
- Density theme rows omit `ColorModeBadge`; add `KindBadge` to all rows.
- Delete confirmation uses `AlertDialog` (already installed). [VERIFIED: UI-SPEC.md]

### Recommended Project Structure (affected files only)

```
src/
├── types/
│   └── theme.types.ts            # Add ThemeKind + extend ITheme
├── utils/
│   ├── tokenScope.ts             # NEW: COLOR_SCOPE_TYPES, DENSITY_SCOPE_TYPES constants
│   └── resolveActiveThemeForGroup.ts  # NEW: dominant-type routing logic
├── lib/
│   └── themeTokenMerge.ts        # Extend: add mergeDualThemeTokens
├── components/
│   └── themes/
│       └── ThemeList.tsx         # Restructure: grouped sections, KindBadge
├── app/
│   ├── collections/
│   │   └── [id]/
│   │       ├── tokens/page.tsx   # Replace activeThemeId with dual state
│   │       ├── themes/page.tsx   # To be absorbed / redirect
│   │       └── output/page.tsx   # Replace single selector with dual
│   └── api/
│       └── collections/[id]/
│           └── themes/
│               ├── route.ts      # POST: accept kind
│               └── [themeId]/
│                   ├── route.ts  # PUT: accept/validate kind, strip colorMode for density
│                   └── tokens/
│                       └── route.ts  # PATCH: enforce scoped types
```

### Anti-Patterns to Avoid

- **Reading `activeThemeId` as a single value where both themes could be relevant:** After the migration, any place that reads `activeThemeId` to determine "is there a theme active" must be updated to check `activeColorThemeId || activeDensityThemeId`.
- **Persisting selection to MongoDB (D-10 violation):** The active color + density IDs are session state only. Do not add `lastColorThemeId` / `lastDensityThemeId` to the MongoDB document.
- **Using positional `$set` on themes array:** The existing codebase already avoids this (uses whole-array `$set`). [VERIFIED: route.ts comments about Mongoose #14595].
- **Calling `mergeThemeTokens` twice independently:** Do not call the old single-theme merge twice (once for color, once for density) — this loses the correct application order. Write a single three-way merge that applies them in sequence.
- **Mixed graph state contamination:** Never use the same `graphStateMap` object for two different active themes simultaneously. The resolved edit target must be unambiguous.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token type scope constants | Inline string comparisons scattered across files | `tokenScope.ts` utility with `COLOR_SCOPE_TYPES`, `DENSITY_SCOPE_TYPES` exported arrays | Single source of truth; easy to extend; testable |
| Three-way merge logic | Re-implementing merge in tokens/page.tsx | Extend `themeTokenMerge.ts` | Existing pattern; already used by Output page and npm publish service |
| `AlertDialog` for delete confirmation | Custom confirm modal | `src/components/ui/alert-dialog.tsx` (already installed) | UI-SPEC mandates AlertDialog; already present |
| Graph node remapping | New remap function | `remapGraphStateForTheme()` in `src/lib/graphStateRemap.ts` | Already exists; handles node ID uniqueness per theme |

---

## Common Pitfalls

### Pitfall 1: `activeThemeIdRef` Still Used by Debounced Callbacks

**What goes wrong:** After introducing dual theme refs, debounced save callbacks (`persistGraphState`, `themeTokenSaveTimerRef` closures) still read the old `activeThemeIdRef.current` which is never updated.
**Why it happens:** Refs are outside React's dependency tracking; stale closures are a standard React hazard.
**How to avoid:** Replace `activeThemeIdRef` with `activeColorThemeIdRef` and `activeDensityThemeIdRef`. Update the `useEffect` syncs for both refs. The graph persist callback must use `resolveActiveThemeIdForGroup` at call-time from the ref values.
**Warning signs:** Graph state writes go to wrong theme; saves after debounce period use incorrect theme ID.

### Pitfall 2: `effectiveThemeTokens` Memo Dependency Array

**What goes wrong:** The `effectiveThemeTokens` memo (tokens/page.tsx line 770) currently depends on `[activeThemeId, themes, masterGroups]`. After the refactor, it must depend on `[activeColorThemeId, activeDensityThemeId, themes, masterGroups]`.
**Why it happens:** Missing dependency causes stale merged token set displayed in the table.
**How to avoid:** Update the memo dependencies explicitly; ESLint exhaustive-deps will flag this if enabled.

### Pitfall 3: `filterGroupsForActiveTheme` Used for Dual Themes

**What goes wrong:** `filterGroupsForActiveTheme(masterGroups, activeTheme)` currently takes a single theme. With dual themes, calling it with only the color theme hides density-enabled groups.
**Why it happens:** The filter was designed for single-theme; group visibility now depends on whether either active theme enables the group.
**How to avoid:** Create `filterGroupsForDualThemes(masterGroups, colorTheme, densityTheme)` that marks a group as visible if it is enabled/source in EITHER active theme (or if no theme is active).

### Pitfall 4: `ThemeList.onAdd` Signature Change

**What goes wrong:** `ThemeList.onAdd: (name, colorMode) => void` does not carry `kind`. Callers pass `kind` implicitly via two separate buttons.
**Why it happens:** The existing signature has no `kind` parameter.
**How to avoid:** Update `onAdd` to `onAdd: (name: string, kind: ThemeKind, colorMode?: ColorMode) => void`. The dialog's "Add color theme" button passes `kind: 'color'`; "Add density theme" passes `kind: 'density'`.

### Pitfall 5: Output Page Merge Using Old `mergeThemeTokens`

**What goes wrong:** `output/page.tsx` currently uses `mergeThemeTokens(tokens, selectedTheme, namespace)` — a single-theme merge. After this phase, it must use the dual-theme merge.
**Why it happens:** Output page has its own `selectedThemeId` state that maps to one theme.
**How to avoid:** Replace `selectedThemeId` in output/page.tsx with `selectedColorThemeId` + `selectedDensityThemeId`. Call `mergeDualThemeTokens`.
[VERIFIED: src/app/collections/[id]/output/page.tsx lines 72-74]

### Pitfall 6: `darkTheme` Derivation in Output Page

**What goes wrong:** Output page derives `darkTheme` as the first theme with `colorMode === 'dark'` when `selectedThemeId === '__default__'`. This logic needs to account for `kind: 'color'` — only color themes have `colorMode`.
**Why it happens:** After migration, density themes exist with no `colorMode`; the existing check `(t.colorMode ?? 'light') === 'dark'` will still work (density themes will have undefined colorMode, defaulting to 'light', so they'll never match 'dark').
**How to avoid:** Add a guard: `themes.filter(t => t.kind === 'color').find(t => t.colorMode === 'dark')`.
[VERIFIED: src/app/collections/[id]/output/page.tsx lines 76-82]

### Pitfall 7: MongoDB Migration — `kind` Field Absent on Existing Documents

**What goes wrong:** Existing theme documents in MongoDB have no `kind` field. TypeScript type says `kind: ThemeKind` (non-optional), but actual documents return `kind: undefined`.
**Why it happens:** MongoDB does not enforce schema; old documents have no `kind`.
**How to avoid:** Either (a) run a migration script `db.collections.updateMany({'themes': {$exists: true}}, {$set: {'themes.$[].kind': 'color'}})`, or (b) default `kind` at read time: `theme.kind ?? 'color'` everywhere in frontend and API code. Both approaches should be implemented — default at read time as a fallback, migration script for clean data.

---

## Code Examples

### Theme Scope Utility (new file)

```typescript
// src/utils/tokenScope.ts
import type { TokenType } from '@/types/token.types';

export const COLOR_SCOPE_TYPES: readonly TokenType[] = ['color', 'gradient'] as const;

export const DENSITY_SCOPE_TYPES: readonly TokenType[] = [
  'dimension',
  'fontSize',
  'fontWeight',
  'borderRadius',
  'borderWidth',
] as const;

export function isColorScopeType(t: TokenType): boolean {
  return (COLOR_SCOPE_TYPES as readonly string[]).includes(t);
}

export function isDensityScopeType(t: TokenType): boolean {
  return (DENSITY_SCOPE_TYPES as readonly string[]).includes(t);
}

/** Returns 'color' | 'density' | null based on majority token type in a group */
export function dominantScopeForTokenTypes(types: TokenType[]): 'color' | 'density' | null {
  const colorCount = types.filter(isColorScopeType).length;
  const densityCount = types.filter(isDensityScopeType).length;
  if (colorCount === 0 && densityCount === 0) return null;
  return colorCount >= densityCount ? 'color' : 'density';
}
```

### Extended `ITheme` Type

```typescript
// src/types/theme.types.ts
export type ThemeKind = 'color' | 'density';

export interface ITheme {
  id: string;
  name: string;
  kind: ThemeKind;
  colorMode?: ColorMode;  // only meaningful for kind === 'color'
  groups: Record<string, ThemeGroupState>;
  tokens: TokenGroup[];
  graphState?: CollectionGraphState | null;
}
```

### Three-Way Merge Function

```typescript
// src/lib/themeTokenMerge.ts — additive to existing mergeThemeTokens
export function mergeDualThemeTokens(
  masterTokens: Record<string, unknown>,
  colorTheme: ITheme | null,
  densityTheme: ITheme | null,
  namespace: string
): Record<string, unknown> {
  if (!colorTheme && !densityTheme) {
    const { groups } = tokenService.processImportedTokens(masterTokens, namespace);
    return tokenService.generateStyleDictionaryOutput(groups, namespace, true);
  }
  const { groups: masterGroups } = tokenService.processImportedTokens(masterTokens, namespace);
  
  // Step 1: Apply color theme overrides
  const afterColorGroups = colorTheme
    ? applyThemeOverrides(masterGroups, colorTheme, COLOR_SCOPE_TYPES)
    : masterGroups;
  
  // Step 2: Apply density theme overrides on top
  const afterDensityGroups = densityTheme
    ? applyThemeOverrides(afterColorGroups, densityTheme, DENSITY_SCOPE_TYPES)
    : afterColorGroups;
  
  return tokenService.generateStyleDictionaryOutput(afterDensityGroups, namespace, true);
}
```

### API POST — Accept `kind`

```typescript
// themes/route.ts POST handler — key change
const validKinds = ['color', 'density'] as const;
const kind: ThemeKind = (body.kind && validKinds.includes(body.kind as ThemeKind))
  ? body.kind as ThemeKind
  : 'color';
const colorMode: ColorMode | undefined = kind === 'color'
  ? (validColorModes.includes(body.colorMode as ColorMode) ? body.colorMode as ColorMode : 'light')
  : undefined;
const theme: ITheme = { id: themeId, name: body.name.trim(), kind, ...(colorMode ? { colorMode } : {}), groups, tokens: groupTree, graphState };
```

---

## Affected File Inventory

[VERIFIED: direct file reads of each file listed below]

| File | Change Type | Scope of Change |
|------|-------------|-----------------|
| `src/types/theme.types.ts` | Extend | Add `ThemeKind`, update `ITheme` |
| `src/utils/tokenScope.ts` | Create | Color/density scope constants + helpers |
| `src/utils/resolveActiveThemeForGroup.ts` | Create | Graph routing util (D-08) |
| `src/lib/themeTokenMerge.ts` | Extend | Add `mergeDualThemeTokens` |
| `src/utils/filterGroupsForActiveTheme.ts` | Extend or new sibling | Dual-theme group filter |
| `src/app/collections/[id]/tokens/page.tsx` | Major refactor | Replace `activeThemeId` with dual state; update all consumers |
| `src/app/collections/[id]/themes/page.tsx` | Redirect or delete | Content absorbed into tokens page; add `redirect()` to `/tokens` |
| `src/app/collections/[id]/output/page.tsx` | Modify | Replace single selector with dual; update merge call |
| `src/components/collections/CollectionSidebar.tsx` | Minor | Remove Themes nav item |
| `src/components/themes/ThemeList.tsx` | Major refactor | Grouped sections; kind-aware add dialog |
| `src/components/graph/TokenGraphPanel.tsx` | Prop change | Extend to receive `activeColorThemeId` + `activeDensityThemeId` |
| `src/app/api/collections/[id]/themes/route.ts` | Modify | POST accepts `kind`; validate color-mode only for color kind |
| `src/app/api/collections/[id]/themes/[themeId]/route.ts` | Modify | PUT validates `kind`; guard colorMode on density themes |
| `src/app/api/collections/[id]/themes/[themeId]/tokens/route.ts` | Modify | PATCH enforces scope filtering |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single `activeThemeId` state | Dual `activeColorThemeId` + `activeDensityThemeId` | This phase | All theme-aware rendering, saves, graph state require update |
| Single-theme `mergeThemeTokens` | Three-layer `mergeDualThemeTokens` | This phase | Export, token table, graph all use new merge |
| Flat `ThemeList` | Grouped Color Themes / Density Themes sections | This phase | UI restructure; `onAdd` signature changes |
| Themes page as standalone nav item | Absorbed into Tokens page; old URL redirects | This phase | Remove sidebar link; add route redirect |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Tiebreaker for mixed-type groups is dominant type by token count | Architecture Patterns — Pattern 3 | Minor UX: wrong theme gets edits for mixed groups; fixable without data migration |
| A2 | `borderWidth` belongs in density scope (not in CONTEXT.md explicitly) | Token Type Classification | Minor: affects which themes can override border-width tokens |
| A3 | `boxShadow`, `shadow`, `border` are Base scope (unscoped) | Token Type Classification | Medium: if color-adjacent, color themes won't override shadows; requires data migration if changed later |
| A4 | `mergeDualThemeTokens` applies overrides per scoped token type within groups (not per group-state) | Architecture Patterns — Pattern 2 | High: incorrect merge means wrong values exported; needs unit test to confirm |
| A5 | `filterGroupsForActiveTheme` needs a dual-theme variant (group visible if enabled in either theme) | Common Pitfalls — Pitfall 3 | Medium: groups may be hidden that should be visible |
| A6 | Lazy migration (default `kind ?? 'color'` at read time) is sufficient without a migration script | Common Pitfalls — Pitfall 7 | Low-medium: no data loss; slightly inconsistent documents until next save |

---

## Open Questions

1. **`boxShadow` / `shadow` / `border` scope**
   - What we know: D-05 explicitly lists `color` and `gradient` for color scope; D-06 lists `dimension`, `fontSize`, `fontWeight`, `borderRadius`; D-07 says "tokens outside both scopes stay in collection default".
   - What's unclear: Whether `boxShadow` (which contains color values) should be in color scope.
   - Recommendation: Default to Base/unscoped in this phase. Add to color scope as a future opt-in once dual-theme is stable.

2. **Snapshot trimming — eager vs. lazy**
   - What we know: D-11 says trim on save; D-12 says migration or lazy. Claude's Discretion per CONTEXT.md.
   - What's unclear: Whether a migration script runs in Wave 1 or trimming is purely lazy.
   - Recommendation: Lazy trim (strip out-of-scope tokens from `tokens` array on PATCH) for Wave 1. No migration script needed since existing themes have `kind: 'color'` after migration and their snapshots are already color-appropriate (legacy themes were always color-focused).

3. **`ThemeGroupMatrix` component in themes/page.tsx**
   - What we know: `ThemeGroupMatrix` renders group state controls for a selected theme. It must move into the Tokens page absorption.
   - What's unclear: Whether `ThemeGroupMatrix` moves as-is into a modal/panel on the Tokens page, or is reimagined.
   - Recommendation: Move `ThemeGroupMatrix` (or equivalent group-state toggles) into a theme detail panel reachable from the `ThemeList`. The plan should specify whether this is a dialog or a side-panel.

4. **`AIChatPanel` `activeThemeId` prop**
   - What we know: `AIChatPanel` currently receives `activeThemeId` prop.
   [VERIFIED: src/app/collections/[id]/tokens/page.tsx line 1484]
   - What's unclear: Whether the chat panel needs to know about dual theme selection or can receive a single derived ID.
   - Recommendation: Pass `activeColorThemeId` as the primary theme ID for chat context; add `activeDensityThemeId` if needed by MCP tools (D-11 in deferred).

---

## Environment Availability

Step 2.6: SKIPPED — this phase is code-only changes to an existing Next.js application with no new external dependencies.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 30 |
| Config file | `jest.config.ts` (inferred from `"jest": "jest"` in package.json) |
| Quick run command | `yarn test --testPathPattern=themeTokenMerge` |
| Full suite command | `yarn test` |

### Phase Requirements → Test Map

| Req | Behavior | Test Type | Automated Command | File Exists? |
|-----|----------|-----------|-------------------|-------------|
| Token scope constants | `isColorScopeType('color')` = true; `isDensityScopeType('dimension')` = true | unit | `yarn test --testPathPattern=tokenScope` | No — Wave 0 |
| Three-way merge | Collection default → color overrides → density overrides produces correct merged output | unit | `yarn test --testPathPattern=themeTokenMerge` | Partial — existing `themeTokenMerge.ts` has no tests; Wave 0 |
| Graph routing | `resolveActiveThemeIdForGroup` returns correct theme ID for color/density/mixed/empty groups | unit | `yarn test --testPathPattern=resolveActiveTheme` | No — Wave 0 |
| PATCH scope enforcement | PATCH with out-of-scope tokens returns no-op (or error) | unit (route test) | `yarn test --testPathPattern=themes.*tokens` | Partial — `single.test.ts` exists |
| Dual filter | `filterGroupsForDualThemes` shows group visible in either active theme | unit | `yarn test --testPathPattern=filterGroups` | Partial — `filterGroupsForActiveTheme.test.ts` exists |

### Wave 0 Gaps
- [ ] `src/utils/__tests__/tokenScope.test.ts` — covers scope constants and helpers
- [ ] `src/lib/__tests__/themeTokenMerge.test.ts` — covers `mergeDualThemeTokens` three-layer merge
- [ ] `src/utils/__tests__/resolveActiveThemeForGroup.test.ts` — covers graph routing logic
- [ ] Update `src/utils/__tests__/filterGroupsForActiveTheme.test.ts` — extend for dual-theme filter

---

## Security Domain

This phase modifies theme persistence routes. Existing auth guards (`requireRole(Action.Write, params.id)` + `assertOrgOwnership`) are present on all mutating routes and require no changes. No new attack surface is introduced.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V4 Access Control | yes | `requireRole` + `assertOrgOwnership` already in place on all theme routes |
| V5 Input Validation | yes | `kind` field validated against allowlist; `name` validated non-empty string |

[VERIFIED: src/app/api/collections/[id]/themes/route.ts, themes/[themeId]/route.ts]

---

## Wave Decomposition Recommendation

Based on the dependency graph:

**Wave 1 — Foundation (types, constants, merge logic)**
- Extend `ITheme` with `kind: ThemeKind`
- Create `src/utils/tokenScope.ts`
- Create `src/utils/resolveActiveThemeForGroup.ts`
- Extend `src/lib/themeTokenMerge.ts` with `mergeDualThemeTokens`
- Create Wave 0 test files
- MongoDB migration: default `kind ?? 'color'` at read time in all API handlers

**Wave 2 — Tokens page dual state**
- Replace `activeThemeId` with `activeColorThemeId` + `activeDensityThemeId` in `tokens/page.tsx`
- Update all refs, effects, callbacks, memo dependencies
- Update dual `graphStateMap` sync + `persistGraphState` routing
- Update `TokenGraphPanel` props
- Update `filterGroupsForActiveTheme` for dual themes

**Wave 3 — UI: ThemeList restructure + Themes CRUD absorption**
- Restructure `ThemeList.tsx` into grouped sections
- Update `ThemeList.onAdd` signature to include `kind`
- Update API POST to accept `kind`; API PUT to guard `colorMode` on density
- API PATCH to enforce scope trimming
- Absorb ThemesPage CRUD into Tokens page (or as a panel/dialog reachable from ThemeList)

**Wave 4 — Cleanup: Output page + sidebar**
- Replace single selector in `output/page.tsx` with dual selectors
- Update `mergeThemeTokens` call in output page to `mergeDualThemeTokens`
- Update `darkTheme` derivation guard for `kind: 'color'`
- Remove Themes nav item from `CollectionSidebar.tsx`
- Add redirect from `/collections/[id]/themes` to `/collections/[id]/tokens`

---

## Sources

### Primary (HIGH confidence — all directly read from codebase)
- `src/types/theme.types.ts` — `ITheme` interface, `ColorMode`, `ThemeGroupState`
- `src/types/token.types.ts` — complete `TokenType` union + `TOKEN_TYPES` array
- `src/app/collections/[id]/tokens/page.tsx` — single `activeThemeId` pattern, all refs, effects, save callbacks
- `src/app/collections/[id]/themes/page.tsx` — CRUD operations to absorb
- `src/app/collections/[id]/output/page.tsx` — `selectedThemeId`, `mergeThemeTokens` call, `darkTheme` derivation
- `src/app/api/collections/[id]/themes/route.ts` — POST handler body shape
- `src/app/api/collections/[id]/themes/[themeId]/route.ts` — PUT/DELETE handlers
- `src/app/api/collections/[id]/themes/[themeId]/tokens/route.ts` — PATCH handler + `source` group guard
- `src/components/collections/CollectionSidebar.tsx` — Themes nav item location
- `src/components/themes/ThemeList.tsx` — current list structure + `onAdd` signature
- `src/components/graph/TokenGraphPanel.tsx` — `activeThemeId` prop, `key` pattern
- `src/lib/themeTokenMerge.ts` — existing merge function signature and logic
- `src/lib/graphStateRemap.ts` — `remapGraphStateForTheme` (used at theme creation)
- `src/utils/filterGroupsForActiveTheme.ts` — single-theme filter logic
- `.planning/phases/33-theme-configuration-color-density/33-CONTEXT.md` — all locked decisions
- `.planning/phases/33-theme-configuration-color-density/33-SPEC.md` — acceptance criteria
- `.planning/phases/33-theme-configuration-color-density/33-UI-SPEC.md` — component specs and copy

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed; no new dependencies
- Data model change: HIGH — `ITheme` extension is minimal and verified
- Architecture patterns: HIGH (existing code read) / ASSUMED for new utilities
- Migration approach: MEDIUM — MongoDB write pattern is established; specific migration script not yet written
- Token scope classification: HIGH for explicitly listed types; ASSUMED for `boxShadow`/`shadow`/`border`

**Research date:** 2026-04-26
**Valid until:** 2026-05-26 (stable codebase; all findings from source files)
