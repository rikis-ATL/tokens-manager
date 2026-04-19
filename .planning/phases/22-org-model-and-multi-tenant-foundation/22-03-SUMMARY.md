---
phase: 22
plan: 03
subsystem: auth
tags: [signup, organization, multi-tenant, next-auth, zod, bcrypt, tdd]
dependency_graph:
  requires: [Organization model (22-01), User.organizationId (22-01)]
  provides: [POST /api/auth/signup, /auth/signup page, atomic Org+User creation]
  affects: [src/app/api/auth/signup/route.ts, src/app/auth/signup/page.tsx]
tech_stack:
  added: []
  patterns: [zod schema validation, bcrypt cost-12 hashing, catch-and-delete rollback (Pitfall 5), TDD RED/GREEN]
key_files:
  created:
    - src/app/api/auth/signup/route.ts
    - src/app/api/auth/signup/__tests__/route.test.ts
    - src/app/auth/signup/page.tsx
  modified: []
decisions:
  - "D-03: Dedicated /auth/signup page — anyone can create an org via self-serve signup"
  - "D-04: Four fields on signup form — orgName, displayName, email, password"
  - "D-05: /api/auth/setup stays unchanged — separate bootstrap path for super-admin"
  - "Pitfall 5 rollback: catch-and-delete on orphaned Organization if User.create fails; no MongoDB transactions"
  - "Hard-coded role:Admin and organizationId:org._id — attacker-supplied values ignored (T-22-11)"
  - "Email pre-check before Organization creation — fails fast without orphan creation on duplicate"
metrics:
  duration: ~20 minutes
  completed: "2026-04-19"
  tasks_completed: 3
  files_changed: 3
---

# Phase 22 Plan 03: Self-Serve Signup Flow Summary

**One-liner:** POST /api/auth/signup creates Organization + Admin User atomically with zod validation, bcrypt-12 hashing, and catch-and-delete rollback; /auth/signup renders a four-field form with auto-signin on success (D-03, D-04, TENANT-02).

## What Was Built

### Task 1: POST /api/auth/signup Route (TDD)

Created `src/app/api/auth/signup/route.ts`:
- Zod schema validates `orgName`, `displayName`, `email`, `password` (min 8 chars)
- Email lowercased at validation time; `.trim()` applied to string fields
- Pre-checks email uniqueness via `User.findOne({ email }).lean()` — fails before creating Org
- Creates Organization with `{ name: parsed.orgName }`
- Hashes password via `bcrypt.hash(parsed.password, 12)` — never stores plaintext (T-22-14)
- Creates User with `role: 'Admin'`, `status: 'active'`, `organizationId: org._id` — hard-coded, not user-supplied (T-22-11)
- Returns 201 `{ ok: true, organizationId }` on success
- Catch block deletes orphaned Organization if User.create fails (Pitfall 5 rollback)
- Returns 400 on invalid input, 409 on duplicate email, 500 on partial failure
- No `requireAuth()` — intentionally unauthenticated (matches setup route pattern, D-03)
- `src/app/api/auth/setup/route.ts` untouched — D-05 regression verified

Created `src/app/api/auth/signup/__tests__/route.test.ts`:
- 10 unit tests covering all success and error paths
- TDD: RED commit before route existed, GREEN after

### Task 2: /auth/signup Page

Created `src/app/auth/signup/page.tsx`:
- `'use client'` directive — mirrors sign-in page structure
- Four fields in order per D-04: Organization name, Your name, Email, Password
- Client-side password length check (< 8) before fetch — UX hint, server is authoritative
- POSTs `{ orgName, displayName, email, password }` to `/api/auth/signup`
- On 201: calls `signIn('credentials', { redirect: false, email, password })` then `router.push('/')`
- Auto-signin failure fallback: error message + redirect to `/auth/sign-in`
- Error display for API error responses (reads `data.error`)
- Loading state with Loader2 spinner in submit button
- "Already have an account? Sign in" link to `/auth/sign-in`
- Wrapped in matching chrome: `min-h-screen flex items-center justify-center bg-gray-50`

## Test Results

All 10 route tests pass:

| Test | Status |
|------|--------|
| creates Org and Admin User atomically on valid input | PASS |
| returns 400 when orgName missing | PASS |
| returns 400 when displayName missing | PASS |
| returns 400 when email is not email-shaped | PASS |
| returns 400 when password < 8 chars | PASS |
| returns 409 on duplicate email without creating an Organization | PASS |
| rolls back the Organization when User.create throws (Pitfall 5) | PASS |
| lowercases the email before storage | PASS |
| hashes the password via bcrypt (never stores plain text) | PASS |
| does not touch /api/auth/setup route (D-05 regression guard) | PASS |

TypeScript: `yarn tsc --noEmit` exits 0.

## Deviations from Plan

None — plan executed exactly as written.

## Human Verification Checkpoint (Task 3)

**Status: APPROVED** — End-to-end browser verification passed by user on 2026-04-19.

Verified:
- Dev server running, navigated to `/auth/signup` in incognito
- Four fields with correct labels (Organization name, Your name, Email, Password)
- Client-side validation (password < 8 chars) shows inline red error
- Valid submission → redirect to `/`, MongoDB confirmed Org + User docs created
- Duplicate email → 409 "Email already in use" displayed
- Sign-in with created credentials succeeded
- Regression check: `/auth/setup` behavior unchanged (D-05)

## Known Stubs

None — the signup flow is fully wired. The page POSTs to the real API route which writes to MongoDB. The auto-signin uses real next-auth credentials flow.

Note: If Plan 02 (`assertOrgOwnership()`) is not yet deployed, `session.user.organizationId` will be empty string after signup — this is acceptable for the signup checkpoint itself; ownership enforcement is Plan 02's concern.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: unauthenticated-write | src/app/api/auth/signup/route.ts | New unauthenticated POST endpoint creating Org+User docs. Mitigations in place: zod validation (T-22-12), bcrypt hashing (T-22-14), hard-coded role (T-22-11). DOS risk accepted per T-22-09 (rate limiting is Phase 23). |

## Self-Check

Files created:
- [x] src/app/api/auth/signup/route.ts — FOUND
- [x] src/app/api/auth/signup/__tests__/route.test.ts — FOUND
- [x] src/app/auth/signup/page.tsx — FOUND

Commits:
- [x] 256f951 — test(22-03): add failing tests for POST /api/auth/signup route (RED)
- [x] 105fda6 — feat(22-03): POST /api/auth/signup — atomic Org+Admin User creation with rollback
- [x] 87c9bcd — feat(22-03): /auth/signup page — 4-field self-serve org signup form (D-04)

D-05 verified: `git diff src/app/api/auth/setup/route.ts` — no output.

## Self-Check: PASSED
