---
phase: 20
plan: 01
subsystem: invite-api
tags: [invite, email, resend, api, auth]
dependency_graph:
  requires: [src/lib/auth/invite.ts, src/lib/auth/require-auth.ts, src/lib/db/models/User.ts]
  provides: [invite-create-api, invite-list-api, invite-revoke-api, invite-resend-api, invite-validate-api]
  affects: [phase-20-plan-02, phase-20-plan-03]
tech_stack:
  added: [resend@^4.x]
  patterns: [token-hash-store, email-rollback-on-failure, public-validate-endpoint]
key_files:
  created:
    - src/lib/email/invite-email.ts
    - src/app/api/invites/route.ts
    - src/app/api/invites/validate/route.ts
    - src/app/api/invites/[id]/route.ts
    - src/app/api/invites/[id]/resend/route.ts
  modified:
    - src/lib/db/models/Invite.ts
    - next.config.js
    - package.json
    - yarn.lock
decisions:
  - resend added to serverComponentsExternalPackages to prevent webpack bundling @react-email/render (optional peer dep)
  - POST /api/invites rolls back Invite document if Resend email send fails — atomicity via delete-on-error
  - GET /api/invites/validate is public (no requireRole) — must be accessible pre-login on the setup page
  - Duplicate check covers both active User account (409) and pending non-expired Invite (409)
metrics:
  duration: "~30 min (split across two sessions)"
  completed_date: "2026-03-28"
  tasks_completed: 2
  files_changed: 9
requirements:
  - USER-02
  - USER-03
  - USER-07
---

# Phase 20 Plan 01: Invite API Foundation Summary

**One-liner:** Resend-backed invite API with hashed token storage, duplicate guards, and public validate endpoint for the setup page.

## What Was Built

Five invite API route handlers plus an email HTML utility, providing the full invite lifecycle foundation that Plans 02 and 03 depend on.

### Endpoints Created

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/invites` | Admin | List all non-accepted invites sorted newest first |
| `POST` | `/api/invites` | Admin | Create invite, store hashed token, send Resend email |
| `GET` | `/api/invites/validate?token=` | Public | Validate plaintext token; return email + role for setup page |
| `DELETE` | `/api/invites/[id]` | Admin | Revoke (delete) a pending invite |
| `POST` | `/api/invites/[id]/resend` | Admin | Regenerate token, reset 7-day clock, send fresh email |

### Model Change

`src/lib/db/models/Invite.ts` — added `collectionId?: string` to both the `IInvite` TypeScript interface and the Mongoose schema. Used by the setup page for post-account-creation redirect to a specific collection.

### Email Utility

`src/lib/email/invite-email.ts` — `buildInviteEmailHtml(email, role, setupUrl)` returns a plain inline-styled HTML string. No react-email dependency per CONTEXT.md decision.

## Key Patterns

- **Token security**: `generateInviteToken()` produces a 32-byte random hex string; only the SHA-256 hash is stored in MongoDB; plaintext goes in the email link only.
- **Email rollback**: If `resend.emails.send()` fails in `POST /api/invites`, the newly-created `Invite` document is deleted before returning 500 — no orphaned invite records.
- **Duplicate guards**: POST checks for existing active User account (409) and existing pending non-expired Invite (409) before creating.
- **Public validate endpoint**: `GET /api/invites/validate` has no `requireRole` guard — it must be reachable pre-login when the invited user lands on the setup page.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added resend to serverComponentsExternalPackages**
- **Found during:** Task 2 — `yarn build` failed after installing resend
- **Issue:** `resend` package has an optional dynamic dependency on `@react-email/render`; webpack tried to bundle it, causing `Module not found: Can't resolve '@react-email/render'`
- **Fix:** Added `'resend'` to `serverComponentsExternalPackages` in `next.config.js` — webpack treats the package as a Node.js external, so the optional dep is never resolved at bundle time
- **Files modified:** `next.config.js`
- **Commit:** 9b8f1cd

## Verification

- `npx tsc --noEmit` — zero errors
- `yarn build` — passes after externalization fix
- All 6 plan artifacts confirmed present on disk

## Self-Check: PASSED

All files found:
- FOUND: src/lib/db/models/Invite.ts (with collectionId)
- FOUND: src/lib/email/invite-email.ts (exports buildInviteEmailHtml)
- FOUND: src/app/api/invites/route.ts
- FOUND: src/app/api/invites/validate/route.ts
- FOUND: src/app/api/invites/[id]/route.ts
- FOUND: src/app/api/invites/[id]/resend/route.ts
- FOUND: resend in package.json

Commits found:
- 821fdbd — feat(20-01): extend Invite model with collectionId and add email HTML utility
- 9b8f1cd — feat(20-01): build all invite API route handlers
