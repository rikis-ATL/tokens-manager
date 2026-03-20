# Phase 13: Groups Ordering Drag and Drop - Research

**Researched:** 2026-03-20
**Domain:** React drag-and-drop tree (sibling reorder + reparent), token path mutation, undo history
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Full reparenting is supported — groups can be moved to a different parent, not just reordered among siblings
- Root level is a valid drop target (groups can be promoted to top-level)
- Only groups are valid drop targets; tokens cannot be reparented via drag
- Name collision on drop: auto-rename the moved group with a suffix (e.g. `-2`) rather than blocking or merging
- Reparenting updates token dot-paths to reflect the new tree structure (e.g. `brand.primary` → `primitives.brand.primary`)
- Token references (aliases) that point to moved paths are auto-updated to the new paths
- All ordering (sibling and reparented) persists to MongoDB — drag order is durable across page refreshes
- Undo is supported within the session (Ctrl+Z) — an operation history stack reverting the last move
- Drag order is the canonical token sequence for all exports (CSS, SCSS, JSON, SD formats)
- Order is respected at all tree depths — children sort within their parent's drag order
- Theme-aware exports (Phase 12) also respect the global drag order
- Figma export uses new token paths after reparenting (variable names update to match)
- Order is tracked for disabled groups too — their position is preserved for when they are re-enabled
- Group ordering is global — one order applies to all themes (not per-theme)
- New theme snapshots (Phase 10 deep-copy) inherit the current drag order at creation time
- When a group is reordered, all existing theme `.tokens` snapshots are reordered to match
- When a group is reparented, theme group-state map entries (`groupId → state`) travel with the group — states are not cleared on move

### Claude's Discretion

- Drag handle visual design and placement in the tree row
- Drag preview / ghost element appearance
- Drop zone indicator (line, highlight, or zone overlay) style
- Whether undo history persists across page navigations or is session-only within a page load
- Debounce strategy for persisting order to MongoDB on drop

### Deferred Ideas (OUT OF SCOPE)

- None — discussion stayed within phase scope
</user_constraints>

---

## Summary

This phase adds drag-and-drop reordering and reparenting to the `TokenGroupTree` sidebar. The drag-and-drop library ecosystem in React has converged on **@dnd-kit** as the standard approach, used in the dnd-kit official sortable tree example and all community implementations. The tree must be rendered as a **flattened array** (not nested recursion) to allow cross-level moves within a single `SortableContext`; the nested tree structure is then rebuilt from the flat representation after each move.

The most significant architectural challenge in this codebase is that **group IDs are path-derived** (e.g. `colors/brand/primary`), not UUIDs. Reparenting a group changes its ID, which cascades into: token IDs embedded in the group, token alias references embedded as `{...}` strings in token values, theme group-state maps (`Record<string, ThemeGroupState>`) keyed by group ID, and the theme `.tokens` snapshots held in MongoDB. A pure tree-operation utility (`remapGroupAfterMove`) must handle all these cascades before any persistence occurs.

Ordering persistence requires a new `order` field on the `TokenGroup` type (or a separate ordering list on the collection), or — simpler — the canonical array order of `children[]` in the saved `TokenGroup[]` tree doubles as the drag order. The decision is to use **array position as order** (no extra field), keeping the data model unchanged; the drag operation just reorders the `children` arrays. The undo history is a simple in-memory stack `TokenGroup[][]` bounded to ~20 entries, with `Ctrl+Z` reverting to the previous snapshot.

**Primary recommendation:** Use `@dnd-kit/core` + `@dnd-kit/sortable` with a custom flatten/rebuild approach (following the official dnd-kit sortable tree story). Do NOT use `dnd-kit-sortable-tree` (abandoned; last published 2 years ago, v0.1.73). Implement flat-array rendering in `TokenGroupTree` with a single `DndContext + SortableContext`, and a pure `applyGroupMove` util that handles the full cascade: group tree reorder, group/token ID rewrite, alias path rewrite, theme snapshot sync, and theme group-state key migration.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@dnd-kit/core` | 6.3.1 | DnD primitives: sensors, DndContext, drag overlay | The de-facto standard for React DnD; accessible, sensor-agnostic |
| `@dnd-kit/sortable` | ^7.x | Sortable preset: `useSortable`, `SortableContext`, `arrayMove` | Official dnd-kit preset for sorted lists; handles index tracking |
| `@dnd-kit/utilities` | ^3.2 | CSS transform utilities used by useSortable | Required peer dep of sortable |

**Already installed:** None of these are in the project's `package.json`. All three must be added.

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | already installed | `GripVertical` icon for drag handle | Already in codebase; use for the handle icon |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@dnd-kit/sortable` | `dnd-kit-sortable-tree` | Abandoned (2 years), no maintenance, brings its own wrappers that fight with our custom tree |
| `@dnd-kit/sortable` | `react-beautiful-dnd` | Deprecated by Atlassian in 2022; no longer maintained |
| `@dnd-kit/sortable` | `react-dnd` | Lower-level, more boilerplate; dnd-kit has better touch/pointer sensor support |

**Installation:**
```bash
yarn add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## Architecture Patterns

### Recommended File Structure

```
src/
├── components/tokens/
│   ├── TokenGroupTree.tsx        # Existing — refactor to DnD; add DndContext + SortableContext
│   └── SortableGroupRow.tsx      # New — single tree row wrapped with useSortable
├── utils/
│   └── groupMove.ts              # New — pure applyGroupMove util (all cascade logic)
```

No new API routes are required. The existing `PUT /api/collections/[id]` persists the updated `TokenGroup[]` tree (via `generateStyleDictionaryOutput`) and the existing `PATCH /api/collections/[id]/themes/[themeId]/tokens` persists theme snapshots.

### Pattern 1: Flatten → Sort → Rebuild

**What:** Render the tree as a flat array with depth metadata. `SortableContext` receives flat IDs. On drag end, `applyGroupMove` reorders the flat array, updates parent/depth references, and rebuilds the nested tree.

**When to use:** Required for cross-level moves inside a single `SortableContext`.

**Example:**
```typescript
// Source: dnd-kit official tree story
// https://github.com/clauderic/dnd-kit/blob/master/stories/3%20-%20Examples/Tree/SortableTree.tsx

interface FlatNode {
  group: TokenGroup;
  depth: number;
  parentId: string | null;
  index: number;           // index within sibling array
  displayLabel: string;
}

function flattenTree(groups: TokenGroup[], parentId: string | null = null, depth = 0): FlatNode[] {
  const result: FlatNode[] = [];
  groups.forEach((group, index) => {
    const segments = parseGroupPath(group.name);
    const displayLabel = segments[segments.length - 1] ?? group.name;
    result.push({ group, depth, parentId, index, displayLabel });
    if (group.children?.length) {
      result.push(...flattenTree(group.children, group.id, depth + 1));
    }
  });
  return result;
}
```

### Pattern 2: useSortable per Row

**What:** Each flattened row is a separate component that calls `useSortable`. The drag handle (`GripVertical` icon) uses `...attributes, ...listeners` from `useSortable`. The row is rendered with a CSS transform during drag.

**Example:**
```typescript
// Source: @dnd-kit/sortable docs https://dndkit.com/presets/sortable
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableGroupRow({ node, isSelected, onSelect, onDelete, onAddSubGroup }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.group.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    paddingLeft: node.depth * 14 + 8,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="...">
      <button {...listeners} className="cursor-grab p-1 text-gray-300 hover:text-gray-500">
        <GripVertical size={12} />
      </button>
      {/* rest of row content */}
    </div>
  );
}
```

### Pattern 3: Single DndContext + SortableContext in TokenGroupTree

**What:** One `DndContext` wraps the entire list. `SortableContext` receives the flat IDs in order. `onDragEnd` calls `applyGroupMove` and calls back to the parent page to update state.

**Example:**
```typescript
// Source: dnd-kit official docs
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

// In TokenGroupTree:
const sensors = useSensors(useSensor(PointerSensor, {
  activationConstraint: { distance: 8 }, // avoids accidental drags
}));

const flatNodes = flattenTree(groups);
const sortedIds = flatNodes.map(n => n.group.id);

<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
  <SortableContext items={sortedIds} strategy={verticalListSortingStrategy}>
    {flatNodes.map(node => (
      <SortableGroupRow key={node.group.id} node={node} ... />
    ))}
  </SortableContext>
</DndContext>
```

### Pattern 4: applyGroupMove — Pure Cascade Utility

**What:** A single pure function in `src/utils/groupMove.ts` that takes the current `TokenGroup[]` tree, an `activeId` (dragged), and an `overId` (drop target), and returns the new tree with all cascades applied. This is the most critical piece of the phase.

**Cascade sequence:**
1. Determine new parent and new sibling index from drop position
2. Remove the moved group from its current location in the tree
3. Check for name collision in new parent — auto-append suffix if needed
4. Compute the old ID prefix and new ID prefix for the moved subtree
5. Recursively rewrite all group IDs, group `path` fields, group `parent` fields, and group `name` fields for all nodes in the moved subtree
6. Recursively rewrite all token IDs in the moved subtree (token IDs are `groupId/tokenName`)
7. Recursively rewrite all token alias values `{old.dot.path...}` → `{new.dot.path...}` in ALL tokens across the entire tree (not just the moved subtree, since any group's token can alias to the moved group's tokens)
8. Insert the rewritten subtree at its new location
9. Return new master groups tree

**Outputs needed:** `applyGroupMove(groups, activeId, overId, position) → TokenGroup[]`

### Pattern 5: Undo History Stack

**What:** A simple in-memory `useRef<TokenGroup[][]>` stack in `CollectionTokensPage`. Each successful drag appends the pre-move snapshot. Ctrl+Z pops the stack and calls the revert handler.

```typescript
// Session-only stack — intentionally not persisted
const undoStackRef = useRef<TokenGroup[][]>([]);
const MAX_UNDO = 20;

function pushUndo(snapshot: TokenGroup[]) {
  undoStackRef.current = [
    snapshot,
    ...undoStackRef.current.slice(0, MAX_UNDO - 1),
  ];
}

function handleUndo() {
  const previous = undoStackRef.current.shift();
  if (previous) {
    handleGroupsReordered(previous);
    // Also trigger MongoDB persist of the reverted state
  }
}
```

### Anti-Patterns to Avoid

- **Nested SortableContext for each parent group:** Prevents cross-group (reparent) drag moves. Use one flat SortableContext for the whole tree.
- **UUID-based new IDs on reparent:** Generates IDs that don't match the path-derived ID convention. Always recompute IDs from the new path segments.
- **Alias update only in moved subtree:** Aliases can live in ANY group pointing to the moved group's tokens. The alias rewrite must scan the entire tree.
- **Updating only `masterGroups` in page state and not theme snapshots:** Theme `.tokens` arrays are separate copies and must be reordered to match. Forgetting this makes theme exports have the old order.
- **Skipping disabled-group state preservation:** The theme group-state maps use old IDs as keys. On reparent, the old key must be renamed to the new ID, not deleted.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag detection, pointer events, touch events | Custom mousedown handlers | `@dnd-kit/core` PointerSensor / TouchSensor | Handles multi-pointer, scroll containment, keyboard, accessibility |
| Item displacement animation during drag | CSS transition hacks | `@dnd-kit/sortable` built-in transform + transition | Handles layout shift automatically during active drag |
| Array reorder after drop | Custom splice logic | `arrayMove` from `@dnd-kit/sortable` | Handles index math correctly (no off-by-one) |
| Drag overlay (ghost element) | Custom absolute-positioned clone | `DragOverlay` from `@dnd-kit/core` | Renders in a portal, unaffected by parent overflow:hidden |

**Key insight:** The drag interaction layer (pointer tracking, overlay, animation) is dnd-kit's responsibility. The data mutation layer (path rewrite, alias update, theme sync) is this project's pure util responsibility. Keep these two concerns completely separate.

---

## Common Pitfalls

### Pitfall 1: Group ID Is Path-Derived — Reparenting Changes the ID

**What goes wrong:** After a reparent, the moved group's `id` is now `newParent/movedGroup` but the code still references the old ID `oldParent/movedGroup`. Theme maps still have entries keyed by the old ID. Tokens within the group still have IDs like `oldParent/movedGroup/tokenName`.

**Why it happens:** The token service derives group IDs from path segments (`groupPath.join('/')`). This is a deliberate convention but means IDs are not stable across moves.

**How to avoid:** `applyGroupMove` must compute `oldIdPrefix` = the moved group's current `id` and `newIdPrefix` = the new path-derived ID, then do a recursive string-replacement across all group IDs, token IDs, group path fields, and parent fields. Also update all `ITheme.groups` keys from old to new ID.

**Warning signs:** After a move, group selection breaks (selectedGroupId points to old ID), or themes show no groups.

### Pitfall 2: Alias References Use Dot-Notation Paths, Not Group IDs

**What goes wrong:** Token alias values like `{brand.primary.base}` embed the dot-path (derived from `group.path`, which is the slash-ID with `/` replaced by `.`). After a reparent of `brand/primary` → `primitives/brand/primary`, any token value containing `{brand.primary.` must be rewritten to `{primitives.brand.primary.`.

**Why it happens:** Aliases reference the full logical path, not the internal group ID. `resolveTokenReference` searches by `group.path + '.' + token.path`, so stale aliases silently fail to resolve.

**How to avoid:** In `applyGroupMove`, after all group/token ID rewrites, do a second pass: scan ALL token values in ALL groups (not just the moved subtree), check if the string value starts with `{` and ends with `}`, and apply a targeted string replacement of the old dot-path prefix to the new one.

**Warning signs:** Alias tokens render their raw `{...}` string instead of a resolved value after a reparent.

### Pitfall 3: Theme Snapshot Tokens Go Stale After Reorder/Reparent

**What goes wrong:** Reordering groups updates `masterGroups` on the page, but `theme.tokens` for each theme still holds the old order. Exports use the theme snapshot, which now has wrong order or old IDs.

**Why it happens:** `ITheme.tokens` is an independent copy made at theme creation time. The page reorder event only updates `masterGroups`.

**How to avoid:** After `applyGroupMove`, sync `themes` state: for each theme, apply the same group ordering change and ID rewrite to `theme.tokens` and `theme.groups`. Then PATCH each theme's tokens to MongoDB (or batch as a single PUT to the collection that includes the updated themes array).

**Warning signs:** Theme export produces tokens in pre-drag order. Config page export renders old variable names for Figma.

### Pitfall 4: `activationConstraint` Missing — Accidental Drag on Click

**What goes wrong:** Without a minimum drag distance, clicking a row to select a group triggers the drag start event first, preventing the click handler from firing.

**Why it happens:** `PointerSensor` fires on any pointer down by default.

**How to avoid:** Configure `activationConstraint: { distance: 8 }` on `PointerSensor`. This requires the pointer to move 8px before drag begins, allowing normal clicks to register.

**Warning signs:** Clicking a group row doesn't select it; it initiates a drag instead.

### Pitfall 5: Drop Target Confusion — Dropping ON a Group vs. AFTER It

**What goes wrong:** `closestCenter` collision detection makes it ambiguous whether the user wants to make a group a child of the hovered group, or insert it after the hovered group at the same level.

**Why it happens:** dnd-kit reports only `over.id` (which element the dragged item is over) without a position qualifier (before/after/into).

**How to avoid:** Use `DragOverlay` and compute the **projected position** during drag: track pointer Y relative to the over element's bounding rect. Upper half = insert before as sibling; lower half = insert after as sibling (or if over is a parent-type group, into it as first child). Follow the official dnd-kit tree story pattern for projection.

**Warning signs:** Groups end up nested when the user expected sibling order; or sibling-ordered when user expected nesting.

### Pitfall 6: `overflow: hidden` on Sidebar Clips the Drag Overlay

**What goes wrong:** The sidebar `<aside>` and its children have `overflow-y-auto` or `overflow: hidden`. The drag ghost/overlay is positioned absolutely inside that container and gets clipped.

**Why it happens:** CSS `overflow: hidden` creates a new stacking context that clips absolutely positioned descendants.

**How to avoid:** Use `DragOverlay` from `@dnd-kit/core`. It renders a portal at the document body level, outside all overflow-clipping containers, so the ghost is never clipped.

**Warning signs:** Drag ghost disappears when moved outside the sidebar bounds.

---

## Code Examples

### Collision Detection — Closest Center (Verified Pattern)

```typescript
// Source: @dnd-kit/core docs, dndkit.com
import { DndContext, closestCenter } from '@dnd-kit/core';

<DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
```

### arrayMove (Verified from @dnd-kit/sortable)

```typescript
// Source: @dnd-kit/sortable
import { arrayMove } from '@dnd-kit/sortable';

// In onDragEnd:
const oldIndex = flatNodes.findIndex(n => n.group.id === activeId);
const newIndex = flatNodes.findIndex(n => n.group.id === overId);
const reordered = arrayMove(flatNodes, oldIndex, newIndex);
```

### DragOverlay (Portal-Based Ghost)

```typescript
// Source: @dnd-kit/core
import { DragOverlay } from '@dnd-kit/core';
import { useState } from 'react';

// Track active drag item for the overlay
const [activeNode, setActiveNode] = useState<FlatNode | null>(null);

<DndContext
  onDragStart={({ active }) => setActiveNode(flatNodes.find(n => n.group.id === active.id) ?? null)}
  onDragEnd={(event) => { handleDragEnd(event); setActiveNode(null); }}
>
  {/* ... */}
  <DragOverlay>
    {activeNode ? <GroupRowPreview node={activeNode} /> : null}
  </DragOverlay>
</DndContext>
```

### Group ID Rewrite After Reparent (Project-Specific Pattern)

```typescript
// src/utils/groupMove.ts (to be created)

/** Rewrite all IDs in a subtree when moved from oldPrefix to newPrefix */
function rewriteSubtreeIds(
  group: TokenGroup,
  oldSlashPrefix: string,   // e.g. "brand/primary"
  newSlashPrefix: string,   // e.g. "primitives/brand/primary"
): TokenGroup {
  const newId = group.id.replace(oldSlashPrefix, newSlashPrefix);
  const newPath = newId.replace(/\//g, '.');
  return {
    ...group,
    id: newId,
    path: newPath,
    parent: group.parent ? group.parent.replace(oldSlashPrefix, newSlashPrefix) : undefined,
    tokens: group.tokens.map(t => ({
      ...t,
      id: t.id.replace(oldSlashPrefix, newSlashPrefix),
    })),
    children: group.children?.map(child => rewriteSubtreeIds(child, oldSlashPrefix, newSlashPrefix)),
  };
}
```

### Alias Path Rewrite (Full-Tree Scan)

```typescript
// src/utils/groupMove.ts
/** Replace old dot-path prefix in alias values across the entire tree */
function rewriteAliasesInTree(
  groups: TokenGroup[],
  oldDotPrefix: string,  // e.g. "brand.primary"
  newDotPrefix: string,  // e.g. "primitives.brand.primary"
): TokenGroup[] {
  return groups.map(group => ({
    ...group,
    tokens: group.tokens.map(token => ({
      ...token,
      value: typeof token.value === 'string' && token.value.startsWith('{')
        ? token.value.replace(
            new RegExp(`\\{${escapeRegex(oldDotPrefix)}\\.`, 'g'),
            `{${newDotPrefix}.`
          )
        : token.value,
    })),
    children: group.children ? rewriteAliasesInTree(group.children, oldDotPrefix, newDotPrefix) : undefined,
  }));
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

### Theme Group-State Key Migration

```typescript
// When reparenting: rename keys in theme.groups from old IDs to new IDs
function migrateThemeGroups(
  theme: ITheme,
  oldIdPrefix: string,
  newIdPrefix: string,
): ITheme {
  const newGroups: Record<string, ThemeGroupState> = {};
  for (const [key, state] of Object.entries(theme.groups)) {
    const newKey = key.startsWith(oldIdPrefix)
      ? newIdPrefix + key.slice(oldIdPrefix.length)
      : key;
    newGroups[newKey] = state;
  }
  return { ...theme, groups: newGroups };
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `react-beautiful-dnd` | `@dnd-kit` | 2022 (rbd deprecated) | dnd-kit is the maintained standard |
| `dnd-kit-sortable-tree` package | Custom flatten + rebuild | Still technically available but stale | The package is unmaintained (v0.1.73, 2 years old); implement directly |
| Nested SortableContext per level | Single flat SortableContext | dnd-kit recommendation | Enables cross-level moves |

**Deprecated/outdated:**
- `react-beautiful-dnd`: Deprecated by Atlassian 2022 — do not use
- `dnd-kit-sortable-tree` npm package: Last published 2 years ago, v0.1.73 — do not use

---

## Open Questions

1. **How to represent drop position: before/after/into?**
   - What we know: `closestCenter` gives `over.id` but no positional qualifier
   - What's unclear: Whether to implement full projection (pointer Y position relative to over-item) or a simpler "last item in group = drop as sibling, middle item = reorder" heuristic
   - Recommendation: Implement the simple heuristic first: `over.id` without positional qualifier means "insert after the over item at the same level". If reparenting is triggered explicitly via the drop zone being a group header, it nests. This matches standard file-manager drag behavior.

2. **Persisting updated theme tokens after a reorder**
   - What we know: There is no batch-update-all-themes API endpoint; only `PATCH /api/collections/[id]/themes/[themeId]/tokens` per theme
   - What's unclear: Whether to fire N PATCH calls (one per theme) on each drag-end, or build a new endpoint
   - Recommendation: Build a single `PUT /api/collections/[id]` update that includes the entire `themes` array (same `$set: { themes: updatedArray }` pattern already in use per STATE.md), alongside the updated collection tokens. This keeps the atomic whole-array update pattern already established.

3. **Name collision suffix generation**
   - What we know: The decision is to auto-append `-2` on collision
   - What's unclear: Whether to increment (brand, brand-2, brand-3...) or always use -2
   - Recommendation: Increment: check for `name`, then `name-2`, `name-3`, etc., up to some reasonable limit (10). This is standard file-system behavior.

---

## Critical Data Flow Understanding

This section documents the essential data model constraints the planner must understand.

### Group ID Convention (Critical)

Group IDs in this codebase are **path-derived**, not UUIDs:
- Root group `brand` has ID `brand`
- Child `primary` under `brand` has ID `brand/primary`
- Grandchild `100` has ID `brand/primary/100`

Token IDs follow the same convention: `groupId/tokenName` → `brand/primary/base`.

**Consequence:** Moving `brand/primary` under `primitives` requires recursively renaming every ID in the moved subtree. This is unavoidable given the existing convention; a UUID migration is out of scope.

### Token Dot-Path (for Aliases)

`group.path` is `group.id` with `/` → `.`. Token alias values reference `{group.path.token.path}`. After a reparent, `group.path` changes, so alias strings must be updated across the entire tree.

### Theme Integration Points

```
masterGroups (TokenGroup[])
  ↕ reordered by drag
  → sync to: theme.tokens for each ITheme (same array structure, independent copy)
  → sync to: theme.groups keys (Record<string, ThemeGroupState>) — key = groupId

On reparent (ID changes):
  1. masterGroups: all IDs in moved subtree rewritten
  2. theme.tokens: same rewrite applied to each theme's copy
  3. theme.groups: all keys matching old IDs renamed to new IDs
  4. collection raw tokens: regenerated via generateStyleDictionaryOutput(updatedMasterGroups)
  5. Persist: PUT /api/collections/[id] with { tokens: updatedRawTokens, themes: updatedThemes }
```

### MongoDB Persistence Pattern

Per STATE.md, the established pattern is `$set: { themes: updatedArray }` for whole-array updates. The reorder persist call must follow this pattern and not use `$push` or positional updates (unreliable on Mixed-typed arrays per Mongoose bugs #14595, #12530).

---

## Sources

### Primary (HIGH confidence)

- `@dnd-kit/core` + `@dnd-kit/sortable` docs at dndkit.com — APIs, hooks, sensor config verified
- dnd-kit official tree story at github.com/clauderic/dnd-kit — flattenTree/buildTree pattern verified
- Project codebase read directly — group ID convention, token service, theme model, API patterns

### Secondary (MEDIUM confidence)

- npmjs.com @dnd-kit/core: version 6.3.1 confirmed; @dnd-kit/sortable: v10.0.0 listed (verify via `yarn info @dnd-kit/sortable version` before install)
- npmjs.com dnd-kit-sortable-tree: v0.1.73, last published 2 years ago — confirmed abandoned

### Tertiary (LOW confidence)

- WebSearch patterns for undo history stack — standard `useRef<T[]>` push/pop; no external lib needed (multiple sources agree)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — dnd-kit 6.3.1 verified as current; Yarn install command matches package.json conventions
- Architecture: HIGH — based on direct codebase read; flattenTree/SortableContext pattern verified from official source
- Pitfalls: HIGH — group ID convention directly verified in token.service.ts (line 186: `groupPath.join('/')`); alias resolution directly verified in token.service.ts (line 369)
- Theme sync requirements: HIGH — directly verified in theme.types.ts and STATE.md decisions

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (dnd-kit is stable; project conventions are stable)
