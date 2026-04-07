---
phase: 26-ai-service-layer-foundation
verified: 2026-04-03T00:00:00Z
status: passed
score: 4/4 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Confirm encrypted key round-trip works at runtime"
    expected: "PUT /api/user/settings stores key, POST /api/ai/chat decrypts it and gets a reply from Claude"
    why_human: "Requires live MongoDB instance, ENCRYPTION_KEY, and ANTHROPIC_API_KEY env vars — cannot verify programmatically in CI"
  - test: "Confirm SELF_HOSTED=true bypasses user key lookup"
    expected: "POST /api/ai/chat responds with a valid reply using the server ANTHROPIC_API_KEY without a User DB read"
    why_human: "Requires running server with SELF_HOSTED=true configured"
  - test: "Confirm MCP server connects and tools respond via Claude Desktop"
    expected: "Claude Desktop shows atui-tokens-manager server in MCP client list; list_collections returns collection names"
    why_human: "Requires Claude Desktop installed, mongodb running, and absolute path substitution in claude_desktop_config.json"
---

# Phase 26: AI Service Layer Foundation — Verification Report

**Phase Goal:** Provider-agnostic AI service is in place — Claude (Anthropic SDK) is wired as the first provider, per-user API keys are stored encrypted in MongoDB, and all AI calls route through a server-side service with zero browser exposure
**Verified:** 2026-04-03
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `src/services/ai/` module exists with a provider interface and a Claude implementation; swapping providers requires only a new implementation file | VERIFIED | `provider.interface.ts` exports `AIProvider`, `Message`, `ChatOptions`; `claude.provider.ts` implements `AIProvider`; `ai.service.ts` calls `new ClaudeProvider(key)` — swapping requires only a new class |
| 2 | Per-user API key is AES-256 encrypted in MongoDB on User document (`encryptedApiKey` + `apiKeyIv`); plaintext key never returned in any API response | VERIFIED | `encryption.ts` uses `aes-256-gcm` with `getAuthTag()`; User model has both fields; `settings/route.ts` stores encrypted values and never calls `decrypt()`; no `decrypt` import in that file |
| 3 | `POST /api/ai/chat` calls AI service server-side using the authenticated user's decrypted key; no AI SDK code in any Client Component | VERIFIED | `chat/route.ts` imports `aiService` from `@/services/ai`, not Anthropic SDK; `requireAuth()` guard at top; no `@anthropic-ai` import anywhere outside `src/services/ai/claude.provider.ts` |
| 4 | `SELF_HOSTED=true` bypass: built-in default key used, per-user key storage skipped | VERIFIED | `ai.service.ts` checks `process.env.SELF_HOSTED === "true"` first in `getProvider()`; `chat/route.ts` skips User DB lookup entirely when `SELF_HOSTED !== "true"` is false |

**Score:** 4/4 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/services/ai/provider.interface.ts` | AIProvider interface, Message type, ChatOptions type | VERIFIED | All three interfaces exported; `chat()` method signature correct |
| `src/services/ai/claude.provider.ts` | ClaudeProvider implementing AIProvider | VERIFIED | `implements AIProvider`; uses `new Anthropic({ apiKey })`; `max_tokens` required param present |
| `src/services/ai/ai.service.ts` | AIService with SELF_HOSTED key resolution + singleton | VERIFIED | `SELF_HOSTED` check, `new ClaudeProvider`, `export const aiService` all present |
| `src/services/ai/index.ts` | Barrel exports | VERIFIED | Exports `AIService`, `aiService`, `ClaudeProvider`, and type-only `AIProvider`, `Message`, `ChatOptions` |
| `src/lib/ai/encryption.ts` | `encrypt()` and `decrypt()` for API key storage | VERIFIED | AES-256-GCM, `ENCRYPTION_KEY` env validation, `getAuthTag()` present; auth tag appended to ciphertext |
| `src/lib/db/models/User.ts` | `encryptedApiKey` and `apiKeyIv` fields | VERIFIED | Both fields present in `IUser` interface and Mongoose schema with `default: undefined` |
| `src/app/api/user/settings/route.ts` | PUT handler for encrypted key save/clear | VERIFIED | `requireAuth()`, `encrypt(apiKey)`, `$unset` on empty, never imports `decrypt` |
| `src/app/api/ai/chat/route.ts` | POST handler for AI chat proxy | VERIFIED | `requireAuth()`, `aiService.chat`, `{ reply }` response, 402 on no key, SELF_HOSTED dual-gate, no Anthropic SDK import |
| `src/mcp/server.ts` | MCP server entry point with StdioServerTransport | VERIFIED | `McpServer`, `StdioServerTransport`, `dbConnect()`, `registerTokenTools`, `registerGroupTools`, graceful shutdown, no `console.log()` |
| `src/mcp/tools/tokens.ts` | 6 token CRUD tools | VERIFIED | `list_collections`, `list_tokens`, `get_token`, `create_token`, `update_token`, `delete_token` all registered with Zod schemas; `export function registerTokenTools` |
| `src/mcp/tools/groups.ts` | 2 group tools | VERIFIED | `list_groups`, `create_group` with `export function registerGroupTools`; Zod schemas; educational comments |
| `documentation/mcp-architecture.md` | MCP architecture doc with config snippets | VERIFIED | 267 lines; contains `## What is MCP`, `## Claude Desktop Setup`, `## Claude Code Setup`, `## Adding New Tools`, `claude_desktop_config.json`, `.claude/settings.json`, `StdioServerTransport`, `mcp:dev`, `console.error` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `claude.provider.ts` | `provider.interface.ts` | `implements AIProvider` | WIRED | Line 7: `export class ClaudeProvider implements AIProvider` |
| `ai.service.ts` | `claude.provider.ts` | `new ClaudeProvider(apiKey)` | WIRED | Lines 10 and 14: two call sites in `getProvider()` |
| `ai.service.ts` | `encryption.ts` | `decrypt(encryptedKey, iv)` | WIRED | Line 2 import; line 14 `decrypt(userEncryptedKey, userIv)` |
| `settings/route.ts` | `encryption.ts` | `encrypt(apiKey)` | WIRED | Line 5 import; line 27 `encrypt(apiKey)` |
| `chat/route.ts` | `ai.service.ts` | `aiService.chat(messages)` | WIRED | Line 5 import; line 41 `aiService.chat(messages, ...)` |
| `chat/route.ts` | `User.ts` | `User.findById` for encrypted key | WIRED | Lines 4 and 33: `User.findById(authResult.user.id).select("encryptedApiKey apiKeyIv").lean()` |
| `mcp/server.ts` | `mongodb.ts` | `dbConnect()` on startup | WIRED | Lines 19 and 44: import and call inside `main()` |
| `mcp/tools/tokens.ts` | `TokenCollection.ts` | TokenCollection model queries | WIRED | Line 20 import; used in every tool handler |
| `mcp/server.ts` | `mcp/tools/tokens.ts` | `registerTokenTools(server)` | WIRED | Lines 26 and 38 |
| `mcp/server.ts` | `mcp/tools/groups.ts` | `registerGroupTools(server)` | WIRED | Lines 27 and 39 |
| `services/index.ts` | `services/ai/index.ts` | barrel re-export | WIRED | `export { AIService, aiService } from './ai/'` |
| `documentation/mcp-architecture.md` | `src/mcp/server.ts` | references entry point | WIRED | Line 17 and multiple config snippets reference `src/mcp/server.ts` |

---

### Data-Flow Trace (Level 4)

The AI service layer is not a data-rendering component — it is a server-side service that proxies requests. Level 4 data-flow tracing applies to the API routes, not UI components. The relevant traces:

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `chat/route.ts` | `user.encryptedApiKey` | `User.findById().select("encryptedApiKey apiKeyIv").lean()` | Yes — MongoDB query | FLOWING |
| `chat/route.ts` | `reply` | `aiService.chat(messages)` delegates to `ClaudeProvider.chat()` → Anthropic SDK | Yes — live API call | FLOWING |
| `settings/route.ts` | `encryptedApiKey` | `encrypt(apiKey)` from request body → `User.updateOne($set)` | Yes — AES-256-GCM encrypted, persisted to MongoDB | FLOWING |
| `mcp/tools/tokens.ts` | `collections` | `TokenCollection.find({}, "name description _id").lean()` | Yes — real DB query | FLOWING |

---

### Behavioral Spot-Checks

Server startup requires MongoDB and AI API keys — live server tests are not feasible here. Module-level checks performed instead:

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| `provider.interface.ts` exports contract | File exists, `AIProvider`, `Message`, `ChatOptions` present | Found all three | PASS |
| `ClaudeProvider` implements interface | `implements AIProvider` in class declaration | Confirmed line 7 | PASS |
| `AIService.getProvider()` checks SELF_HOSTED first | `process.env.SELF_HOSTED === "true"` is first branch in `getProvider()` | Confirmed lines 7–11 | PASS |
| `encrypt()` produces `{ encrypted, iv }` tuple | Return statement present in `encryption.ts` | Confirmed lines 26–29 | PASS |
| `chat/route.ts` has no Anthropic SDK import | `grep @anthropic-ai` in route file | Zero matches | PASS |
| `settings/route.ts` has no `decrypt` import | `grep decrypt` in route file | Zero matches | PASS |
| `console.log()` absent from all MCP source files | `grep console.log(` across `src/mcp/` | Only one match in a JSDoc comment (not runtime code) | PASS |
| All 8 MCP tools registered | List in `tokens.ts` (6) and `groups.ts` (2) | All 8 present with Zod schemas | PASS |
| `mcp:dev` script in package.json | `grep mcp:dev package.json` | Present with correct tsx + tsconfig flags | PASS |
| All three packages installed | `package.json` dependencies | `@anthropic-ai/sdk ^0.82.0`, `@modelcontextprotocol/sdk ^1.29.0`, `zod ^3.23` | PASS |
| All phase commits present in git log | `git log --oneline` | 0d2a6d9, bb04444, caa5f7e, d13d748, f6643cf, 86a80ce, ed9d721 all confirmed | PASS |

---

### Requirements Coverage

The requirement IDs AI-02, AI-03, AI-04 are defined in `.planning/PROJECT.md` and `.planning/ROADMAP.md`, not in `REQUIREMENTS.md`. The `REQUIREMENTS.md` file covers v1.5 (AUTH/USER/PERM/UI/ARCH) and v1.6 (TENANT/BILLING/STRIPE) milestones only. The AI requirements belong to a future milestone and are tracked exclusively in ROADMAP.md and PROJECT.md. This is not a gap — it is an intentional scoping of REQUIREMENTS.md to released milestones.

| Requirement | Source | Description | Status | Evidence |
|-------------|--------|-------------|--------|----------|
| AI-02 | PROJECT.md | User enters API key; stored encrypted in MongoDB | SATISFIED | `encryption.ts` (AES-256-GCM), User model fields, `settings/route.ts` stores encrypted key, never returns plaintext |
| AI-03 | PROJECT.md | All AI calls server-side; key never exposed to browser | SATISFIED | `chat/route.ts` delegates to `aiService`, no Anthropic SDK in any Client Component; `requireAuth()` guards all AI routes |
| AI-04 | PROJECT.md | AI service is provider-agnostic; Claude is initial provider | SATISFIED | `AIProvider` interface in `provider.interface.ts`; `ClaudeProvider` is one implementation; `AIService` injects via interface; swapping requires only a new class file |

**Orphaned requirements:** None. All three AI requirements claimed by Phase 26 plans are accounted for.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | No TODO/FIXME/placeholder comments found in any phase 26 file | — | — |
| None | — | No empty return stubs (`return null`, `return []`, `return {}`) found | — | — |
| None | — | No hardcoded empty state flowing to rendering found | — | — |

All implementations are substantive. The only `console.log` match in `src/mcp/` is inside a JSDoc comment (`* CRITICAL: Never use console.log()`), not runtime code.

---

### Human Verification Required

#### 1. Encrypted API Key Round-Trip

**Test:** Set `ENCRYPTION_KEY` and `ANTHROPIC_API_KEY` in `.env.local`, start the Next.js dev server, sign in, PUT a key to `/api/user/settings`, verify MongoDB shows `encryptedApiKey` + `apiKeyIv` on the User document (not plaintext), then POST to `/api/ai/chat` with a simple message and confirm a non-empty `reply`.
**Expected:** MongoDB stores hex-encoded ciphertext; `/api/ai/chat` returns `{ reply: "..." }` with real text from Claude.
**Why human:** Requires live MongoDB, valid Anthropic API key, and running Next.js server.

#### 2. SELF_HOSTED=true Bypass

**Test:** Set `SELF_HOSTED=true` in `.env.local`, POST to `/api/ai/chat` for a user with no `encryptedApiKey` on their document.
**Expected:** Request succeeds (no 402); reply contains real text from Claude using the server key; no DB query for encrypted key is performed.
**Why human:** Requires live environment with env var toggling.

#### 3. MCP Server via Claude Desktop

**Test:** Copy the Claude Desktop config snippet from `documentation/mcp-architecture.md` into `~/Library/Application Support/Claude/claude_desktop_config.json` (substituting actual project path), restart Claude Desktop, open a conversation, ask "list my token collections".
**Expected:** Claude calls `list_collections` and returns real collection names from MongoDB.
**Why human:** Requires Claude Desktop, local MongoDB, and manual path substitution.

#### Status (2026-04-04)

These three checks are **optional hardening** (live MongoDB, env toggles, Claude Desktop). They do **not** change the phase **passed** sign-off from 2026-04-03. Re-run them after material changes to `settings/route.ts`, `chat/route.ts`, `ai.service.ts`, or `src/mcp/`.

---

### Gaps Summary

No gaps. All four success criteria from ROADMAP.md are fully implemented:

1. **Provider interface + Claude implementation** — `src/services/ai/` contains the `AIProvider` interface, `ClaudeProvider` implementation, and `AIService` singleton. Swapping providers requires only adding a new `*.provider.ts` file.

2. **AES-256-GCM encrypted keys in MongoDB** — `encryption.ts` implements GCM with auth tag; User model has both fields; `PUT /api/user/settings` stores encrypted values; plaintext is never returned in any response.

3. **Server-side AI calls, zero client exposure** — `POST /api/ai/chat` calls `aiService` (not Anthropic SDK directly); no `@anthropic-ai` import appears outside `claude.provider.ts`.

4. **SELF_HOSTED=true bypass** — dual-gate: route skips DB lookup entirely; AIService uses `ANTHROPIC_API_KEY` from env.

The MCP server (Plans 26-03 and 26-04) is fully implemented as a bonus deliverable: 8 tools, stdio transport, MongoDB-direct, no `console.log()`, with educational documentation at `documentation/mcp-architecture.md`.

---

_Verified: 2026-04-03_
_Verifier: Claude (gsd-verifier)_
