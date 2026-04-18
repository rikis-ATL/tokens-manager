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
| **Framework** | jest 29.x (jest.config.ts already exists in repo root) |
| **Config file** | `jest.config.ts` — already present |
| **Quick run command** | `yarn jest --testPathPattern=src/lib/` |
| **Full suite command** | `yarn jest` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `yarn jest --testPathPattern=src/lib/`
- **After every plan wave:** Run `yarn jest`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 22-01-01 | 01 | 1 | TENANT-01 | T-22-01 | Organization model enforces required name field | unit | `yarn jest src/lib/db/models/__tests__/organization.test.ts` | ❌ W0 | ⬜ pending |
| 22-01-02 | 01 | 1 | TENANT-01 | T-22-01 | organizationId required on User schema | unit | `yarn jest src/lib/db/models/__tests__/user-org.test.ts` | ❌ W0 | ⬜ pending |
| 22-01-03 | 01 | 1 | TENANT-01 | T-22-01 | organizationId required on TokenCollection schema | unit | `yarn jest src/lib/db/models/__tests__/token-collection-org.test.ts` | ❌ W0 | ⬜ pending |
| 22-02-01 | 02 | 2 | TENANT-01 | T-22-02 | assertOrgOwnership returns 404 for cross-tenant access | unit | `yarn jest src/lib/auth/__tests__/assert-org-ownership.test.ts` | ❌ W0 | ⬜ pending |
| 22-02-02 | 02 | 2 | TENANT-01 | T-22-02 | JWT includes organizationId claim | unit | `yarn jest src/lib/auth/__tests__/jwt-org.test.ts` | ❌ W0 | ⬜ pending |
| 22-02-03 | 02 | 2 | TENANT-01 | T-22-07 | Demo session uses DEMO_ORG_ID for ownership | unit | `yarn jest src/lib/auth/__tests__/demo-session-org.test.ts` | ❌ W0 | ⬜ pending |
| 22-03-01 | 03 | 2 | TENANT-02 | — | Signup API creates org and admin user atomically | unit | `yarn jest src/app/api/auth/signup/__tests__/route.test.ts` | ❌ W0 | ⬜ pending |
| 22-04-01 | 04 | 2 | TENANT-01 | — | GET /api/collections filters by organizationId | unit | `yarn jest src/lib/db/__tests__/mongo-repository-list.test.ts` | ❌ W0 | ⬜ pending |
| 22-04-02 | 04 | 2 | TENANT-03 | — | Migration script idempotency and back-fill | unit | `yarn jest scripts/__tests__/migrate-to-org.test.ts` | ❌ W0 | ⬜ pending |
| 22-04-03 | 04 | 2 | TENANT-03 | — | Operator runs migration script against local DB | manual | Run `scripts/migrate-to-org.ts` via ts-node, verify via mongosh | ✅ | ⬜ pending |
| 22-05-01 | 05 | 3 | TENANT-01 | T-22-22 | All 17 by-id routes call assertOrgOwnership | grep | `grep -rn "assertOrgOwnership" src/app/api/ \| wc -l` ≥ 17 | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

No jest install needed — jest.config.ts already exists. Wave 0 only needs test stub files:

- [ ] `src/lib/db/models/__tests__/organization.test.ts` — stub for Organization model (TENANT-01, Plan 01)
- [ ] `src/lib/db/models/__tests__/user-org.test.ts` — stub for User+organizationId (TENANT-01, Plan 01)
- [ ] `src/lib/db/models/__tests__/token-collection-org.test.ts` — stub for TokenCollection+organizationId (TENANT-01, Plan 01)
- [ ] `src/lib/auth/__tests__/assert-org-ownership.test.ts` — stub for ownership guard (TENANT-01, Plan 02)
- [ ] `src/lib/auth/__tests__/jwt-org.test.ts` — stub for JWT organizationId claim (Plan 02)
- [ ] `src/lib/auth/__tests__/demo-session-org.test.ts` — stub for demo session org (Plan 02)
- [ ] `src/app/api/auth/signup/__tests__/route.test.ts` — stub for org creation flow (TENANT-02, Plan 03)
- [ ] `src/lib/db/__tests__/mongo-repository-list.test.ts` — stub for list() org filter (TENANT-01, Plan 04)
- [ ] `scripts/__tests__/migrate-to-org.test.ts` — stub for migration script (TENANT-03, Plan 04)

*Plans create these files as part of their TDD task execution — no separate Wave 0 plan needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Migration script back-fills existing users + collections | TENANT-03 | Script runs against live DB; cannot be automated without a real DB fixture | Follow Task 4 checkpoint in Plan 22-04 — run via ts-node, verify with mongosh |
| Compound indexes created on User and TokenCollection | TENANT-01 | Index creation is a side-effect of model registration at app startup | Connect to MongoDB, run `db.users.getIndexes()` and `db.tokencollections.getIndexes()`, verify `(organizationId, _id)` compound index present |
| JWT organizationId claim visible after sign-in | TENANT-01 | Requires browser login flow | Log in, inspect `/api/auth/session`, verify `organizationId` field present |
| Self-serve signup creates org without admin | TENANT-02 | Requires end-to-end UI flow | Navigate to `/signup`, create account, verify org created and user associated |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or explicit manual entry above
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 test stub paths match actual plan `<files>` declarations
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
