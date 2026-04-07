# Phase 26: Discussion Log

**Date:** 2026-04-03
**Phase:** 26 — AI Service Layer Foundation

---

## Areas Selected

All four presented areas were selected, plus a significant scope pivot to MCP-first emerged during discussion.

---

## Provider Interface Shape

**Q: What should the core AIProvider interface expose?**
→ `chat(messages, options) → string` — single method, full string response. Streaming deferred to Phase 27.

**Q: Where does the AIProvider interface live?**
→ `src/services/ai/` — matches roadmap success criteria exactly.

**Q: How should the Claude model name be configured?**
→ `ANTHROPIC_MODEL` env var with `'claude-sonnet-4-6'` fallback.

**Q: Should the interface accept a system prompt?**
→ Yes — `options.systemPrompt?` in `chat()`. Needed for Phase 28 tool use context.

---

## API Key Storage & Encryption

**Q: Where should the encrypted API key live in MongoDB?**
→ Field on the existing User model (`encryptedApiKey` + `apiKeyIv`) — not a separate UserSettings model.

**Q: Where does the AES-256 encryption key come from?**
→ `ENCRYPTION_KEY` env var (32-byte hex). Fails loud if missing.

**Q: What's the API surface for saving/retrieving the key?**
→ `PUT /api/user/settings` with `{ apiKey }`. Route encrypts server-side, never returns key in response.

**Q: Should saving an empty string delete the stored key?**
→ Yes — `{ apiKey: '' }` removes the encrypted fields.

**Q: Since you're only running self-hosted, how much of the per-user key storage should Phase 26 build?**
→ Build it fully — even though SELF_HOSTED=true at runtime, the code is built for future use.

---

## SELF_HOSTED Bypass Mechanics

**Q: When SELF_HOSTED=true, where does the default API key come from?**
→ `ANTHROPIC_API_KEY` env var (standard Anthropic SDK convention).

**Q: When SELF_HOSTED=true and a user has a stored key, which wins?**
→ Server key always wins. Per-user keys are ignored when SELF_HOSTED=true.

**User note:** "note that we only have self hosted" — this is always true in this deployment.

---

## Scope Pivot: MCP-First

**User question (mid-discussion):** "can i ask is it possible to just give Claude access to the manager with Claude or another LLM"

This surfaced the MCP architecture as an alternative to the embedded chat panel. After discussion:

**Q: How should AI interact with the tokens manager?**
→ **Both — but start with MCP so we can refine before committing to a chat UI.**

**Q: What should the MCP server expose in Phase 26?**
→ CRUD tools for tokens + groups. Everything else (themes, export, etc.) in follow-up phases.
User note: "add more documentation to this, I want to treat it as a lesson, this will be very valuable to me if I understand how it works."

**Q: Where does the MCP server live architecturally?**
→ Standalone Node.js server alongside Next.js (`src/mcp/server.ts`).

**Q: How does the MCP server authenticate with the tokens manager API?**
→ Direct MongoDB access via existing Mongoose models — no HTTP round-trip to Next.js.

**Q: How should documentation be structured?**
→ Both inline comments (explaining MCP concepts as they appear) AND `documentation/mcp-architecture.md` (big picture).

**Q: How should users connect Claude Desktop to this MCP server?**
→ stdio transport + config snippets for **both** Claude Desktop and Claude Code (CLI).

---

## POST /api/ai/chat Contract

**Q: What should the request body shape be?**
→ `{ messages: [{role, content}] }` — standard messages array for conversation history.

**Q: What should the response shape be?**
→ `{ reply: string }` — buffered JSON, not streaming.

**Q: What auth guard?**
→ `requireAuth()` — any signed-in user.

**Q: What error when no API key?**
→ `402` with `{ error: 'API key not configured' }`.
