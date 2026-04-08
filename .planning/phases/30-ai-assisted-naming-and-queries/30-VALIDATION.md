---
phase: 30
slug: ai-assisted-naming-and-queries
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-08
---

# Phase 30 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest + ts-jest |
| **Config file** | `jest.config.ts` (project root) |
| **Quick run command** | `yarn test --testPathPattern=bulkTokenActions` |
| **Full suite command** | `yarn test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `yarn test --testPathPattern=bulkTokenActions`
- **After every plan wave:** Run `yarn test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 30-??-01 | TBD | 1 | AI-12 | — | Theme-aware token injection returns correct theme tokens | Manual (browser) | n/a — chat integration | N/A | ✅ green |
| 30-??-02 | TBD | 1 | AI-13 | — | bulkReplacePrefix pure logic (oldPrefix→newPrefix) | Unit | `yarn test --testPathPattern=bulkTokenActions` | ✅ green | ✅ green |
| 30-??-03 | TBD | 2 | AI-13 | — | rename_prefix API endpoint validates and responds | Integration | `yarn test --testPathPattern=tokens/.*route` | ✅ green | ✅ green |
| 30-??-04 | TBD | 2 | AI-11 | — | create_theme tool calls correct API, returns themeId | Manual (browser) | n/a | N/A | ✅ green |
| 30-??-05 | TBD | 2 | AI-11 | — | update_theme_token granular endpoint updates single token | Integration | `yarn test --testPathPattern=themes/.*route` | ✅ green | ✅ green |
| 30-??-06 | TBD | 3 | AI-14 | — | Two-step paste→confirm flow does not write on first turn | Manual (browser) | n/a | N/A | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/utils/bulkTokenActions.test.ts` — add test for `bulkReplacePrefix` (old→new prefix substitution within a group)
- [x] `src/app/api/collections/[id]/tokens/__tests__/route.test.ts` — integration test stubs for rename-prefix endpoint
- [x] `src/app/api/collections/[id]/themes/[themeId]/tokens/__tests__/single.test.ts` — integration tests for granular update/delete token endpoint

*(Existing test infrastructure covers Jest — only gaps are for new functions/endpoints)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Natural language query returns correct tokens for active theme | AI-12 | Chat integration — no unit surface for system prompt behavior | Select a theme, open AI chat, ask "which tokens use [color]?", verify response matches theme tokens not collection default |
| create_theme tool creates theme and populates values | AI-11 | Multi-step AI tool use flow requires browser | Ask AI to create a dark theme variant, verify new theme appears in theme selector with AI-suggested values |
| Paste values → suggest names (no write) → confirm → apply | AI-14 | Two-turn chat flow, AI reasoning required | Paste raw token values, verify AI responds with names only (no tokens created), reply "yes apply", verify tokens created |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-08
