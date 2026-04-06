---
phase: 28-ai-tool-use-token-and-group-crud
status: open
---

# Phase 28 — Known Bugs

## BUG-01: Chat clears tokens table

**Symptom:** Opening the AI chat panel and sending a message causes the tokens table to clear (tokens disappear from the UI).

**Likely cause:** The `onToolsExecuted` callback passed to `AIChatPanel` calls `refreshTokens`, which reloads the collection. If the tool execution response or streaming triggers this callback unexpectedly (e.g., on every message rather than only on successful tool calls), it could reset local token state mid-render.

**Impact:** High — data appears lost (not persisted data loss, but disorienting UX). AI feature disabled in DOM until fixed.

**Files to investigate:**
- `src/components/ai/AIChatPanel.tsx` — when `onToolsExecuted` is fired
- `src/app/collections/[id]/tokens/page.tsx` — `refreshTokens` implementation and how it affects token state
- `src/app/api/collections/[id]/ai/chat/route.ts` — streaming response and tool invocation path

**To re-enable:** Remove the two `disabled` comments in `page.tsx` (lines around the AI Chat toggle button and slide-over div) and restore the imports.
