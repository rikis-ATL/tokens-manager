# Phase 33: Theme Configuration — Color/Density Types - Pattern Map

**Mapped:** 2026-04-26
**Files analyzed:** 14 new/modified files
**Analogs found:** 13 / 14

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/types/theme.types.ts` | type-definition | — | `src/types/token.types.ts` | role-match |
| `src/utils/tokenScope.ts` | utility | transform | `src/types/token.types.ts` (TOKEN_TYPES array + helpers pattern) | role-match |
| `src/utils/resolveActiveThemeForGroup.ts` | utility | transform | `src/utils/filterGroupsForActiveTheme.ts` | role-match |
| `src/lib/themeTokenMerge.ts` | service/lib | transform | self (existing `mergeThemeTokens`) | exact |
| `src/utils/filterGroupsForActiveTheme.ts` | utility | transform | self (existing function) | exact |
| `src/app/collections/[id]/tokens/page.tsx` | page/controller | request-response | self (existing page) | exact |
| `src/app/collections/[id]/themes/page.tsx` | page | request-response | self (existing page — add redirect) | exact |
| `src/app/collections/[id]/output/page.tsx` | page/controller | request-response | self (existing page) | exact |
| `src/components/collections/CollectionSidebar.tsx` | component | — | self (existing component) | exact |
| `src/components/themes/ThemeList.tsx` | component | event-driven | self (existing component) | exact |
| `src/components/graph/TokenGraphPanel.tsx` | component | event-driven | self (existing component) | exact |
| `src/app/api/collections/[id]/themes/route.ts` | API route | CRUD | self (existing POST handler) | exact |
| `src/app/api/collections/[id]/themes/[themeId]/route.ts` | API route | CRUD | self (existing PUT/DELETE handler) | exact |
| `src/app/api/collections/[id]/themes/[themeId]/tokens/route.ts` | API route | CRUD | self (existing PATCH handler) | exact |

---

## Pattern Assignments

### `src/types/theme.types.ts` (type-definition)

**Analog:** `src/types/token.types.ts`

**Current content** (lines 1–15) — entire file:
```typescript
import type { TokenGroup } from './token.types';
import type { CollectionGraphState } from './graph-state.types';

export type ColorMode = 'light' | 'dark';

export type ThemeGroupState = 'disabled' | 'enabled' | 'source';

export interface ITheme {
  id: string;
  name: string;
  colorMode: ColorMode;
  groups: Record<string, ThemeGroupState>;
  tokens: TokenGroup[];
  graphState?: CollectionGraphState | null;
}
```

**Change:** Add `ThemeKind` union type and `kind` field; make `colorMode` optional. Copy the union-type + export const array pattern from `src/types/token.types.ts` lines 1–30:
```typescript
// Pattern from token.types.ts — union type + runtime array constant
export type TokenType = 'color' | 'dimension' | ...;
export const TOKEN_TYPES: TokenType[] = ['color', 'dimension', ...];
```

**Target result:**
```typescript
export type ThemeKind = 'color' | 'density';

export interface ITheme {
  id: string;
  name: string;
  kind: ThemeKind;              // NEW
  colorMode?: ColorMode;        // was required; now optional (only used when kind === 'color')
  groups: Record<string, ThemeGroupState>;
  tokens: TokenGroup[];
  graphState?: CollectionGraphState | null;
}
```

**Migration read-time default pattern** (apply everywhere `theme.kind` is read):
```typescript
// At every read site: default absent kind to 'color' for backward compatibility
const kind = (theme.kind ?? 'color') as ThemeKind;
```

---

### `src/utils/tokenScope.ts` (utility, transform) — NEW FILE

**Analog:** `src/types/token.types.ts` (lines 30–56, 66–74) — export-const-array + helper-function pattern

**Import pattern to copy from `src/types/token.types.ts` line 1:**
```typescript
import type { TokenType } from '@/types/token.types';
```

**Export-const-array pattern from `src/types/token.types.ts` lines 30–56:**
```typescript
export const TOKEN_TYPES: TokenType[] = ['color', 'dimension', ...];
```

**Helper function pattern from `src/types/token.types.ts` lines 66–74:**
```typescript
export const PATTERN_TOKEN_TYPES: TokenType[] = ['cssClass', 'htmlTemplate', 'htmlCssComponent'];

export function isPatternTokenType(t: TokenType): boolean {
  return PATTERN_TOKEN_TYPES.includes(t);
}
```

**Target content for new file:**
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

---

### `src/utils/resolveActiveThemeForGroup.ts` (utility, transform) — NEW FILE

**Analog:** `src/utils/filterGroupsForActiveTheme.ts` (entire file)

**Import pattern from `src/utils/filterGroupsForActiveTheme.ts` lines 1–2:**
```typescript
import type { TokenGroup } from '@/types/token.types';
import type { ITheme } from '@/types/theme.types';
```

**Function signature pattern from `src/utils/filterGroupsForActiveTheme.ts` lines 8–11:**
```typescript
export function filterGroupsForActiveTheme(
  masterGroups: TokenGroup[],
  activeTheme: ITheme | null | undefined,
): TokenGroup[] {
```

**Target content for new file:**
```typescript
// src/utils/resolveActiveThemeForGroup.ts
import type { TokenGroup } from '@/types/token.types';
import { dominantScopeForTokenTypes } from '@/utils/tokenScope';

/**
 * Returns the correct active theme ID to use for graph state reads/writes,
 * based on the dominant token type in the given group.
 *
 * - Color-dominant group → activeColorThemeId
 * - Density-dominant group → activeDensityThemeId
 * - Mixed equal / no typed tokens → null (collection default)
 */
export function resolveActiveThemeIdForGroup(
  group: TokenGroup | null | undefined,
  activeColorThemeId: string | null,
  activeDensityThemeId: string | null,
): string | null {
  if (!group) return null;
  const allTypes = group.tokens.map(t => t.type);
  const scope = dominantScopeForTokenTypes(allTypes);
  if (scope === 'color') return activeColorThemeId;
  if (scope === 'density') return activeDensityThemeId;
  return null; // unscoped group → collection default
}
```

---

### `src/lib/themeTokenMerge.ts` (lib/service, transform) — EXTEND

**Analog:** self — `src/lib/themeTokenMerge.ts` (entire file, 55 lines)

**Existing imports pattern** (lines 1–3):
```typescript
import type { TokenGroup } from '@/types';
import type { ITheme } from '@/types/theme.types';
import { tokenService } from '@/services/token.service';
```

**Existing merge function pattern** (lines 21–55) — add these two imports and a new function below:
```typescript
// Add to imports:
import { COLOR_SCOPE_TYPES, DENSITY_SCOPE_TYPES } from '@/utils/tokenScope';
import type { TokenType } from '@/types/token.types';
```

**New function to add (after existing `mergeThemeTokens`):**
```typescript
/**
 * Helper: apply a theme's token overrides to a group tree, scoped to the given token types.
 * Groups are replaced only if their tokens contain at least one token whose type is in scopeTypes.
 */
function applyThemeOverrides(
  masterGroups: TokenGroup[],
  theme: ITheme,
  scopeTypes: readonly TokenType[],
): TokenGroup[] {
  const themeGroupMap = new Map<string, TokenGroup>(theme.tokens.map(g => [g.id, g]));
  return masterGroups.map(masterGroup => {
    const state = theme.groups[masterGroup.id] ?? 'disabled';
    if (state === 'disabled' || state === 'source') return masterGroup;
    // Only apply if the group contains at least one token of the scoped type
    const hasScoped = masterGroup.tokens.some(t => (scopeTypes as readonly string[]).includes(t.type));
    if (!hasScoped) return masterGroup;
    return themeGroupMap.get(masterGroup.id) ?? masterGroup;
  });
}

/**
 * Three-way merge: collection default → color theme overrides → density theme overrides.
 * Each theme only overrides tokens within its own scope (color or density token types).
 * When both themes are null, returns the master tokens unchanged.
 */
export function mergeDualThemeTokens(
  masterTokens: Record<string, unknown>,
  colorTheme: ITheme | null,
  densityTheme: ITheme | null,
  namespace: string,
): Record<string, unknown> {
  if (!colorTheme && !densityTheme) {
    const { groups } = tokenService.processImportedTokens(masterTokens, namespace);
    return tokenService.generateStyleDictionaryOutput(groups, namespace, true);
  }
  const { groups: masterGroups } = tokenService.processImportedTokens(masterTokens, namespace);
  const afterColor = colorTheme
    ? applyThemeOverrides(masterGroups, colorTheme, COLOR_SCOPE_TYPES)
    : masterGroups;
  const afterDensity = densityTheme
    ? applyThemeOverrides(afterColor, densityTheme, DENSITY_SCOPE_TYPES)
    : afterColor;
  return tokenService.generateStyleDictionaryOutput(afterDensity, namespace, true);
}
```

---

### `src/utils/filterGroupsForActiveTheme.ts` (utility, transform) — EXTEND

**Analog:** self — entire file (27 lines)

**Existing function** (lines 8–27) — add a sibling function below it:
```typescript
// Existing signature (do NOT modify):
export function filterGroupsForActiveTheme(
  masterGroups: TokenGroup[],
  activeTheme: ITheme | null | undefined,
): TokenGroup[] { ... }
```

**New sibling function to add:**
```typescript
/**
 * Dual-theme variant: a group is visible if it is enabled/source in EITHER active theme.
 * When both themes are null, returns masterGroups unchanged (collection default view).
 */
export function filterGroupsForDualThemes(
  masterGroups: TokenGroup[],
  colorTheme: ITheme | null | undefined,
  densityTheme: ITheme | null | undefined,
): TokenGroup[] {
  if (!colorTheme && !densityTheme) return masterGroups;

  function filterGroups(groups: TokenGroup[]): TokenGroup[] {
    return groups
      .filter((g) => {
        const colorState = colorTheme?.groups[g.id] ?? 'disabled';
        const densityState = densityTheme?.groups[g.id] ?? 'disabled';
        return colorState !== 'disabled' || densityState !== 'disabled';
      })
      .map((g) => ({
        ...g,
        children: g.children ? filterGroups(g.children) : undefined,
      }));
  }

  return filterGroups(masterGroups);
}
```

---

### `src/app/collections/[id]/tokens/page.tsx` (page, request-response) — MAJOR REFACTOR

**Analog:** self — existing `tokens/page.tsx`

**State replacement pattern** (lines 153–159) — replace single state + ref with dual:
```typescript
// BEFORE (lines 153, 159):
const activeThemeIdRef = useRef<string | null>(null);
const [activeThemeId, setActiveThemeId] = useState<string | null>(null);

// AFTER — copy this pattern:
const activeColorThemeIdRef  = useRef<string | null>(null);
const activeDensityThemeIdRef = useRef<string | null>(null);
const [activeColorThemeId, setActiveColorThemeId]   = useState<string | null>(null);
const [activeDensityThemeId, setActiveDensityThemeId] = useState<string | null>(null);
```

**filteredGroups memo pattern** (lines 207–211) — replace with dual:
```typescript
// BEFORE:
const filteredGroups = useMemo(() => {
  if (!activeThemeId) return masterGroups;
  const activeTheme = themes.find(t => t.id === activeThemeId);
  return filterGroupsForActiveTheme(masterGroups, activeTheme);
}, [masterGroups, activeThemeId, themes]);

// AFTER — same shape, dual theme:
const filteredGroups = useMemo(() => {
  if (!activeColorThemeId && !activeDensityThemeId) return masterGroups;
  const colorTheme  = themes.find(t => t.id === activeColorThemeId)  ?? null;
  const densityTheme = themes.find(t => t.id === activeDensityThemeId) ?? null;
  return filterGroupsForDualThemes(masterGroups, colorTheme, densityTheme);
}, [masterGroups, activeColorThemeId, activeDensityThemeId, themes]);
```

**Ref sync useEffect pattern** (lines 739–742):
```typescript
// BEFORE:
useEffect(() => {
  activeThemeIdRef.current = activeThemeId;
}, [activeThemeId]);

// AFTER — same pattern, two effects:
useEffect(() => {
  activeColorThemeIdRef.current = activeColorThemeId;
}, [activeColorThemeId]);

useEffect(() => {
  activeDensityThemeIdRef.current = activeDensityThemeId;
}, [activeDensityThemeId]);
```

**graphStateMap sync useEffect pattern** (lines 744–756):
```typescript
// BEFORE:
useEffect(() => {
  if (!activeThemeId) {
    setGraphStateMap(collectionGraphState);
    graphStateMapRef.current = collectionGraphState;
    return;
  }
  const theme = themes.find(t => t.id === activeThemeId);
  const gs = (theme?.graphState ?? {}) as CollectionGraphState;
  setGraphStateMap(gs);
  graphStateMapRef.current = gs;
}, [activeThemeId, themes, collectionGraphState]);

// AFTER — resolved theme based on selected group's dominant type:
useEffect(() => {
  const selectedGroup = selectedGroupId
    ? findGroupById(masterGroups, selectedGroupId)
    : null;
  const resolvedId = resolveActiveThemeIdForGroup(
    selectedGroup,
    activeColorThemeId,
    activeDensityThemeId,
  );
  if (!resolvedId) {
    setGraphStateMap(collectionGraphState);
    graphStateMapRef.current = collectionGraphState;
    return;
  }
  const theme = themes.find(t => t.id === resolvedId);
  const gs = (theme?.graphState ?? {}) as CollectionGraphState;
  setGraphStateMap(gs);
  graphStateMapRef.current = gs;
}, [activeColorThemeId, activeDensityThemeId, selectedGroupId, themes, collectionGraphState, masterGroups]);
```

**effectiveThemeTokens memo pattern** (lines 770–808) — replace with dual-merge:
```typescript
// BEFORE memo deps: [activeThemeId, themes, masterGroups]
// AFTER memo deps:  [activeColorThemeId, activeDensityThemeId, themes, masterGroups]
// Call mergeDualThemeTokens instead of inline group processing
```

**persistGraphState routing pattern** (lines 527–562):
```typescript
// BEFORE:
const persistGraphState = useCallback((gs: CollectionGraphState) => {
  const themeId = activeThemeIdRef.current;
  if (themeId) {
    return fetch(`/api/collections/${id}/themes/${themeId}`, { ... });
  }
  // ... collection fallback
}, [id, scheduleDebouncedAppShellRefresh]);

// AFTER — resolve target theme from group dominant type:
const persistGraphState = useCallback((gs: CollectionGraphState) => {
  const selectedGroup = selectedGroupIdRef?.current
    ? findGroupById(masterGroupsRef.current, selectedGroupIdRef.current)
    : null;
  const targetThemeId = resolveActiveThemeIdForGroup(
    selectedGroup,
    activeColorThemeIdRef.current,
    activeDensityThemeIdRef.current,
  );
  if (targetThemeId) {
    return fetch(`/api/collections/${id}/themes/${targetThemeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ graphState: gs }),
    }).then((res) => {
      if (res.ok) {
        setThemes(prev => prev.map(t => t.id === targetThemeId ? { ...t, graphState: gs } : t));
      }
    }).catch((error) => {
      console.error('Failed to persist graph state:', error);
      showErrorToast('Failed to save graph state');
    });
  }
  // Collection default fallback (same as existing lines 544–561)
  ...
}, [id, scheduleDebouncedAppShellRefresh]);
```

**GroupStructureGraph key pattern** (line 1184, TokenGraphPanel line 115):
```typescript
// BEFORE:
key={`${selectedGroup.id}-${activeThemeId ?? 'default'}`}

// AFTER — include both IDs so graph remounts when either changes:
key={`${selectedGroup.id}-${activeColorThemeId ?? 'c0'}-${activeDensityThemeId ?? 'd0'}`}
```

**handleThemeTokenChange routing** (line 861):
```typescript
// BEFORE: always targets activeThemeId
const res = await fetch(`/api/collections/${id}/themes/${activeThemeId}/tokens`, ...);

// AFTER: route to color or density theme based on group dominant type
const selectedGroup = findGroupById(masterGroups, selectedGroupId);
const targetThemeId = resolveActiveThemeIdForGroup(
  selectedGroup, activeColorThemeId, activeDensityThemeId
);
if (!targetThemeId) return; // no active theme for this group
const res = await fetch(`/api/collections/${id}/themes/${targetThemeId}/tokens`, ...);
```

---

### `src/app/collections/[id]/themes/page.tsx` (page) — REDIRECT

**Analog:** `src/app/collections/[id]/tokens/page.tsx` (redirect pattern used in Next.js App Router)

**Redirect pattern** (replaces entire file body):
```typescript
// src/app/collections/[id]/themes/page.tsx
import { redirect } from 'next/navigation';

export default function CollectionThemesPage({ params }: { params: { id: string } }) {
  redirect(`/collections/${params.id}/tokens`);
}
```

---

### `src/app/collections/[id]/output/page.tsx` (page, request-response) — MODIFY

**Analog:** self — `output/page.tsx` (entire file)

**State pattern** (line 37) — replace single with dual:
```typescript
// BEFORE:
const [selectedThemeId, setSelectedThemeId] = useState<string>('__default__');

// AFTER:
const [selectedColorThemeId, setSelectedColorThemeId]   = useState<string | null>(null);
const [selectedDensityThemeId, setSelectedDensityThemeId] = useState<string | null>(null);
```

**Merge call pattern** (lines 70–74):
```typescript
// BEFORE:
const selectedTheme = themes.find((t) => t.id === selectedThemeId) ?? null;
const mergedTokens = tokens && namespace
  ? mergeThemeTokens(tokens, selectedTheme, namespace)
  : tokens;

// AFTER:
const selectedColorTheme   = themes.find(t => t.id === selectedColorThemeId)   ?? null;
const selectedDensityTheme = themes.find(t => t.id === selectedDensityThemeId) ?? null;
const mergedTokens = tokens && namespace
  ? mergeDualThemeTokens(tokens, selectedColorTheme, selectedDensityTheme, namespace)
  : tokens;
```

**darkTheme derivation guard** (lines 76–79):
```typescript
// BEFORE:
const darkTheme = useMemo(() => {
  if (selectedThemeId !== '__default__') return null;
  return themes.find((t) => (t.colorMode ?? 'light') === 'dark') ?? null;
}, [selectedThemeId, themes]);

// AFTER — guard to color themes only (density themes have no colorMode):
const darkTheme = useMemo(() => {
  if (selectedColorThemeId) return null; // explicit color theme selected — no auto dark
  return themes
    .filter(t => (t.kind ?? 'color') === 'color')
    .find(t => t.colorMode === 'dark') ?? null;
}, [selectedColorThemeId, themes]);
```

---

### `src/components/collections/CollectionSidebar.tsx` (component) — MINOR

**Analog:** self — `CollectionSidebar.tsx` (entire file)

**navItems pattern** (lines 26–32) — remove the Themes entry:
```typescript
// BEFORE:
const navItems = [
  { href: `/collections/${collectionId}/tokens`, label: 'Tokens', icon: Palette },
  { href: `/collections/${collectionId}/themes`, label: 'Themes', icon: Layers },  // REMOVE
  { href: `/collections/${collectionId}/output`, label: 'Output', icon: FileOutput },
  ...
];

// AFTER:
const navItems = [
  { href: `/collections/${collectionId}/tokens`, label: 'Tokens', icon: Palette },
  { href: `/collections/${collectionId}/output`, label: 'Output', icon: FileOutput },
  { href: `/collections/${collectionId}/versions`, label: 'Versions', icon: GitBranch },
  { href: `/collections/${collectionId}/settings`, label: 'Settings', icon: SlidersHorizontal },
];
// Remove `Layers` from lucide-react import if no longer used elsewhere
```

---

### `src/components/themes/ThemeList.tsx` (component, event-driven) — MAJOR REFACTOR

**Analog:** self — `ThemeList.tsx` (entire file)

**Imports pattern** (lines 1–20) — add ThemeKind, Lucide kind icons:
```typescript
// ADD to imports:
import type { ThemeKind } from '@/types/theme.types';
import { Palette, Layers } from 'lucide-react'; // kind icons
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
```

**Props interface pattern** (lines 23–30) — update onAdd signature:
```typescript
// BEFORE:
interface ThemeListProps {
  themes: ITheme[];
  selectedThemeId: string | null;
  onSelect: (themeId: string) => void;
  onAdd: (name: string, colorMode: ColorMode) => void;
  onDelete: (themeId: string) => void;
  onColorModeChange?: (themeId: string, colorMode: ColorMode) => void;
}

// AFTER:
interface ThemeListProps {
  themes: ITheme[];
  selectedColorThemeId: string | null;
  selectedDensityThemeId: string | null;
  onSelect: (themeId: string, kind: ThemeKind) => void;
  onAdd: (name: string, kind: ThemeKind, colorMode?: ColorMode) => void;
  onDelete: (themeId: string) => void;
  onColorModeChange?: (themeId: string, colorMode: ColorMode) => void;
}
```

**ColorModeBadge existing pattern** (lines 32–47) — keep as-is; add KindBadge sibling:
```typescript
// Follows same inline-flex badge pattern as ColorModeBadge (lines 32–47):
function KindBadge({ kind }: { kind: ThemeKind }) {
  if (kind === 'density') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] bg-muted text-muted-foreground flex-shrink-0">
        <Layers size={9} />
        Density
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] bg-info/10 text-info flex-shrink-0">
      <Palette size={9} />
      Color
    </span>
  );
}
```

**Section header pattern** (lines 80–91) — used for each of the three grouped sections:
```typescript
// Reuse this exact header + button pattern three times (Base, Color Themes, Density Themes):
<div className="px-3 py-2 border-b border-muted bg-background flex items-center justify-between flex-shrink-0">
  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Color Themes</span>
  <button onClick={() => handleOpenDialog('color')} className="text-muted-foreground hover:text-foreground text-base leading-none px-1 disabled:opacity-40 disabled:cursor-not-allowed">
    <Plus size={14} />
  </button>
</div>
```

**handleOpenDialog pattern** (lines 63–68) — extend for kind:
```typescript
// BEFORE:
const handleOpenDialog = () => { ... setIsAdding(true); };

// AFTER:
const [addingKind, setAddingKind] = useState<ThemeKind | null>(null);
const handleOpenDialog = (kind: ThemeKind) => {
  if (atLimit) return;
  setAddName('');
  setAddColorMode('light');
  setAddingKind(kind);
};
```

**handleCreateTheme pattern** (lines 70–76) — extend for kind:
```typescript
// BEFORE:
const handleCreateTheme = () => {
  const name = addName.trim();
  if (name) { onAdd(name, addColorMode); }
  setIsAdding(false);
};

// AFTER:
const handleCreateTheme = () => {
  const name = addName.trim();
  if (name && addingKind) {
    onAdd(name, addingKind, addingKind === 'color' ? addColorMode : undefined);
  }
  setAddingKind(null);
};
```

**Delete confirmation — use AlertDialog** (replaces onClick directly calling onDelete):
```typescript
// BEFORE (line 139):
onClick={() => onDelete(theme.id)}

// AFTER — wrap with AlertDialog (same pattern as shadcn AlertDialog usage elsewhere):
const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

// In dropdown:
onClick={() => setDeleteTargetId(theme.id)}

// Outside list:
<AlertDialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete theme?</AlertDialogTitle>
      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={() => { onDelete(deleteTargetId!); setDeleteTargetId(null); }}>
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

### `src/components/graph/TokenGraphPanel.tsx` (component, event-driven) — PROP CHANGE

**Analog:** self — `TokenGraphPanel.tsx` (entire file)

**Props interface** (lines 10–25) — extend with dual theme IDs:
```typescript
// BEFORE:
interface TokenGraphPanelProps {
  ...
  activeThemeId?: string | null;
}

// AFTER:
interface TokenGraphPanelProps {
  ...
  activeColorThemeId?: string | null;
  activeDensityThemeId?: string | null;
}
```

**GroupStructureGraph key pattern** (lines 90–91, 115) — update in both render branches:
```typescript
// BEFORE:
key={`__all_groups__-${activeThemeId ?? 'default'}`}
key={`${selectedGroup.id}-${activeThemeId ?? 'default'}`}

// AFTER:
key={`__all_groups__-${activeColorThemeId ?? 'c0'}-${activeDensityThemeId ?? 'd0'}`}
key={`${selectedGroup.id}-${activeColorThemeId ?? 'c0'}-${activeDensityThemeId ?? 'd0'}`}
```

---

### `src/app/api/collections/[id]/themes/route.ts` (API route, CRUD) — MODIFY POST

**Analog:** self — existing POST handler (lines 36–119)

**Auth + guard pattern** (lines 40–44) — keep unchanged:
```typescript
const authResult = await requireRole(Action.Write, params.id);
if (authResult instanceof NextResponse) return authResult;
const themeGuard = await checkThemeLimit(authResult.user.organizationId ?? '', params.id);
if (themeGuard) return themeGuard;
```

**Body parsing pattern** (line 47) — extend to accept kind:
```typescript
// BEFORE:
const body = await request.json() as { name?: string; colorMode?: string };

// AFTER:
const body = await request.json() as { name?: string; kind?: string; colorMode?: string };
```

**kind + colorMode validation pattern** (lines 79–84) — add after name validation:
```typescript
// After existing colorMode validation (lines 79–84), add kind resolution:
const validKinds = ['color', 'density'] as const;
const kind: ThemeKind = (body.kind && validKinds.includes(body.kind as ThemeKind))
  ? body.kind as ThemeKind
  : 'color'; // default: backward-compatible migration safety

const validColorModes = ['light', 'dark'] as const;
const colorMode: ColorMode | undefined = kind === 'color'
  ? (body.colorMode && validColorModes.includes(body.colorMode as ColorMode)
      ? body.colorMode as ColorMode
      : 'light')
  : undefined; // density themes have no colorMode
```

**theme object construction** (line 95–102) — add kind, make colorMode conditional:
```typescript
// BEFORE:
const theme: ITheme = {
  id: themeId,
  name: body.name.trim(),
  colorMode,
  groups: Object.fromEntries(groupIds.map((gid) => [gid, defaultState])),
  tokens: groupTree,
  graphState,
};

// AFTER:
const theme: ITheme = {
  id: themeId,
  name: body.name.trim(),
  kind,
  ...(colorMode !== undefined ? { colorMode } : {}),
  groups: Object.fromEntries(groupIds.map((gid) => [gid, defaultState])),
  tokens: groupTree,
  graphState,
};
```

---

### `src/app/api/collections/[id]/themes/[themeId]/route.ts` (API route, CRUD) — MODIFY PUT

**Analog:** self — existing PUT handler (lines 10–77)

**Auth pattern** (lines 14–17) — keep unchanged:
```typescript
const authResult = await requireRole(Action.Write, params.id);
if (authResult instanceof NextResponse) return authResult;
const _ownershipGuard = await assertOrgOwnership(authResult, params.id);
if (_ownershipGuard) return _ownershipGuard;
```

**Body type + nothing-to-update guard** (lines 19–30) — extend with kind:
```typescript
// BEFORE:
const body = await request.json() as {
  name?: string;
  groups?: Record<string, ThemeGroupState>;
  graphState?: CollectionGraphState | null;
  colorMode?: ColorMode;
};
if (body.name === undefined && body.groups === undefined && body.graphState === undefined && body.colorMode === undefined) {
  return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
}

// AFTER:
const body = await request.json() as {
  name?: string;
  kind?: ThemeKind;
  groups?: Record<string, ThemeGroupState>;
  graphState?: CollectionGraphState | null;
  colorMode?: ColorMode;
};
if (body.name === undefined && body.groups === undefined && body.graphState === undefined
    && body.colorMode === undefined && body.kind === undefined) {
  return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
}
```

**Whole-array $set pattern** (lines 53–70) — keep exactly; add kind + colorMode guard:
```typescript
// In updatedTheme spread (lines 53–59), add kind guard:
const existingKind = (themes[themeIndex].kind ?? 'color') as ThemeKind;
const incomingKind = body.kind ?? existingKind;
const updatedTheme: Record<string, unknown> = {
  ...themes[themeIndex],
  kind: incomingKind,
  ...(body.name !== undefined ? { name: body.name.trim() } : {}),
  ...(body.groups !== undefined ? { groups: body.groups } : {}),
  ...(body.graphState !== undefined ? { graphState: body.graphState } : {}),
  // Only set colorMode for color themes; strip it for density themes
  ...(incomingKind === 'color' && body.colorMode !== undefined ? { colorMode: body.colorMode } : {}),
  ...(incomingKind === 'density' ? { colorMode: undefined } : {}),
};
```

---

### `src/app/api/collections/[id]/themes/[themeId]/tokens/route.ts` (API route, CRUD) — MODIFY PATCH

**Analog:** self — existing PATCH handler (entire file, 75 lines)

**Auth pattern** (lines 14–17) — keep unchanged:
```typescript
const authResult = await requireRole(Action.Write, params.id);
if (authResult instanceof NextResponse) return authResult;
const _ownershipGuard = await assertOrgOwnership(authResult, params.id);
if (_ownershipGuard) return _ownershipGuard;
```

**Whole-array $set pattern** (lines 27–65) — keep; add scope-trimming after source-group guard:
```typescript
// Existing source-group guard (lines 44–48) — keep unchanged:
const hasSourceWrite = (body.tokens as TokenGroup[]).some(g => groups[g.id] === 'source');
if (hasSourceWrite) {
  return NextResponse.json({ error: 'Cannot write to source groups' }, { status: 422 });
}

// ADD after source-group guard — scope trimming (no-op for out-of-scope tokens):
import { COLOR_SCOPE_TYPES, DENSITY_SCOPE_TYPES } from '@/utils/tokenScope';
import type { ThemeKind } from '@/types/theme.types';
import type { GeneratedToken } from '@/types/token.types';

const themeKind = ((theme.kind ?? 'color') as ThemeKind);
const scopeTypes = themeKind === 'color' ? COLOR_SCOPE_TYPES : DENSITY_SCOPE_TYPES;

// Filter each group's tokens to only the scoped types (no-op: silently strip out-of-scope)
const scopedTokens = (body.tokens as TokenGroup[]).map(g => ({
  ...g,
  tokens: g.tokens.filter((t: GeneratedToken) =>
    (scopeTypes as readonly string[]).includes(t.type)
  ),
}));

const updatedTheme: Record<string, unknown> = {
  ...theme,
  tokens: scopedTokens,  // was: body.tokens
};
```

---

## Shared Patterns

### Authentication — Apply to All API Routes
**Source:** `src/app/api/collections/[id]/themes/route.ts` lines 40–41 (read) / `src/app/api/collections/[id]/themes/[themeId]/route.ts` lines 14–17 (write)

Read-only endpoints:
```typescript
const session = await requireAuth();
if (session instanceof NextResponse) return session;
```

Write endpoints (all theme mutations):
```typescript
const authResult = await requireRole(Action.Write, params.id);
if (authResult instanceof NextResponse) return authResult;
const _ownershipGuard = await assertOrgOwnership(authResult, params.id);
if (_ownershipGuard) return _ownershipGuard;
```

### Whole-Array $set (MongoDB) — Apply to All Theme Mutation Routes
**Source:** `src/app/api/collections/[id]/themes/[themeId]/route.ts` lines 34–70
**Rationale:** Positional `$set` is unreliable on `Schema.Types.Mixed` arrays (Mongoose #14595, #12530).
```typescript
// ALWAYS: fetch full doc → mutate in-memory → $set whole array
const collection = await TokenCollection.findById(params.id).lean() as Record<string, unknown> | null;
const themes = (collection.themes as Array<Record<string, unknown>>) ?? [];
const themeIndex = themes.findIndex((t) => (t.id as string) === params.themeId);
// ... mutate themes[themeIndex] ...
await TokenCollection.findByIdAndUpdate(params.id, { $set: { themes: updatedThemes } }).lean();
```

### Error Response Pattern — Apply to All API Routes
**Source:** All existing route handlers
```typescript
} catch (error) {
  console.error('[HANDLER_NAME /api/path]', error);
  return NextResponse.json({ error: 'Human-readable message' }, { status: 500 });
}
```

### kind Default at Read Time — Apply Everywhere `theme.kind` is Read
**Source:** Research document pitfall 7
```typescript
// Backward compat: existing MongoDB documents have no `kind` field
const kind = (theme.kind ?? 'color') as ThemeKind;
```

### Dialog Pattern (shadcn) — Apply to ThemeList
**Source:** `src/components/themes/ThemeList.tsx` lines 152–204 — `Dialog` / `DialogContent` / `DialogHeader` / `DialogFooter` structure

### AlertDialog Pattern (shadcn) — Apply to ThemeList delete confirmation
**Source:** `src/components/ui/alert-dialog.tsx` (already installed per RESEARCH.md)
```typescript
<AlertDialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete theme?</AlertDialogTitle>
      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={...}>Delete</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### useRef + useEffect Sync Pattern — Apply to Dual Theme Refs
**Source:** `src/app/collections/[id]/tokens/page.tsx` lines 153, 739–742
```typescript
// Ref tracks latest value for use in debounced callbacks without stale closure issues
const activeColorThemeIdRef = useRef<string | null>(null);
useEffect(() => {
  activeColorThemeIdRef.current = activeColorThemeId;
}, [activeColorThemeId]);
```

---

## No Analog Found

All 14 files have analogs. No files require research-only patterns.

| File | Notes |
|------|-------|
| `src/utils/tokenScope.ts` | Closest analog is the `TOKEN_TYPES` constant array + `isPatternTokenType` helper in `src/types/token.types.ts`. The structure is identical — export const array + boolean helper functions. |

---

## Metadata

**Analog search scope:** `src/types/`, `src/utils/`, `src/lib/`, `src/app/collections/[id]/`, `src/components/themes/`, `src/components/graph/`, `src/components/collections/`, `src/app/api/collections/[id]/themes/`
**Files scanned:** 14 primary analog files read in full
**Pattern extraction date:** 2026-04-26
