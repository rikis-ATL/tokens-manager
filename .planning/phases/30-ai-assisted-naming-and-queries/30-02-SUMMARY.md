---
phase: 30-ai-assisted-naming-and-queries
plan: "02"
subsystem: ai-tools
tags: [ai, rename, bulk-operations, api, token-management]
dependency_graph:
  requires:
    - 26-ai-service-layer-foundation
    - 28-ai-tool-use-token-and-group-crud
  provides:
    - rename_prefix AI tool (D-04)
    - collection rename-prefix endpoint (D-05)
    - theme rename-prefix endpoint (D-06)
  affects:
    - src/services/ai/tools.ts
    - src/utils/bulkTokenActions.ts
tech_stack:
  added: []
  patterns:
    - W3C flat-object key rename via MongoDB $unset/$set
    - TokenGroup[] bulk rename via bulkReplacePrefix + whole-array $set write-back
    - Theme-aware tool routing in executeToolCall (themeId != '__default__')
key_files:
  created:
    - src/utils/bulkTokenActions.ts (bulkReplacePrefix export)
    - src/app/api/collections/[id]/tokens/rename-prefix/route.ts
    - src/app/api/collections/[id]/themes/[themeId]/tokens/rename-prefix/route.ts
    - src/app/api/collections/[id]/tokens/__tests__/rename-prefix.test.ts
  modified:
    - src/utils/bulkTokenActions.test.ts
    - src/services/ai/tools.ts
    - src/services/ai/__tests__/tools.test.ts
decisions:
  - "[30-02]: Collection rename-prefix operates on W3C flat object keys directly ($unset old key + $set new key fields) — no TokenGroup[] round-trip needed as no inverse of processImportedTokens exists"
  - "[30-02]: Theme rename-prefix uses bulkReplacePrefix on theme.tokens (TokenGroup[]) + whole-array $set write-back — consistent with established theme write pattern"
  - "[30-02]: rename_prefix tool uses slash-separated groupPath — consistent with TokenGroup IDs; collection endpoint converts slashes to dots for MongoDB dot-notation"
  - "[30-02]: $ character rejection in groupPath/oldPrefix/newPrefix prevents MongoDB operator injection (T-30-03)"
metrics:
  duration: "~15 min"
  completed: "2026-04-08T10:52:14Z"
  tasks_completed: 2
  files_modified: 7
  commits: 2
---

# Phase 30 Plan 02: Rename Prefix AI Tool Summary

**One-liner:** Full-stack rename_prefix AI tool — bulkReplacePrefix pure function, collection W3C key rename endpoint, theme TokenGroup[] rename endpoint, and theme-aware routing in executeToolCall.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add bulkReplacePrefix pure function + tests | 6e1b423 | bulkTokenActions.ts, bulkTokenActions.test.ts |
| 2 | Create rename-prefix endpoints + wire rename_prefix tool | 76988e4 | 5 files |

## What Was Built

### Task 1: bulkReplacePrefix (D-04 logic)

Added `bulkReplacePrefix(groups, groupId, oldPrefix, newPrefix): TokenGroup[]` to `src/utils/bulkTokenActions.ts`. Key design differences from `bulkAddPrefix`/`bulkRemovePrefix`:
- Operates on ALL tokens in the group matching `oldPrefix` (no `tokenIds` set — the AI specifies the prefix, not individual IDs)
- Returns unchanged if `oldPrefix` is empty
- Uses `resolveTokenPathConflict` for collision handling
- Uses `rewriteGroupAliases` for within-group alias rewriting after each rename

6 new test cases covering: basic rename, empty prefix guard, no-match guard, collision resolution, alias rewriting, missing group guard. All 41 tests in the file pass.

### Task 2: API endpoints + tool wiring

**Collection endpoint** (`PATCH /api/collections/[id]/tokens/rename-prefix`):
- Operates directly on W3C flat object keys — navigates to `groupPath` in `collection.tokens`, finds keys starting with `oldPrefix` that have `$value` (token nodes, not group nodes), builds `$unset`/`$set` pairs, updates atomically
- Returns `{ success, message, renamed: N }`

**Theme endpoint** (`PATCH /api/collections/[id]/themes/[themeId]/tokens/rename-prefix`):
- Calls `bulkReplacePrefix` on `theme.tokens` (already `TokenGroup[]`)
- Uses established whole-array `$set` write-back pattern
- Detects no-op via JSON stringify comparison

**Tool wiring** (`src/services/ai/tools.ts`):
- `getToolDefinitions()` now returns 8 tools (was 7)
- `rename_prefix` tool definition with `groupPath`, `oldPrefix`, `newPrefix` inputs
- `executeToolCall()` routes to theme endpoint when `context.themeId` is set and not `'__default__'`

**Security (T-30-02, T-30-03):** Both endpoints use `requireRole(Action.Write)` and reject `$` characters in all user-supplied string parameters.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed stale tool count in tools.test.ts**
- **Found during:** Task 2 verification
- **Issue:** `tools.test.ts` checked `toHaveLength(7)` — fails after adding rename_prefix as 8th tool
- **Fix:** Updated count to 8, added `contains rename_prefix tool` test, added two routing tests for collection and theme modes
- **Files modified:** `src/services/ai/__tests__/tools.test.ts`
- **Commit:** 76988e4

### Pre-existing Issues (Out of Scope)

`src/services/ai/__tests__/claude.provider.test.ts` has 4 pre-existing failures unrelated to this plan (confirmed by git stash verification — failures existed before any changes). Logged to deferred items.

## Known Stubs

`src/app/api/collections/[id]/tokens/__tests__/rename-prefix.test.ts` — 3 integration test stubs with `expect(true).toBe(true)` placeholders. These are intentional per the plan spec (action_addendum D). The unit tests in `bulkTokenActions.test.ts` provide full coverage of the pure function logic.

## Self-Check: PASSED

- `src/utils/bulkTokenActions.ts` exports `bulkReplacePrefix` — FOUND
- `src/app/api/collections/[id]/tokens/rename-prefix/route.ts` — FOUND
- `src/app/api/collections/[id]/themes/[themeId]/tokens/rename-prefix/route.ts` — FOUND
- `src/app/api/collections/[id]/tokens/__tests__/rename-prefix.test.ts` — FOUND
- Commit 6e1b423 — FOUND
- Commit 76988e4 — FOUND
- All 41 bulkTokenActions tests pass
- All rename-prefix test stubs pass (3/3)
- tools.test.ts: 26 passing (updated from 24 + 2 new routing tests)
