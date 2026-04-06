# Project Retrospective

Living retrospective across milestones. Each milestone gets a section; cross-milestone trends tracked at the bottom.

---

## Milestone: v1.7 — AI Integration

**Shipped:** 2026-04-06
**Phases:** 4 (25-28) | **Plans:** 10 | **Commits:** ~73

### What Was Built

- **Style Guide tab** — per-type visual token previews (color palettes, spacing bars, typography specimens, shadow/border-radius tiles); wired to theme selector; all 12 D requirements covered
- **AI service layer** — provider-agnostic `AIProvider` interface + `ClaudeProvider` (Anthropic SDK); AES-256-GCM encrypted per-user API keys; server-side only; MCP server over stdio
- **AI tool use end-to-end** — 6 tool definitions (create/edit/delete token + create/rename/delete group) routed through HTTP to existing app API endpoints; tool use loop wired in ClaudeProvider; AIChatPanel slide-over on Tokens page

### What Worked

- **Provider-agnostic architecture paid off immediately** — swapping or testing providers requires only a new `*.provider.ts` file; chat route has zero SDK-specific code
- **HTTP-based tool execution** — tools call existing API routes rather than importing Mongoose directly; auth, validation, and error handling come for free
- **Phases absorbing each other worked fine in practice** — Phase 27 was empty because Phase 28 implemented the chat UI; the functionality exists even if the phase attribution is stale

### What Was Inefficient

- **Phase 27 was never formally planned** — directory sat empty while Phase 28 did the work; created audit noise and stale requirement attribution
- **Human gate (28-04) never executed** — formal verification of the AI tool use loop was blocked and then the milestone closed; the feature shipped unverified and was immediately disabled by a bug
- **BUG-01 found late** — chat clearing the tokens table was discovered post-implementation; earlier integration testing would have caught it; the `onToolsExecuted` callback (which calls `refreshTokens`) is almost certainly firing too aggressively
- **Type double-cast accumulated** — `Anthropic.Tool[]` ↔ `ToolDefinition[]` cast in chat route and ClaudeProvider; technically safe but degrades type contract over time

### Patterns Established

- **AI tool calls map to app API endpoints** — no direct DB writes from AI layer; this pattern must be preserved in v1.8+
- **AES-256-GCM encryption utility** — `encrypt()`/`decrypt()` in `src/services/ai/encryption.ts`; reusable for any future secrets storage
- **MCP server** — `src/mcp/server.ts` is separate from the HTTP chat route; Claude Desktop can connect independently

### Key Lessons

1. **Always run the human gate** — 28-04 existed precisely to catch integration bugs; skipping it directly caused the bug that disabled the feature
2. **`refreshTokens` needs guard conditions** — before v1.8 re-enables AI chat, audit every callsite of `refreshTokens` and `onToolsExecuted` to ensure it only fires after confirmed tool mutations, not on every message
3. **Empty phases create audit debt** — if a phase gets absorbed into another, close it with a one-line note rather than leaving the directory empty
4. **Milestone scope creep** — Phases 22-24 (v1.6 SaaS) were deferred before v1.7 started; Phase 29 was deferred before v1.7 closed; tighter upfront scoping would reduce carried-over gaps

### Cost Observations

- 4 phases in ~8 days
- Mix: primarily sonnet for execution, opus for planning
- Notable: the AI service layer and tool use phases were planned and executed with high fidelity — the bug is in the UI wiring, not the service layer

---

## Cross-Milestone Trends

| Metric | v1.4 | v1.5 | v1.7 |
|--------|------|------|------|
| Phases | 6 | 6 | 4 |
| Plans | 21 | 25 | 10 |
| Days | ~8 | ~1 | ~8 |
| Human gates missed | 0 | 0 | 1 |
| Requirements gaps at close | 0 | 0 | 12 (Phase 29 deferred) |

**Recurring pattern:** Human verification checkpoints are consistently the last step and most likely to slip. Consider scheduling them earlier in the phase rather than as a final plan.
