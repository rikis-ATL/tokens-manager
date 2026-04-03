# Phase 28: AI Tool Use — Token and Group CRUD - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 28 delivers two parallel capabilities:

1. **In-app chat tool use** — The AI assistant embedded in the Tokens page (AIChatPanel) gains Anthropic SDK tool use (function calling). When a user asks the AI to create/edit/delete tokens or groups, the AI calls structured tool functions that execute the changes by making HTTP requests to the Next.js API endpoints (with the user's session forwarded for auth). The AI has the full collection context in its system prompt and operates on the active theme.

2. **MCP tool completions** — The Phase 26 MCP server (for Claude Desktop/CLI) gets the remaining tools needed for full token/group management: bulk token operations, complete group CRUD (rename, delete), token generator support (algorithmic color/dimension scales), and theme tools.

**What this phase does NOT include:**
- AI-suggested token naming from pasted values (Phase 29, AI-14)
- AI-created themes with suggested values (Phase 29, AI-11)
- Natural language bulk edits / queries (Phase 29, AI-12/13)
- Streaming AI responses in-app

</domain>

<decisions>
## Implementation Decisions

### In-App Chat Tool Architecture

- **D-01:** The Anthropic SDK tool use (function calling) is added to `ClaudeProvider`. The `chat()` method signature extends to accept `tools` and handles multi-turn tool use internally: call API → if tool_use response → execute tool → append tool_result → call API again → return final text reply to caller.
- **D-02:** Tool handlers in the chat route execute by making **HTTP fetch calls to the app's own Next.js API** (e.g. `fetch('/api/collections/${collectionId}/themes/${themeId}/tokens', { method: 'PATCH', ... })`). No Mongoose models in the AI tool layer — AI-15 is satisfied.
- **D-03:** Server-to-server auth: the chat route's incoming `Request` headers include the user's session cookie. Tool handlers forward this cookie in their internal fetch calls. RBAC and collection-access checks apply to all AI tool calls — the AI cannot write to collections the user cannot access.
- **D-04:** The `/api/ai/chat` route request body is extended to accept `{ messages, collectionId, themeId }`. The active theme ID comes from the Tokens page and is passed as a prop to `AIChatPanel` → forwarded in chat requests.
- **D-05:** `AIChatPanel` gains an `activeThemeId?: string` prop. When `activeThemeId` is set, tool calls target the theme's tokens via `PATCH /api/collections/[id]/themes/[themeId]/tokens`. When absent (collection default / `__default__`), tools target the collection via `PUT /api/collections/[id]`.

### Full Collection Context in System Prompt

- **D-06:** Before each chat turn, the server fetches the current collection state (tokens + groups + active theme snapshot) and injects it into the system prompt. This gives the AI full knowledge of the existing token structure — it can reason about paths, values, group hierarchy, and naming conventions without needing explicit list/get tool calls first.
- **D-07:** Context includes: collection name, all token groups (as the full W3C token object), list of group paths, and (if theme active) the active theme's name and its token overrides.
- **D-08:** The system prompt guides the AI to: always confirm before deleting, use dot-notation paths for tokens, preserve the W3C token format (`$value` / `$type`), and describe what it's doing before calling tools.

### Tool Design for In-App Chat

- **D-09:** Tools are designed to support both **green-field** (create bulk tokens from scratch) and **brown-field** (focused edits within an existing group) workflows. Claude's discretion on exact tool signatures, but the set should cover: create_token, update_token, delete_token, create_group, rename_group, delete_group, and bulk_create_tokens (array of tokens in one call).
- **D-10:** For granular token writes, Phase 28 adds new API endpoints that match the MCP tool signatures: `POST /api/collections/[id]/tokens` (create one), `PATCH /api/collections/[id]/tokens` (update one by path), `DELETE /api/collections/[id]/tokens` (delete one by path). Group endpoints similarly. These wrap the same Mongoose logic as the existing bulk endpoints.

### Confirmation for Destructive Operations

- **D-11:** The AI must describe what it plans to do **before** calling any delete tool. It lists the tokens/groups to be deleted and asks "Shall I proceed?" Natural language in chat — no structured UI element. The AI waits for the user's next message and only calls the delete tool if the response is affirmative.
- **D-12:** Failed tool calls (404, 403, 422) surface as plain language in the AI's reply. The AI explains what went wrong and suggests alternatives. No separate error state in the panel — the chat message is the single source of truth.

### MCP Tool Completions

- **D-13:** `src/mcp/tools/groups.ts` gains: `rename_group` (moves all tokens under old path to new path using $rename or read-copy-delete pattern) and `delete_group` (removes the group object and all tokens within it using `$unset`).
- **D-14:** `src/mcp/tools/tokens.ts` gains: `bulk_create_tokens` — accepts `tokens: Array<{ path, value, type }>` and creates all of them in a single `$set` call. Useful for seeding whole groups from AI suggestions.
- **D-15:** A new `src/mcp/tools/generators.ts` module exposes token generator algorithms via MCP. Tools: `generate_color_scale(baseColor, steps, naming)` and `generate_dimension_scale(baseValue, ratio, steps, naming)` — these call `tokenGenerators.ts` functions and either return previews or optionally write to a collection if `collectionId` + `groupPath` are provided.
- **D-16:** `src/mcp/tools/themes.ts` (new): `list_themes(collectionId)`, `get_theme_tokens(collectionId, themeId)`. Read-only for Phase 28 — theme creation is Phase 29.

### Claude's Discretion

- Exact tool call signatures and JSON schemas for in-app tools (detailed parameter names, optionality)
- Whether `bulk_create_tokens` in-app uses a single API call or sequential individual calls
- System prompt wording and token context formatting
- Whether tool-use loop handles nested tool calls (unlikely for this domain, but possible)
- Base URL resolution for server-side fetch (env var vs relative URL vs `x-forwarded-host` header)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing AI Service Layer (Phase 26)
- `src/services/ai/provider.interface.ts` — Current AIProvider interface; tool use requires extending `ChatOptions` to support tools
- `src/services/ai/claude.provider.ts` — ClaudeProvider using Anthropic SDK; tool use loop goes here
- `src/services/ai/ai.service.ts` — AIService.chat() orchestration
- `src/app/api/ai/chat/route.ts` — Current chat route; needs collectionId/themeId params + tool execution

### Existing Chat UI
- `src/components/ai/AIChatPanel.tsx` — Current panel; needs `activeThemeId` prop and forwarding in chat requests

### Existing Token API Endpoints (to call from tool handlers)
- `src/app/api/collections/[id]/route.ts` — GET collection, PUT collection (tokens + graphState)
- `src/app/api/collections/[id]/themes/[themeId]/tokens/route.ts` — PATCH theme tokens (full array replace)
- `src/app/api/collections/[id]/themes/[themeId]/route.ts` — PUT theme (name, groups, graphState)

### MCP Server (to extend)
- `src/mcp/tools/tokens.ts` — Existing token tools (list, get, create, update, delete)
- `src/mcp/tools/groups.ts` — Existing group tools (list, create); needs rename + delete
- `src/mcp/server.ts` — Entry point; new tool modules must be registered here

### Token Generator System
- `src/lib/tokenGenerators.ts` — Generator algorithms (color scales, dimension scales); MCP generator tools call these functions
- `src/types/generator.types.ts` — GeneratorConfig type; inputs for MCP generator tools

### CLAUDE.md Project Context
- `CLAUDE.md` — API patterns, data model conventions, theme token routing rules (themeTokens vs onTokensChange)

### Roadmap
- `.planning/ROADMAP.md` §Phase 28 — Original success criteria and requirements

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ClaudeProvider` — Already uses Anthropic SDK; tool use is a natural extension of `messages.create()` with a `tools` param
- `requireRole(Action.Write, collectionId)` — Drop-in auth guard for all new token API endpoints
- `broadcastTokenUpdate(collectionId, themeId)` — Must be called after any token mutation via API endpoints (already in existing PATCH route)
- `tokenGenerators.ts` `generateColorTokens()` / `generateDimensionTokens()` — Functions MCP generator tools will call

### Established Patterns
- Tool use loop: `messages.create()` → if `stop_reason === 'tool_use'` → execute tools → append `tool_result` blocks → call again
- Auth: `requireRole(Action.Write, collectionId)` from `src/lib/auth/require-auth`
- MongoDB: `findByIdAndUpdate` with `$set` dot-notation for token path operations (pattern already in MCP tools)
- Service cookie forwarding: pass `cookie` header from the incoming Request to internal fetch calls

### Integration Points
- `AIChatPanel.tsx` → needs `activeThemeId` prop from the Tokens page (which already has `activeThemeId` state)
- `/api/ai/chat` route → receives `collectionId` + `themeId` → fetches collection for system prompt → creates tool definitions bound to that collection
- New granular token API endpoints connect to the same Mongoose models as existing bulk endpoints
- MCP `generators.ts` → imports `tokenGenerators.ts` directly (no HTTP hop needed for read-only generation)

</code_context>

<specifics>
## Specific Ideas

- **Full collection in system prompt**: The AI should see the entire token structure before the user even types. This enables the AI to answer questions ("what tokens are in the brand group?") without calling list tools first, and to understand the naming conventions in use.
- **Green-field vs brown-field**: For green-field (starting from scratch), the AI may generate an entire group structure in one message using `bulk_create_tokens`. For brown-field (editing an existing group), fine-grained `create_token` / `update_token` / `delete_token` tools are used.
- **MCP generator tools**: The user specifically wants to be able to ask Claude Desktop "generate a 10-step color scale for #0056D2" and have the result saved to a group. The MCP `generate_color_scale` tool covers this.
- **Theme tools in MCP (read-only)**: `list_themes` and `get_theme_tokens` let Claude Desktop explore which themes exist and what their token overrides are. Write operations on themes are Phase 29.

</specifics>

<deferred>
## Deferred Ideas

- **AI-created themes** (AI-11) — Phase 29. User mentioned "create new themes from collection" — this is out of Phase 28 scope.
- **Natural language queries and bulk edits** (AI-12, AI-13) — Phase 29.
- **AI-suggested token naming from pasted values** (AI-14) — Phase 29.
- **Write theme tools in MCP** — `create_theme`, `update_theme_tokens` via MCP. Phase 29 when theme-creation AI story is fully defined.
- **Streaming AI responses** — Out of scope for all phases currently planned; would require SSE changes to `/api/ai/chat`.

</deferred>

---

*Phase: 28-ai-tool-use-token-and-group-crud*
*Context gathered: 2026-04-04*
