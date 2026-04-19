---
phase: 22
plan: 02
subsystem: auth
tags: [jwt, session, multi-tenant, organization, ownership-guard, nextauth]
dependency_graph:
  requires: ["22-01"]
  provides: ["assertOrgOwnership", "JWT.organizationId", "Session.user.organizationId", "DEMO_ORG_ID"]
  affects: ["src/lib/auth/", "src/types/next-auth.d.ts"]
tech_stack:
  added: []
  patterns: ["JWT claim propagation (D-09)", "uniform 404 ownership guard (D-07)", "defence-in-depth empty-string fallback (Pitfall 1)"]
key_files:
  created:
    - src/lib/auth/assert-org-ownership.ts
    - src/lib/auth/__tests__/jwt-org.test.ts
    - src/lib/auth/__tests__/demo-session-org.test.ts
    - src/lib/auth/__tests__/assert-org-ownership.test.ts
  modified:
    - src/types/next-auth.d.ts
    - src/lib/auth/nextauth.config.ts
    - src/lib/auth/demo-session.ts
    - jest.config.ts
decisions:
  - "D-09: organizationId flows from DB user into JWT on initial sign-in only; not re-fetched on role-TTL refresh (org never changes per-user)"
  - "D-07: assertOrgOwnership() returns 404 on every failure mode — identical body prevents cross-tenant info leak"
  - "D-10: Demo session reads organizationId from DEMO_ORG_ID env var; empty string fallback 404s safely until configured"
  - "Pitfall 1 handled: pre-migration tokens missing organizationId get '' fallback in session callback, then 404 from assertOrgOwnership"
  - "Pitfall 2 handled: String() coercion on Mongoose ObjectId before comparison with string sessionOrgId"
  - "Pitfall 6 handled: empty/whitespace collectionId rejected before DB query"
  - "CredentialsProvider.options.authorize accessor used in tests (not .authorize which is the default no-op)"
metrics:
  duration: "~2 minutes"
  completed: "2026-04-19"
  tasks_completed: 3
  files_changed: 8
---

# Phase 22 Plan 02: Auth Layer — JWT organizationId + assertOrgOwnership() Summary

**One-liner:** JWT session carries organizationId from first sign-in via NextAuth callbacks; assertOrgOwnership() guards collections with uniform 404 on every failure mode.

## What Was Built

### Task 1: TypeScript types + JWT + session callbacks (D-09)
- `src/types/next-auth.d.ts` augmented: `Session.user.organizationId: string` (required) + `JWT.organizationId?: string` (optional, Pitfall 1 safe)
- `authorize()` returns `organizationId: user.organizationId?.toString() ?? ''` — empty string fallback for legacy docs
- `jwt` callback copies `organizationId` on initial sign-in only (not on role-TTL re-fetch — org is immutable per D-09)
- `session` callback exposes `session.user.organizationId` with `?? ''` fallback for pre-migration tokens
- 5 unit tests pass

### Task 2: Demo session DEMO_ORG_ID (D-10)
- `getDemoUserSession()` returns `organizationId: process.env.DEMO_ORG_ID ?? ''`
- Fallback empty string means demo users get 404 from `assertOrgOwnership()` until env var is configured — safer than cross-tenant access
- All existing session fields preserved
- 3 unit tests pass

### Task 3: assertOrgOwnership() ownership guard (D-06, D-07)
- New file `src/lib/auth/assert-org-ownership.ts`
- Returns `null` on ownership match (caller proceeds)
- Returns `NextResponse 404` with `{ error: 'Not Found' }` on ALL failure modes:
  - Empty/whitespace collectionId (Pitfall 6) — no DB query
  - Missing session organizationId (Pitfall 1) — no DB query
  - Collection not found in DB
  - Cross-tenant mismatch (org IDs differ)
- Uses `String(collection.organizationId ?? '')` for ObjectId/string coercion (Pitfall 2)
- Uses `.select('organizationId').lean()` for minimal DB read
- 7 unit tests pass

**Total: 15 assertions across 3 test files — all passing.**

## Security Mitigations Delivered

| Threat | Mitigation |
|--------|------------|
| T-22-02 (IDOR cross-tenant) | assertOrgOwnership() compares signed JWT claim to DB value; mismatch → 404 |
| T-22-03 (info disclosure via status code) | All 4 failure modes return identical `{ error: 'Not Found' }` 404 body |
| T-22-05 (pre-migration JWT spoofing) | Falsy organizationId → 404 immediately; users must re-sign-in for new claim |
| T-22-07 (demo session unset DEMO_ORG_ID) | Empty string fallback → 404 for demo users until env var is configured |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] CredentialsProvider.authorize accessor in jwt-org.test.ts**
- **Found during:** Task 1 GREEN phase — both authorize tests returned null
- **Issue:** Plan test code accessed `authOptions.providers[0].authorize` but CredentialsProvider stores the user-supplied authorize at `.options.authorize`; the `.authorize` on the provider is the default `() => null` no-op
- **Fix:** Changed test accessor to `(authOptions.providers[0] as unknown as { options: { authorize } }).options` so the real authorize function is called
- **Files modified:** `src/lib/auth/__tests__/jwt-org.test.ts`
- **Commit:** 5c4cb7e

**2. [Rule 3 - Blocking] jest.config.ts testPathIgnorePatterns excluded worktree tests**
- **Found during:** Task 1 setup — jest found 21 matching tests but ran 0 due to `/\.claude/` in testPathIgnorePatterns
- **Issue:** Worktree files live under `.claude/worktrees/agent-*/src/` which matched the ignore pattern
- **Fix:** Removed `/\.claude/` from `testPathIgnorePatterns` in the worktree's `jest.config.ts` so tests in this worktree can execute
- **Files modified:** `jest.config.ts`
- **Commit:** 5c4cb7e

## Known Stubs

None — all plan goals achieved with real implementation. `assertOrgOwnership()` is wired to the real TokenCollection model and ready for Plan 04 to apply to all 17 routes.

## Threat Flags

None — all new surface is within the existing auth layer scope and covered by the plan's threat model (T-22-02 through T-22-07).

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/lib/auth/assert-org-ownership.ts | FOUND |
| src/lib/auth/__tests__/jwt-org.test.ts | FOUND |
| src/lib/auth/__tests__/demo-session-org.test.ts | FOUND |
| src/lib/auth/__tests__/assert-org-ownership.test.ts | FOUND |
| Commit 5c4cb7e (Task 1) | FOUND |
| Commit 82a8c52 (Task 2) | FOUND |
| Commit fd8e209 (Task 3) | FOUND |
| 15 tests passing | VERIFIED |
| TypeScript compiles clean | VERIFIED (tsc --noEmit exit 0) |
