# Phase 22: Org Model and Multi-Tenant Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 22-org-model-and-multi-tenant-foundation
**Areas discussed:** Organization model fields, Self-serve signup flow, assertOrgOwnership() design, Migration bootstrap strategy

---

## Organization Model Fields

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal — name + timestamps | name, createdAt, updatedAt only | ✓ |
| Include planTier now | Add planTier (default 'free') to avoid Phase 23 migration | |
| Include slug + ownerId | URL-safe slug + explicit owner reference | |

**User's choice:** Minimal — name + timestamps
**Notes:** planTier belongs in Phase 23 when billing module exists. Clean separation.

| Option | Description | Selected |
|--------|-------------|----------|
| Required after migration bootstrap | Schema enforces required: true; migration back-fills first | ✓ |
| Optional with null default | Schema allows null; API handles null indefinitely | |

**User's choice:** organizationId required on both User and TokenCollection after migration back-fill.

---

## Self-Serve Signup Flow

| Option | Description | Selected |
|--------|-------------|----------|
| New /signup page, anyone can create an org | Dedicated route, fully self-serve | ✓ |
| Extend /setup bootstrap to include org | Conflates first-admin bootstrap with self-serve signup | |
| Admin creates org, then invites users | No public signup; invite-only | |

**User's choice:** New /signup page

| Option | Description | Selected |
|--------|-------------|----------|
| Org name + email + password | Three fields | |
| Org name + display name + email + password | Four fields | ✓ |

**User's choice:** Four fields — org name, display name, email, password.

---

## assertOrgOwnership() Design

| Option | Description | Selected |
|--------|-------------|----------|
| Separate function, called after requireAuth() | Explicit, composable, follows existing pattern | ✓ |
| Combined into requireAuth() with optional collectionId | Overloads existing utility used in 17 handlers | |

**User's choice:** Separate function

| Option | Description | Selected |
|--------|-------------|----------|
| 403 Forbidden | Explicit access denial, consistent with requireRole() | ✓ |
| 404 Not Found | Security-through-obscurity, prevents enumeration | |

**User's choice:** 403 Forbidden

---

## Migration Bootstrap Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| On first API hit (lazy) | No-ops after first run; zero ops burden | |
| Dedicated /api/migrate endpoint | Manual trigger; safer for large prod datasets | |
| Run-once script (scripts/migrate-to-org.ts) | One-off utility, not app runtime code | ✓ |

**User's choice:** One-off utility script committed to the repo
**Notes:** User clarified that only their own data (super admin's user + collections) needs migrating. New orgs are empty. No runtime migration code needed in the app. Script outputs the seeded org _id to set as DEMO_ORG_ID.

---

## Demo Mode (surfaced during discussion)

| Option | Description | Selected |
|--------|-------------|----------|
| DEMO_ORG_ID env var | Set from migration script output; fast, no DB hit | ✓ |
| Runtime lookup by INITIAL_ORG_NAME | DB hit per session request | |

**User's choice:** DEMO_ORG_ID env var
**Notes:** User wants their own org to be the demo (no login). Demo session must include organizationId so assertOrgOwnership() passes for existing collections.

---

## JWT Extension

| Option | Description | Selected |
|--------|-------------|----------|
| Store organizationId in JWT | No DB hit per request; consistent with role handling today | ✓ |
| Look up from DB per request | Always fresh but adds DB query to every protected route | |

**User's choice:** Store in JWT alongside id and role

---

## Claude's Discretion

- API route structure for org creation during signup
- Whether to use `/api/auth/signup` or `/api/orgs/create`
- Exact error messages for 403 responses

## Deferred Ideas

- Org slug / URL-scoped routes
- planTier field on Organization (Phase 23)
- ownerId field on Organization
- Multiple orgs per user
