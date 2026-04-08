# Phase 30: AI-Assisted Naming and Queries - Research

**Researched:** 2026-04-08
**Domain:** AI tool extensions — natural language token queries, bulk rename tool, theme creation tool, granular theme token CRUD, canonical naming suggestions
**Confidence:** HIGH (all findings are codebase-verified or confirmed from locked decisions in CONTEXT.md)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**AI-12: Natural Language Queries**
- D-01: No new tools needed. Full collection token data is already in system prompt. AI reads JSON it already has.
- D-02: Bug fix: `buildCollectionContext()` in `src/app/api/ai/chat/route.ts` — when `themeId` is set and not `__default__`, inject active theme's tokens instead of `collection.tokens`.
- D-03: Update system prompt to explicitly guide AI that it can answer read-only queries about current token state.

**AI-13: Bulk Rename via rename_prefix Tool**
- D-04: New tool: `rename_prefix(groupPath, oldPrefix, newPrefix)` — renames token paths within a group by substituting prefix. Mirrors existing multi-row "rename prefix" UI action.
- D-05: New API endpoint: `PATCH /api/collections/[id]/tokens/rename-prefix` accepts `{ groupPath, oldPrefix, newPrefix }`, performs rename using same logic as multi-row bulk action, broadcasts via `broadcastTokenUpdate`.
- D-06: Theme-aware variant: when `themeId` is set, rename applies to theme tokens, not collection default.

**AI-11: Theme Creation + Granular Theme Token Tools**
- D-07: New tool: `create_theme(name, colorMode)` — calls `POST /api/collections/[id]/themes`. Returns new `themeId`.
- D-08: New tools: `update_theme_token(themeId, tokenPath, value, type?)` and `delete_theme_token(themeId, tokenPath)`. Back granular `PATCH` and `DELETE` endpoints at `/api/collections/[id]/themes/[themeId]/tokens/single`.
- D-09: Theme creation flow: AI calls `create_theme` → receives `themeId` → reads collection tokens from system prompt → calls `update_theme_token` for suggested overrides. AI describes suggestions before calling any tools.

**AI-14: Canonical Naming Suggestions**
- D-10: Two-step flow: (1) user pastes raw values → AI replies with suggested names as formatted text; (2) user confirms → AI calls `bulk_create_tokens`. No accidental writes on first pass.
- D-11: System prompt guides AI to recognize pasted token values and respond with naming suggestions rather than silently applying.

**AIChatPanel UX Updates**
- D-12: Update empty state message and input placeholder in `AIChatPanel.tsx` to hint at: queries, bulk edits, theme creation, naming suggestions.
- D-13: No structural changes to chat panel — only text content updates.

### Claude's Discretion
- Exact wording of system prompt additions for query and naming guidance
- Whether `rename_prefix` confirms before executing (suggested: yes, per existing D-11 pattern)
- Exact parameter naming for new API endpoints
- Whether to add a `bulk_move_tokens` tool in this phase or defer to Phase 32

### Deferred Ideas (OUT OF SCOPE)
- `bulk_move_tokens` tool for reparenting tokens to another parent group
- Streaming AI responses
- MCP `create_theme` / `update_theme` tools (Phase 32 scope)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AI-11 | AI agent can create a new theme and populate it with AI-suggested token values via tool use | D-07/D-08/D-09 confirmed via existing POST /themes endpoint + ITheme model. Tool sequence: create_theme → update_theme_token × N |
| AI-12 | User can query tokens in natural language and receive a correct result | D-01/D-02/D-03 — system prompt already has token JSON; bug fix injects active theme tokens when themeId != __default__ |
| AI-13 | User can request a natural language bulk edit and tokens table updates | D-04/D-05/D-06 — new rename_prefix tool + PATCH endpoint backed by existing bulkAddPrefix/bulkRemovePrefix logic |
| AI-14 | User can paste token values and receive AI-suggested canonical names | D-10/D-11 — two-step chat flow; AI uses bulk_create_tokens (already implemented) on confirmation |
</phase_requirements>

---

## Summary

Phase 30 extends the existing AI chat panel (Phases 26–29) with four targeted capabilities. The implementation is almost entirely additive — new tool definitions, new API endpoints, fixes to the system prompt builder, and a one-line UX text update. No new libraries are required. The existing tool execution architecture (`executeToolCall` switch in `tools.ts`, HTTP tool calls with forwarded cookie headers) handles all new tools using the same patterns established in Phase 28.

The most structurally novel work is the `rename_prefix` tool (AI-13). The pure rename logic already exists in `bulkTokenActions.ts` (`bulkAddPrefix`, `bulkRemovePrefix`) but is currently only consumed client-side by the token table. This phase exposes it via a new server-side API endpoint (`PATCH /tokens/rename-prefix`) that applies the same logic to the persisted W3C token object and then broadcasts the update. The endpoint must be theme-aware (D-06).

For AI-11, the `create_theme` tool target (`POST /api/collections/[id]/themes`) already exists and is fully functional. The new work is the `update_theme_token` and `delete_theme_token` tools, backed by a new granular single-token endpoint at `/themes/[themeId]/tokens/single` — distinct from the existing full-array `PATCH /themes/[themeId]/tokens`.

**Primary recommendation:** Implement in four distinct work units that can be independently verified: (1) AI-12 system prompt fix, (2) AI-13 rename_prefix endpoint + tool, (3) AI-11 theme tools + single-token endpoint, (4) AI-14 system prompt guidance + AIChatPanel text update.

---

## Standard Stack

### Core (already installed — no new packages)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `@anthropic-ai/sdk` | ^0.82.0 | Anthropic tool use loop | Already installed [VERIFIED: package.json] |
| `next` | 13.5.9 | API route handlers | Already installed [VERIFIED: package.json] |
| `mongoose` | ^9.2.2 | MongoDB persistence | Already installed [VERIFIED: package.json] |

**No new packages required.** [VERIFIED: codebase grep — all needed capabilities exist]

### Test Infrastructure

| Tool | Version | Config | Command |
|------|---------|--------|---------|
| Jest | (via ts-jest) | `jest.config.ts` | `yarn test` |
| ts-jest | (preset) | same | `yarn test --testPathPattern=<file>` |

[VERIFIED: jest.config.ts at project root]

---

## Architecture Patterns

### Existing AI Tool Execution Pattern (reuse exactly)

Every new tool follows this established pattern:

**Step 1 — Tool definition in `getToolDefinitions()`:**
```typescript
// Source: src/services/ai/tools.ts (existing pattern)
{
  name: "rename_prefix",
  description: "...",
  input_schema: {
    type: "object",
    properties: {
      groupPath: { type: "string", description: "..." },
      oldPrefix: { type: "string", description: "..." },
      newPrefix: { type: "string", description: "..." },
    },
    required: ["groupPath", "oldPrefix", "newPrefix"],
  },
}
```

**Step 2 — New case in `executeToolCall()` switch:**
```typescript
// Source: src/services/ai/tools.ts (existing switch pattern)
case "rename_prefix": {
  const url = `${baseUrl}/api/collections/${collectionId}/tokens/rename-prefix`;
  return await fetchToolResult(url, "PATCH", toolInput, headers);
}
```

**Step 3 — New Next.js route file for each endpoint.**

[VERIFIED: src/services/ai/tools.ts — all existing tools follow this exact 3-step pattern]

### Theme-Aware Tool Routing Pattern (already established, extend it)

```typescript
// Source: src/services/ai/tools.ts ToolCallContext + switch cases
// Currently: themeId is in context but unused (Phase 28 comment: "deferred to future phase")
// Phase 30: extend cases to check themeId

case "rename_prefix": {
  const isThemeMode = context.themeId && context.themeId !== '__default__';
  const url = isThemeMode
    ? `${baseUrl}/api/collections/${collectionId}/themes/${context.themeId}/tokens/rename-prefix`
    : `${baseUrl}/api/collections/${collectionId}/tokens/rename-prefix`;
  return await fetchToolResult(url, "PATCH", toolInput, headers);
}
```

[VERIFIED: src/services/ai/tools.ts — ToolCallContext has `themeId: string | null`; existing comment explicitly calls out Phase 30 as the phase to activate theme routing]

### rename_prefix Business Logic (reuse existing pure functions)

The API endpoint backing `rename_prefix` must apply the W3C token object transformation. The existing bulk action functions work on `TokenGroup[]` (the parsed tree), but the MongoDB token document is a flat W3C object. The endpoint will need to:

1. Fetch the collection (or theme) tokens from MongoDB
2. Pass through `tokenService.processImportedTokens()` to get `TokenGroup[]`
3. Call `bulkAddPrefix()` or `bulkRemovePrefix()` on the appropriate group
4. Write the updated `TokenGroup[]` back (convert back to W3C object, or use `$set` pattern)

**Critical insight:** The existing token CRUD endpoints use MongoDB dot-notation `$set` on the raw W3C token object. The `rename_prefix` operation renames token keys — not values — so it cannot use simple `$set`. It needs to:
- Read the group subtree from MongoDB
- Rename keys client-side (on the server, within the route handler)
- Write the entire group back with `$set`

The groups API route (`src/app/api/collections/[id]/groups/route.ts`) already has precedent for "rename group" using a similar read-then-write pattern. [VERIFIED: groups route.ts — PATCH handler for rename_group uses a fetch-then-rewrite-then-save pattern]

Alternatively, the route handler can use the `tokenService.processImportedTokens()` → `bulkAddPrefix()`/`bulkRemovePrefix()` pipeline and write back the resulting `TokenGroup[]` in a format the DB accepts. Consult how `POST /themes` stores `theme.tokens` as a `TokenGroup[]` — this is already the persisted format for theme tokens.

**Collection tokens vs theme tokens:**
- `collection.tokens` is stored as a W3C flat object (`Record<string, unknown>`)
- `theme.tokens` is stored as `TokenGroup[]` (see `POST /themes` route — `theme.tokens = groupTree`)

This means the rename-prefix endpoint has **different logic paths** depending on whether it targets the collection or a theme. [VERIFIED: src/app/api/collections/[id]/themes/route.ts line 99 — `tokens: groupTree`]

### Granular Theme Token Endpoint Pattern

The existing `PATCH /themes/[themeId]/tokens` accepts a full `TokenGroup[]` array replacement. The new `PATCH /themes/[themeId]/tokens/single` accepts a single token operation:

```typescript
// New endpoint: src/app/api/collections/[id]/themes/[themeId]/tokens/single/route.ts
// PATCH body: { tokenPath: string, value: string, type?: string }
// DELETE body: { tokenPath: string }
```

The endpoint must find the token by path within `theme.tokens` (a `TokenGroup[]`), update it, and write the full array back. The "find-by-path and update" pattern can be extracted from the existing PATCH handler's `hasSourceWrite` guard logic. [VERIFIED: existing PATCH reads theme.tokens as TokenGroup[], finds by group.id, writes entire array back]

### buildCollectionContext() Bug Fix (AI-12)

Current code always uses `collection.tokens` regardless of active theme:
```typescript
// CURRENT (buggy): src/app/api/ai/chat/route.ts line 40
const tokens = (collection.tokens as Record<string, unknown>) ?? {};
```

Fix: when `themeId` is set and not `__default__`, find the active theme and use its `tokens` (a `TokenGroup[]`) instead. The system prompt already accepts JSON — `TokenGroup[]` serializes fine.

```typescript
// FIXED pattern
let tokens: unknown = collection.tokens ?? {};
if (themeId && themeId !== '__default__') {
  const activeTheme = themes.find(t => t.id === themeId);
  if (activeTheme?.tokens) {
    tokens = activeTheme.tokens; // TokenGroup[] — still valid JSON for system prompt
  }
}
```

[VERIFIED: route.ts lines 36-78 — buildCollectionContext() reads collection.tokens unconditionally; theme context section (line 70-77) only adds the theme name but never uses theme.tokens]

### System Prompt Additions (AI-12, AI-14)

Current system prompt (in `buildCollectionContext()`) says:
> "You can create, update, and delete tokens and groups using the provided tools."

Additions for AI-12 (read-only queries):
> "You can also answer read-only questions about the current token state — such as which tokens use a specific value, which groups contain a given type, or what the current value of a token is — by reading the Full token data above. No tool call is needed for read-only queries."

Additions for AI-14 (naming suggestions):
> "When a user pastes a list of token values or raw token data without specifying what to do, respond with suggested canonical names and group structure as formatted text. Do NOT call bulk_create_tokens immediately. Wait for user confirmation ('yes, apply it' or similar) before calling tools to apply the suggestions."

[ASSUMED] Exact wording is Claude's discretion per CONTEXT.md — the above is a starting recommendation.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token rename logic | Custom path-rename algorithm | `bulkAddPrefix()` / `bulkRemovePrefix()` from `bulkTokenActions.ts` | Already tested with collision resolution and alias rewriting |
| Theme-awareness in tool routing | Custom condition logic | Extend existing `ToolCallContext.themeId` check pattern | Already stubbed in Phase 28 — just wire it |
| HTTP tool execution | New fetch wrapper | Existing `fetchToolResult()` private helper in `tools.ts` | Handles error surfacing, response parsing |
| Theme token CRUD | New write pipeline | Extend existing `PATCH /themes/[themeId]/tokens` array-write pattern | Mongoose array-write workaround already understood |
| Broadcasting | Manual WebSocket push | `broadcastTokenUpdate(collectionId, themeId?)` | Already imported in all token/theme endpoints |

---

## API Endpoints: Inventory

### New Endpoints Required

| Method | Path | Decision | Notes |
|--------|------|----------|-------|
| PATCH | `/api/collections/[id]/tokens/rename-prefix` | D-05 | Collection-level rename |
| PATCH | `/api/collections/[id]/themes/[themeId]/tokens/rename-prefix` | D-06 | Theme-level rename |
| PATCH | `/api/collections/[id]/themes/[themeId]/tokens/single` | D-08 | Granular theme token update |
| DELETE | `/api/collections/[id]/themes/[themeId]/tokens/single` | D-08 | Granular theme token delete |

### Existing Endpoints Reused (no changes needed)

| Method | Path | Tool | Decision |
|--------|------|------|----------|
| POST | `/api/collections/[id]/themes` | `create_theme` | D-07 — already implemented |
| POST | `/api/collections/[id]/tokens` | `bulk_create_tokens` (step 2 of AI-14 flow) | Existing |

[VERIFIED: file listing of src/app/api/collections — rename-prefix and tokens/single paths do NOT currently exist]

---

## New Tools: Summary

| Tool Name | Parameters | Backs | Decision |
|-----------|------------|-------|----------|
| `rename_prefix` | `groupPath`, `oldPrefix`, `newPrefix` | PATCH /tokens/rename-prefix (or /themes/.../tokens/rename-prefix) | D-04, D-05, D-06 |
| `create_theme` | `name`, `colorMode` | POST /themes (existing) | D-07 |
| `update_theme_token` | `themeId`, `tokenPath`, `value`, `type?` | PATCH /themes/[themeId]/tokens/single | D-08 |
| `delete_theme_token` | `themeId`, `tokenPath` | DELETE /themes/[themeId]/tokens/single | D-08 |

---

## Common Pitfalls

### Pitfall 1: rename_prefix operates on different data shapes for collection vs theme

**What goes wrong:** Collection tokens are stored as a W3C flat object; theme tokens are stored as `TokenGroup[]`. A naive endpoint that treats both the same will fail.

**Why it happens:** The `POST /themes` route stores `tokens: groupTree` (a processed `TokenGroup[]`), not the raw W3C object. The collection's `tokens` field is raw W3C.

**How to avoid:** The collection rename-prefix endpoint must: fetch raw tokens → `tokenService.processImportedTokens()` → apply `bulkAddPrefix()`/`bulkRemovePrefix()` → convert back to W3C object using the inverse of `processImportedTokens`, OR use a direct key-rename approach on the raw object. The theme rename-prefix endpoint can work directly with `theme.tokens` as `TokenGroup[]`.

**Warning signs:** Test passes for collection but fails for theme (or vice versa). Tokens disappear after rename if the write-back format is wrong.

[VERIFIED: src/app/api/collections/[id]/themes/route.ts line 99 — `tokens: groupTree`; src/app/api/collections/[id]/tokens/route.ts — $set with dot-notation on raw W3C object]

### Pitfall 2: Positional $set fails on Schema.Types.Mixed theme arrays

**What goes wrong:** Using `themes.$.tokens` positional $set to update a single theme's tokens fails with Mongoose when the array contains Mixed-type documents.

**Why it happens:** Mongoose bug #14595, #12530 — positional operator unreliable on Mixed arrays.

**How to avoid:** Follow the established pattern (already used in `PATCH /themes/[themeId]/tokens` and `PUT /themes/[themeId]`): fetch full document → find theme by index → construct new themes array with updated theme → `$set: { themes: updatedThemes }`.

[VERIFIED: src/app/api/collections/[id]/themes/[themeId]/tokens/route.ts lines 26-65 — comment explicitly calls out this bug and the whole-array $set workaround]

### Pitfall 3: create_theme tool returns themeId — AI must use it in subsequent update_theme_token calls

**What goes wrong:** The AI creates a theme then cannot reference it in subsequent tool calls because the themeId is buried in the tool result data.

**Why it happens:** The tool result is returned as a `ToolResult` object; if the AI doesn't extract and use the themeId from `data.theme.id`, subsequent update calls fail.

**How to avoid:** The `create_theme` tool's success message and `data` payload must prominently include the new `themeId`. The system prompt for D-09 should instruct the AI to capture the themeId from the create_theme result and pass it to subsequent `update_theme_token` calls.

[VERIFIED: src/app/api/collections/[id]/themes/route.ts line 113 — POST returns `{ theme }` including `theme.id`; tools.ts fetchToolResult line 337-342 — returns `data` field which includes the full response body]

### Pitfall 4: AI-12 system prompt always injects collection.tokens — theme queries return wrong data

**What goes wrong:** User selects a theme and asks "which tokens use #0056D2?" but the AI reads the collection default tokens in the system prompt and gives incorrect results for the theme.

**Why it happens:** `buildCollectionContext()` unconditionally reads `collection.tokens` (line 40 in chat route). The theme-awareness block (lines 70-77) only adds the theme name as text, never switching the token data source.

**How to avoid:** The D-02 fix is the direct solution. Implementation detail: `theme.tokens` is `TokenGroup[]`, not the flat W3C object. The system prompt should clearly label whichever format is used, and the existing `JSON.stringify(tokens, null, 2)` serialization still works for both formats.

[VERIFIED: src/app/api/ai/chat/route.ts lines 36-78 — confirmed bug exists in current code]

### Pitfall 5: bulkAddPrefix vs bulkRemovePrefix — rename_prefix maps to which?

**What goes wrong:** The rename_prefix tool takes `oldPrefix` and `newPrefix`. This is a "replace one prefix with another" operation — not purely "add" or "remove" but a combined substitute.

**Why it happens:** The existing helpers are `bulkAddPrefix` (prepends a new prefix) and `bulkRemovePrefix` (strips an existing prefix). The `rename_prefix` tool needs "replace oldPrefix with newPrefix on all matching token paths."

**How to avoid:** The rename_prefix implementation should:
1. Filter tokens in the group where `token.path.startsWith(oldPrefix)`
2. Strip `oldPrefix` from matched tokens → apply `bulkRemovePrefix`
3. Add `newPrefix` to the stripped paths → apply `bulkAddPrefix`

Or implement a dedicated `bulkReplacePrefix` pure function in `bulkTokenActions.ts` that does this atomically and runs alias rewriting once.

[VERIFIED: src/utils/bulkTokenActions.ts — `bulkAddPrefix` and `bulkRemovePrefix` both exist; no `bulkReplacePrefix` function exists currently]

---

## Code Examples

### Existing fetchToolResult helper (internal, reuse)
```typescript
// Source: src/services/ai/tools.ts
async function fetchToolResult(
  url: string,
  method: string,
  body: Record<string, unknown>,
  headers: Record<string, string>
): Promise<ToolResult> {
  const response = await fetch(url, { method, headers, body: JSON.stringify(body) });
  const data = await response.json() as Record<string, unknown>;
  if (!response.ok) {
    return { success: false, message: `Error: ${response.status} ${data.error ?? response.statusText}`, data };
  }
  return { success: true, message: (data.message as string) ?? "Success", data };
}
```

### Existing theme array write-back pattern (for new single-token endpoint)
```typescript
// Source: src/app/api/collections/[id]/themes/[themeId]/tokens/route.ts
const themes = (collection.themes as Array<Record<string, unknown>>) ?? [];
const themeIndex = themes.findIndex((t) => (t.id as string) === params.themeId);
const updatedTheme = { ...themes[themeIndex], tokens: newTokens };
const updatedThemes = [...themes.slice(0, themeIndex), updatedTheme, ...themes.slice(themeIndex + 1)];
await TokenCollection.findByIdAndUpdate(params.id, { $set: { themes: updatedThemes } }).lean();
broadcastTokenUpdate(params.id, params.themeId);
```

### Existing theme creation response (create_theme tool target)
```typescript
// Source: src/app/api/collections/[id]/themes/route.ts line 113
return NextResponse.json({ theme }, { status: 201 });
// theme.id = crypto.randomUUID() — this is the themeId the AI needs for subsequent calls
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Phase 28: themeId in context but unused for tool routing | Phase 30: activate theme-aware routing for rename_prefix, update_theme_token, delete_theme_token | AI mutations now correctly target active theme |
| Phase 28/29: system prompt injects collection.tokens always | Phase 30 D-02 fix: inject active theme tokens when theme is active | Queries are accurate for theme mode |
| No rename operation available via AI | Phase 30 rename_prefix tool | AI can perform bulk renames by natural language |
| Theme population required manual token-by-token work | AI-11: AI creates theme + populates suggested overrides in one chat flow | Theme creation workflow fully AI-assisted |

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest + ts-jest |
| Config file | `jest.config.ts` (project root) |
| Quick run command | `yarn test --testPathPattern=bulkTokenActions` |
| Full suite command | `yarn test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AI-12 | Query returns correct tokens for active theme | Manual (browser verify) | n/a — chat integration | N/A |
| AI-13 | rename_prefix pure logic (bulkReplacePrefix) | Unit | `yarn test --testPathPattern=bulkTokenActions` | ❌ Wave 0 if new function added |
| AI-13 | rename_prefix API endpoint validates and responds | Integration | `yarn test --testPathPattern=tokens/.*route` | ❌ Wave 0 |
| AI-11 | create_theme tool calls correct API | Manual (browser verify) | n/a | N/A |
| AI-14 | Paste-then-confirm two-step flow | Manual (browser verify) | n/a | N/A |

### Sampling Rate
- **Per task commit:** `yarn test --testPathPattern=bulkTokenActions`
- **Per wave merge:** `yarn test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] If `bulkReplacePrefix` is added to `bulkTokenActions.ts` — tests should be added to `bulkTokenActions.test.ts`
- [ ] New route integration tests in `src/app/api/collections/[id]/tokens/__tests__/route.test.ts` — cover rename-prefix endpoint

*(Existing test infrastructure covers bulkTokenActions — only gaps are for new functions/endpoints)*

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | System prompt wording for AI-12 query guidance and AI-14 naming suggestion guidance | System Prompt Additions | Low — Claude's discretion per CONTEXT.md; AI behavior may need iteration |
| A2 | `bulkReplacePrefix` should be implemented as a new function combining add+remove | Pitfall 5 / Architecture Patterns | Medium — could be implemented inline in the route handler instead; either works |
| A3 | rename_prefix endpoint URL path is `tokens/rename-prefix` (subpath of tokens route) | API Endpoints Inventory | Low — exact URL is Claude's discretion per CONTEXT.md D-05 |

---

## Open Questions

1. **How to convert collection.tokens (W3C object) back to storable format after rename_prefix**
   - What we know: `tokenService.processImportedTokens()` converts W3C → `TokenGroup[]`. The rename operates on `TokenGroup[]`.
   - What's unclear: Is there an inverse function (TokenGroup[] → W3C object) already in the codebase, or must the rename work directly on the W3C object's keys?
   - Recommendation: Planner should read `src/services/token.service.ts` before writing the rename-prefix route. If no inverse exists, the route should manipulate the W3C object keys directly (rename top-level keys matching `groupPath.oldPrefix*`) which is simpler than a full round-trip.

2. **update_theme_token: how to find-and-update a single token within theme.tokens (TokenGroup[])**
   - What we know: `theme.tokens` is `TokenGroup[]`. Tokens are nested within groups. Each `GeneratedToken` has an `id` (e.g. `colors/brand/primary`) and `path` (e.g. `primary`).
   - What's unclear: The `tokenPath` parameter for `update_theme_token` is dot-separated (e.g. `colors.brand.primary`). Does the endpoint find the token by reconstructing the group ID (`colors/brand`) and token path (`primary`), or by some other means?
   - Recommendation: Parse `tokenPath` by splitting on last dot → `groupId = path.slice(0, lastDot).replace(/\./g, '/')`, `tokenLocalPath = path.slice(lastDot + 1)`. Find group in theme.tokens tree, find token by `token.path === tokenLocalPath`, update value/type.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies beyond the project's own stack — no new CLIs, databases, or services required)

---

## Project Constraints (from CLAUDE.md)

- **Package manager:** ALWAYS use `yarn`. NEVER `npm`.
- **Theme routing:** Use `themeTokens` / `activeThemeTokens` in theme mode; route edits via `onThemeTokensChange`; never `onTokensChange` for theme edits.
- **Refs pattern:** `activeThemeIdRef` and `graphStateMapRef` stay in sync for debounced saves. (Not directly impacted by this phase.)
- **API patterns:** `PUT /api/collections/[id]` for default; `PATCH /api/collections/[id]/themes/[themeId]/tokens` for theme tokens. New single-token endpoints extend this pattern.
- **broadcastTokenUpdate:** Must be called after every mutation.
- **requireRole(Action.Write, collectionId):** Auth guard on all new write endpoints.
- **SOLID / clean code:** New route handlers must be thin — no business logic inline. Extract rename logic to `bulkTokenActions.ts`. Keep functions 5–30 lines.

---

## Sources

### Primary (HIGH confidence)
- `src/app/api/ai/chat/route.ts` — confirmed current bug in buildCollectionContext(); tool registration pattern
- `src/services/ai/tools.ts` — confirmed full tool definition + execution pattern; themeId stub comment
- `src/app/api/collections/[id]/themes/route.ts` — confirmed POST theme creation; theme.tokens stored as TokenGroup[]
- `src/app/api/collections/[id]/themes/[themeId]/tokens/route.ts` — confirmed full-array $set workaround; source guard
- `src/app/api/collections/[id]/tokens/route.ts` — confirmed POST/PATCH/DELETE pattern with dot-notation $set
- `src/utils/bulkTokenActions.ts` — confirmed bulkAddPrefix, bulkRemovePrefix, detectCommonPrefix implementations
- `src/utils/bulkTokenActions.test.ts` — confirmed test coverage and expected rename behavior
- `src/components/ai/AIChatPanel.tsx` — confirmed current placeholder text and empty state message
- `src/utils/groupMove.ts` — confirmed group path manipulation utilities
- `.planning/phases/30-ai-assisted-naming-and-queries/30-CONTEXT.md` — all locked decisions

### Secondary (MEDIUM confidence)
- `.planning/milestones/v1.7-phases/28-ai-tool-use-token-and-group-crud/28-CONTEXT.md` — Phase 28 locked decisions (D-02 HTTP calls, D-03 cookie forwarding, D-11 confirm before delete)
- `.planning/milestones/v1.8-phases/29-fix-ai-chat-verify-phase-28/29-CONTEXT.md` — Phase 29 locked decisions (toolsExecuted boolean, silent refresh)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; verified from package.json and codebase
- Architecture: HIGH — all patterns verified from existing source files
- Pitfalls: HIGH — all verified from actual code reading (not assumed)
- Open questions: MEDIUM — code exists but relevant files (token.service.ts) not fully read

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (stable codebase — no fast-moving dependencies)
