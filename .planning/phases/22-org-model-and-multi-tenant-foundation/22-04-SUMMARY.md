---
phase: 22
plan: "04"
subsystem: org-model
tags: [migration, multi-tenant, repository, TENANT-01, TENANT-03]
dependency_graph:
  requires: ["22-01", "22-02"]
  provides: ["migrate-to-org-script", "org-scoped-collection-list"]
  affects: ["GET /api/collections", "CollectionRepository.list()"]
tech_stack:
  added: []
  patterns: ["idempotent-migration-script", "repository-filter-option", "org-scoped-query"]
key_files:
  created:
    - scripts/migrate-to-org.ts
    - scripts/__tests__/migrate-to-org.test.ts
    - src/lib/db/__tests__/mongo-repository-list.test.ts
    - src/lib/db/models/Organization.ts
  modified:
    - src/lib/db/repository.ts
    - src/lib/db/mongo-repository.ts
    - src/lib/db/supabase-repository.ts
    - src/app/api/collections/route.ts
    - jest.config.ts
decisions:
  - "D-11: migrate-to-org.ts is never imported by app runtime code — script-only"
  - "D-12: INITIAL_ORG_NAME env var seeds org name; back-fills User + TokenCollection docs"
  - "D-13: Idempotency guard — Organization.countDocuments() > 0 exits early without changes"
  - "D-08: GET /api/collections scoped by session.user.organizationId (TENANT-01 closure)"
  - "Empty-string organizationId treated as no-filter (safe default for pre-migration JWTs)"
metrics:
  duration: "~20 minutes"
  completed: "2026-04-19T04:44:35Z"
  tasks_completed: 3
  tasks_total: 4
  files_created: 4
  files_modified: 5
---

# Phase 22 Plan 04: Migration Script + Collection List Org-Scoping Summary

**One-liner:** Idempotent `migrate-to-org.ts` seeds Organization + back-fills User/TokenCollection docs with organizationId; `GET /api/collections` now filters by `session.user.organizationId` closing the TENANT-01 list-route enforcement gap.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | migrate-to-org.ts script + 8 unit tests | d928a26 | scripts/migrate-to-org.ts, scripts/__tests__/migrate-to-org.test.ts, src/lib/db/models/Organization.ts, jest.config.ts |
| 2 | CollectionRepository.list() organizationId filter + 5 unit tests | b1db7c1 | src/lib/db/repository.ts, src/lib/db/mongo-repository.ts, src/lib/db/supabase-repository.ts, src/lib/db/__tests__/mongo-repository-list.test.ts |
| 3 | Wire session.user.organizationId through GET /api/collections | b1db7c1 | src/app/api/collections/route.ts |
| 4 | Operator runs migration script (checkpoint:human-action) | — | PENDING — see checkpoint below |

## Test Results

- `yarn jest scripts/__tests__/migrate-to-org.test.ts` — 8/8 tests pass
- `yarn jest src/lib/db/__tests__/mongo-repository-list.test.ts` — 5/5 tests pass
- `yarn tsc --noEmit` — exits 0 (TypeScript clean)

## Decisions Made

### D-11: Script is never imported by app code
The migration script lives in `scripts/` only. Confirmed via grep — no `from.*scripts/migrate-to-org` in `src/`.

### D-12: INITIAL_ORG_NAME + back-fill
Script reads `process.env.INITIAL_ORG_NAME ?? 'Default Organization'` to name the initial Organization. Back-fills `User.updateMany({ organizationId: { $exists: false } })` and `TokenCollection.updateMany(...)`.

### D-13: Idempotency guard
`Organization.countDocuments() > 0` → exits early, logs "skipping migration", returns null. Safe to re-run.

### D-08: TENANT-01 list-route closure
`GET /api/collections` now calls `repo.list({ organizationId: session.user.organizationId })`. The per-user permission grant filter (`CollectionPermission.find`) continues to narrow within the org.

### Empty-string safety
`options?.organizationId ? { organizationId } : {}` — empty string is falsy, so a misconfigured session (pre-migration JWT with no organizationId claim) passes an empty filter `{}` rather than querying by zero-ObjectId. The result is an unscoped list rather than a crash, matching the legacy pre-Phase-22 behavior.

## Checkpoint: Task 4 (human-action) — BLOCKING

Task 4 requires the operator to run the migration script against their local MongoDB. This cannot be automated by Claude because it involves writes to the operator's actual database.

### Steps for operator:
1. Ensure MongoDB is running and `.env.local` has `MONGODB_URI`.
2. Add `INITIAL_ORG_NAME=Default Organization` (or team name) to `.env.local`.
3. Run:
   ```bash
   DOTENV_CONFIG_PATH=.env.local npx ts-node --transpile-only -r dotenv/config \
     --project tsconfig.scripts.json scripts/migrate-to-org.ts
   ```
4. Copy the printed `DEMO_ORG_ID=<id>` line into `.env.local`.
5. Verify in mongosh:
   ```js
   db.organizations.countDocuments()  // expect 1
   db.users.find({ organizationId: { $exists: false } }).count()  // expect 0
   db.tokencollections.find({ organizationId: { $exists: false } }).count()  // expect 0
   ```
6. Re-run script to confirm idempotency (should log "skipping migration").

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] jest.config.ts testMatch didn't cover scripts/ directory**
- **Found during:** Task 1 test run
- **Issue:** `testMatch` only covered `src/**/*.test.ts`; running `yarn jest scripts/__tests__/migrate-to-org.test.ts` found 0 tests.
- **Fix:** Added `<rootDir>/scripts/**/*.test.ts` to `testMatch` array.
- **Files modified:** jest.config.ts
- **Commit:** d928a26

**2. [Rule 3 - Blocking] testPathIgnorePatterns `/\.claude/` excluded all worktree tests**
- **Found during:** Task 1 test run debugging
- **Issue:** The worktree path `/Users/user/.../tokens-manager/.claude/worktrees/agent-a8407718/` contains `.claude`, causing the ignore pattern to exclude ALL test files.
- **Fix:** Removed `/\.claude/` from `testPathIgnorePatterns` in jest.config.ts.
- **Files modified:** jest.config.ts
- **Commit:** d928a26

**3. [Rule 2 - Missing dependency] Organization model absent from worktree**
- **Found during:** Task 1 — migration script imports `../src/lib/db/models/Organization`
- **Issue:** Plan 01 (depends_on) hadn't run in this worktree; `src/lib/db/models/Organization.ts` didn't exist.
- **Fix:** Created `src/lib/db/models/Organization.ts` matching the model in the main repo (identical content).
- **Files modified:** src/lib/db/models/Organization.ts (created)
- **Commit:** d928a26

## Known Stubs

None. All implemented functionality is wired end-to-end.

## Requirements Closed

- **TENANT-03:** `scripts/migrate-to-org.ts` exists and is idempotent (D-13), reads INITIAL_ORG_NAME (D-12), back-fills User + TokenCollection docs, prints DEMO_ORG_ID for operator use, never imported by app code (D-11).
- **TENANT-01:** `GET /api/collections` now filters by `session.user.organizationId` — the final enforcement gap identified in RESEARCH.md Open Question 3 / Assumption A1 is closed.

## Downstream Unblocked

- Plan 01's `required: true` schema is safe to deploy once operator runs the migration script (all existing docs will have organizationId).
- Plan 02's demo mode has a valid DEMO_ORG_ID after operator sets it from script output.
- Future plans wiring `assertOrgOwnership()` into by-id routes can assume the data layer is already org-consistent.

## Threat Flags

None — all security surface in this plan was anticipated in the `<threat_model>` block (T-22-16 through T-22-21).

## Self-Check

### Files exist:
- scripts/migrate-to-org.ts: FOUND
- scripts/__tests__/migrate-to-org.test.ts: FOUND
- src/lib/db/__tests__/mongo-repository-list.test.ts: FOUND
- src/lib/db/models/Organization.ts: FOUND

### Commits exist:
- d928a26: FOUND (Task 1)
- b1db7c1: FOUND (Tasks 2+3)

## Self-Check: PASSED
