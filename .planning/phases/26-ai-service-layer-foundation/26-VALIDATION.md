---
phase: 26
slug: ai-service-layer-foundation
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-03
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest (existing) + TypeScript compile check |
| **Config file** | jest.config.js (if exists) or package.json jest field |
| **Quick run command** | `yarn tsc --noEmit` |
| **Full suite command** | `yarn tsc --noEmit && yarn test --passWithNoTests` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `yarn tsc --noEmit`
- **After every plan wave:** Run `yarn tsc --noEmit && yarn test --passWithNoTests`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 26-01-01 | 01 | 1 | AI-03 | compile | `yarn tsc --noEmit` | n/a (created in task) | ⬜ pending |
| 26-01-02 | 01 | 1 | AI-04 | compile | `yarn tsc --noEmit` | n/a (created in task) | ⬜ pending |
| 26-02-01 | 02 | 2 | AI-02 | compile | `yarn tsc --noEmit` | n/a (created in task) | ⬜ pending |
| 26-03-01 | 03 | 2 | AI-03 | compile + manual | `yarn tsc --noEmit` | n/a (created in task) | ⬜ pending |
| 26-04-01 | 04 | 3 | MCP | manual | MCP server connects to Claude Desktop/Code | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/services/ai/provider.interface.ts` — AIProvider interface file exists
- [ ] `src/services/ai/claude.provider.ts` — Claude implementation file exists
- [ ] `src/mcp/server.ts` — MCP server entry point exists
- [ ] TypeScript compiles with no errors after all new files added

*Existing test infrastructure (Jest) covers the project; new files are primarily TypeScript modules validated by compile checks.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| MCP server connects to Claude Desktop | MCP-01 | Requires Claude Desktop app + config | Add config snippet, restart Claude Desktop, verify tools appear |
| MCP server connects to Claude Code (CLI) | MCP-02 | Requires Claude Code CLI + .claude/settings.json | Add mcpServers config, run `claude`, verify tools available |
| list_tokens tool returns real MongoDB data | MCP-03 | Requires running MongoDB + MCP server | Run server, call list_tokens via Claude, verify token data matches DB |
| POST /api/ai/chat calls Anthropic SDK | AI-03 | Requires ANTHROPIC_API_KEY env var | Start Next.js, POST to /api/ai/chat, verify response from Claude |
| API key encrypt/decrypt round-trip | AI-02 | Requires running DB + ENCRYPTION_KEY set | PUT /api/user/settings with key, verify encrypted in DB, verify chat uses decrypted key |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (compile-check-after-creation pattern)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (n/a — files created within tasks; no pre-existing stubs needed)
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-03
