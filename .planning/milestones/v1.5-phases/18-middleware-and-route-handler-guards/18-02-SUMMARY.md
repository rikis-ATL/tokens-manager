---
phase: 18-middleware-and-route-handler-guards
plan: 02
subsystem: api-security
tags: [auth, route-handlers, requireAuth, security, ARCH-02]
dependency_graph:
  requires:
    - 18-01  # requireAuth() utility and middleware.ts
  provides:
    - requireAuth guards on all 17 write Route Handlers
    - documented bootstrap exception on POST /api/auth/setup
  affects:
    - src/app/api/collections/route.ts
    - src/app/api/collections/[id]/route.ts
    - src/app/api/collections/[id]/duplicate/route.ts
    - src/app/api/collections/[id]/themes/route.ts
    - src/app/api/collections/[id]/themes/[themeId]/route.ts
    - src/app/api/collections/[id]/themes/[themeId]/tokens/route.ts
    - src/app/api/export/github/route.ts
    - src/app/api/import/github/route.ts
    - src/app/api/figma/import/route.ts
    - src/app/api/export/figma/route.ts
    - src/app/api/tokens/[...path]/route.ts
    - src/app/api/build-tokens/route.ts
    - src/app/api/database/config/route.ts
    - src/app/api/database/test/route.ts
    - src/app/api/github/branches/route.ts
    - src/app/api/auth/setup/route.ts (documentation comment only)
tech_stack:
  added: []
  patterns:
    - "requireAuth() early-return guard — first two statements in every write handler"
    - "instanceof NextResponse check — returns 401 {error:Unauthorized} on unauthenticated requests"
    - "Bootstrap exception — POST /api/auth/setup intentionally excluded with block comment"
key_files:
  created: []
  modified:
    - src/app/api/collections/route.ts
    - src/app/api/collections/[id]/route.ts
    - src/app/api/collections/[id]/duplicate/route.ts
    - src/app/api/collections/[id]/themes/route.ts
    - src/app/api/collections/[id]/themes/[themeId]/route.ts
    - src/app/api/collections/[id]/themes/[themeId]/tokens/route.ts
    - src/app/api/export/github/route.ts
    - src/app/api/import/github/route.ts
    - src/app/api/figma/import/route.ts
    - src/app/api/export/figma/route.ts
    - src/app/api/tokens/[...path]/route.ts
    - src/app/api/build-tokens/route.ts
    - src/app/api/database/config/route.ts
    - src/app/api/database/test/route.ts
    - src/app/api/github/branches/route.ts
    - src/app/api/auth/setup/route.ts
decisions:
  - "17 handlers guarded with requireAuth(); POST /api/auth/setup is 1 documented bootstrap exception (ARCH-02 satisfied)"
  - "GET handlers in all files left unguarded — ARCH-02 specifies write handlers only"
  - "Guard placed before try{} block (or as first statement when no try{}) — early return prevents any business logic executing on unauthenticated requests"
metrics:
  duration: "4 minutes"
  completed_date: "2026-03-28"
  tasks_completed: 2
  files_modified: 16
---

# Phase 18 Plan 02: Route Handler Guards Summary

requireAuth() guard applied to all 17 write Route Handlers across 15 route files using the early-return pattern (const authResult = await requireAuth(); if (authResult instanceof NextResponse) return authResult); POST /api/auth/setup documented as intentional bootstrap exception with block comment.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Guard collection and theme write handlers (1-8) | 09ed666 | 6 route files |
| 2 | Guard export/import/build/database/github handlers (9-17) + document setup exception | daefb4f | 10 route files |

## What Was Built

### Handler Coverage

All 18 write Route Handlers are now accounted for:

| # | Method | Route | Guard |
|---|--------|-------|-------|
| 1 | POST | /api/collections | requireAuth() |
| 2 | PUT | /api/collections/[id] | requireAuth() |
| 3 | DELETE | /api/collections/[id] | requireAuth() |
| 4 | POST | /api/collections/[id]/duplicate | requireAuth() |
| 5 | POST | /api/collections/[id]/themes | requireAuth() |
| 6 | PUT | /api/collections/[id]/themes/[themeId] | requireAuth() |
| 7 | DELETE | /api/collections/[id]/themes/[themeId] | requireAuth() |
| 8 | PATCH | /api/collections/[id]/themes/[themeId]/tokens | requireAuth() |
| 9 | POST | /api/export/github | requireAuth() |
| 10 | POST | /api/import/github | requireAuth() |
| 11 | POST | /api/figma/import | requireAuth() |
| 12 | POST | /api/export/figma | requireAuth() |
| 13 | PUT | /api/tokens/[...path] | requireAuth() |
| 14 | POST | /api/build-tokens | requireAuth() |
| 15 | PUT | /api/database/config | requireAuth() |
| 16 | POST | /api/database/test | requireAuth() |
| 17 | POST | /api/github/branches | requireAuth() |
| 18 | POST | /api/auth/setup | DOCUMENTED EXCEPTION (bootstrap) |

### Guard Pattern Applied

```typescript
import { requireAuth } from '@/lib/auth/require-auth';

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  try {
    // ... existing handler body unchanged ...
  } catch (error) {
    // ... existing error handling ...
  }
}
```

### Bootstrap Exception

`POST /api/auth/setup` has a block comment explaining why it is intentionally excluded from requireAuth():

```typescript
/**
 * POST /api/auth/setup — intentionally excluded from requireAuth().
 *
 * This is the bootstrap endpoint: it creates the first Admin user when no users
 * exist in the database. Adding requireAuth() would break first-time setup
 * because there is no session to authenticate against before the first user is created.
 *
 * The existing guard (count > 0 returns 403) prevents abuse after setup is complete.
 * This is the one intentional exception to ARCH-02 (17 handlers guarded, 1 documented exception).
 */
```

## Verification Results

- `npx tsc --noEmit`: 0 errors
- `grep -rl "requireAuth" src/app/api/` excluding auth/setup and nextauth: 15 files
- `grep -c "requireAuth" src/app/api/collections/[id]/route.ts`: 3 (1 import + 2 guard lines for PUT + DELETE)
- `src/app/api/auth/setup/route.ts`: exception comment present, no requireAuth() call
- GET handlers in all files: unchanged

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED
