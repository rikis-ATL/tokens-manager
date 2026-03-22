# ATUI Tokens Manager — AI Assistant Context

> Project-specific guidance for AI coding assistants. Read this first when working on the codebase.

## Project Overview

Next.js design token management tool for the Allied Telesis ATUI design system. Manages token collections with MongoDB persistence, theme support, visual graph-based token generation, and export to GitHub, Figma, and multiple CSS/JS formats.

## Key Directories

| Path | Purpose |
|------|---------|
| `src/app/collections/[id]/tokens/page.tsx` | Main tokens page — tokens table, graph panel, theme selector |
| `src/app/api/collections/[id]/` | Collection API (GET/PUT, themes CRUD) |
| `src/components/tokens/` | TokenGeneratorForm, TokenGroupTree, TokenTable |
| `src/components/graph/` | GroupStructureGraph, TokenGraphPanel, node components |
| `src/lib/` | graphEvaluator, graphStateRemap, tokenGroupToGraph |
| `src/types/` | theme.types, graph-state.types, token.types |
| `documentation/` | Architecture and design docs |

## Data Model: Themes + Tokens + Graph

**Tokens** and **graph state** are per theme and per group:

```
Default (collection)
├── groupA → tokens (collection.tokens), graph (collection.graphState["groupA"])
└── groupB → tokens, graph

Theme 1
├── groupA → tokens (theme1.tokens), graph (theme1.graphState["groupA"])
└── groupB → tokens, graph

Theme 2
├── groupA → tokens (theme2.tokens), graph (theme2.graphState["groupA"])
└── groupB → tokens, graph
```

- **Group IDs** are shared across themes (from collection structure).
- **Default theme** (`__default__`) = synthetic; edits go to collection.
- **Custom themes** = isolated; each has its own `tokens` and `graphState`.
- **Theme group states**: `enabled` (editable), `source` (read-only, uses collection), `disabled` (hidden).

## Conventions

- **Clean code**: Follow `.planning/codebase/CLEAN-CODE.md` — SOLID, separation of concerns, function/component size limits.
- **SOLID / separation of concerns**: Break large functions into smaller, focused functions; extract logic from components to utils/services.
- **Refs for async**: `activeThemeIdRef` and `graphStateMapRef` stay in sync for debounced saves and unmount flushes.
- **Graph state persistence**: `GroupStructureGraph` flushes on unmount with `flushImmediate: true` so the current theme’s state is saved before switching.
- **Theme tokens**: Use `themeTokens` / `activeThemeTokens` when in theme mode; route edits via `onThemeTokensChange`; never use `onTokensChange` for theme edits.

## API Patterns

- **Collection default**: `PUT /api/collections/[id]` with `{ tokens, graphState }`.
- **Theme tokens**: `PATCH /api/collections/[id]/themes/[themeId]/tokens` with `{ tokens }`.
- **Theme graph**: `PUT /api/collections/[id]/themes/[themeId]` with `{ graphState }`.
- **Theme creation**: `POST /api/collections/[id]/themes` — inherits `graphState` from collection with remapped node IDs via `remapGraphStateForTheme()`.

## Graph System

- **GroupStructureGraph**: `key={group.id}-{activeThemeId}` so remounts on theme change.
- **Node IDs**: Unique per theme; `remapGraphStateForTheme()` rewrites IDs when creating themes.
- **Persisted edge**: `sourceHandle` and `targetHandle` required for hydration.

## Documentation

- `documentation/graph-system-summary.md` — Graph nodes, evaluation, state
- `documentation/graph-architecture.md` — Token parsing, layout, selection
- `documentation/themes-and-graph-data-model.md` — Themes, tokens, graph state model
- `.planning/PROJECT.md` — Requirements, milestones, decisions
