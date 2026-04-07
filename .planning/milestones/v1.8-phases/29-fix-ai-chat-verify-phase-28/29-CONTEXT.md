# Phase 29: Fix AI Chat + Verify Phase 28 - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix the AI chat panel bug that clears the tokens table on every message, re-enable the AI chat UI, and complete human verification of Phase 28 tool-use behavior. Verify the `/api/user/settings/check` endpoint works correctly.

**What this phase does NOT include:**
- AI-assisted naming, natural language queries/edits, or theme creation (Phase 30)
- Style Guide verification (Phase 31)

</domain>

<decisions>
## Implementation Decisions

### Bug Fix Strategy (BUG-01)

- **D-01:** Fix approach: add `toolsExecuted: boolean` to the `/api/ai/chat` response. The `ClaudeProvider` tool use loop already knows whether tools ran — surface that as a boolean in the JSON response alongside `reply`.
- **D-02:** `AIChatPanel` only calls `onToolsExecuted?.()` when `data.toolsExecuted === true`. This eliminates the unconditional callback that was causing `refreshTokens` to fire on every chat response.
- **D-03:** `aiService.chat()` return type extends to `{ reply: string; toolsExecuted: boolean }`. The `ClaudeProvider.chat()` implementation sets `toolsExecuted: true` when the tool use loop executed at least one tool call.
- **D-04:** The `provider.interface.ts` `ChatResult` type (or `chat()` return type) is updated to carry the `toolsExecuted` flag. All callers (only the chat route) update accordingly.

### Token Refresh UX After Tool Use

- **D-05:** Silent refresh — when `toolsExecuted` is true, the tokens table refreshes in the background with no toast or indicator. The AI's reply text in the chat already describes what changed; no extra UI confirmation needed.

### Re-enabling the AI Chat UI (AI-01)

- **D-06:** After the bug fix is confirmed working, restore the AI chat toggle button in the Tokens page header and the slide-over panel. Both are currently commented out with `disabled: bug where chat clears tokens table (see 28-BUGS.md)` markers.
- **D-07:** The `AIChatPanel` import and render are already present (just commented out). Uncomment and wire `activeThemeId` prop correctly.

### API Key Check (AI-02)

- **D-08:** `GET /api/user/settings/check` already exists and is correct. Verification is a manual browser check: open DevTools → Network → navigate to the Tokens page → confirm the endpoint is called and returns `{ hasApiKey: true }` (SELF_HOSTED=true path).

### Phase 28 Human Verification (VERIFY-28)

- **D-09:** The plan includes a human checkpoint step: run all 6 scenarios in `28-04-TEST-GUIDE.md` in the browser, record results in a new `28-04-SUMMARY.md`, then update `28-VERIFICATION.md` with sign-off status. No automation — manual browser execution is the requirement.
- **D-10:** VERIFY-28 must happen AFTER the BUG-01 fix is merged (the test guide requires the AI chat panel to be open and functional). The plan orders: fix bug → re-enable UI → run verification.

### Claude's Discretion

- Exact return type shape for `toolsExecuted` (inline in response object vs wrapper type)
- Whether `ClaudeProvider` tracks tool execution via a flag inside the loop or by checking `stop_reason`
- Wording of the `28-04-SUMMARY.md` template

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Bug Fix Surface
- `src/components/ai/AIChatPanel.tsx` — `onToolsExecuted` callback; receives `toolsExecuted` from API response
- `src/app/api/ai/chat/route.ts` — Chat route; must return `toolsExecuted` flag alongside `reply`
- `src/services/ai/provider.interface.ts` — `ChatResult` return type; extend to include `toolsExecuted`
- `src/services/ai/claude.provider.ts` — Tool use loop; source of `toolsExecuted` truth

### Re-enable Surface
- `src/app/collections/[id]/tokens/page.tsx` — Lines ~1096 and ~1348; two disabled comments mark where the AI toggle button and slide-over need to be restored

### Bug Tracker
- `.planning/phases/28-ai-tool-use-token-and-group-crud/28-BUGS.md` — BUG-01 description, likely cause, and re-enable instructions

### Human Verification
- `.planning/phases/28-ai-tool-use-token-and-group-crud/28-04-TEST-GUIDE.md` — 6 browser scenarios to execute
- `.planning/phases/28-ai-tool-use-token-and-group-crud/28-VERIFICATION.md` — Must be updated with sign-off after test guide complete

### Endpoint to Verify
- `src/app/api/user/settings/check/route.ts` — AI-02 endpoint; already correct; needs browser confirmation only

### Roadmap
- `.planning/ROADMAP.md` §Phase 29 — Success criteria: BUG-01-FIX, AI-01, AI-02, VERIFY-28

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `refreshTokens` in `page.tsx` — existing callback that fetches collection and sets `masterGroups`; already used by `onToolsExecuted`, just needs to be called conditionally
- `showSuccessToast` / `showErrorToast` in `page.tsx` — available if we ever want to add a notification, but D-05 says silent refresh

### Established Patterns
- API responses return plain JSON objects; extending `{ reply }` to `{ reply, toolsExecuted }` follows existing pattern
- `requireAuth()` guard already on the chat route — no auth changes needed
- The tool use loop in `ClaudeProvider` already distinguishes between text responses (`stop_reason === 'end_turn'`) and tool use responses (`stop_reason === 'tool_use'`) — `toolsExecuted` is derivable from that state

### Integration Points
- `AIChatPanel.tsx` → calls `/api/ai/chat` → receives `{ reply, toolsExecuted }` → calls `onToolsExecuted` only if `toolsExecuted === true`
- `page.tsx` passes `onToolsExecuted={refreshTokens}` to `AIChatPanel` — this wiring stays unchanged; only the conditional changes
- `ClaudeProvider.chat()` → return value needs to carry `toolsExecuted` → `AIService.chat()` passes it through → route returns it

</code_context>

<specifics>
## Specific Ideas

- The fix is intentionally minimal — add one boolean to the response, add one `if` check in the panel. No architectural changes.
- After fixing the bug, the test guide (VERIFY-28) should be run against the fixed code, not before — ordering matters in the plan.

</specifics>

<deferred>
## Deferred Ideas

- Streaming AI responses — out of scope for all current phases
- Automated test coverage for the browser scenarios in VERIFY-28 — could be done in a future phase; manual is sufficient for now
- AI-11, AI-12, AI-13, AI-14 (naming, queries, bulk edits, theme creation) — Phase 30

</deferred>

---

*Phase: 29-fix-ai-chat-verify-phase-28*
*Context gathered: 2026-04-07*
