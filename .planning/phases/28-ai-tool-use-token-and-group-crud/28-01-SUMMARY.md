---
phase: 28-ai-tool-use-token-and-group-crud
plan: 01
subsystem: api
tags: [anthropic, mongodb, tool-use, ai, tokens, groups]

requires:
  - phase: 26-ai-service-layer-foundation
    provides: ClaudeProvider, AIProvider interface, ai.service.ts

provides:
  - POST/PATCH/DELETE /api/collections/[id]/tokens — single-token CRUD with auth and broadcast
  - POST/PATCH/DELETE /api/collections/[id]/groups — group CRUD with rename/move and auth and broadcast
  - getToolDefinitions() — 7 Anthropic SDK Tool objects for token and group operations
  - executeToolCall() — dispatches tool calls to API endpoints with session cookie forwarding

affects:
  - 28-02: chat API route — needs getToolDefinitions() for messages.create() tools param
  - 28-03: ClaudeProvider — needs executeToolCall() for tool_use response handling
  - 28-04: chat UI — observes broadcastTokenUpdate side effects

tech-stack:
  added: []
  patterns:
    - "Granular dot-notation MongoDB $set/$unset for single-token CRUD without full-array replacement"
    - "Atomic group rename via simultaneous $set newPath + $unset oldPath in one findByIdAndUpdate"
    - "AI tool handlers use HTTP fetch (not Mongoose) — AI-15 boundary enforced in tools.ts"
    - "Session cookie forwarded in tool HTTP calls — cookieHeader passed through context object"

key-files:
  created:
    - src/app/api/collections/[id]/tokens/route.ts
    - src/app/api/collections/[id]/groups/route.ts
    - src/services/ai/tools.ts
  modified: []

key-decisions:
  - "Tool handlers use HTTP calls to app API routes, not direct Mongoose access (AI-15)"
  - "Phase 28 tool calls target collection.tokens only; themeId reserved for future theme-aware ops (D-05)"
  - "bulk_create_tokens stops on first failure and reports partial completion with results array"
  - "Atomic group rename: $set + $unset in single findByIdAndUpdate — no intermediate state"
  - "fetchToolResult helper centralises response parsing and non-2xx error extraction"

requirements-completed: [AI-05, AI-06, AI-07, AI-08, AI-09, AI-10, AI-15]

duration: 8min
completed: 2026-04-03
---

# Phase 28 Plan 01: AI Tool Definitions and Granular API Endpoints Summary

**Granular token/group CRUD API endpoints and Anthropic SDK tool definitions with HTTP-based tool dispatch for in-app AI chat**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-03T21:31:48Z
- **Completed:** 2026-04-03T21:39:42Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created POST/PATCH/DELETE `/api/collections/[id]/tokens` for single-token creation, update, and delete using MongoDB dot-notation $set/$unset
- Created POST/PATCH/DELETE `/api/collections/[id]/groups` for group creation, atomic rename (move all tokens), and delete
- Created `src/services/ai/tools.ts` with `getToolDefinitions()` (7 Anthropic SDK Tool objects) and `executeToolCall()` that dispatches to API endpoints with session cookie forwarding

## Task Commits

1. **Task 1: Create granular token and group API endpoints** - `3cf75cb` (feat)
2. **Task 2: Create AI tool definitions and handler map** - `4e619c3` (feat)

## Files Created/Modified

- `src/app/api/collections/[id]/tokens/route.ts` — POST (create), PATCH (update by path), DELETE (delete by path) for collection default tokens
- `src/app/api/collections/[id]/groups/route.ts` — POST (create group), PATCH (rename/move group), DELETE (delete group and subtree)
- `src/services/ai/tools.ts` — `getToolDefinitions()` returning 7 Anthropic.Tool[], `executeToolCall()` dispatching to API with cookie forwarding

## Decisions Made

- Tool handlers use HTTP calls to app API routes, not direct Mongoose access (AI-15 boundary)
- Phase 28 tool calls target `collection.tokens` only; `themeId` is accepted in context but unused — deferred to future theme-aware phase
- `bulk_create_tokens` stops on first failure and returns partial completion data with results array
- Atomic group rename: simultaneous `$set` + `$unset` in one `findByIdAndUpdate` — no intermediate broken state
- `fetchToolResult` internal helper centralizes HTTP call, response parsing, and non-2xx error extraction

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Known Stubs

None - all endpoints are fully functional with real MongoDB operations.

## Next Phase Readiness

- Granular API endpoints are live and ready for Plan 02 (chat API route) consumption
- `getToolDefinitions()` is ready to be passed as `tools` parameter to `claude.messages.create()` in Plan 03
- `executeToolCall()` is ready to be wired into the tool_use response loop in Plan 03
- TypeScript passes with zero errors

---
*Phase: 28-ai-tool-use-token-and-group-crud*
*Completed: 2026-04-03*
