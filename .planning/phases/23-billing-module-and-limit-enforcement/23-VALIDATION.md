---
phase: 23
slug: billing-module-and-limit-enforcement
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-20
---

# Phase 23 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x / vitest |
| **Config file** | jest.config.js or vitest.config.ts |
| **Quick run command** | `yarn test --testPathPattern=billing` |
| **Full suite command** | `yarn test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `yarn test --testPathPattern=billing`
- **After every plan wave:** Run `yarn test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 23-01-01 | 01 | 1 | BILLING-01 | — | tiers.ts is single source of truth for limits | unit | `yarn test --testPathPattern=tiers` | ❌ W0 | ⬜ pending |
| 23-01-02 | 01 | 1 | BILLING-07 | — | SELF_HOSTED=true bypasses all limit checks | unit | `yarn test --testPathPattern=billing` | ❌ W0 | ⬜ pending |
| 23-01-03 | 01 | 2 | LIMIT-01 | — | 402 response with structured error on limit exceeded | integration | `yarn test --testPathPattern=billing` | ❌ W0 | ⬜ pending |
| 23-01-04 | 01 | 2 | LIMIT-05 | — | Usage resets lazily on UTC-month boundary | unit | `yarn test --testPathPattern=billing` | ❌ W0 | ⬜ pending |
| 23-01-05 | 01 | 3 | RATE-01 | — | Rate limiter enforces per-user-ID limits | integration | `yarn test --testPathPattern=rate` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/billing/__tests__/tiers.test.ts` — stubs for BILLING-01, BILLING-07
- [ ] `src/lib/billing/__tests__/check-limit.test.ts` — stubs for LIMIT-01, LIMIT-05
- [ ] `src/lib/billing/__tests__/rate-limiter.test.ts` — stubs for RATE-01

*Existing test infrastructure assumed; Wave 0 adds billing-specific test files.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| UpgradeModal appears in UI on 402 | LIMIT-01 | Visual UI behavior | Trigger a limit-exceeded API call; verify modal renders in browser |
| SELF_HOSTED env var set in .env.local bypasses limits | BILLING-07 | Requires env setup | Set SELF_HOSTED=true, verify all billing checks return null |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
