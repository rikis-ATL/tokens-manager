# Phase 26: AI Service Layer Foundation - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 26 delivers a working MCP (Model Context Protocol) server that exposes CRUD tools for tokens and groups in the tokens manager. Claude Desktop and Claude Code (CLI) can connect to this server locally via stdio transport, enabling AI-assisted token management through natural language — without any in-app chat UI.

This is the foundation for the AI integration story: build the MCP server first, iterate on AI interactions in Claude Desktop, and commit to a chat UI in a later phase only after the tool surface is refined.

**What this phase does NOT include:**
- In-app chat panel UI (Phase 27+)
- Themes, export, or import tools (follow-up phase)
- Per-user API key storage via the app UI (Phase 27+)
- Streaming AI responses in-app

</domain>

<decisions>
## Implementation Decisions

### MCP Server Architecture

- **D-01:** MCP server lives at `src/mcp/server.ts` as a standalone Node.js entry point that runs alongside (not inside) the Next.js app. It uses the **stdio transport** — the standard MCP transport for local tool servers connecting to Claude Desktop and Claude Code.
- **D-02:** The MCP server accesses MongoDB **directly via the existing Mongoose models and services** (e.g., `TokenCollection`, `tokenService`) — no HTTP round-trip to the Next.js API. This means it shares the same `MONGODB_URI` env var and the same data layer as the app. No auth tokens or running Next.js instance required.
- **D-03:** Transport is **stdio** (`StdioServerTransport` from the MCP SDK). This works for both Claude Desktop and Claude Code (CLI). Configuration snippets for both will be documented in `documentation/mcp-architecture.md`.

### MCP Tool Set (Phase 26 Scope)

- **D-04:** Phase 26 exposes **CRUD tools for tokens and groups only**. Themes, export, naming suggestions, and bulk operations are deferred to follow-up phases.
- **D-05:** Tools to implement:
  - `list_collections` — list all token collections (needed to scope subsequent calls)
  - `list_groups` — list token groups in a collection
  - `list_tokens` — list tokens in a group (or all groups)
  - `get_token` — get a specific token by path
  - `create_token` — create a new token in a group
  - `update_token` — update a token's value or type
  - `delete_token` — delete a token by path
  - `create_group` — create a new token group
- **D-06:** Each tool has a **JSON Schema for its input parameters** (required by MCP). This schema is what Claude uses to call the tool correctly — it's the contract between AI and code.

### Documentation Style

- **D-07:** Documentation is **both inline comments AND a dedicated architecture doc** at `documentation/mcp-architecture.md`. The inline comments explain MCP concepts as they appear in code (what a "tool" is, what JSON schema does, why stdio, etc.). The architecture doc explains the big picture: what MCP is, how Claude Desktop connects, the request/response lifecycle, how to add new tools, and config snippets for both Claude Desktop and Claude Code.
- **D-08:** The goal is **educational** — this codebase should be a reference for how to build an MCP server. Comments and docs should be written assuming the reader is learning MCP for the first time.

### AI Provider Interface (for future phases)

- **D-09:** Even though Phase 26 doesn't embed Claude in the app, the `src/services/ai/` module should be scaffolded with a provider interface and a Claude implementation using the Anthropic SDK. This is required by the roadmap success criteria and will be consumed by Phase 27 (embedded chat UI). The Phase 26 MCP server does NOT call this service — Claude Desktop brings its own AI.
- **D-10:** Model is configured via `ANTHROPIC_MODEL` env var, defaulting to `'claude-sonnet-4-6'` if unset.
- **D-11:** Provider interface: `AIProvider.chat(messages: Message[], options?: { systemPrompt?: string }): Promise<string>` — single method returning a full string. Streaming is a Phase 27+ concern.

### API Key Storage (for future phases)

- **D-12:** Per-user API key storage is also scaffolded in Phase 26 (encrypted field on the **User model**, not a separate UserSettings model). Field names: `encryptedApiKey` + `apiKeyIv` on the User document.
- **D-13:** Encryption key comes from `ENCRYPTION_KEY` env var (32-byte hex string). Fails loudly at startup if missing when per-user key features are used.
- **D-14:** Save/clear API key via `PUT /api/user/settings` with `{ apiKey: string }`. Empty string deletes the stored key.
- **D-15:** **SELF_HOSTED=true** (always true in this deployment) → server reads `ANTHROPIC_API_KEY` env var as the built-in key. Per-user key storage is skipped at runtime. Server key always wins — per-user keys (if stored) are ignored when SELF_HOSTED=true.

### POST /api/ai/chat (for future phases)

- **D-16:** Route scaffolded in Phase 26 but primarily consumed by Phase 27. Request: `{ messages: [{role: 'user'|'assistant', content: string}] }`. Response: `{ reply: string }` (buffered, not streamed).
- **D-17:** Auth guard: `requireAuth()` — any signed-in user can call the AI.
- **D-18:** Error when no key available: `402` with `{ error: 'API key not configured' }`.

### Claude's Discretion

- Tool error handling (e.g., collection not found, invalid token path) — Claude picks appropriate error response format per MCP spec.
- Mongoose connection management in the MCP server process — Claude handles connection lifecycle (connect on start, close on exit).
- Whether tools accept collection ID or collection name for lookup — Claude picks the more ergonomic option for conversational AI use.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap
- `.planning/ROADMAP.md` §Phase 26 — Original success criteria (note: scope has pivoted to MCP-first; criteria 1-4 are still implemented but MCP server is the primary deliverable)

### Existing Services and Models
- `src/services/github.service.ts` — Service class pattern to follow for `src/services/ai/`
- `src/services/index.ts` — Barrel export pattern
- `src/lib/db/models/User.ts` — User model to extend with `encryptedApiKey` / `apiKeyIv` fields
- `src/lib/db/models/TokenCollection.ts` — Primary data model the MCP tools will query
- `src/lib/auth/` — `requireAuth()` guard pattern used by the chat route

### Auth Patterns
- `.planning/STATE.md` §Decisions — Phase 18 auth pattern: `requireAuth()` on all write routes; `getServerSession(authOptions)` single-arg form for App Router

### MCP (to research)
- MCP TypeScript SDK: `@modelcontextprotocol/sdk` — researcher should fetch current docs and examples
- Claude Desktop config format: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Claude Code MCP config: `.claude/settings.json` `mcpServers` key

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/services/github.service.ts` / `figma.service.ts` — Pattern for `AIService` class: named class + singleton export + barrel re-export from `index.ts`
- `src/lib/db/models/` — All Mongoose models. `TokenCollection.ts` is what MCP tools will query for tokens and groups.
- `src/lib/auth/permissions.ts` + `requireAuth()` — Drop-in guard for the `/api/ai/chat` route
- `src/lib/mongodb.ts` — Existing Mongoose connection module. MCP server can import this to connect.

### Established Patterns
- Services: named class with methods, singleton instance exported, re-exported from `services/index.ts`
- Models: `(mongoose.models.X as Model<T>) || mongoose.model<T>('X', schema)` guard for hot-reload safety
- Auth: `requireAuth()` from `src/lib/auth/` wraps route handlers; returns 401 on unauthenticated requests
- Env vars: checked at call time, not at module load (except secrets that should fail loud)

### Integration Points
- MCP server connects to MongoDB via `src/lib/mongodb.ts` — same connection string as Next.js app
- `PUT /api/user/settings` → new route under `src/app/api/user/settings/route.ts`
- `POST /api/ai/chat` → new route under `src/app/api/ai/chat/route.ts`
- `src/services/ai/` → new directory: `provider.interface.ts`, `claude.provider.ts`, `ai.service.ts`, `index.ts`
- `src/mcp/` → new directory: `server.ts`, `tools/tokens.ts`, `tools/groups.ts`

</code_context>

<specifics>
## Specific Ideas

- **MCP as a learning artifact**: The code should read like a tutorial. Every non-obvious concept (tools, schemas, stdio transport, the MCP handshake) gets a comment explaining the why, not just the what.
- **Both Claude Desktop and Claude Code (CLI)**: `documentation/mcp-architecture.md` must include working config snippets for both clients. The user wants to connect from both environments.
- **MCP-first iteration strategy**: The intent is to use Claude Desktop to interact with real token data, discover what tool shapes work well, and *then* commit to a chat UI. Phase 26 is the research vehicle for Phases 27-29.

</specifics>

<deferred>
## Deferred Ideas

- Themes tools (list_themes, create_theme, etc.) — follow-up MCP phase after Phase 26
- Export tools (trigger export, download formats) — follow-up MCP phase
- AI naming suggestions / bulk natural language edits — Phase 29 territory
- In-app chat panel UI — Phase 27 (after MCP iteration proves the tool surface)
- Streaming responses in-app — Phase 27+
- Per-user model selection — not needed; SELF_HOSTED means one org-wide key and model

</deferred>

---

*Phase: 26-ai-service-layer-foundation*
*Context gathered: 2026-04-03*
