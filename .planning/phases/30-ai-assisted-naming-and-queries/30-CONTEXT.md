# Phase 30: AI-Assisted Naming and Queries - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend the existing AI chat panel (Phases 26–29) with four new capabilities:
1. **AI-11** — AI can create a new theme and populate it with AI-suggested token values via tool use
2. **AI-12** — User can query tokens in natural language and receive a correct result
3. **AI-13** — User can request a natural language bulk edit (rename prefix) and the tokens table updates
4. **AI-14** — User can paste raw token values and the AI suggests canonical names + group structure, then applies them on user confirmation

**What this phase does NOT include:**
- Streaming AI responses
- MCP theme mutation tools (Phase 32)
- Style Guide verification (Phase 31)

</domain>

<decisions>
## Implementation Decisions

### AI-12: Natural Language Queries

- **D-01:** No new tools needed. The full collection token data is already injected into the system prompt. The AI can answer "which tokens use #0056D2?" by reading the JSON it already has.
- **D-02:** Bug fix: the current system prompt always uses `collection.tokens`, even when a theme is active. Fix `buildCollectionContext()` in `src/app/api/ai/chat/route.ts`: when `themeId` is set and not `__default__`, inject the active theme's tokens instead of the collection default tokens. This makes queries accurate when a theme is selected.
- **D-03:** Update the system prompt to explicitly guide the AI that it can answer read-only queries about the current token state (not just create/edit/delete).

### AI-13: Bulk Rename via rename_prefix Tool

- **D-04:** New tool: `rename_prefix(groupPath, oldPrefix, newPrefix)` — renames token paths within a group by substituting the prefix of each token name. Mirrors the existing multi-row "rename prefix" action in the token table. Tool name is `rename_prefix` (not `move_token` — that's a separate concept for reparenting tokens to another group).
- **D-05:** New API endpoint to back the tool: `PATCH /api/collections/[id]/tokens/rename-prefix` accepts `{ groupPath, oldPrefix, newPrefix }`, performs the rename using the same logic as the multi-row bulk action, broadcasts via `broadcastTokenUpdate`.
- **D-06:** The tool also needs a theme-aware variant: when `themeId` is set, the rename applies to the theme's tokens, not the collection default.

### AI-11: Theme Creation + Granular Theme Token Tools

- **D-07:** New tool: `create_theme(name, colorMode)` — calls `POST /api/collections/[id]/themes`. Returns the new `themeId`. This enables the AI to create a theme during the chat session.
- **D-08:** New tools for granular theme token updates (mirroring the collection token endpoints): `update_theme_token(themeId, tokenPath, value, type?)` and `delete_theme_token(themeId, tokenPath)`. These back granular `PATCH` and `DELETE` endpoints at `/api/collections/[id]/themes/[themeId]/tokens/single`.
- **D-09:** Theme creation flow in chat: AI calls `create_theme` → receives new `themeId` → reads existing collection tokens from system prompt context to understand current structure → calls `update_theme_token` for each value it wants to suggest differently (e.g., lighter colors for a dark theme variant). AI describes its suggestions before calling any tools.

### AI-14: Canonical Naming Suggestions

- **D-10:** Two-step flow: (1) user pastes raw values → AI replies with suggested canonical names and group structure as formatted text; (2) user says "yes, apply it" → AI calls `bulk_create_tokens` with the suggested paths and values. No accidental writes on the first pass.
- **D-11:** The system prompt should guide the AI to recognize when a user pastes a list of token values (even without explicit "suggest names" phrasing) and respond with naming suggestions rather than silently applying.

### AIChatPanel UX Updates

- **D-12:** Update the empty state message and input placeholder in `AIChatPanel.tsx` to hint at the new capabilities: queries, bulk edits, theme creation, and naming suggestions. Example placeholder: "Ask about tokens, create themes, or paste values for naming..."
- **D-13:** No structural changes to the chat panel — same slide-over, same message display. Only text content updates.

### Claude's Discretion

- Exact wording of system prompt additions for query and naming guidance
- Whether `rename_prefix` confirms before executing (suggested: yes, per existing D-11 pattern — describe what will be renamed first)
- Exact parameter naming for new API endpoints
- Whether to add a `bulk_move_tokens` tool (for reparenting) in this phase or defer to Phase 32

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing AI Surface (modify these)
- `src/app/api/ai/chat/route.ts` — `buildCollectionContext()`: fix theme-aware token injection (D-02); add `create_theme` + theme token tools to tool definitions (D-07, D-08)
- `src/services/ai/tools.ts` — `getToolDefinitions()` and `executeToolCall()`: add `rename_prefix`, `create_theme`, `update_theme_token`, `delete_theme_token` (D-04, D-07, D-08)
- `src/components/ai/AIChatPanel.tsx` — Update empty state and placeholder text (D-12)

### Existing Token API (reference for new endpoint patterns)
- `src/app/api/collections/[id]/tokens/route.ts` — POST/PATCH/DELETE pattern for collection-level token CRUD; new endpoints follow this exactly
- `src/app/api/collections/[id]/themes/route.ts` — POST theme creation; `create_theme` tool calls this
- `src/app/api/collections/[id]/themes/[themeId]/tokens/route.ts` — Current full-array PATCH; new granular endpoints live alongside this

### Existing Bulk Rename Logic (reuse for rename_prefix)
- `src/utils/bulkTokenActions.test.ts` — Shows expected behavior of rename prefix (old prefix → new prefix within group)
- `src/utils/groupMove.ts` — Group/token path manipulation utilities; check for reusable rename helpers

### Prior Context (locked decisions)
- `.planning/milestones/v1.7-phases/28-ai-tool-use-token-and-group-crud/28-CONTEXT.md` — D-02 (HTTP tool calls), D-03 (cookie forwarding), D-08 (system prompt structure), D-11 (confirm before delete)
- `.planning/milestones/v1.8-phases/29-fix-ai-chat-verify-phase-28/29-CONTEXT.md` — D-01 (toolsExecuted boolean), D-05 (silent refresh pattern)

### Requirements
- `.planning/REQUIREMENTS.md` §AI requirements — AI-11, AI-12, AI-13, AI-14

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `broadcastTokenUpdate(collectionId, themeId?)` — must be called after any mutation; already used in all token/theme endpoints
- `requireRole(Action.Write, collectionId)` — auth guard for all new write endpoints
- `executeToolCall()` dispatch pattern in `tools.ts` — add new cases to the existing switch statement
- `getToolDefinitions()` in `tools.ts` — add new tool definitions to the returned array
- `collectGroupPaths()` in `route.ts` — existing helper that extracts group paths from token object

### Established Patterns
- Tool execution: HTTP fetch to app's own API with forwarded cookie header (D-02/D-03 from Phase 28)
- New tool = new case in `executeToolCall()` switch + new entry in `getToolDefinitions()` array
- New API endpoint = new route file following POST/PATCH/DELETE pattern in `src/app/api/collections/[id]/tokens/`
- Theme-aware tool calls: check `themeId !== null && themeId !== '__default__'` to route to theme endpoint vs collection endpoint

### Integration Points
- `buildCollectionContext()` in chat route: change `const tokens = collection.tokens` to use theme tokens when theme is active (D-02)
- New endpoints at `/api/collections/[id]/themes/[themeId]/tokens/single` for granular theme token CRUD (D-08)
- `create_theme` tool HTTP target: `POST /api/collections/[id]/themes` (already exists — no new endpoint needed)
- `rename_prefix` tool HTTP target: new `PATCH /api/collections/[id]/tokens/rename-prefix` (D-05)

</code_context>

<specifics>
## Specific Ideas

- The `rename_prefix` tool name comes directly from the existing multi-row bulk action label in the token table — maintain naming consistency between AI tools and UI actions.
- `move_token` (reparenting to a different parent group) is explicitly a separate concept from `rename_prefix` (changing a token's name prefix within its group). Do not conflate.
- The AI-14 flow ("paste values → suggest names → user confirms → AI applies") deliberately uses two chat turns to avoid accidental writes. The existing system prompt rule "always describe before calling delete tools" extends naturally to this.

</specifics>

<deferred>
## Deferred Ideas

- `bulk_move_tokens` tool for reparenting tokens to another parent group — may be useful but not required by AI-11/12/13/14; defer to Phase 32 or backlog
- Streaming AI responses — out of scope for all current phases
- MCP `create_theme` / `update_theme` tools — Phase 32 scope (MCP parity)

</deferred>

---

*Phase: 30-ai-assisted-naming-and-queries*
*Context gathered: 2026-04-08*
