# ATUI Tokens Manager

Design token management tool for the Allied Telesis ATUI design system. View, create, edit, and persist design tokens — import from GitHub and Figma, store collections in MongoDB, and export to multiple formats (CSS, SCSS, LESS, JS, TS, JSON). Supports per-collection themes with isolated token values and graph state per theme and per group.

## Getting Started

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000). Browse collections at `/collections`; each collection has Tokens, Themes, Config, and Settings pages.

## Tech Stack

- **Next.js 13** (App Router)
- **TypeScript**
- **MongoDB** (Mongoose) — `MONGODB_URI` env var
- **Style Dictionary v5** — token build
- **shadcn/ui** (Radix UI) — UI components
- **React Flow** — visual graph editor for token generation

## Project Structure

```
src/
├── app/
│   ├── collections/[id]/     # Tokens, Themes, Config, Settings
│   └── api/collections/       # Collection + theme CRUD
├── components/
│   ├── tokens/               # TokenGeneratorForm, TokenGroupTree
│   ├── graph/                # GroupStructureGraph, node components
│   └── themes/               # Theme list, group matrix
├── lib/
│   ├── graphEvaluator.ts     # Graph evaluation engine
│   ├── graphStateRemap.ts    # Theme graph state remapping
│   └── db/                   # MongoDB, repository
└── types/                    # theme, graph-state, token types
```

## Documentation

| Document | Purpose |
|----------|---------|
| [CLAUDE.md](./CLAUDE.md) | AI assistant context — project conventions, data model |
| [documentation/themes-and-graph-data-model.md](./documentation/themes-and-graph-data-model.md) | Themes, tokens, graph state model |
| [documentation/graph-system-summary.md](./documentation/graph-system-summary.md) | Graph nodes, evaluation, persistence |
| [documentation/graph-architecture.md](./documentation/graph-architecture.md) | Token parsing, layout, selection |
| [.planning/PROJECT.md](./.planning/PROJECT.md) | Requirements, milestones, decisions |

## Key Concepts

- **Collections** — Token sets stored in MongoDB; each has its own Figma/GitHub config.
- **Themes** — Per-collection themes; each has its own tokens and graph state per group.
- **Default theme** — Edits go to the collection; custom themes are isolated.
- **Graph** — Visual node editor for generating tokens; state per theme and per group.

## Environment

```env
MONGODB_URI=mongodb://...
```

## Build

```bash
yarn build
```
