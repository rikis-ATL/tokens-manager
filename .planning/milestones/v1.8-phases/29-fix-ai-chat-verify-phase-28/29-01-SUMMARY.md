---
plan: 29-01
phase: 29
status: complete
subsystem: ai-chat
tags: [bug-fix, ai, chat, ui-restore]
dependency_graph:
  requires: []
  provides: [BUG-01-FIX, AI-01]
  affects: [tokens-page, ai-service-chain]
tech_stack:
  added: []
  patterns: [ChatResult-wrapper, conditional-callback]
key_files:
  created: []
  modified:
    - src/services/ai/provider.interface.ts
    - src/services/ai/claude.provider.ts
    - src/services/ai/ai.service.ts
    - src/app/api/ai/chat/route.ts
    - src/components/ai/AIChatPanel.tsx
    - src/app/collections/[id]/tokens/page.tsx
decisions:
  - "ChatResult interface added to provider.interface.ts; all callers updated to use it"
  - "toolsExecuted set to true only when toolUseBlocks.length > 0 inside ClaudeProvider loop"
  - "AIChatPanel guards onToolsExecuted call with if (data.toolsExecuted)"
  - "Silent refresh — no toast on token table refresh after tool use (per D-05)"
metrics:
  duration: ~20min
  completed: 2026-04-08
  tasks_completed: 2
  files_modified: 6
---

# Phase 29 Plan 01: Fix AI Chat (BUG-01) + Restore UI Summary

## What was built

Fixed BUG-01 (AI chat clearing the tokens table on every message) by adding a `toolsExecuted: boolean` field to the AI service response chain. `ClaudeProvider` now tracks whether any tool calls actually executed during the loop and surfaces that as a flag in the `ChatResult` return type. The `/api/ai/chat` route returns `{ reply, toolsExecuted }` and `AIChatPanel` only calls `onToolsExecuted` (which triggers `refreshTokens`) when `toolsExecuted === true`. After fixing the root cause, the AI chat toggle button and slide-over panel were restored in the Tokens page (they were commented out with `disabled: bug where chat clears tokens table` markers).

## Changes made

| File | Change |
|------|--------|
| `src/services/ai/provider.interface.ts` | Added `ChatResult { reply: string; toolsExecuted: boolean }` interface; changed `AIProvider.chat` return type from `Promise<string>` to `Promise<ChatResult>` |
| `src/services/ai/claude.provider.ts` | Imported `ChatResult`; changed return type to `Promise<ChatResult>`; added `let toolsExecuted = false` before loop; set `toolsExecuted = true` when `toolUseBlocks.length > 0`; all return statements now return `{ reply, toolsExecuted }` |
| `src/services/ai/ai.service.ts` | Imported `ChatResult`; changed `chat()` return type from `Promise<string>` to `Promise<ChatResult>` |
| `src/app/api/ai/chat/route.ts` | Changed `reply = await aiService.chat(...)` to `result = await aiService.chat(...)`; returns `{ reply: result.reply, toolsExecuted: result.toolsExecuted }` |
| `src/components/ai/AIChatPanel.tsx` | Changed response type cast to include `toolsExecuted: boolean`; replaced unconditional `onToolsExecuted?.()` with `if (data.toolsExecuted) { onToolsExecuted?.(); }` |
| `src/app/collections/[id]/tokens/page.tsx` | Added `MessageSquare, X` to lucide-react imports; added `AIChatPanel` import; added `isChatOpen` state; replaced disabled-comment for toggle button with real `<Button>`; replaced disabled-comment for slide-over with real `<div>` containing `<AIChatPanel>` |

## Commits

- `a226125` — feat(29-01): add toolsExecuted to AI service chain
- `62fc4f2` — feat(29-01): fix AIChatPanel callback and restore AI chat UI

## Verification

TypeScript full-project `tsc --noEmit` consistently OOMs on this machine (heap exhaustion at ~4GB regardless of `--max-old-space-size`). This is a pre-existing environment constraint unrelated to these changes. The changes were verified by:

1. Code review of all 6 modified files confirms correct types flow end-to-end
2. `grep` confirms no "disabled: bug where chat clears tokens table" text remains in page.tsx
3. `grep` confirms `AIChatPanel` import, `isChatOpen`, `MessageSquare`, and `data.toolsExecuted` are all present in expected files
4. Both commits applied cleanly with no git errors

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `src/services/ai/provider.interface.ts` — contains `ChatResult`, `toolsExecuted`, `Promise<ChatResult>` ✓
- `src/services/ai/claude.provider.ts` — contains `let toolsExecuted = false`, `toolsExecuted = true`, `Promise<ChatResult>` ✓
- `src/services/ai/ai.service.ts` — contains `Promise<ChatResult>` ✓
- `src/app/api/ai/chat/route.ts` — contains `result.toolsExecuted`, `result.reply` ✓
- `src/components/ai/AIChatPanel.tsx` — contains `if (data.toolsExecuted)`, no bare `onToolsExecuted?.()` ✓
- `src/app/collections/[id]/tokens/page.tsx` — contains `AIChatPanel` import (not commented), `MessageSquare`, `X`, `isChatOpen`, `onToolsExecuted={refreshTokens}`, no "disabled" comment ✓
- Commits `a226125` and `62fc4f2` exist in git log ✓
