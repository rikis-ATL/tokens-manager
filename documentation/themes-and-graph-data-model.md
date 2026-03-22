# Themes and Graph Data Model

> How themes, tokens, and graph state are stored and scoped. Last updated: 2026-03-19

## Overview

Tokens and graph state are **per theme** and **per group**. The graph behaves like the tokens table: each theme has its own graph state per group. Default defines the collection; themes are isolated copies.

## Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Collection Default                           │
├─────────────────────────────────────────────────────────────────────┤
│  tokens: Record<string, unknown>     (raw collection tokens)         │
│  graphState: Record<groupId, GraphGroupState>                         │
│    ├── "colors"       → graph for colors group                       │
│    ├── "colors/brand" → graph for brand subgroup                     │
│    └── "typography"   → graph for typography group                    │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         Theme 1 (custom)                             │
├─────────────────────────────────────────────────────────────────────┤
│  tokens: TokenGroup[]                (full snapshot, per-theme copy) │
│  groups: Record<groupId, ThemeGroupState>  (enabled/source/disabled) │
│  graphState: Record<groupId, GraphGroupState>                        │
│    ├── "colors"       → graph 1A (unique node IDs)                  │
│    ├── "colors/brand" → graph 1B                                    │
│    └── "typography"   → graph 1C                                    │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         Theme 2 (custom)                             │
├─────────────────────────────────────────────────────────────────────┤
│  tokens: TokenGroup[]                (full snapshot)                 │
│  groups: Record<groupId, ThemeGroupState>                            │
│  graphState: Record<groupId, GraphGroupState>                        │
│    ├── "colors"       → graph 2A (unique node IDs)                  │
│    └── ...                                                           │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Concepts

### Default Theme (`__default__`)

- Synthetic theme created client-side; not stored in MongoDB.
- Edits go to `collection.tokens` and `collection.graphState`.
- Used for consistent UX when theme selector is active.

### Custom Themes

- Stored in `collection.themes` array.
- Each theme has its own `tokens` and `graphState`.
- **Never fall back to collection** when loading a custom theme’s graph.
- Theme creation: `POST /themes` copies collection graph state and remaps node IDs via `remapGraphStateForTheme()`.

### Group IDs

- Shared across themes (e.g. `"colors"`, `"colors/brand"`).
- `graphState[groupId]` is the graph state for that group in that theme.
- Same structure as `theme.tokens` for groups.

### Theme Group States

| State     | Behavior                                      |
|----------|-----------------------------------------------|
| `enabled` | Editable; theme has its own tokens and graph  |
| `source`  | Read-only; uses collection default values     |
| `disabled`| Hidden from group tree                        |

## Persistence

| Target        | Endpoint                                      | Payload                    |
|---------------|-----------------------------------------------|----------------------------|
| Default (collection) | `PUT /api/collections/[id]`           | `{ tokens, graphState }`  |
| Theme tokens  | `PATCH /api/collections/[id]/themes/[themeId]/tokens` | `{ tokens }` |
| Theme graph   | `PUT /api/collections/[id]/themes/[themeId]`  | `{ graphState }`          |

## Graph State Remapping

When creating a theme, `remapGraphStateForTheme()` in `src/lib/graphStateRemap.ts`:

1. Copies `collection.graphState` for the new theme.
2. Rewrites node IDs with a theme prefix (`t-{themeId}`).
3. Ensures each theme has unique graph nodes (no cross-theme ID collisions).

## Sync and Persist Flow (Tokens Page)

1. **Theme switch**: `graphStateMap` is set from `theme.graphState` (or `collection.graphState` for default).
2. **Graph edit**: `handleGraphStateChange(groupId, state)` merges into `graphStateMapRef` and debounce-saves.
3. **Unmount/theme switch**: `GroupStructureGraph` unmounts and flushes with `flushImmediate: true` so the current theme’s state is saved before loading the next theme.
4. **Ref sync**: `activeThemeIdRef` is kept in sync with `activeThemeId` for correct debounced save.

## Related Files

- `src/types/theme.types.ts` — `ITheme`, `ThemeGroupState`
- `src/types/graph-state.types.ts` — `GraphGroupState`, `CollectionGraphState`
- `src/lib/graphStateRemap.ts` — `remapGraphStateForTheme()`
- `src/app/collections/[id]/tokens/page.tsx` — sync, persist, `handleGraphStateChange`
