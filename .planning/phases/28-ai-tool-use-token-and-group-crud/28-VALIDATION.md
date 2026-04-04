---
phase: 28
slug: ai-tool-use-token-and-group-crud
status: complete
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-04
---

# Phase 28 — Validation Strategy

> Per-phase validation contract reconstructed from PLAN and SUMMARY artifacts.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.x + ts-jest |
| **Config file** | `jest.config.ts` |
| **Quick run command** | `yarn jest --testPathPattern=src/services/ai` |
| **Full suite command** | `yarn jest` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `yarn jest --testPathPattern=src/services/ai`
- **After every plan wave:** Run `yarn jest`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File | Status |
|---------|------|------|-------------|-----------|-------------------|------|--------|
| 28-01-01a | 01 | 1 | AI-05/06/07/15 | unit | `yarn jest "src/app/api/collections/\[id\]/tokens/__tests__/route.test.ts"` | ✅ | ✅ green |
| 28-01-01b | 01 | 1 | AI-09/15 | unit | `yarn jest "src/app/api/collections/\[id\]/groups/__tests__/route.test.ts"` | ✅ | ✅ green |
| 28-01-02a | 01 | 1 | AI-05..10 | unit | `yarn jest "src/services/ai/__tests__/tools.test.ts"` | ✅ | ✅ green |
| 28-01-02b | 01 | 1 | AI-15 | unit | `yarn jest "src/services/ai/__tests__/tools.test.ts"` | ✅ | ✅ green |
| 28-02-01 | 02 | 1 | AI-08/09 | manual | See Manual-Only table | — | — |
| 28-02-02 | 02 | 1 | AI-10 | manual | See Manual-Only table | — | — |
| 28-03-01 | 03 | 2 | AI-05..07 | unit | `yarn jest "src/services/ai/__tests__/claude.provider.test.ts"` | ✅ | ✅ green |
| 28-04-01 | 04 | 3 | AI-05..07/11 | manual | See Manual-Only table | — | — |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| MCP bulk_create_tokens creates tokens atomically | AI-08 | Requires live MCP server + MongoDB connection; no test harness for MCP server | Start dev server, use Claude Desktop to call `bulk_create_tokens` with 3 tokens; verify all appear in token table |
| MCP rename_group moves all tokens atomically | AI-09 | Requires live MCP server + MongoDB | Use Claude Desktop to rename a group; verify new path appears and old path gone |
| MCP delete_group removes subtree | AI-09 | Requires live MCP server + MongoDB | Use Claude Desktop to delete a group; verify all nested tokens removed |
| MCP generate_color_scale uses tokenGenerators.ts | AI-10 | Requires live MCP server + tokenGenerators algorithm | Call generate_color_scale from Claude Desktop; verify returned scale matches expected step pattern |
| MCP generate_dimension_scale | AI-10 | Requires live MCP server | Call generate_dimension_scale; verify scale values follow modular ratio |
| AI creates token via chat (end-to-end) | AI-05 | Requires live Claude API + MongoDB | Type "Create a token called color.brand.primary with value #0056D2" in AI chat; verify token appears in table |
| AI edits token via chat | AI-06 | Requires live Claude API + MongoDB | Type "Change color.brand.primary to #FF6600"; verify value updated |
| AI deletes token with confirmation step | AI-07/D-11 | Requires live Claude API | Type "Delete color.brand.primary"; verify AI asks "Shall I proceed?" before deleting |
| AI tool calls route through API endpoints | AI-15 | Requires browser Network tab inspection | Verify fetch calls to /api/collections/[id]/tokens during AI chat tool use |
| Failed tool calls produce readable errors | D-12 | Requires live Claude API | Type "Delete nonexistent.path"; verify AI explains error in plain language |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Manual-Only entry
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-04

**Human wave:** `wave_0_complete` stays `false` until Plan **28-04** is executed and signed off (see `28-VERIFICATION.md` and `.planning/v1.7-HUMAN-GATES.md`).

---

## Validation Audit 2026-04-04

| Metric | Count |
|--------|-------|
| Gaps found | 7 |
| Resolved (automated) | 5 |
| Escalated to manual-only | 2 (MCP tools require live server; Plan 04 is a human checkpoint) |
| Tests created | 4 files, 74 tests |
| Test suites | tools.test.ts (24), claude.provider.test.ts (8), tokens/route.test.ts (21), groups/route.test.ts (21) |
