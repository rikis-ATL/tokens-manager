# Feature Research

**Domain:** AI chat panel with tool use in a design token management developer tool
**Researched:** 2026-03-30
**Confidence:** HIGH (core patterns verified against official Anthropic docs + multiple authoritative UX sources)

---

## Scope Note

This file covers only **v1.7 AI Integration** features. The existing app already ships: token CRUD, group tree, themes, GitHub/Figma export, RBAC, user management. Research here answers: what does the AI layer need to feel complete, differentiated, and trustworthy?

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that, if missing, make the AI panel feel broken or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Streaming text responses | Every modern AI chat streams; non-streaming feels broken and slow | MEDIUM | Claude SDK `.stream()` with SSE. Next.js API route pipes `ReadableStream` to browser. Event flow: `message_start` → `content_block_delta` (text_delta) → `message_stop`. Official docs confirm this is the standard approach. |
| Thinking indicator while AI works | Users need confirmation the request was received; silence reads as failure | LOW | Animated dots or spinner shown from send until first `message_start` event arrives. Separate visual state from "executing tool." |
| Tool call activity indicator | Users need to know when the AI is mutating data, not just talking | MEDIUM | Show a status chip "Creating token group: color/brand..." on `content_block_start` with `type: tool_use`. Resolves to checkmark or error on `content_block_stop` + tool result return. |
| Clear error for invalid API key | Users who enter a wrong key hit auth errors immediately; silent failure is alarming | LOW | Detect 401 / `authentication_error` server-side; return structured error to client; show inline "Invalid API key — check Settings." with link. |
| Clear error for rate limit | Anthropic rate limits are per-user per tier; users hit them during heavy use | LOW | Detect 429 / `rate_limit_error`; show "Rate limit reached. Wait a moment before sending." Do not auto-retry on 429; wait for user. |
| Clear error for context limit | Long sessions exhaust the context window; users need to know why responses stopped | MEDIUM | Detect `stop_reason: max_tokens` or `context_length_exceeded`; show "Conversation too long. Start a new chat to continue." Offer clear-chat action. |
| Stop/cancel in-flight response | Streaming responses can be long; users need to interrupt | LOW | Abort controller on the browser; cancel the SSE connection. Show message as partial with "(stopped)" label. Already established pattern in every chat product. |
| Persist chat history within a page session | Users expect to scroll up and see earlier turns in the current session | LOW | In-memory React state for the current session. Not persisted to DB in v1.7. Clear on page refresh is acceptable v1 behavior. |
| API key configuration in user settings | Users expect a dedicated place to enter and save their key | LOW | Add `anthropicApiKey` field to user settings (existing settings infrastructure). Encrypt with AES-256 before MongoDB storage. All AI calls are server-side only; key never sent to browser. |
| AI tool calls route through existing API endpoints | Users expect AI edits to appear in the UI immediately — same as manual edits | HIGH | Tool implementations call `PUT /api/collections/[id]`, `PATCH /api/collections/[id]/themes/[themeId]/tokens`, etc. Token table updates after each tool result via existing `onTokensChange` / `onThemeTokensChange` callbacks. AI does not write to DB directly (AI-15 in PROJECT.md). |

### Differentiators (Competitive Advantage)

Features that make the AI panel valuable rather than just present.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Collapsible tool call detail accordion | Power users want to audit exactly what the AI sent; casual users want it hidden | LOW | Below each activity chip, expand to reveal tool name, parameters as formatted JSON, and the result. Collapsed by default. Low build cost, high trust payoff. |
| Inline optimistic UI update after tool execution | Users see token table changes immediately without a full page reload | HIGH | After tool result is returned, fire the same state update as a manual edit (shared callbacks). This is the integration seam between the AI layer and existing token state management. |
| AI-assisted token naming: paste values, get suggestions | No existing tool in this domain provides AI-suggested canonical token names for raw values | HIGH | User pastes hex codes or raw values; AI responds with structured group + token name suggestions following namespace/category/concept/property/scale convention. AI uses a `search_tokens` read-only tool to understand the current collection structure as context before suggesting names. |
| Natural language token query | Token tables are hard to search by value across groups; natural language lowers the bar significantly | MEDIUM | AI uses a `search_tokens` read-only tool that filters the collection in the API route and returns matches. No writes. Response is a formatted list with group paths. |
| Multi-step sequence with per-step status | For "create group then add tokens" sequences, each step's status is visible — not a wall of text at the end | HIGH | Stream tool activity chips sequentially. Each chip: pending → executing → success/error. Claude sends tool calls sequentially in a single turn; UI reflects this naturally step by step. |
| Theme creation with AI-suggested token values | Designers ask "create a dark theme"; AI generates a full theme with token overrides | HIGH | AI calls `create_theme`, then `set_theme_token_value` for each override. Multi-step loop. Requires per-step status UI and the batch undo primitive. |
| Undo AI edits as a single batch | Users who do not like an AI-generated change want to revert everything in one Ctrl+Z | HIGH | The existing undo system (v1.4) handles single operations. For multi-step AI sequences, wrap the full sequence in a single undo snapshot before execution begins. Requires a new `beginBatch` / `endBatch` undo primitive. |
| Collection context in system prompt | AI knows the current groups, token count, and active theme without the user having to describe it | MEDIUM | Before each request, inject a compact serialization of the active collection structure (group names, token counts per group, active theme name). Keep under ~2 KB to preserve context budget for the conversation. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Auto-execute tool calls without user seeing them | "Make it seamless — just do it" | Destroys trust. Users who cannot see what changed lose confidence when unexpected mutations appear in the token table. Industry consensus (Smashing Magazine, UX Magazine, Emerge Haus agentic UX research 2025-2026) is clear: transparency is non-negotiable for agentic tools. | Show compact tool activity chips. Low friction, full visibility. |
| Real-time collaborative AI (multiple users, same session) | "What if two people use the chat at once?" | Requires WebSockets, operational transforms, conflict resolution — all out of scope. API key is per-user by definition. Per-session chat is correct. | Accept per-user, per-session isolation as the correct v1.7 model. |
| Persistent chat history across page refreshes | "I want to come back to this conversation" | MongoDB storage of full message history adds schema complexity. Context windows are finite; replaying days of history wastes tokens and degrades response quality. | Clear-on-refresh is acceptable. Add "copy conversation" export if users request persistence in feedback. |
| AI writing directly to MongoDB | "Skip the API layer for speed" | Bypasses access control, validation, undo hooks, and theme-aware token routing that the API layer enforces. Breaks existing data integrity guarantees. AI-15 in PROJECT.md explicitly prohibits this. | AI calls the same API endpoints as the manual UI. This is the correct architecture. |
| AI-triggered GitHub/Figma export | "Ask AI to push the PR for me" | Involves external auth tokens, branch naming decisions, PR descriptions — all require human judgment. Out of scope per v1.7 decision in PROJECT.md. | Defer to v1.8+. AI can tell the user "Your changes are ready — use the Export tab to push to GitHub." |
| Shared org-level API key | "Don't make each user enter their own key" | One org key means all users share rate limits and quota attribution becomes opaque. Harder to revoke per-user access. Explicitly out of scope in PROJECT.md v1.7. | Per-user key is the correct model. Designers and developers typically have their own Anthropic accounts. |
| Streaming tool input parameters character-by-character to the UI | "Show the AI composing the JSON in real time" | Fine-grained tool streaming (`eager_input_streaming: true`) produces partial invalid JSON mid-stream per official Anthropic docs. Showing partial JSON to users creates confusion, not transparency. | Buffer tool input until `content_block_stop`, then show complete parameters in the accordion. |
| Undo individual steps within an AI multi-step sequence | "I like steps 1-3 but not step 4" | Partial undo of a sequence requires understanding token/group dependencies between steps. A token cannot exist without its group; reversing step 4 alone may leave the data inconsistent. | Undo the entire AI sequence as a single batch. Document this behavior in the UI. |

---

## Feature Dependencies

```
[API Key Configuration (User Settings)]
    └──required by──> [All AI Chat Features]

[Chat Panel UI + SSE Streaming Route]
    └──required by──> [Streaming Text Responses]
    └──required by──> [Tool Call Activity Indicators]
    └──required by──> [Error State Display]
    └──required by──> [Stop/Cancel Button]

[Tool Call Activity Indicators]
    └──required by──> [Multi-step Sequence UX]
    └──required by──> [Collapsible Tool Detail Accordion]

[Inline Optimistic UI Update after Tool Execution]
    └──requires──> [Tool calls route through existing API endpoints]
    └──requires──> [Shared token state callbacks (onTokensChange / onThemeTokensChange)]

[Multi-step Sequence UX]
    └──requires──> [Tool Call Activity Indicators]
    └──enhances──> [Theme creation with AI-suggested values]
    └──enhances──> [AI-assisted token naming]

[Undo AI Edits as a Single Batch]
    └──requires──> [Existing undo system (built in v1.4)]
    └──requires──> [New beginBatch / endBatch undo primitive]

[AI-Assisted Token Naming]
    └──requires──> [search_tokens read-only tool]
    └──requires──> [Collection context injection in system prompt]

[Natural Language Token Query]
    └──requires──> [search_tokens read-only tool]
    └──enhances──> [Collection context injection in system prompt]

[Theme Creation with AI Values]
    └──requires──> [Multi-step Sequence UX]
    └──requires──> [create_theme tool]
    └──requires──> [set_theme_token_value tool]
```

### Dependency Notes

- **API key configuration must land first.** Every AI feature gates on the key being present and valid server-side. Phase 1 of the roadmap must include: settings field, encrypted storage, server-side decryption path, and a validation endpoint.
- **SSE streaming infrastructure must precede tool call indicators.** The activity chip UI reads `content_block_start` events for `type: tool_use`. Without the streaming pipeline, there is nothing to react to.
- **Inline optimistic UI requires shared callbacks.** The token table's `onTokensChange` / `onThemeTokensChange` callbacks (already wired in the Tokens page) must be accessible to the tool result handler. This is an architectural integration point, not a new feature to build.
- **Undo batch primitive is an enhancement, not a blocker.** The existing single-operation undo (v1.4) works for simple AI edits. The batch primitive is needed only for multi-step sequences. Can be deferred to a later task within v1.7.
- **Collection context injection is a pure utility.** No UI required. Must be designed carefully to stay under token budget (~2 KB is a safe ceiling for collection metadata).

---

## MVP Definition

### Launch With (v1.7.0)

The minimum needed for a functional, trustworthy AI agent in the token tool.

- [ ] API key entry and encrypted storage in user settings
- [ ] Chat panel UI on Tokens page: resizable side panel, message history, input field, send button, close button
- [ ] SSE streaming from Next.js API route to browser: text responses stream character by character
- [ ] Thinking indicator: spinner from send until first `message_start` event
- [ ] Tool call activity chip with status (pending → executing → success / error)
- [ ] Stop/cancel button: abort controller terminates the SSE stream
- [ ] Error states: invalid API key, rate limit, context limit — each with a distinct, actionable inline message
- [ ] AI tools (write): create token, edit token value, delete token
- [ ] AI tools (write): create token group, rename token group, delete token group
- [ ] AI tools (read): search tokens by value or name
- [ ] Natural language token query via search tool
- [ ] Natural language token edits via write tools
- [ ] Collection context injection in system prompt (active group names, token counts, active theme)
- [ ] Tool calls route through existing API endpoints — no direct DB access
- [ ] Inline optimistic UI update after tool execution: token table reflects changes without page reload

### Add After Validation (v1.7.x)

- [ ] Collapsible tool detail accordion: show parameters + result — add when users ask "what exactly did it do?"
- [ ] AI-assisted token naming (paste values → canonical name suggestions) — add after basic CRUD is stable
- [ ] Undo AI edits as a single batch — add when users report frustration reverting multi-step changes
- [ ] Theme creation with AI-suggested token values — complex multi-step; add after single-step tools are proven
- [ ] "Test API key" button in settings — add after key entry flow is live

### Future Consideration (v1.8+)

- [ ] Conversation context summarization to handle long sessions gracefully without hitting the context limit
- [ ] AI-triggered export suggestions: AI tells user "ready to export" but does not trigger export
- [ ] Documentation / changelog generation from token structure
- [ ] Cross-collection AI queries (per-collection only in v1.7)

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| API key settings + encrypted storage | HIGH | LOW | P1 |
| Chat panel UI (side panel) | HIGH | LOW | P1 |
| SSE streaming text | HIGH | MEDIUM | P1 |
| Tool call activity chip | HIGH | MEDIUM | P1 |
| Error states (key / rate / context) | HIGH | LOW | P1 |
| Stop/cancel button | HIGH | LOW | P1 |
| Token CRUD tools (create/edit/delete) | HIGH | MEDIUM | P1 |
| Group CRUD tools | HIGH | MEDIUM | P1 |
| Search/query tool | HIGH | MEDIUM | P1 |
| Inline optimistic UI after tool call | HIGH | HIGH | P1 |
| Collection context in system prompt | MEDIUM | LOW | P1 |
| Collapsible tool detail accordion | MEDIUM | LOW | P2 |
| AI-assisted naming (paste → suggest) | HIGH | HIGH | P2 |
| Undo AI batch | MEDIUM | HIGH | P2 |
| Theme creation with AI values | MEDIUM | HIGH | P2 |
| Test API key button | LOW | LOW | P2 |

**Priority key:**
- P1: Must have for launch — users cannot trust or use the AI panel without it
- P2: Should have — increases trust and value; add after P1 is stable
- P3: Nice to have; future consideration

---

## UX Pattern Analysis: Tool Call Transparency

### Should Users See Tool Calls?

**Yes, but in compact, non-obtrusive form.** (HIGH confidence — multiple authoritative sources converge on this conclusion.)

Research from Smashing Magazine (Feb 2026, "Designing For Agentic AI: Practical UX Patterns"), UX Magazine ("Secrets of Agentic UX"), and the Emerge Haus split-screen agent UI analysis all identify **action visibility** as the primary trust mechanism for agentic tools. The canonical pattern: "Show intent, not inner thoughts. 'Creating token group: color/brand', 'Setting token value: primary-blue'—make the workflow legible."

Hiding tool calls to appear seamless is an anti-pattern. When mutations appear in the token table without any visible cause, users lose confidence in the system. Smashing Magazine describes this as: "No rollback path forces users into manual cleanup, which feels like punishment for trusting the system."

### Recommended Pattern: Activity Chip, Not Full Debug View

**Show:** A compact human-readable chip above the AI's follow-up text.
Example: "Created token group: color/brand" with a checkmark icon.

**Hide by default:** The full JSON parameters. An expand toggle in the chip reveals tool name, parameters as formatted JSON, and the result.

**Never show:** Raw SSE event stream, partial JSON deltas mid-stream, or internal message structure.

This pattern matches what Cursor (Composer panel), Claude.ai (tool use blocks), and GitHub Copilot Workspace (task steps) show: a human-readable action label with optional detail expansion.

### Multi-Step Sequence UX

For a sequence like "create group, then add 5 tokens":

1. AI sends its plan as text: "I'll create the group first, then add each token."
2. `content_block_start` for first `tool_use` → chip appears: "Creating group: color/brand" (spinner).
3. Tool executes → `content_block_stop` + tool result → chip resolves to checkmark → optimistic UI update in token table.
4. Claude sends next `tool_use` block → second chip appears below the first.
5. After all tools complete, AI sends its summary text.

This sequential reveal—one chip at a time—follows the numbered-steps pattern from agentic UX research. Users see the sequence unfold rather than receiving a wall of results at the end.

### Confirmation Before Destructive Actions

For **delete operations** (delete token, delete group), the recommended pattern is conversational confirmation rather than a UI modal:

Claude is instructed via system prompt to ask for confirmation before calling any delete tool: "I'm about to delete group 'color/brand' which contains 12 tokens. Shall I proceed?" The user replies to confirm. The tool is called only after explicit confirmation.

This avoids building a custom confirmation modal while achieving the same safety outcome through the conversational flow already present in the chat panel.

### Chat Panel Layout

**Finding: Resizable side panel is the correct pattern for this app.** (MEDIUM confidence — derived from multiple layout pattern analyses.)

The emerging consensus in agentic tool UI (Emerge Haus, UX Collective research) is a split-screen layout: left side for the existing UI, right side for the AI agent. The split balances autonomy with oversight.

For the Tokens page specifically: the existing layout already has a left sidebar (group tree), a center content area (token table), and a right panel (React Flow graph). Adding the AI chat as a collapsible right side panel or overlay is consistent with this layout. An overlay/drawer is simpler to build; a persistent resizable panel is more powerful but requires layout restructuring.

**Recommended for v1.7:** A toggleable side panel that slides in from the right, overlaying the graph panel. The graph panel is already optional (users toggle it). The AI panel replaces it in the layout when active. This avoids layout restructuring while preserving all existing functionality.

---

## Streaming Architecture: Key Technical Facts

From official Anthropic documentation (HIGH confidence):

**SSE event flow for a tool-use response:**
1. `message_start` — message begins; contains empty content array
2. `content_block_start` with `type: "text"` — AI begins its reasoning/plan text
3. `content_block_delta` events with `type: "text_delta"` — text streams character by character
4. `content_block_stop` — text block ends
5. `content_block_start` with `type: "tool_use"` — tool call begins; UI shows activity chip
6. `content_block_delta` events with `type: "input_json_delta"` — tool parameters stream as partial JSON strings; do NOT show these to users
7. `content_block_stop` — tool input fully accumulated; parse JSON; execute tool
8. `message_delta` with `stop_reason: "tool_use"` — AI is waiting for tool results
9. App sends tool results back as a new user message with `role: "user"` and `type: "tool_result"` content
10. New streaming response begins for AI's follow-up text
11. `message_stop` — full response complete

**Error events in SSE stream:**
```
event: error
data: {"type": "error", "error": {"type": "overloaded_error", "message": "Overloaded"}}
```
Errors arrive as named SSE events, not HTTP status codes, during streaming. The API route must handle both pre-stream HTTP errors (401, 429 before streaming starts) and in-stream error events.

**Tool input accumulation:** Accumulate `partial_json` strings across `input_json_delta` events; parse only on `content_block_stop`. Do not attempt to parse mid-stream.

**Fine-grained tool streaming (`eager_input_streaming: true`):** Available but not recommended for UI display. It reduces latency for large parameters but produces partial JSON. Use for background performance optimization only; never expose to users.

---

## Error State Specifications

| Error Condition | API Signal | User-Facing Message | Action Offered |
|----------------|-----------|---------------------|----------------|
| Invalid API key | HTTP 401 / `authentication_error` | "Invalid API key. Check your key in Settings." | Link to Settings page |
| Rate limited | HTTP 429 / `rate_limit_error` | "Rate limit reached. Wait a moment before sending." | No auto-retry; user-initiated resend |
| Context window full | `stop_reason: max_tokens` or `context_length_exceeded` | "Conversation too long. Start a new chat to continue." | "Clear chat" button |
| API overloaded | `overloaded_error` in SSE stream | "Claude is busy right now. Try again in a few seconds." | Retry button (with 5s delay) |
| Network error / stream drop | Fetch abort / stream error | "Connection lost. Your last message was not processed." | Retry button |
| Tool execution failed | Tool returns error result to Claude | AI surfaces the error in follow-up text naturally; no special UI needed | AI decides whether to retry or explain |
| No API key configured | Pre-flight check before first send | "Add your API key in Settings to use AI features." | Link to Settings page |

---

## Reference Product Analysis

| Pattern | Cursor Composer | Claude.ai | GitHub Copilot Workspace | Recommended for this app |
|---------|-----------------|-----------|--------------------------|--------------------------|
| Tool call visibility | File edits shown as diffs in editor | Tool use shown as labeled blocks in chat | Task steps in a sidebar plan | Activity chip in chat; accordion for detail |
| Multi-step transparency | Each file edit applies as it arrives | Each tool_use block shown sequentially | Plan shown upfront; steps check off | Sequential chips, one per tool call |
| Streaming | Yes, character by character | Yes | No (batch results) | Yes — mandatory for trust and perceived speed |
| Confirmation for destructive actions | Asks before overwriting in some modes | Not applicable (read-only) | Plan approval before execution | AI asks in conversation for deletes |
| Error for bad API key | Settings-level, not in chat | Account-level | Organization-level | Inline in chat + link to Settings |
| Panel layout | Split panel (editor left, chat right) | Full-screen chat | Sidebar plan + full-screen | Toggleable right side panel on Tokens page |

---

## Sources

- [Smashing Magazine — Designing For Agentic AI: Practical UX Patterns (Feb 2026)](https://www.smashingmagazine.com/2026/02/designing-agentic-ai-practical-ux-patterns/)
- [Emerge Haus — The New Dominant UI Design for AI Agents](https://www.emerge.haus/blog/the-new-dominant-ui-design-for-ai-agents)
- [UX Collective — Where Should AI Sit in Your UI?](https://uxdesign.cc/where-should-ai-sit-in-your-ui-1710a258390e)
- [UX Magazine — Secrets of Agentic UX: Emerging Design Patterns](https://uxmag.com/articles/secrets-of-agentic-ux-emerging-design-patterns-for-human-interaction-with-ai-agents)
- [The Shape of AI — UX Patterns for Artificial Intelligence Interfaces](https://www.shapeof.ai)
- [Anthropic Official Docs — Streaming Messages (SSE event types, error events)](https://platform.claude.com/docs/en/build-with-claude/streaming)
- [Anthropic Official Docs — Fine-grained Tool Streaming](https://platform.claude.com/docs/en/agents-and-tools/tool-use/fine-grained-tool-streaming)
- [Anthropic Official Docs — Advanced Tool Use](https://www.anthropic.com/engineering/advanced-tool-use)
- [Smashing Magazine — Design Patterns for AI Interfaces (Jul 2025)](https://www.smashingmagazine.com/2025/07/design-patterns-ai-interfaces/)
- [DEV Community — Building Production-Ready Claude Streaming API with Next.js Edge Runtime](https://dev.to/bydaewon/building-a-production-ready-claude-streaming-api-with-nextjs-edge-runtime-3e7)
- PROJECT.md v1.7 milestone requirements (AI-01 through AI-15)

---

*Feature research for: ATUI Tokens Manager v1.7 — AI Chat Panel with Tool Use*
*Researched: 2026-03-30*
