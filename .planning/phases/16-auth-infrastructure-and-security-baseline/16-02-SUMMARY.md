---
phase: 16-auth-infrastructure-and-security-baseline
plan: 02
subsystem: auth
tags: [mongoose, permissions, rbac, invite-tokens, crypto, mongodb]

# Dependency graph
requires:
  - phase: 16-01
    provides: next-auth package, TypeScript session types, CVE patch

provides:
  - "Role type and Action const object (source of truth in permissions.ts)"
  - "canPerform(role, action) pure function for RBAC checks"
  - "generateInviteToken, hashToken, isInviteExpired utilities using Node.js crypto"
  - "User Mongoose model with displayName, email, passwordHash, role, status"
  - "Invite Mongoose model with token hash, status, expiresAt, createdBy, role"
  - "CollectionPermission Mongoose model for per-collection role overrides"

affects:
  - "Phase 17 — sign-in credentials provider imports User model"
  - "Phase 18 — protected route handlers use canPerform"
  - "Phase 19 — RBAC middleware imports canPerform and CollectionPermission"
  - "Phase 20 — invite flow uses Invite model and invite.ts utilities"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Mongoose hot-reload guard: (mongoose.models.X as Model<XDoc>) || mongoose.model<XDoc>(...)"
    - "Role imported from permissions.ts as source of truth; User.ts re-exports it for downstream consumers"
    - "Action as const object (not enum) for runtime-accessible values and TypeScript type safety"

key-files:
  created:
    - src/lib/auth/permissions.ts
    - src/lib/auth/invite.ts
    - src/lib/db/models/User.ts
    - src/lib/db/models/Invite.ts
    - src/lib/db/models/CollectionPermission.ts
  modified: []

key-decisions:
  - "Action is a const object (not enum) — enables both runtime iteration (Object.values) and TypeScript type inference"
  - "permissions.ts is the single source of truth for Role type — User.ts re-exports it so Invite.ts can import from User.ts"
  - "canPerform is the only exported function — no isAdmin()/isEditor() helpers per PERM-01/02"
  - "DeleteCollection is Admin-only — not in Editor set"
  - "invite.ts uses Node.js built-in crypto only — no jsonwebtoken dependency"
  - "Invite token: plaintext sent in email, SHA-256 hash stored in DB"
  - "No TTL index on Invite.expiresAt — documents kept with status=accepted for audit trail"
  - "CollectionPermission uses compound unique index (userId, collectionId) for one override per user per collection"

patterns-established:
  - "Mongoose model pattern: IDocument interface, Schema<Doc>, hot-reload guard matching TokenCollection.ts"
  - "Permission check: import canPerform from permissions.ts, call canPerform(role, Action.X) directly"

requirements-completed: [ARCH-01]

# Metrics
duration: 4min
completed: 2026-03-28
---

# Phase 16 Plan 02: Auth Utilities and Mongoose Models Summary

**Role-based permission system (permissions.ts + canPerform) and three Mongoose models (User, Invite, CollectionPermission) providing the data layer for all subsequent auth phases**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-28T05:02:05Z
- **Completed:** 2026-03-28T05:05:42Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created `src/lib/auth/permissions.ts` with Role type, Action const object, ActionType, and canPerform pure function implementing Admin/Editor/Viewer permission sets
- Created `src/lib/auth/invite.ts` with generateInviteToken, hashToken, and isInviteExpired using Node.js built-in crypto
- Created three Mongoose models (User, Invite, CollectionPermission) matching the TokenCollection.ts hot-reload guard pattern with correct schemas, indexes, and timestamps

## Task Commits

Each task was committed atomically:

1. **Task 1: Create permissions.ts and invite.ts in src/lib/auth/** - `440f434` (feat)
2. **Task 2: Create User, Invite, and CollectionPermission Mongoose models** - `7d49943` (feat)

**Plan metadata:** *(to be added in final commit)*

## Files Created/Modified
- `src/lib/auth/permissions.ts` - Role type, Action const object, ActionType, canPerform pure function; source of truth for all permission checks
- `src/lib/auth/invite.ts` - generateInviteToken (64 hex chars), hashToken (SHA-256), isInviteExpired; Node.js crypto only
- `src/lib/db/models/User.ts` - User Mongoose model; re-exports Role from permissions.ts for downstream consumers
- `src/lib/db/models/Invite.ts` - Invite Mongoose model; token field stores SHA-256 hash; 7-day default expiry
- `src/lib/db/models/CollectionPermission.ts` - Per-collection role override model; compound unique index (userId, collectionId)

## Decisions Made
- Action is a const object (not TypeScript enum) — enables both runtime Object.values() iteration for PERMISSIONS table and TypeScript type inference via `typeof Action[keyof typeof Action]`
- permissions.ts is the canonical Role source — User.ts re-exports it so Invite.ts can import Role from User.ts without circular deps
- No isAdmin()/isEditor() helpers exported — canPerform is the only API per PERM-01/02; prevents scattered ad-hoc role checks
- DeleteCollection is Admin-only — Editor set explicitly excludes it to protect collection lifecycle
- No TTL index on Invite.expiresAt — accepted invites retained for audit trail; expiry checked in application logic via isInviteExpired()
- CollectionPermission compound unique index enforces one role override per (user, collection) pair at the DB level

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All five files ready for import by Phase 17 (sign-in Credentials provider uses User model and bcrypt)
- canPerform importable by Phase 18/19 route handlers and RBAC middleware
- Invite model and invite.ts utilities ready for Phase 20 invite flow
- yarn build passes with zero TypeScript errors confirming no type conflicts

## Self-Check: PASSED

- src/lib/auth/permissions.ts: FOUND
- src/lib/auth/invite.ts: FOUND
- src/lib/db/models/User.ts: FOUND
- src/lib/db/models/Invite.ts: FOUND
- src/lib/db/models/CollectionPermission.ts: FOUND
- .planning/phases/16-auth-infrastructure-and-security-baseline/16-02-SUMMARY.md: FOUND
- Commit 440f434 (Task 1): FOUND
- Commit 7d49943 (Task 2): FOUND

---
*Phase: 16-auth-infrastructure-and-security-baseline*
*Completed: 2026-03-28*
