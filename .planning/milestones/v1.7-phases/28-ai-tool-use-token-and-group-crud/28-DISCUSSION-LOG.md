# Phase 28: AI Tool Use — Token and Group CRUD - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 28-ai-tool-use-token-and-group-crud
**Areas discussed:** Token/group API granularity, Tool routing mechanism, Theme awareness, Confirmation UX for destructive ops, MCP extensions

---

## Token/Group API Granularity

| Option | Description | Selected |
|--------|-------------|----------|
| Add new granular endpoints | New routes per token op (POST/PATCH/DELETE /api/collections/[id]/tokens). Clean API, matches MCP signatures. | ✓ |
| Read-modify-write with existing bulk endpoint | GET full array, mutate in memory, PATCH back. No new routes, but race-condition risk. | |

**User's choice:** "We need to use the most flexible approach. We want to prompt with full collection context."
**Notes:** User's primary concern is full collection context in the AI's system prompt. The tool granularity follows from that: both bulk (green-field) and focused (brown-field) operations needed. New granular endpoints are added to support both.

---

## Tool Design for Bulk vs Focused

| Option | Description | Selected |
|--------|-------------|----------|
| Tools operate on full tokens array | AI calls one tool with modified array. Consistent with bulk endpoint. | |
| Granular per-operation tools | createToken, updateToken, deleteToken — fine-grained. More tools to build. | ✓ |
| Claude's discretion | Claude picks best approach. | |

**User's choice:** "Users will likely be focused on green fields — creating bulk tokens, or brown fields — focused on a group. Use whatever approach works best for both."
**Notes:** Both patterns supported. Claude picks tool granularity that serves both use cases.

---

## Tool Routing Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| HTTP fetch to own Next.js API | Tool handler calls fetch to localhost API. True routing through auth/validation/WebSocket. | ✓ |
| Call shared service functions directly | Import same functions API routes use. No HTTP hop. Faster but bypasses auth guards. | |

**User's choice:** HTTP fetch to own Next.js API (Recommended)
**Notes:** Explicitly satisfies AI-15 (no direct DB writes in AI layer). Auth forwarded via session cookie.

---

## Auth for Server-to-Server Calls

| Option | Description | Selected |
|--------|-------------|----------|
| Forward user's session cookie | Real user permissions; RBAC applies to AI tool calls. | ✓ |
| Internal secret / service token | Simpler, but skips user-level RBAC. | |

**User's choice:** Forward the user's session cookie (Recommended)
**Notes:** AI tools run with the actual user's permission level. Collection access controls enforced.

---

## Theme Awareness

| Option | Description | Selected |
|--------|-------------|----------|
| Active theme (Recommended) | AIChatPanel gets activeThemeId prop. Tools target active theme tokens. | ✓ |
| Always collection default | Tools always write to collection regardless of active theme. | |
| AI decides based on context | AI reasons about where to write. | |

**User's choice:** Active theme, but they may also request to create new themes from the collection.
**Notes:** Active theme is the write target. Creating new themes deferred to Phase 29 (AI-11 scope).

---

## Confirmation UX for Destructive Ops

| Option | Description | Selected |
|--------|-------------|----------|
| Natural language in chat (Recommended) | AI describes plan, asks "Confirm?", user replies yes/no, then AI executes. | ✓ |
| Only on bulk/risky ops | Single deletes immediate; bulk requires confirmation. | |

**User's choice:** Natural language in chat (Recommended)
**Notes:** Purely conversational — no structured UI element. The AI's reply IS the confirmation prompt.

---

## Error Surface

| Option | Description | Selected |
|--------|-------------|----------|
| Inline in the AI reply (Recommended) | AI explains what went wrong in plain language. | ✓ |
| Separate error state in panel | Distinct error banner alongside AI reply. | |

**User's choice:** Inline in the AI reply (Recommended)

---

## MCP Tool Completions

**User note:** "We need to extend the MCP tools to cover all actions, ideally bulk actions and generators."

| Option | Selected |
|--------|----------|
| Bulk token operations (create_tokens with array) | ✓ |
| Complete group CRUD (rename_group, delete_group) | ✓ |
| Token generator support (algorithmic color/dimension scales) | ✓ |
| Theme tools in MCP (list_themes, get_theme_tokens — read-only) | ✓ |

**Notes:** All four MCP extensions included in Phase 28 scope.

---

## Claude's Discretion

- Exact tool signatures and JSON schemas for in-app Anthropic SDK tools
- Whether bulk_create_tokens in-app uses single API call or sequential individual calls
- System prompt wording and token context formatting
- Base URL resolution for server-side fetch (env var vs relative URL)

## Deferred Ideas

- AI-created themes via MCP (write theme tools) — Phase 29
- Natural language bulk edits and queries — Phase 29 (AI-12/13)
- AI-suggested token naming — Phase 29 (AI-14)
- Streaming responses — out of scope for all current phases
