# Phase 22: Org Model and Multi-Tenant Foundation - Research

**Researched:** 2026-04-18
**Domain:** Multi-tenant data scoping — Mongoose models, NextAuth JWT extension, API ownership guards
**Confidence:** HIGH (all findings verified against live codebase)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Minimal schema — `name` (String, required), `createdAt`, `updatedAt` (via timestamps). No slug, ownerId, or planTier yet.
- **D-02:** `organizationId` on User and TokenCollection schemas is `required: true`. Migration script back-fills existing docs before this constraint is enforced in production.
- **D-03:** New dedicated `/signup` page — not an extension of `/api/auth/setup`. Anyone can create an org by signing up.
- **D-04:** Signup form collects four fields: org name, display name, email, password. Creates Organization first, then creates User as Admin scoped to that org.
- **D-05:** Existing `/api/auth/setup` bootstrap remains unchanged.
- **D-06:** `assertOrgOwnership()` is a standalone function called after `requireAuth()` — does not modify or replace `requireAuth()`.
- **D-07:** Signature: `assertOrgOwnership(session: Session, collectionId: string): Promise<NextResponse | null>` — returns `null` on success, `NextResponse 403` on org mismatch.
- **D-08:** Must be applied to all collection routes: `GET/PUT /api/collections/[id]`, themes CRUD, export, Figma, GitHub routes.
- **D-09:** `organizationId` stored in JWT token. Added in `jwt` callback in `nextauth.config.ts` at initial sign-in. `assertOrgOwnership()` reads from `session.user.organizationId` — no DB hit per request.
- **D-10:** Demo mode session returns `organizationId` from `DEMO_ORG_ID` env var.
- **D-11:** No runtime migration code in the app. Migration is a committed one-off utility script at `scripts/migrate-to-org.ts`.
- **D-12:** Script creates one Organization document (name from `INITIAL_ORG_NAME` env var), back-fills `organizationId` on all existing User and TokenCollection docs.
- **D-13:** Script is idempotent: if `Organization.countDocuments() > 0`, skip and exit.
- **D-14:** Add compound indexes `(organizationId, _id)` on User and TokenCollection collections.

### Claude's Discretion

- API route for org creation during signup (likely `POST /api/auth/signup` or `/api/orgs/create`)
- Whether signup API route is a new `/api/auth/signup` or `/api/orgs/create`
- Exact error messages for 403 responses from `assertOrgOwnership()`

### Deferred Ideas (OUT OF SCOPE)

- Org slug / URL-scoped routes (e.g. `/orgs/acme/...`) — future phase
- `planTier` on Organization model — Phase 23
- `ownerId` field on Organization — not required for Phase 22
- Multiple orgs per user — out of scope; each user belongs to exactly one org
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TENANT-01 | All users and collections are scoped to an organization via organizationId | Organization model, schema extensions, `assertOrgOwnership()`, compound indexes, JWT claim |
| TENANT-02 | User can create a new organization during self-serve signup | New `/signup` page, `/api/auth/signup` route, atomic Org+User creation |
| TENANT-03 | Existing data is migrated to an org seeded from `INITIAL_ORG_NAME` env var on first boot | `scripts/migrate-to-org.ts` idempotent back-fill script |
</phase_requirements>

---

## Summary

Phase 22 adds a first-class `Organization` Mongoose model and wires `organizationId` into every User and TokenCollection document. The enforcement layer is a new `assertOrgOwnership()` function that composes after the existing `requireAuth()` in guarded route handlers, reading `organizationId` from the JWT session — zero DB hits per request. A new `/signup` page and `POST /api/auth/signup` route let anyone create a fresh org atomically. Existing single-tenant data is back-filled via a one-off utility script (`scripts/migrate-to-org.ts`) that is idempotent and never called by the app at runtime.

The existing codebase is highly amenable to this change. `requireAuth()` already returns a typed `Session`, and the JWT callback in `nextauth.config.ts` already adds custom claims (`id`, `role`, `roleLastFetched`) — extending it with `organizationId` is a one-line addition. The `next-auth.d.ts` type declaration file requires corresponding extension. The 17 collection-scoped route handlers all already call `requireAuth()` or `requireRole()`, providing clear insertion points for `assertOrgOwnership()`.

One **critical discrepancy** exists between CONTEXT.md and STATE.md and must be resolved before implementation: CONTEXT.md D-07 specifies `assertOrgOwnership()` returns a 403 on mismatch, but STATE.md records the pre-phase decision as "returns 404 not 403 — avoids confirming resource existence to cross-tenant requestors." The planner must pick one and use it consistently. Research recommendation: 404 is the security-correct choice per the STATE.md rationale; 403 reveals that the resource exists.

**Primary recommendation:** Implement `assertOrgOwnership()` to return 404 (per STATE.md security rationale), add `organizationId` as a required field to User and TokenCollection schemas with the migration script back-filling before the constraint is deployed.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| mongoose | ^9.2.2 | Organization model, schema extension, compound indexes | Already in use [VERIFIED: package.json] |
| next-auth | ^4.24.13 | JWT callback extension, session typing | Already in use [VERIFIED: package.json] |
| bcryptjs | ^2.4.3 | Password hashing for new signup route | Already in use [VERIFIED: package.json] |
| zod | ^3.23 | Input validation for signup API route | Already in use [VERIFIED: package.json] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tsx | ^4.21.0 | Running migration script via ts-node-equivalent | Use for `scripts/migrate-to-org.ts` execution [VERIFIED: package.json] |
| ts-node | ^10.9.2 | Alternative script runner | Used by existing seed scripts [VERIFIED: package.json] |
| dotenv | (transitive) | Env var loading in scripts | Scripts use `-r dotenv/config` already [VERIFIED: scripts/seed.ts] |

### No New Dependencies Required
All libraries needed for Phase 22 are already installed. No `yarn add` step needed.

---

## Architecture Patterns

### New File: Organization Model
```
src/lib/db/models/Organization.ts
```
Pattern identical to User.ts and TokenCollection.ts:
```typescript
// [VERIFIED: src/lib/db/models/User.ts] — use exact same guard pattern
const Organization: Model<OrgDoc> =
  (mongoose.models.Organization as Model<OrgDoc>) ||
  mongoose.model<OrgDoc>('Organization', orgSchema);
```

### New File: assertOrgOwnership utility
```
src/lib/auth/assert-org-ownership.ts
```

### New API Route: Signup
```
src/app/api/auth/signup/route.ts
```
(Recommendation for Claude's discretion: use `/api/auth/signup` to keep auth routes co-located under `/api/auth/`. This mirrors the existing `/api/auth/setup/route.ts` pattern.)

### New Page: /signup
```
src/app/auth/signup/page.tsx        (client component — mirrors sign-in/page.tsx)
```

### New Script: Migration
```
scripts/migrate-to-org.ts
```

### Recommended Project Structure (new files only)
```
src/
├── lib/
│   ├── auth/
│   │   └── assert-org-ownership.ts   # new — ownership enforcement
│   └── db/
│       └── models/
│           └── Organization.ts       # new — org model
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── signup/
│   │           └── route.ts          # new — POST signup endpoint
│   └── auth/
│       └── signup/
│           └── page.tsx              # new — signup UI
scripts/
└── migrate-to-org.ts                 # new — one-off back-fill
```

### Pattern 1: Organization Model (minimal schema per D-01)
```typescript
// Source: verified against src/lib/db/models/User.ts pattern
import mongoose, { Schema, Model } from 'mongoose';

interface IOrganization {
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

type OrgDoc = Omit<IOrganization, '_id'>;

const orgSchema = new Schema<OrgDoc>(
  { name: { type: String, required: true, trim: true } },
  { timestamps: true }
);

const Organization: Model<OrgDoc> =
  (mongoose.models.Organization as Model<OrgDoc>) ||
  mongoose.model<OrgDoc>('Organization', orgSchema);

export default Organization;
```
[VERIFIED: pattern from src/lib/db/models/User.ts]

### Pattern 2: Extending User schema with organizationId
```typescript
// Add to IUser interface and userSchema in src/lib/db/models/User.ts
organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true }
```
Note: `required: true` is safe only AFTER the migration script has back-filled all docs. For the initial deploy, the planner must sequence: run migration script → then deploy app with `required: true`. [ASSUMED — deployment sequencing constraint]

### Pattern 3: Compound indexes (per D-14)
```typescript
// On userSchema — prevents COLLSCAN on user-list-by-org queries
userSchema.index({ organizationId: 1, _id: 1 });

// On tokenCollectionSchema — prevents COLLSCAN on collection-list-by-org queries
tokenCollectionSchema.index({ organizationId: 1, _id: 1 });
```
[VERIFIED: STATE.md decision "Compound `{ _id, organizationId }` indexes on User and TokenCollection — prevents COLLSCAN on collection list queries"]

### Pattern 4: JWT callback extension
```typescript
// In src/lib/auth/nextauth.config.ts — jwt callback
// Source: verified against existing pattern in nextauth.config.ts lines 39-46
if (user) {
  // ...existing fields...
  token.organizationId = (user as unknown as { organizationId: string }).organizationId;
}
```
The `authorize()` function currently returns `{ id, email, name, role }`. It must also return `organizationId` from the DB lookup. [VERIFIED: src/lib/auth/nextauth.config.ts lines 28-31]

### Pattern 5: Type declaration extension
```typescript
// Extend src/types/next-auth.d.ts
declare module 'next-auth' {
  interface Session {
    demoMode?: boolean;
    user: {
      id: string;
      role: string;
      organizationId: string;   // add this
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: string;
    roleLastFetched?: number;
    organizationId?: string;    // add this
  }
}
```
[VERIFIED: src/types/next-auth.d.ts]

### Pattern 6: assertOrgOwnership() implementation
```typescript
// Source: pattern derived from requireAuth() in src/lib/auth/require-auth.ts
import type { Session } from 'next-auth';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import TokenCollection from '@/lib/db/models/TokenCollection';

export async function assertOrgOwnership(
  session: Session,
  collectionId: string
): Promise<NextResponse | null> {
  const sessionOrgId = session.user.organizationId;
  if (!sessionOrgId) {
    // Session predates org migration — treat as mismatch
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  await dbConnect();
  const collection = await TokenCollection.findById(collectionId)
    .select('organizationId')
    .lean() as { organizationId?: string } | null;

  if (!collection) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  if (collection.organizationId?.toString() !== sessionOrgId) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  return null; // ownership confirmed
}
```
**Status code note:** Research recommends 404 per STATE.md security decision ("avoids confirming resource existence to cross-tenant requestors"). CONTEXT.md D-07 says 403 — planner must resolve this conflict before implementation. 404 is the security-correct choice. [VERIFIED conflict: STATE.md line 48 vs CONTEXT.md D-07]

### Pattern 7: Route handler call site
```typescript
// After requireAuth(), before business logic — derived from existing pattern
const session = await requireAuth();
if (session instanceof NextResponse) return session;

const ownershipResult = await assertOrgOwnership(session, params.id);
if (ownershipResult !== null) return ownershipResult;

// ...business logic continues...
```
[VERIFIED: pattern from requireAuth() usage in src/app/api/collections/[id]/route.ts lines 16-17]

### Pattern 8: Demo session extension
```typescript
// In src/lib/auth/demo-session.ts — add organizationId from env var
export async function getDemoUserSession(): Promise<Session> {
  return {
    demoMode: true,
    user: {
      id: 'demo-visitor',
      email: 'demo@visitor.local',
      name: 'Demo Visitor',
      role: 'Demo',
      organizationId: process.env.DEMO_ORG_ID ?? '',  // add this
    },
    expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  };
}
```
[VERIFIED: src/lib/auth/demo-session.ts]

### Pattern 9: Migration script structure
```typescript
// scripts/migrate-to-org.ts — matches existing scripts/seed.ts pattern
// Run via: DOTENV_CONFIG_PATH=.env.local npx ts-node --transpile-only -r dotenv/config
//           --project tsconfig.scripts.json scripts/migrate-to-org.ts

import dbConnect from '../src/lib/mongodb';
import Organization from '../src/lib/db/models/Organization';
import User from '../src/lib/db/models/User';
import TokenCollection from '../src/lib/db/models/TokenCollection';

async function migrate() {
  await dbConnect();

  // Idempotency guard (D-13)
  const orgCount = await Organization.countDocuments();
  if (orgCount > 0) {
    console.log('[migrate] Organizations already seeded — skipping.');
    process.exit(0);
  }

  const orgName = process.env.INITIAL_ORG_NAME ?? 'Default Organization';
  const org = await Organization.create({ name: orgName });
  console.log(`[migrate] Created org: ${org._id} — "${orgName}"`);

  // Back-fill Users
  const userResult = await User.updateMany(
    { organizationId: { $exists: false } },
    { $set: { organizationId: org._id } }
  );
  console.log(`[migrate] Updated ${userResult.modifiedCount} User docs`);

  // Back-fill TokenCollections
  const collResult = await TokenCollection.updateMany(
    { organizationId: { $exists: false } },
    { $set: { organizationId: org._id } }
  );
  console.log(`[migrate] Updated ${collResult.modifiedCount} TokenCollection docs`);

  console.log(`\n[migrate] Done. Set DEMO_ORG_ID=${org._id} in .env.local`);
  process.exit(0);
}

migrate().catch(err => { console.error(err); process.exit(1); });
```
[VERIFIED: pattern from scripts/seed.ts]

### Anti-Patterns to Avoid

- **Calling `assertOrgOwnership()` before `requireAuth()`:** The function depends on `session.user.organizationId` being present; it must receive a validated Session, not raw user input.
- **Adding `assertOrgOwnership()` to `/api/auth/setup/route.ts`:** This bootstrap route is intentionally unauthenticated and must remain unchanged (D-05).
- **Running migration as app startup logic:** D-11 explicitly prohibits this. Script is run manually once.
- **Using `findById()` without `.select('organizationId')`:** Fetches the full token document (potentially megabytes) just for an ownership check. Always use `.select()`.
- **Storing `organizationId` as a plain string in Mongoose schema:** Use `Schema.Types.ObjectId, ref: 'Organization'` for referential integrity and consistent comparison. However, the JWT carries it as a string — use `.toString()` when comparing.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT claim storage | Custom session store or cookie | NextAuth `jwt` callback with token extension | Already in codebase; adding a field is a one-liner |
| Password hashing in signup | Custom crypto | `bcryptjs.hash(password, 12)` | Same as existing `/api/auth/setup` route |
| Idempotency in migration script | Complex state machine | `Organization.countDocuments() > 0` guard | Simple and sufficient per D-13 |
| TypeScript types for new session fields | Manual casting | Extend `src/types/next-auth.d.ts` | Module augmentation is the NextAuth-supported pattern |

---

## Routes Requiring assertOrgOwnership()

The following 17+ collection-scoped route files need `assertOrgOwnership()` added. All are currently guarded by `requireAuth()` or `requireRole()`. [VERIFIED: grep output of requireAuth/requireRole usage]

**Collection-scoped routes (params.id is the collectionId):**
1. `src/app/api/collections/[id]/route.ts` — GET, PUT, DELETE
2. `src/app/api/collections/[id]/duplicate/route.ts`
3. `src/app/api/collections/[id]/groups/route.ts`
4. `src/app/api/collections/[id]/permissions/route.ts`
5. `src/app/api/collections/[id]/permissions/me/route.ts`
6. `src/app/api/collections/[id]/themes/route.ts`
7. `src/app/api/collections/[id]/themes/[themeId]/route.ts`
8. `src/app/api/collections/[id]/themes/[themeId]/tokens/route.ts`
9. `src/app/api/collections/[id]/themes/[themeId]/tokens/single/route.ts`
10. `src/app/api/collections/[id]/themes/[themeId]/tokens/rename-prefix/route.ts`
11. `src/app/api/collections/[id]/tokens/route.ts`
12. `src/app/api/collections/[id]/tokens/live/route.ts`
13. `src/app/api/collections/[id]/tokens/rename-prefix/route.ts`

**Export/integration routes (collectionId passed in request body, not params):**
14. `src/app/api/export/figma/route.ts` — uses `mongoCollectionId` from body
15. `src/app/api/export/github/route.ts` — uses collection identity from body
16. `src/app/api/figma/import/route.ts`
17. `src/app/api/import/github/route.ts`

**Important:** Export/integration routes pass `collectionId` in the request body, not URL params. `assertOrgOwnership()` signature `(session, collectionId: string)` handles both cases — the caller extracts the ID from wherever it lives. For routes where `collectionId` is optional (e.g., export without a saved collection), ownership check is skipped when no ID is present.

**Routes explicitly excluded from assertOrgOwnership():**
- `src/app/api/auth/setup/route.ts` — unauthenticated bootstrap, unchanged (D-05)
- `src/app/api/auth/signup/route.ts` (new) — unauthenticated, creates the org
- `src/app/api/collections/route.ts` (GET/POST) — collection list/create, no specific collection ID yet; filter by `organizationId` in the query instead

**Collections list route:** `GET /api/collections` should filter by `session.user.organizationId` in the `repo.list()` call, not use `assertOrgOwnership()` (since there's no single collection ID at list time). [ASSUMED — implementation pattern, requires planner decision]

---

## Common Pitfalls

### Pitfall 1: JWT organizationId missing for existing sessions after deploy
**What goes wrong:** Users who signed in before Phase 22 have JWTs without `organizationId`. `assertOrgOwnership()` reads `session.user.organizationId` and gets `undefined`, incorrectly blocking access.
**Why it happens:** NextAuth JWT strategy caches tokens for up to 30 days. Existing tokens don't auto-refresh with new fields.
**How to avoid:** In `assertOrgOwnership()`, handle the case where `session.user.organizationId` is undefined/falsy as an error (401 or 404). Users will re-authenticate on next forced sign-in, or the role re-fetch in the `jwt` callback (which runs every 60s) can be extended to also back-fill `organizationId` when absent.
**Warning signs:** 404 responses for valid collections immediately after deploy.

### Pitfall 2: ObjectId vs string comparison in assertOrgOwnership()
**What goes wrong:** `collection.organizationId` is a Mongoose ObjectId; `session.user.organizationId` is a string from JWT. Strict equality `===` always returns false.
**Why it happens:** Mongoose stores references as ObjectId objects; JWT serializes everything to strings.
**How to avoid:** Always call `.toString()` on the DB value before comparing: `collection.organizationId?.toString() !== sessionOrgId`.
**Warning signs:** All cross-tenant checks return "mismatch" even for same-org users.

### Pitfall 3: required: true on organizationId before migration runs
**What goes wrong:** Deploying the schema change (`organizationId: required: true`) before running `scripts/migrate-to-org.ts` causes all existing User/TokenCollection operations to fail with Mongoose validation errors.
**Why it happens:** Mongoose validates on save; existing docs without the field fail validation when any field is updated.
**How to avoid:** Deploy migration script first, verify all docs have `organizationId`, then deploy the schema with `required: true`. Alternatively, temporarily deploy with `required: false` and tighten after migration.
**Warning signs:** Mongoose `ValidationError: organizationId is required` in server logs immediately after deploy.

### Pitfall 4: TokenCollection model key includes collection name
**What goes wrong:** `TokenCollection.ts` uses a dynamic model key `TokenCollection_${collectionName}` (not `'TokenCollection'`). Code that imports the model and calls `mongoose.models.TokenCollection` directly will get undefined.
**Why it happens:** The configurable `MONGODB_COLLECTION_NAME` env var means the model key varies.
**How to avoid:** Always import from `@/lib/db/models/TokenCollection` — don't reference `mongoose.models.TokenCollection` directly. The migration script must import the model module, not reference it by string key.
**Warning signs:** `TypeError: Cannot read properties of undefined` on model operations in the migration script.

### Pitfall 5: Signup route creates Org and User in two separate DB operations
**What goes wrong:** If the User creation fails after Org creation, the orphaned Org document has no owner and no way to be reached.
**Why it happens:** MongoDB sessions/transactions not used; two independent `create()` calls.
**How to avoid:** Either use MongoDB transactions (`session.withTransaction()`), or delete the Org in the catch block if User creation fails. Given this is a low-traffic signup flow, the catch-and-delete pattern is simpler and avoids transaction complexity.
**Warning signs:** Organizations with no users in the DB.

### Pitfall 6: assertOrgOwnership() on export routes with optional collectionId
**What goes wrong:** Export routes (Figma, GitHub) accept an optional `mongoCollectionId` in the request body. If `mongoCollectionId` is absent, calling `assertOrgOwnership()` with an empty string or undefined will error or incorrectly block.
**Why it happens:** Export was designed to work without a saved MongoDB collection.
**How to avoid:** Only call `assertOrgOwnership()` when `mongoCollectionId` is present and non-empty. When absent, no ownership check is needed (no stored resource is being accessed).
**Warning signs:** Export failures when `mongoCollectionId` is not provided.

---

## Code Examples

### Full assertOrgOwnership() with 404 return (recommended)
```typescript
// src/lib/auth/assert-org-ownership.ts
// [VERIFIED: pattern derived from require-auth.ts]
import type { Session } from 'next-auth';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import TokenCollection from '@/lib/db/models/TokenCollection';

export async function assertOrgOwnership(
  session: Session,
  collectionId: string
): Promise<NextResponse | null> {
  const sessionOrgId = session.user.organizationId;
  if (!sessionOrgId) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  await dbConnect();
  const collection = await TokenCollection.findById(collectionId)
    .select('organizationId')
    .lean() as { organizationId?: unknown } | null;

  if (!collection) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  if (String(collection.organizationId) !== sessionOrgId) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  return null;
}
```

### POST /api/auth/signup route (atomic Org + User creation)
```typescript
// src/app/api/auth/signup/route.ts
// [VERIFIED: pattern from src/app/api/auth/setup/route.ts]
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import Organization from '@/lib/db/models/Organization';
import User from '@/lib/db/models/User';

export async function POST(request: Request) {
  await dbConnect();
  const { orgName, displayName, email, password } = await request.json();

  // Validate inputs
  if (!orgName?.trim() || !displayName?.trim() || !email?.trim() || !password || password.length < 8) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  // Check email uniqueness
  const existing = await User.findOne({ email: email.toLowerCase() }).lean();
  if (existing) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
  }

  let org: { _id: unknown } | null = null;
  try {
    org = await Organization.create({ name: orgName.trim() });
    const passwordHash = await bcrypt.hash(password, 12);
    await User.create({
      displayName: displayName.trim(),
      email: email.toLowerCase(),
      passwordHash,
      role: 'Admin',
      status: 'active',
      organizationId: org._id,
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    // Rollback org if user creation failed
    if (org) {
      await Organization.findByIdAndDelete(org._id).catch(() => {});
    }
    console.error('[POST /api/auth/signup]', error);
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 });
  }
}
```

### Migration script run command (matches existing seed pattern)
```bash
# Run once before deploying app with required: true
DOTENV_CONFIG_PATH=.env.local npx ts-node --transpile-only -r dotenv/config \
  --project tsconfig.scripts.json scripts/migrate-to-org.ts
```
[VERIFIED: matches scripts pattern in package.json]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-tenant (no org concept) | Multi-tenant with org-scoped collections | Phase 22 | All collection queries must filter by organizationId |
| JWT carries id, role, name, roleLastFetched | JWT also carries organizationId | Phase 22 | No per-request DB hit for ownership checks |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Collections list route (`GET /api/collections`) should filter by `organizationId` in query rather than using `assertOrgOwnership()` | Routes Requiring assertOrgOwnership() | If wrong: org isolation breaks on the collections list endpoint |
| A2 | Export routes should skip ownership check when `mongoCollectionId` is absent | Common Pitfalls #6 | If wrong: exports without a saved collection will fail |
| A3 | Deployment order must be: run migration → then deploy schema with `required: true` | Common Pitfalls #3 | If wrong: all existing document updates fail with validation errors |
| A4 | `assertOrgOwnership()` should return 404 (per STATE.md) not 403 (per CONTEXT.md D-07) | Pattern 6, Primary recommendation | If 403: reveals resource existence to cross-tenant requestors (security downgrade) |

---

## Open Questions

1. **403 vs 404 for assertOrgOwnership() mismatch**
   - What we know: STATE.md says 404 (security rationale); CONTEXT.md D-07 says 403 explicitly
   - What's unclear: Which takes precedence — the pre-phase architectural decision in STATE.md or the explicit CONTEXT.md decision?
   - Recommendation: Use 404 per STATE.md. The CONTEXT.md was written before consulting STATE.md's security rationale. Planner should confirm with the implementation agent to use 404.

2. **organizationId in JWT when user re-fetches role**
   - What we know: The `jwt` callback re-fetches `role` from DB every 60s (TTL). `organizationId` is set only at initial sign-in.
   - What's unclear: If a user's org changes (unlikely per single-org-per-user decision), their JWT would be stale.
   - Recommendation: For Phase 22, single-org-per-user means org never changes after creation. No re-fetch needed. Document as assumption.

3. **Whether GET /api/collections filters or uses assertOrgOwnership()**
   - What we know: The list route has no collectionId — it lists all visible collections.
   - What's unclear: Should `repo.list()` accept an `organizationId` filter, or should the route add a `.filter()` post-query?
   - Recommendation: Pass `organizationId` as a filter to `repo.list()` so the MongoDB query is indexed. Check the repository interface to understand the change scope.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| MongoDB | All data operations | Assumed running | — | — |
| ts-node | `scripts/migrate-to-org.ts` | ✓ | ^10.9.2 | Use tsx |
| tsx | Script alternative | ✓ | ^4.21.0 | — |
| tsconfig.scripts.json | Script compilation | ✓ | — (exists) | — |
| `INITIAL_ORG_NAME` env var | Migration script | Not yet in .env.local | — | Defaults to "Default Organization" in script |
| `DEMO_ORG_ID` env var | Demo mode session | Not yet in .env.local | — | Set after migration script outputs org _id |

**Missing dependencies with no fallback:** None that block Phase 22 execution.

**Missing env vars (add to .env.local documentation):**
- `INITIAL_ORG_NAME` — name for the org created during migration
- `DEMO_ORG_ID` — set to migration script output; used by `getDemoUserSession()`

---

## Validation Architecture

> `workflow.nyquist_validation` is not set to false in config.json — validation section included.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | (none detected in codebase) |
| Config file | none — see Wave 0 |
| Quick run command | `yarn jest --testPathPattern=org` |
| Full suite command | `yarn jest` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TENANT-01 | assertOrgOwnership() returns null for matching org | unit | `yarn jest --testPathPattern=assert-org-ownership` | Wave 0 |
| TENANT-01 | assertOrgOwnership() returns 404 for mismatched org | unit | `yarn jest --testPathPattern=assert-org-ownership` | Wave 0 |
| TENANT-01 | organizationId present on TokenCollection after schema update | unit | `yarn jest --testPathPattern=TokenCollection` | Wave 0 |
| TENANT-01 | JWT session includes organizationId after sign-in | unit | `yarn jest --testPathPattern=nextauth` | Wave 0 |
| TENANT-02 | POST /api/auth/signup creates Org + Admin User | unit | `yarn jest --testPathPattern=signup` | Wave 0 |
| TENANT-02 | POST /api/auth/signup returns 409 on duplicate email | unit | `yarn jest --testPathPattern=signup` | Wave 0 |
| TENANT-03 | migrate-to-org.ts creates org and back-fills docs | integration | manual run (script, not Jest) | manual-only |
| TENANT-03 | migrate-to-org.ts is idempotent (second run skips) | integration | manual run | manual-only |

### Sampling Rate
- **Per task commit:** `yarn jest --testPathPattern=org --passWithNoTests`
- **Per wave merge:** `yarn jest`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/lib/auth/__tests__/assert-org-ownership.test.ts` — covers TENANT-01 ownership enforcement
- [ ] `src/app/api/auth/signup/__tests__/route.test.ts` — covers TENANT-02 signup flow
- [ ] `jest.config.js` or `jest.config.ts` — framework config if not present
- [ ] `src/test-utils/` or similar — shared mock for dbConnect, mongoose models

Note: No test infrastructure detected in the codebase. Wave 0 must include test framework setup. [VERIFIED: no jest.config.* or *.test.ts found in src/]

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | bcryptjs (cost 12) for signup password hash — same as existing setup route |
| V3 Session Management | yes | NextAuth JWT strategy, 30-day maxAge — unchanged |
| V4 Access Control | yes | `assertOrgOwnership()` — enforces org boundary at API layer |
| V5 Input Validation | yes | zod or manual validation in signup route (orgName, displayName, email, password length) |
| V6 Cryptography | no | No new crypto — bcryptjs already in use |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-tenant data access (user accesses another org's collection by guessing ObjectId) | Elevation of Privilege | `assertOrgOwnership()` on all 17 collection routes |
| Org creation spam (automated signups) | Denial of Service | Out of scope for Phase 22; rate limiting is Phase 23 (RATE-01) |
| JWT org claim tampering | Tampering | JWT signed with `NEXTAUTH_SECRET` — cannot be modified without secret |
| User email enumeration at signup | Information Disclosure | Return generic error or 409 on duplicate email — implementation decision |
| Migration script run after production data exists | Tampering | Idempotency guard: `if (Organization.countDocuments() > 0) exit` |

---

## Sources

### Primary (HIGH confidence)
- `src/lib/auth/require-auth.ts` — requireAuth/requireRole patterns verified
- `src/lib/auth/nextauth.config.ts` — JWT callback extension point verified
- `src/lib/auth/demo-session.ts` — demo session structure verified
- `src/lib/db/models/User.ts` — Mongoose model pattern and schema structure verified
- `src/lib/db/models/TokenCollection.ts` — model key pattern, dynamic collection name verified
- `src/types/next-auth.d.ts` — module augmentation structure verified
- `src/app/api/auth/setup/route.ts` — bootstrap route pattern verified
- `scripts/seed.ts` — migration script execution pattern verified
- `package.json` — all dependency versions verified
- `tsconfig.scripts.json` — scripts compilation config verified
- `.planning/STATE.md` — pre-phase architectural decisions verified

### Secondary (MEDIUM confidence)
- CONTEXT.md decisions D-01 through D-14 — user-locked decisions, cross-referenced with codebase

### Tertiary (LOW confidence — see Assumptions Log)
- Deployment ordering recommendation (migration before schema `required: true`)
- Collections list route filter-by-org approach

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all verified in package.json and live code
- Architecture patterns: HIGH — all derived from existing verified codebase patterns
- Route inventory: HIGH — verified by directory listing and grep
- Pitfalls: HIGH — verified against actual code structure (ObjectId vs string, model key pattern, etc.)
- Validation architecture: MEDIUM — no test framework found; Wave 0 gaps are assumptions about what jest setup will look like

**Research date:** 2026-04-18
**Valid until:** 2026-05-18 (stable stack, 30-day window)
