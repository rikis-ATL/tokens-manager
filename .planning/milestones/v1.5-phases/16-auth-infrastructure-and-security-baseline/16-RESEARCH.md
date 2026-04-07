# Phase 16: Auth Infrastructure and Security Baseline - Research

**Researched:** 2026-03-28
**Domain:** NextAuth v4, Mongoose models, JWT strategy, CVE patch, TypeScript module augmentation
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Phase boundary:** Backend-only foundation — patch CVE-2025-29927 (upgrade to next@13.5.9), install NextAuth and dependencies, define Mongoose models (User, Invite, CollectionPermission), create `src/lib/auth/` module with authOptions, permissions pure function, and invite utility. Nothing user-facing.
- **User model fields:** `displayName`, `email`, `passwordHash`, `role`, `status`
  - Role enum: `'Admin' | 'Editor' | 'Viewer'`
  - Status enum: `'active' | 'invited' | 'disabled'`
  - Enable Mongoose `timestamps: true`
- **JWT strategy:** JWT-only, stateless — no sessions collection in MongoDB
  - Session duration: 30 days
  - JWT payload: `id` and `role` only (no email, no displayName)
  - SUPER_ADMIN_EMAIL enforcement: jwt callback forces `role = 'Admin'` in the token; DB record is not touched
- **Permissions function interface:** Single pure function `canPerform(role: Role, action: Action): boolean`
  - `Action` exported as TypeScript `const` object (not enum, not plain strings) — e.g. `Action.Write`, `Action.ManageUsers`
  - Full action set: `Read`, `Write`, `CreateCollection`, `DeleteCollection`, `ManageUsers`, `PushGithub`, `PushFigma`
  - Only `canPerform()` exported from `permissions.ts` — no isAdmin/isEditor helpers
- **Invite model fields:** `email`, `token`, `status`, `expiresAt`, `createdBy`, `role`
  - Status enum: `'pending' | 'accepted' | 'expired'`
  - Default expiry: 7 days from creation
  - After account setup: status set to `'accepted'` — document kept for audit trail
  - Role stored on Invite — set by the inviting Admin at invite time

### Claude's Discretion

- Token generation method for invite tokens (crypto.randomBytes or uuid)
- CollectionPermission schema field names and index design
- bcrypt salt rounds for password hashing
- NextAuth provider configuration details (CredentialsProvider internals)
- TypeScript module augmentation approach for JWT/session types

### Deferred Ideas (OUT OF SCOPE)

- None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ARCH-01 | Auth infrastructure lives in isolated modules — `src/lib/auth/` (authOptions, helpers, models), `src/app/api/auth/` (NextAuth route handler), `src/app/auth/` (sign-in, invite setup pages) — never mixed with existing token/collection code | Directory structure patterns confirmed; ARCH-01 is purely a structural constraint with no tech risk |
| AUTH-06 | A superadmin account is configured via `SUPER_ADMIN_EMAIL` env var; this account always has Admin access and cannot be removed or downgraded by any user action (enforced in JWT callback on every sign-in) | jwt callback pattern confirmed; `user` object is available only on sign-in trigger, allowing SUPER_ADMIN_EMAIL check per sign-in |
</phase_requirements>

## Summary

Phase 16 establishes the auth foundation by patching CVE-2025-29927 (upgrade `next` from 13.5.6 to 13.5.9), installing `next-auth@^4.24.13` with `bcryptjs`, defining three Mongoose models following the project's existing model pattern, and creating the `src/lib/auth/` module containing `nextauth.config.ts`, `permissions.ts`, and `invite.ts`. Nothing user-facing ships in this phase.

The technology stack is well-understood: NextAuth v4 is the correct choice for Next.js 13.x (v5/Auth.js requires Next.js 14+). The JWT-only strategy with `session: { strategy: "jwt" }` is required when using CredentialsProvider — database adapter is incompatible with credentials. TypeScript module augmentation for NextAuth v4 follows a standard `declare module "next-auth"` + `declare module "next-auth/jwt"` pattern in a `.d.ts` file. The existing project uses a `mongoose.models.Model || mongoose.model(...)` guard pattern to prevent hot-reload re-registration — all three new models must follow this pattern.

The CVE-2025-29927 patch (13.5.6 → 13.5.9) is a security-only backport with no breaking changes. The upgrade is a single version bump in `package.json` plus `yarn install`. For invite tokens, `crypto.randomBytes(32).toString('hex')` with the SHA-256 hash stored in DB and plaintext sent in email is the recommended pattern (Node.js built-in, no extra dependency).

**Primary recommendation:** Install `next-auth@^4.24.13` and `bcryptjs` (not `bcrypt` — avoids native addon compilation issues in Next.js serverless), patch `next@13.5.9`, follow the existing `TokenCollection.ts` model structure for all three new models, and keep all auth code strictly inside `src/lib/auth/`.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next-auth | ^4.24.13 | Authentication framework — CredentialsProvider, JWT callbacks, getServerSession | Latest stable v4; v5 requires Next.js 14+; project locked at 13.5.x |
| bcryptjs | ^2.4.3 | Password hashing — pure JavaScript, no native addon | Avoids C++ binding compilation failures in Next.js / serverless environments; same API as bcrypt |
| next | 13.5.9 | CVE-2025-29927 security patch | Backport from Vercel specifically for 13.x LTS community; targeted security fix, no breaking changes |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/bcryptjs | ^2.4.6 | TypeScript definitions for bcryptjs | Required when using bcryptjs with strict TypeScript |
| crypto (Node.js built-in) | built-in | Invite token generation via `crypto.randomBytes(32)` | No extra dependency; secure CSPRNG; already available in Node.js runtime |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| bcryptjs | bcrypt (native) | bcrypt is faster but fails to compile in some serverless/Next.js environments; bcryptjs is pure JS, universally compatible |
| crypto.randomBytes | uuid v4 | uuid is fine but adds a dependency; crypto is built-in and produces cryptographically secure 64-char hex token equally well |
| NextAuth v4 | Auth.js (v5) | Auth.js v5 requires Next.js 14+; project cannot use it on 13.5.x |

**Installation:**
```bash
yarn add next-auth@^4.24.13 bcryptjs@^2.4.3
yarn add -D @types/bcryptjs@^2.4.6
```
Then update `package.json`: `"next": "13.5.9"` and run `yarn install`.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   ├── auth/
│   │   ├── nextauth.config.ts    # authOptions (NextAuthOptions) — CredentialsProvider, jwt callback, session callback
│   │   ├── permissions.ts        # canPerform(role, action): boolean + Action const object + Role type
│   │   └── invite.ts             # generateInviteToken(), hashToken(), isInviteExpired()
│   └── db/
│       └── models/
│           ├── TokenCollection.ts  # existing
│           ├── User.ts             # NEW
│           ├── Invite.ts           # NEW
│           └── CollectionPermission.ts  # NEW
├── app/
│   └── api/
│       └── auth/
│           └── [...nextauth]/
│               └── route.ts        # NextAuth handler — export { handler as GET, handler as POST }
└── types/
    └── next-auth.d.ts              # TypeScript module augmentation for JWT + Session
```

### Pattern 1: Mongoose Model (matching existing project pattern)

**What:** Define an IDocument interface, create a Schema<T>, guard against hot-reload re-registration with `mongoose.models.X || mongoose.model(...)`.
**When to use:** Every new model in this project — matches existing `TokenCollection.ts` pattern exactly.

```typescript
// Source: existing src/lib/db/models/TokenCollection.ts pattern + mongoosejs.com/docs/typescript.html
import mongoose, { Schema, Model } from 'mongoose';

export type Role = 'Admin' | 'Editor' | 'Viewer';
export type UserStatus = 'active' | 'invited' | 'disabled';

export interface IUser {
  displayName: string;
  email: string;
  passwordHash: string;
  role: Role;
  status: UserStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

type UserDoc = Omit<IUser, '_id'>;

const userSchema = new Schema<UserDoc>(
  {
    displayName: { type: String, required: true, trim: true },
    email:       { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash:{ type: String, required: true },
    role:        { type: String, enum: ['Admin', 'Editor', 'Viewer'], required: true },
    status:      { type: String, enum: ['active', 'invited', 'disabled'], required: true, default: 'invited' },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });

const User: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc>) ||
  mongoose.model<UserDoc>('User', userSchema);

export default User;
```

### Pattern 2: NextAuth authOptions with JWT strategy

**What:** Export `authOptions: NextAuthOptions` from `src/lib/auth/nextauth.config.ts`, import it into the route handler.
**When to use:** Always export authOptions separately so `getServerSession(authOptions)` works from any Route Handler or Server Component.

```typescript
// Source: next-auth.js.org/configuration/options + next-auth.js.org/providers/credentials
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/db/models/User';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        await dbConnect();
        const user = await User.findOne({ email: credentials.email.toLowerCase() });
        if (!user || user.status === 'disabled') return null;
        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;
        return { id: user._id.toString(), email: user.email, role: user.role };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
  },
  callbacks: {
    async jwt({ token, user }) {
      // user is only present on initial sign-in
      if (user) {
        token.id   = (user as any).id;
        token.role = (user as any).role;
      }
      // SUPER_ADMIN_EMAIL enforcement — always override, no DB side effect
      if (token.email === process.env.SUPER_ADMIN_EMAIL) {
        token.role = 'Admin';
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id   = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/sign-in',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
```

### Pattern 3: NextAuth Route Handler (App Router)

**What:** `src/app/api/auth/[...nextauth]/route.ts` exports GET and POST from the NextAuth handler.
**When to use:** Required by Next.js App Router; NextAuth v4 works with App Router using this exact pattern.

```typescript
// Source: next-auth.js.org/getting-started/example + App Router docs
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth.config';

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### Pattern 4: TypeScript Module Augmentation

**What:** Extend NextAuth's `Session` and `JWT` interfaces so `session.user.id` and `session.user.role` are typed without casting.
**When to use:** Required whenever adding custom fields to JWT or Session in a TypeScript project.

```typescript
// Source: next-auth.js.org/getting-started/typescript
// File: src/types/next-auth.d.ts
import NextAuth, { DefaultSession } from 'next-auth';
import { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id:   string;
      role: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?:   string;
    role?: string;
  }
}
```

Note: The `src/types/` directory already exists in the project. The `.d.ts` file will be picked up automatically because `tsconfig.json` includes `**/*.ts`.

### Pattern 5: Permissions Pure Function

**What:** Export `Action` as a `const` object and `canPerform` as a pure function mapping Role × Action → boolean.
**When to use:** Any code (server or client) checking access — no side effects, fully testable.

```typescript
// src/lib/auth/permissions.ts
export type Role = 'Admin' | 'Editor' | 'Viewer';

export const Action = {
  Read:             'Read',
  Write:            'Write',
  CreateCollection: 'CreateCollection',
  DeleteCollection: 'DeleteCollection',
  ManageUsers:      'ManageUsers',
  PushGithub:       'PushGithub',
  PushFigma:        'PushFigma',
} as const;

export type ActionType = typeof Action[keyof typeof Action];

const PERMISSIONS: Record<Role, Set<ActionType>> = {
  Admin:  new Set(Object.values(Action)),
  Editor: new Set([Action.Read, Action.Write, Action.CreateCollection, Action.PushGithub, Action.PushFigma]),
  Viewer: new Set([Action.Read]),
};

export function canPerform(role: Role, action: ActionType): boolean {
  return PERMISSIONS[role]?.has(action) ?? false;
}
```

### Pattern 6: Invite Token Utility

**What:** Generate a 64-char hex token via `crypto.randomBytes(32)`, hash it with SHA-256 for DB storage, send plaintext in email link.
**When to use:** Invite creation (Phase 20). The utility is defined here (Phase 16) so it is available.

```typescript
// src/lib/auth/invite.ts
import crypto from 'crypto';

/** Generate a URL-safe plaintext token (sent in email). */
export function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/** Hash a plaintext token for safe DB storage. */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Check if an invite has passed its expiry date. */
export function isInviteExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}
```

### Pattern 7: CollectionPermission Model

**What:** Sparse override table keyed on `(userId, collectionId)` storing a per-collection role override.
**When to use:** PERM-04 (Phase 19). Model defined now for schema completeness.

```typescript
// src/lib/db/models/CollectionPermission.ts
export interface ICollectionPermission {
  userId:       string;   // references User._id as string
  collectionId: string;   // references TokenCollection._id as string
  role:         Role;     // override role for this collection
}
```

Recommended indexes: compound `{ userId: 1, collectionId: 1 }` unique index for fast lookup + uniqueness guarantee; single `{ collectionId: 1 }` index for admin listing.

### Anti-Patterns to Avoid

- **Using `@auth/mongodb-adapter` with CredentialsProvider:** The adapter requires database sessions; CredentialsProvider requires JWT sessions. They are mutually incompatible. The STATE.md decisions confirm this was investigated and rejected.
- **Storing auth logic outside `src/lib/auth/`:** ARCH-01 requires all auth code to live in the isolated module. Do not add auth helpers to `src/lib/utils.ts` or route handler files.
- **Relying on middleware as the security boundary:** CVE-2025-29927 proved middleware can be bypassed. Every write Route Handler must independently call `getServerSession()` — this is enforced in Phase 18, not Phase 16.
- **Using `bcrypt` (native) instead of `bcryptjs`:** Native bcrypt requires C++ addons that can fail in Next.js / serverless builds. Always use `bcryptjs` in this project.
- **Registering Mongoose models without the hot-reload guard:** Always use `mongoose.models.ModelName || mongoose.model(...)` — existing pattern in `TokenCollection.ts`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT creation, signing, verification | Custom JWT library | NextAuth v4 JWT callbacks | Edge cases: token rotation, secret handling, clock skew, secure defaults |
| Session management | Custom cookies | NextAuth session strategy | HttpOnly cookie handling, CSRF, secure flags handled automatically |
| Password hashing | SHA-256 or MD5 | bcryptjs | SHA-256 is not a KDF; bcrypt adds adaptive cost factor, salt, and timing resistance |
| Token signing | jsonwebtoken | Node.js built-in `crypto` | For invite tokens, crypto.randomBytes produces opaque secure tokens without needing a JWT signature |
| CSRF protection | Custom CSRF tokens | NextAuth built-in CSRF | NextAuth generates and validates CSRF tokens for the credentials POST automatically |

**Key insight:** NextAuth v4 handles the hardest parts (JWT signing, cookie security, CSRF, token refresh) while remaining fully customizable through callbacks. The callbacks pattern is the designed extension point — use it, not workarounds.

## Common Pitfalls

### Pitfall 1: Missing NEXTAUTH_SECRET in production
**What goes wrong:** NextAuth silently falls back to a random secret in development. In production without `NEXTAUTH_SECRET`, all JWTs are invalid after restart.
**Why it happens:** Development convenience default masks the missing env var.
**How to avoid:** Add `NEXTAUTH_SECRET` to `.env.local` immediately. The `secret: process.env.NEXTAUTH_SECRET` field in authOptions makes it explicit.
**Warning signs:** Sessions suddenly invalid after deployment; users logged out on server restart.

### Pitfall 2: TypeScript augmentation file not recognized
**What goes wrong:** `session.user.id` produces TypeScript error "Property 'id' does not exist on type..."
**Why it happens:** The `.d.ts` file location is wrong or not included in `tsconfig.json`.
**How to avoid:** Place augmentation in `src/types/next-auth.d.ts`. The project's `tsconfig.json` already includes `**/*.ts` so no extra config needed.
**Warning signs:** TypeScript errors on `session.user.id` despite adding the field to the jwt/session callbacks.

### Pitfall 3: `user` object not available in jwt callback on token refresh
**What goes wrong:** Code that reads `user.role` in the jwt callback throws on token refresh (user is undefined).
**Why it happens:** The `user` parameter in the jwt callback is only present on initial sign-in, not on subsequent calls.
**How to avoid:** Always guard with `if (user) { ... }`. For SUPER_ADMIN_EMAIL enforcement, check `token.email` (always present), not `user.email`.
**Warning signs:** Runtime crash on page refresh after initial sign-in.

### Pitfall 4: Mongoose model re-registration in Next.js dev mode
**What goes wrong:** `OverwriteModelError: Cannot overwrite Model once compiled` in development hot-reload.
**Why it happens:** Next.js hot-reloads modules, calling `mongoose.model()` multiple times.
**How to avoid:** Use `(mongoose.models.User as Model<UserDoc>) || mongoose.model<UserDoc>('User', userSchema)` — exactly as in existing `TokenCollection.ts`.
**Warning signs:** Error appears only in dev after a file save, not in production.

### Pitfall 5: next@13.5.9 upgrade causes lockfile conflicts
**What goes wrong:** `yarn install` fails or produces peer dependency warnings after changing `next` version.
**Why it happens:** `eslint-config-next` pins to the same version as `next`. Both must be updated together.
**How to avoid:** Update both `"next": "13.5.9"` and `"eslint-config-next": "13.5.9"` simultaneously in `package.json`.
**Warning signs:** Peer dependency resolution errors; build fails on lint step.

### Pitfall 6: CredentialsProvider requires explicit `session.strategy: "jwt"`
**What goes wrong:** NextAuth tries to use database sessions (the default when no adapter is configured), and CredentialsProvider silently fails or produces unexpected behavior.
**Why it happens:** The default session strategy when no adapter is present is actually `"jwt"` — but relying on the default is fragile and causes confusion.
**How to avoid:** Always set `session: { strategy: "jwt" }` explicitly in authOptions (as locked in decisions).
**Warning signs:** Sessions work in dev but mysteriously expire or fail after deploy.

## Code Examples

Verified patterns from official sources:

### getServerSession in a Route Handler (Phase 18+ use, verified pattern)
```typescript
// Source: next-auth.js.org/configuration/nextjs
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/nextauth.config';
import { NextResponse } from 'next/server';

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... handler logic
}
```

### Invite Model with 7-day expiry
```typescript
// src/lib/db/models/Invite.ts
import mongoose, { Schema, Model } from 'mongoose';
import type { Role } from './User';

export type InviteStatus = 'pending' | 'accepted' | 'expired';

export interface IInvite {
  email:     string;
  token:     string;   // SHA-256 hash of the plaintext token
  status:    InviteStatus;
  expiresAt: Date;
  createdBy: string;   // User._id as string
  role:      Role;
  createdAt?: Date;
  updatedAt?: Date;
}

type InviteDoc = Omit<IInvite, '_id'>;

const inviteSchema = new Schema<InviteDoc>(
  {
    email:     { type: String, required: true, lowercase: true, trim: true },
    token:     { type: String, required: true, unique: true },
    status:    { type: String, enum: ['pending', 'accepted', 'expired'], default: 'pending' },
    expiresAt: { type: Date,   required: true, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    createdBy: { type: String, required: true },
    role:      { type: String, enum: ['Admin', 'Editor', 'Viewer'], required: true },
  },
  { timestamps: true }
);

inviteSchema.index({ email: 1 });
inviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Optional: TTL index for auto-cleanup (keep as `expired` for audit — do NOT use TTL if audit trail is required)

const Invite: Model<InviteDoc> =
  (mongoose.models.Invite as Model<InviteDoc>) ||
  mongoose.model<InviteDoc>('Invite', inviteSchema);

export default Invite;
```

Note: Do NOT add a TTL index on `expiresAt` — the locked decision requires keeping the document as `'accepted'` for audit trail. TTL would auto-delete documents.

### bcryptjs salt rounds
```typescript
// src/lib/auth/nextauth.config.ts (inside authorize) or future account setup handler
import bcrypt from 'bcryptjs';

// Hashing (Phase 20 account setup — but the pattern is referenced here)
const SALT_ROUNDS = 12; // Good balance: ~200ms on modern hardware, resistant to brute force
const passwordHash = await bcrypt.hash(plainPassword, SALT_ROUNDS);

// Verification (Phase 16 authorize callback)
const valid = await bcrypt.compare(credentials.password, user.passwordHash);
```

Salt rounds recommendation: **12** (industry standard for bcryptjs in 2024–2026; 10 is minimum acceptable, 14+ noticeably slow for users).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Auth.js v5 (beta → stable) | NextAuth v4 for Next.js 13.x | Auth.js v5 requires Next.js 14+ | Project stays on v4; no migration |
| `session: { jwt: true }` | `session: { strategy: "jwt" }` | v4 upgrade | Renamed option; old form rejected |
| `import { getToken } from "next-auth/jwt"` (default export) | Named import only | v4 upgrade | Must use named import |
| bcrypt (native) | bcryptjs (pure JS) | Next.js serverless era | Avoids native addon compilation failures |
| Middleware as auth gate | `getServerSession()` per Route Handler | CVE-2025-29927 (March 2025) | Middleware alone is insufficient; in-handler checks mandatory |

**Deprecated/outdated:**
- `session.jwt: boolean`: Removed in v4; replaced by `session.strategy: "jwt" | "database"`.
- `@auth/mongodb-adapter` with CredentialsProvider: Incompatible — adapter forces database sessions; CredentialsProvider requires JWT sessions.
- `next@13.5.6`: Has CVSS 9.1 vulnerability CVE-2025-29927; must be upgraded to 13.5.9 before any auth code ships.

## Open Questions

1. **bcrypt salt rounds (Claude's Discretion)**
   - What we know: 10 is minimum acceptable; 12 is industry standard; 14+ is noticeably slow
   - What's unclear: Project's target deployment hardware (affects perceived latency)
   - Recommendation: Use **12** — correct default for internal tools with low auth frequency

2. **CollectionPermission index design (Claude's Discretion)**
   - What we know: Query pattern is `findOne({ userId, collectionId })` for access check; `find({ collectionId })` for admin view
   - What's unclear: Expected collection count and concurrent user count (affects index overhead)
   - Recommendation: Compound unique index `{ userId: 1, collectionId: 1 }` + secondary `{ collectionId: 1 }` — covers both query patterns

3. **Type sharing: `Role` defined in User.ts vs. permissions.ts**
   - What we know: Both User model and permissions.ts need the `Role` type
   - What's unclear: Import direction preference
   - Recommendation: Define `Role` and `ActionType` in `permissions.ts` and import from there into User model — permissions is the "source of truth" for auth domain types, not the database layer

4. **NEXTAUTH_URL env var requirement**
   - What we know: NextAuth v4 requires `NEXTAUTH_URL` in production; in development it auto-detects `localhost:3000`
   - What's unclear: Whether the project's `.env.local` already has this
   - Recommendation: Document required env vars in a comment at the top of `nextauth.config.ts`

## Sources

### Primary (HIGH confidence)
- [next-auth.js.org/getting-started/typescript](https://next-auth.js.org/getting-started/typescript) — Module augmentation patterns for Session and JWT interfaces
- [next-auth.js.org/providers/credentials](https://next-auth.js.org/providers/credentials) — CredentialsProvider authorize callback, JWT requirement note
- [next-auth.js.org/configuration/callbacks](https://next-auth.js.org/configuration/callbacks) — jwt and session callback patterns
- [next-auth.js.org/configuration/options](https://next-auth.js.org/configuration/options) — session.maxAge, jwt.maxAge, pages config
- [next-auth.js.org/configuration/nextjs](https://next-auth.js.org/configuration/nextjs) — getServerSession in Route Handlers, App Router handler export pattern
- [mongoosejs.com/docs/typescript.html](https://mongoosejs.com/docs/typescript.html) — Schema<T>, model<T>, HydratedDocument patterns
- [github.com/vercel/next.js/releases/tag/v13.5.9](https://github.com/vercel/next.js/releases/tag/v13.5.9) — Security-only patch for CVE-2025-29927, no breaking changes
- Existing codebase: `src/lib/db/models/TokenCollection.ts` — definitive project model pattern; `src/lib/mongodb.ts` — dbConnect utility

### Secondary (MEDIUM confidence)
- [securitylabs.datadoghq.com/articles/nextjs-middleware-auth-bypass/](https://securitylabs.datadoghq.com/articles/nextjs-middleware-auth-bypass/) — CVE-2025-29927 technical analysis (CVSS 9.1, x-middleware-subrequest header bypass)
- [nvd.nist.gov/vuln/detail/CVE-2025-29927](https://nvd.nist.gov/vuln/detail/CVE-2025-29927) — Official NVD entry: affected 13.x < 13.5.9
- [npmjs.com/package/next-auth](https://npmjs.com/package/next-auth) — v4.24.13 is latest stable v4 (published Oct 2025)
- [medium.com — bcrypt vs bcryptjs](https://medium.com/@abdulakeemabdulafeez/bcrypt-vs-bcryptjs-which-one-should-you-use-in-node-js-92b5c4097c51) — Verified bcryptjs recommendation for Next.js/serverless

### Tertiary (LOW confidence)
- None — all critical findings have HIGH or MEDIUM confidence backing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm versions confirmed, library compatibility with Next.js 13 confirmed via STATE.md decisions and official docs
- Architecture: HIGH — patterns verified against official NextAuth v4 docs and existing codebase conventions
- Pitfalls: HIGH — hot-reload guard from existing codebase; jwt callback user-only-on-signin from official docs; CVE from NVD; bcryptjs from multiple sources

**Research date:** 2026-03-28
**Valid until:** 2026-09-28 (stable stack; NextAuth v4 is in maintenance mode, patterns won't change)
