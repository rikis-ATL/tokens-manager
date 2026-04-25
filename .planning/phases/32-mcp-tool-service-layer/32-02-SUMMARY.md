---
plan: 32-02
phase: 32-mcp-tool-service-layer
status: complete
completed: 2026-04-26
requirements: [MCP-01]
gap_closure: true
---

# Plan 32-02: Wire API Routes to Shared Service Layer

## What Was Built

Refactored the three in-app HTTP API route mutation handlers to delegate their DB operations to the shared service layer, fully closing MCP-01.

**Files changed:**
- `src/app/api/collections/[id]/tokens/route.ts` — POST/PATCH/DELETE now call `createToken`, `updateToken`, `deleteToken` from `@/services/shared/tokens`
- `src/app/api/collections/[id]/groups/route.ts` — POST/PATCH/DELETE now call `createGroup`, `renameGroup`, `deleteGroup` from `@/services/shared/groups`; local `getNestedValue` helper removed
- `src/app/api/collections/[id]/themes/[themeId]/tokens/single/route.ts` — PATCH/DELETE now call `updateThemeToken`, `deleteThemeToken` from `@/services/shared/themes`; local `findGroupById` and `parseTokenPath` helpers removed

## Approach

Route handlers retain ownership of: auth guards (`requireRole`, `assertOrgOwnership`), input validation, `dbConnect()`, `broadcastTokenUpdate`, and HTTP response shaping. The DB mutation logic is fully delegated to the shared service. This maintains the auth/business-logic separation and preserves all HTTP response contracts so callers are unaffected.

## Key Files

### Created
_none_

### Modified
- `src/app/api/collections/[id]/tokens/route.ts` — delegates mutations to shared tokens service
- `src/app/api/collections/[id]/groups/route.ts` — delegates mutations to shared groups service
- `src/app/api/collections/[id]/themes/[themeId]/tokens/single/route.ts` — delegates mutations to shared themes service

## Deviations

None. Plan executed as specified.

## Self-Check

- [x] All tasks executed
- [x] `grep "from '@/services/shared/tokens'" tokens/route.ts` — present
- [x] `grep "from '@/services/shared/groups'" groups/route.ts` — present
- [x] `grep "from '@/services/shared/themes'" single/route.ts` — present
- [x] `grep "TokenCollection"` returns zero results in all three route files
- [x] Auth guards present in all handlers
- [x] `broadcastTokenUpdate` present in all handlers
- [x] `yarn tsc --noEmit` — no errors
- [x] MCP-01 fully satisfied: shared services now used by both MCP tools and in-app HTTP API route handlers
- [x] SUMMARY.md committed

## Self-Check: PASSED
