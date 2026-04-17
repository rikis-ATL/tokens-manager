---
phase: 22
slug: org-model-and-multi-tenant-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-18
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x (Wave 0 installs — no test infrastructure currently exists) |
| **Config file** | `jest.config.ts` — Wave 0 creates |
| **Quick run command** | `yarn jest --testPathPattern=src/__tests__/` |
| **Full suite command** | `yarn jest` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `yarn jest --testPathPattern=src/__tests__/`
- **After every plan wave:** Run `yarn jest`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 22-01-01 | 01 | 0 | — | — | N/A | infra | `yarn jest --version` | ❌ W0 | ⬜ pending |
| 22-01-02 | 01 | 1 | TENANT-01 | T-22-01 | Organization model enforces required name field | unit | `yarn jest src/__tests__/models/organization.test.ts` | ❌ W0 | ⬜ pending |
| 22-01-03 | 01 | 1 | TENANT-01 | T-22-01 | organizationId required on User schema | unit | `yarn jest src/__tests__/models/user.test.ts` | ❌ W0 | ⬜ pending |
| 22-01-04 | 01 | 1 | TENANT-01 | T-22-01 | organizationId required on TokenCollection schema | unit | `yarn jest src/__tests__/models/tokenCollection.test.ts` | ❌ W0 | ⬜ pending |
| 22-02-01 | 02 | 2 | TENANT-01 | T-22-02 | assertOrgOwnership returns 404 for cross-tenant access | unit | `yarn jest src/__tests__/lib/assertOrgOwnership.test.ts` | ❌ W0 | ⬜ pending |
| 22-02-02 | 02 | 2 | TENANT-01 | T-22-02 | JWT includes organizationId claim | unit | `yarn jest src/__tests__/auth/jwt.test.ts` | ❌ W0 | ⬜ pending |
| 22-03-01 | 03 | 2 | TENANT-02 | — | Signup creates org and associates user | unit | `yarn jest src/__tests__/api/signup.test.ts` | ❌ W0 | ⬜ pending |
| 22-04-01 | 04 | 3 | TENANT-03 | — | Migration script back-fills existing docs | manual | Run `yarn tsx scripts/migrate-to-org.ts --dry-run` | ✅ | ⬜ pending |
| 22-04-02 | 04 | 3 | TENANT-01 | T-22-01 | Compound indexes created on User and TokenCollection | manual | Check via MongoDB shell or `mongo-check.ts` script | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `jest.config.ts` — Jest configuration with ts-jest transformer
- [ ] `src/__tests__/models/organization.test.ts` — stubs for Organization model (TENANT-01)
- [ ] `src/__tests__/models/user.test.ts` — stubs for User+organizationId (TENANT-01)
- [ ] `src/__tests__/models/tokenCollection.test.ts` — stubs for TokenCollection+organizationId (TENANT-01)
- [ ] `src/__tests__/lib/assertOrgOwnership.test.ts` — stubs for ownership guard (TENANT-01)
- [ ] `src/__tests__/auth/jwt.test.ts` — stubs for JWT organizationId claim
- [ ] `src/__tests__/api/signup.test.ts` — stubs for org creation flow (TENANT-02)
- [ ] `yarn add --dev jest @types/jest ts-jest` — test dependencies

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Migration script back-fills existing users + collections | TENANT-03 | No test DB fixture; script is run-once utility | Run `yarn tsx scripts/migrate-to-org.ts --dry-run`, verify output shows correct counts |
| Compound indexes created | TENANT-01 | Index creation is a side-effect of model registration | Connect to MongoDB, run `db.users.getIndexes()` and `db.tokencollections.getIndexes()`, verify `(organizationId, _id)` compound index present |
| JWT organizationId claim visible in browser | TENANT-01 | Requires login flow in browser | Log in, inspect session via `/api/auth/session`, verify `organizationId` field present |
| Self-serve signup creates org without admin | TENANT-02 | Requires end-to-end UI flow | Navigate to signup, create account, verify org created and user associated |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
