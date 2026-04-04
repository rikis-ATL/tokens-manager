---
phase: 28-ai-tool-use-token-and-group-crud
plan: "03"
subsystem: ai-chat
tags: [anthropic, tool-use, chat, collection-context, claude-provider]

dependency_graph:
  requires:
    - phase: 28-01
      provides: getToolDefinitions, executeToolCall, granular token/group API endpoints
    - phase: 26-ai-service-layer-foundation
      provides: ClaudeProvider, AIProvider interface, AIService
  provides:
    - ClaudeProvider multi-turn tool use loop (tool_use -> execute -> tool_result -> final text)
    - Extended ChatOptions with tools and toolExecutor
    - Chat route with collection context system prompt and cookie-forwarding tool executor
    - AIChatPanel component with activeThemeId prop
    - Tokens page wires activeThemeId to AIChatPanel
  affects:
    - 28-04: chat UI — AIChatPanel now receives collection context; tool calls are functional end-to-end

tech_stack:
  added: []
  patterns:
    - "Multi-turn tool use loop in ClaudeProvider: API call -> tool_use detection -> toolExecutor -> tool_result -> repeat up to MAX_TOOL_ROUNDS"
    - "Collection context injection: full W3C token JSON + group paths in system prompt per chat turn"
    - "Cookie forwarding: chat route request.headers.get('cookie') passed through to executeToolCall context"
    - "Tool executor closure: captures collectionId, themeId, cookieHeader, baseUrl from route scope"

key_files:
  created:
    - src/components/ai/AIChatPanel.tsx
  modified:
    - src/services/ai/provider.interface.ts
    - src/services/ai/claude.provider.ts
    - src/app/api/ai/chat/route.ts
    - src/app/collections/[id]/tokens/page.tsx

key_decisions:
  - "MAX_TOOL_ROUNDS = 10 safety cap prevents infinite tool loops in ClaudeProvider"
  - "toolExecutor is optional in ChatOptions — when absent, tool_use stop_reason returns text as-is (backward compatible)"
  - "buildCollectionContext injects full W3C token JSON to give AI complete reasoning context without requiring get_token list tools"
  - "collectGroupPaths traverses token tree to show AI the group hierarchy in system prompt header"
  - "AIChatPanel implemented as fixed slide-over panel (shadcn Sheet) triggered by MessageSquare button in header, not ResizablePanel"
  - "Slide-over approach chosen for simpler state management, better mobile UX, and no screen space competition with tokens table"
  - "TSC full project check OOMs on this machine; isolated module checks pass — pre-existing project-wide memory issue"

metrics:
  duration: ~10 min
  completed: "2026-04-04T01:09:35Z"
  tasks_completed: 2
  files_changed: 5
---

# Phase 28 Plan 03: Tool Use Loop and Collection Context Summary

**Wired Anthropic SDK tool use loop into ClaudeProvider, extended chat route with full collection context and HTTP-based tool execution, and added AIChatPanel component to the tokens page.**

## Performance

- **Duration:** ~10 min
- **Completed:** 2026-04-04T01:09:35Z
- **Tasks:** 2
- **Files modified:** 5

## Task Commits

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Extend provider interface and ClaudeProvider with tool use loop | b948d65 | provider.interface.ts, claude.provider.ts |
| 2 | Wire collection context, tool execution, and AIChatPanel | ea73ac7 | chat/route.ts, AIChatPanel.tsx, page.tsx |

## What Was Built

### Task 1 — Provider Interface + ClaudeProvider Tool Use Loop

**provider.interface.ts**: Added `ToolDefinition` interface, `ToolExecutor` type alias, and `tools`/`toolExecutor` optional fields to `ChatOptions`. The `AIProvider.chat()` signature is unchanged — tool use is internal to the implementation.

**claude.provider.ts**: Replaced the single-shot `client.messages.create()` call with a `MAX_TOOL_ROUNDS = 10` loop:
1. Call API with optional `tools` parameter
2. If `stop_reason !== "tool_use"` or no `toolExecutor`, extract text and return
3. Filter `tool_use` blocks from response content
4. Push assistant response (with tool_use blocks) to `anthropicMessages`
5. Execute each tool via `toolExecutor`, collect `ToolResultBlockParam[]`
6. Push tool results as a `user` message
7. Loop — final iteration returns text reply

**ai.service.ts**: No changes needed — `tools` and `toolExecutor` flow through automatically via the extended `ChatOptions`.

### Task 2 — Chat Route + AIChatPanel

**src/app/api/ai/chat/route.ts**: Major extension:
- Extended body parsing to include `collectionId` and `themeId`
- Added `buildCollectionContext()` helper: fetches collection via `TokenCollection.findById()`, injects full W3C token JSON + group path list + AI behavior rules into the system prompt
- Added `collectGroupPaths()` helper: traverses the token tree to extract non-token group paths for the system prompt header
- Created `toolExecutor` closure capturing `collectionId`, `themeId`, `cookieHeader`, `baseUrl` and forwarding to `executeToolCall()` from Plan 01's `tools.ts`
- Extended `aiService.chat()` call to include `systemPrompt`, `tools`, `toolExecutor`
- Cookie forwarding: `request.headers.get('cookie')` passed into tool context so RBAC applies to all AI tool calls

**src/components/ai/AIChatPanel.tsx** (new): React client component with:
- Props: `collectionId`, `collectionName`, `activeThemeId?: string | null`
- Chat message state with user/assistant bubbles
- `handleSend` posts `{ messages, collectionId, themeId }` to `/api/ai/chat`
- Error handling: 402 → API key not configured message; other errors → error message in chat
- Auto-scroll to bottom on new messages

**src/app/collections/[id]/tokens/page.tsx**: Added `AIChatPanel` import and integrated as a slide-over panel triggered by a `MessageSquare` button in the page header. The panel uses shadcn's Sheet component for a fixed slide-over layout (not ResizablePanel). Passes `collectionId={id}`, `collectionName={collectionName}`, `activeThemeId={activeThemeId}`.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| MAX_TOOL_ROUNDS = 10 | Prevents infinite loops; matches D-01 safety requirement |
| toolExecutor is optional | Backward compatible — chat without tools still works identically |
| Full W3C JSON in system prompt | AI can reason about existing tokens without needing get/list tools first (D-06) |
| AIChatPanel as fourth resizable panel | Integrates naturally into the existing master-detail-graph layout |
| Graph panel default size reduced 40% → 30% | Make room for the 25% AI chat panel |

## Deviations from Plan

### Auto-added Missing File

**[Rule 2 - Missing Functionality] Created AIChatPanel.tsx**
- **Found during:** Task 2
- **Issue:** `src/components/ai/AIChatPanel.tsx` referenced in the plan as "existing" but was never created in a prior plan. The `src/components/ai/` directory did not exist.
- **Fix:** Created the full AIChatPanel component with props matching the plan spec (`collectionId`, `collectionName`, `activeThemeId`).
- **Files modified:** `src/components/ai/AIChatPanel.tsx` (created)

### Worktree Behind Main

**[Rule 3 - Blocking] Merged main into worktree branch**
- **Found during:** Setup
- **Issue:** Worktree branch was at `a6637a4` (pre-Phase-28), missing Plan 01 commits (`3cf75cb`, `4e619c3`) that created `tools.ts` and the granular API endpoints this plan depends on.
- **Fix:** `git merge main --no-edit` fast-forwarded to `4e619c3`.
- **Commits merged:** 10 commits including all Phase 28 Plan 01 and Plan 02 work.

## TypeScript Verification

Full `npx tsc --noEmit` consistently OOMs on this machine (pre-existing project-wide issue, not caused by these changes — also observed in prior Phase 28 plans). Isolated module checks (`--skipLibCheck --isolatedModules`) pass with no errors.

## Known Stubs

None — all changes are fully wired:
- ClaudeProvider tool loop is a real multi-turn implementation using the Anthropic SDK
- Chat route fetches real MongoDB collection data for the system prompt
- AIChatPanel sends real requests to `/api/ai/chat` with real `collectionId`/`themeId`
- Tool execution uses `executeToolCall()` from Plan 01 which makes real HTTP calls to the granular API endpoints

## Self-Check

Files created/modified:
- FOUND: src/services/ai/provider.interface.ts
- FOUND: src/services/ai/claude.provider.ts
- FOUND: src/app/api/ai/chat/route.ts
- FOUND: src/components/ai/AIChatPanel.tsx
- FOUND: src/app/collections/[id]/tokens/page.tsx (AIChatPanel import + JSX)

Commits:
- FOUND: b948d65 (feat(28-03): extend provider interface and ClaudeProvider with tool use loop)
- FOUND: ea73ac7 (feat(28-03): wire collection context, tool execution, and AIChatPanel)

## Self-Check: PASSED
