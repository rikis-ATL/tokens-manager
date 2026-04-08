# Phase 16: Auth Infrastructure and Security Baseline - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Backend-only foundation — patch CVE-2025-29927 (upgrade to next@13.5.9), install NextAuth and dependencies, define Mongoose models (User, Invite, CollectionPermission), create `src/lib/auth/` module with authOptions, permissions pure function, and invite utility. Nothing user-facing. Produces the infrastructure that Phases 17–21 build on.

</domain>

<decisions>
## Implementation Decisions

### User model fields
- Fields: `displayName`, `email`, `passwordHash`, `role`, `status`
- Role enum: `'Admin' | 'Editor' | 'Viewer'`
- Status enum: `'active' | 'invited' | 'disabled'`
- Enable Mongoose `timestamps: true` (automatic `createdAt`, `updatedAt`)

### JWT strategy and session lifetime
- JWT-only, stateless — no sessions collection in MongoDB
- Session duration: 30 days
- JWT payload: `id` and `role` only (no email, no displayName)
- SUPER_ADMIN_EMAIL enforcement: jwt callback forces `role = 'Admin'` in the token; DB record is not touched

### Permissions function interface
- Single pure function: `canPerform(role: Role, action: Action): boolean`
- `Action` exported as a TypeScript `const` object (not enum, not plain strings) — e.g. `Action.Write`, `Action.ManageUsers`
- Full action set defined now based on PERM-01–03: `Read`, `Write`, `CreateCollection`, `DeleteCollection`, `ManageUsers`, `PushGithub`, `PushFigma`
- Only `canPerform()` exported from `permissions.ts` — no isAdmin/isEditor helpers

### Invite model fields
- Fields: `email`, `token`, `status`, `expiresAt`, `createdBy`, `role`
- Status enum: `'pending' | 'accepted' | 'expired'`
- Default expiry: 7 days from creation
- After account setup: status set to `'accepted'` — document kept for audit trail
- Role stored on Invite — set by the inviting Admin at invite time; new user inherits this role on account setup

### Claude's Discretion
- Token generation method for invite tokens (crypto.randomBytes or uuid)
- CollectionPermission schema field names and index design
- bcrypt salt rounds for password hashing
- NextAuth provider configuration details (CredentialsProvider internals)
- TypeScript module augmentation approach for JWT/session types

</decisions>

<specifics>
## Specific Ideas

- No specific references — standard NextAuth + Mongoose patterns apply
- Least-privilege: invited users get the role the Admin set, not a hardcoded default
- SUPER_ADMIN_EMAIL is a pure JWT override — no DB side effects

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-auth-infrastructure-and-security-baseline*
*Context gathered: 2026-03-28*
