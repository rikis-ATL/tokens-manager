---
phase: 32
plan: "01"
subsystem: mcp-tools
tags: [mcp, ai-tools, service-layer, shared-logic, theme-mutation]
status: complete
key-files:
  created:
    - src/services/shared/tokens.ts
    - src/services/shared/groups.ts
    - src/services/shared/themes.ts
    - src/mcp/tools/theme-mutations.ts
  modified:
    - src/mcp/tools/tokens.ts
    - src/mcp/tools/groups.ts
    - src/mcp/tools/themes.ts
    - src/mcp/server.ts
metrics:
  tasks_completed: 4
  commits: 3
  files_created: 4
  files_modified: 4
---

# Phase 32 Plan 01 Summary: Shared Service Layer + MCP Theme Mutations

## What Was Built

### Task 1 — Shared service layer (`src/services/shared/`)

Three new modules containing all token/group/theme business logic:

- **`tokens.ts`** — `createToken`, `updateToken`, `deleteToken`, `bulkCreateTokens`. All operate via direct MongoDB `$set`/`$unset` on `TokenCollection`. Returns `ToolResult` — a uniform response understood by both MCP and HTTP callers.
- **`groups.ts`** — `createGroup`, `renameGroup`, `deleteGroup`. Group paths use dot notation. `createGroup` is idempotent. `renameGroup` uses a combined `$set`/`$unset` to move the entire subtree atomically.
- **`themes.ts`** — `createTheme`, `updateThemeToken`, `deleteThemeToken`, `deleteTheme`. `createTheme` derives group IDs from the collection's token structure, inherits and remaps graph state via `remapGraphStateForTheme()`, and stores the full token group tree snapshot. Billing checks are intentionally omitted (MCP is a trusted admin-level tool).

### Task 2 — MCP tools refactored to use shared services

- `src/mcp/tools/tokens.ts` — mutation handlers now delegate to `@/services/shared/tokens`; read-only tools (`list_tokens`, `get_token`, `list_collections`) unchanged.
- `src/mcp/tools/groups.ts` — mutation handlers delegate to `@/services/shared/groups`; read-only `list_groups` unchanged.
- `src/mcp/tools/themes.ts` — read-only; no changes to functionality. Comment added noting mutations live in `theme-mutations.ts`.

### Task 3 — MCP theme mutation tools (`src/mcp/tools/theme-mutations.ts`)

Four new MCP tools registered via `registerThemeMutationTools()`:

| Tool | Maps to shared service |
|------|----------------------|
| `create_theme` | `createTheme(collectionId, name, colorMode)` |
| `update_theme_token` | `updateThemeToken(collectionId, themeId, tokenPath, value, type?)` |
| `delete_theme_token` | `deleteThemeToken(collectionId, themeId, tokenPath)` |
| `delete_theme` | `deleteTheme(collectionId, themeId)` |

`tokenPath` uses slash separators (`colors/brand/primary`) to match the in-app AI tool interface.

`src/mcp/server.ts` updated to import and register `registerThemeMutationTools`.

## Commits

| Commit | Description |
|--------|-------------|
| `0ef167a` | feat(32-01): create shared token/group/theme service layer |
| `ce5ec35` | refactor(32-01): wire MCP token/group/theme tools to shared service layer |
| `1577d98` | feat(32-01): add MCP theme mutation tools — create_theme, update_theme_token, delete_theme_token, delete_theme |

## Deviations

None — implementation matches plan exactly.

## Self-Check

- [x] `src/services/shared/tokens.ts` exists with `createToken`, `updateToken`, `deleteToken`, `bulkCreateTokens`
- [x] `src/services/shared/groups.ts` exists with `createGroup`, `renameGroup`, `deleteGroup`
- [x] `src/services/shared/themes.ts` exists with `createTheme`, `updateThemeToken`, `deleteThemeToken`, `deleteTheme`
- [x] `src/mcp/tools/tokens.ts` imports from `@/services/shared/tokens` — no direct MongoDB mutations
- [x] `src/mcp/tools/groups.ts` imports from `@/services/shared/groups` — no direct MongoDB mutations
- [x] `src/mcp/tools/theme-mutations.ts` registers 4 theme mutation tools
- [x] `src/mcp/server.ts` calls `registerThemeMutationTools(server)`
- [x] MCP-01 satisfied: shared service modules contain all business logic, no duplication
- [x] MCP-02 satisfied: MCP server exposes create_theme, update_theme_token, delete_theme_token, delete_theme

## Self-Check: PASSED
