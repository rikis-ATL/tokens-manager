# Access & Permissions

> Infrastructure reference for ATUI Tokens Manager. Describes roles, page access, API guards, multi-tenancy scoping, and the super-admin boundary.

---

## Roles

Roles are stored on the `User` document and flow into the JWT on sign-in. They are re-fetched from the DB every 60 seconds via the `jwt` callback (TTL refresh).

| Role | Description |
|------|-------------|
| **Admin** | Full access to all actions within their organisation |
| **Editor** | Read + write tokens, create collections, push to GitHub/Figma, manage versions, publish npm |
| **Viewer** | Read only |
| **Demo** | Read + write to playground collections only (used in `DEMO_MODE`) |
| **Super Admin** | Admin role **plus** `isSuperAdmin: true` in session. Identified by `session.user.email === SUPER_ADMIN_EMAIL` env var. Unlocks infrastructure-level settings hidden from regular Admins. |

### Action matrix

| Action | Admin | Editor | Viewer | Demo |
|--------|-------|--------|--------|------|
| Read | ✓ | ✓ | ✓ | ✓ |
| Write (tokens, graph, themes) | ✓ | ✓ | — | playground only |
| CreateCollection | ✓ | ✓ | — | — |
| DeleteCollection | ✓ | — | — | — |
| ManageUsers | ✓ | — | — | — |
| PushGithub | ✓ | ✓ | — | ✓ (demo mode only) |
| PushFigma | ✓ | ✓ | — | ✓ (demo mode only) |
| ManageVersions | ✓ | ✓ | — | ✓ (demo mode only) |
| PublishNpm | ✓ | ✓ | — | ✓ (demo mode only) |

Defined in `src/lib/auth/permissions.ts`.

---

## Collection-level permission grants

For non-Admin users, access can be further narrowed at the collection level via `CollectionPermission` documents.

| State | Behaviour |
|-------|-----------|
| User has **no grants** | Org-scoped: can access all collections in their organisation |
| User has **one or more grants** | Collection-scoped: can only access explicitly granted collections |
| Grant has a role | That role overrides the user's org role for that collection |

Admins bypass the grant system entirely — they always see all org collections.

---

## Multi-tenancy scoping

All data is scoped to `session.user.organizationId` (set from the JWT at sign-in).

| Data | Scoping |
|------|---------|
| Collections list (`GET /api/collections`) | Filtered by `{ organizationId }`. Empty/missing orgId returns empty list (never leaks). |
| Individual collection (`GET /api/collections/[id]`) | Post-fetch org ownership check — returns 404 if collection belongs to a different org. |
| Collection mutations (PUT, DELETE, sub-routes) | `requireRole` performs org ownership check before returning the session. All themes, tokens, versions, and group routes inherit this automatically. |
| Users (`GET /api/org/users`) | Filtered by `{ organizationId }`. |
| Invites (`GET /api/invites`) | Filtered by `organizationId`. |
| Usage (`GET /api/org/usage`) | Reads org document via `session.user.organizationId`. |

`organizationId` is a required field on `TokenCollection` (added in Phase 22). New collections always inherit it from `session.user.organizationId` at creation.

---

## Middleware

`src/middleware.ts` guards all non-API page routes by checking for the NextAuth session cookie (`next-auth.session-token` or `__Secure-next-auth.session-token`).

| Condition | Behaviour |
|-----------|-----------|
| No session cookie | Redirect to `/auth/sign-in?callbackUrl=<path>` |
| Session cookie present | Allow through |
| Path starts with `/auth/` | Always allowed (exempt from session check) |
| Path is `/auth/sign-in` with session | Redirect to `/collections` |
| `DEMO_MODE=true` | Pass-through for all routes; `/auth/sign-in` redirects to `/collections` |

**Note:** The middleware only checks cookie *presence*, not JWT validity. Role-based access is enforced in API routes via `requireRole()` and in client components via `useSession()`.

---

## Page access

### Auth pages (no session required)

| Route | Access | Notes |
|-------|--------|-------|
| `/auth/sign-in` | Public | Redirects to `/collections` if already authenticated |
| `/auth/signup` | Public | Self-registration (if enabled) |
| `/auth/setup` | Public | First-run system setup; redirects away if users already exist |
| `/auth/create-super-admin` | Public | First-run super-admin creation |
| `/auth/invite-setup` | Public | Invite acceptance and account creation |

### App pages (session required)

| Route | Minimum role | Super admin only | Notes |
|-------|-------------|-----------------|-------|
| `/` | Any | — | Redirects to `/collections` |
| `/collections` | Any | — | List filtered to caller's org |
| `/collections/[id]/tokens` | Any + collection access | — | Write actions hidden for Viewer/Demo |
| `/collections/[id]/config` | Any + collection access | — | Figma/GitHub config; write guarded by Action.Write |
| `/collections/[id]/settings` | Any + collection access | — | Collection metadata |
| `/collections/[id]/themes` | Any + collection access | — | Theme CRUD |
| `/collections/[id]/versions` | Any + collection access | — | Version history; restore/delete guarded by Action.ManageVersions |
| `/org/users` | Admin | — | Client redirect for non-Admin |
| `/settings` | Admin | Partial | AI Configuration visible to all Admins; Database Settings and App Theme visible to Super Admin only |
| `/dev-test` | Any (dev) | — | Development test page |

---

## API route guards

### Public / auth-only (`requireAuth`)

| Route | Method | Notes |
|-------|--------|-------|
| `/api/collections` | GET | Org-scoped list |
| `/api/collections/[id]` | GET | Org ownership checked |
| `/api/org/usage` | GET | Org-scoped usage snapshot |
| `/api/user/settings` | PUT | Scoped to `session.user.id` |
| `/api/user/settings/check` | GET | Scoped to `session.user.id` |
| `/api/app-theme/config` | GET | Read-only config |
| `/api/app-theme/css` | GET | Read-only CSS |

### Action.Write (Admin + Editor)

| Route | Method |
|-------|--------|
| `/api/collections/[id]` | PUT |
| `/api/collections/[id]/tokens` | GET, POST, PATCH |
| `/api/collections/[id]/tokens/rename-prefix` | POST |
| `/api/collections/[id]/themes` | POST |
| `/api/collections/[id]/themes/[themeId]` | PUT |
| `/api/collections/[id]/themes/[themeId]/tokens` | PATCH |
| `/api/collections/[id]/themes/[themeId]/tokens/single` | GET, PUT, DELETE |
| `/api/collections/[id]/themes/[themeId]/tokens/rename-prefix` | POST |
| `/api/collections/[id]/groups` | GET, PUT, DELETE |
| `/api/build-tokens` | POST |

### Action.CreateCollection (Admin + Editor)

| Route | Method |
|-------|--------|
| `/api/collections` | POST |
| `/api/collections/[id]/duplicate` | POST |

### Action.DeleteCollection (Admin only)

| Route | Method |
|-------|--------|
| `/api/collections/[id]` | DELETE |

### Action.ManageUsers (Admin only)

| Route | Method |
|-------|--------|
| `/api/org/users` | GET, POST |
| `/api/org/users/[id]` | DELETE |
| `/api/org/users/[id]/role` | PUT |
| `/api/org/users/[id]/collections` | GET |
| `/api/invites` | GET, POST |
| `/api/invites/[id]` | DELETE |
| `/api/invites/[id]/resend` | POST |
| `/api/collections/[id]/permissions` | GET, POST |

### Action.PushGithub (Admin + Editor)

| Route | Method |
|-------|--------|
| `/api/export/github` | POST |
| `/api/import/github` | POST |
| `/api/github/branches` | GET |
| `/api/github/test` | GET |

### Action.PushFigma (Admin + Editor)

| Route | Method |
|-------|--------|
| `/api/export/figma` | POST |
| `/api/figma/import` | POST |
| `/api/figma/test` | GET |

### Action.ManageVersions (Admin + Editor)

| Route | Method |
|-------|--------|
| `/api/collections/[id]/versions` | GET, POST |
| `/api/collections/[id]/versions/[versionId]` | GET, DELETE |
| `/api/collections/[id]/versions/[versionId]/restore` | POST |
| `/api/collections/[id]/versions/bulk-delete` | POST |

### Action.PublishNpm (Admin + Editor)

| Route | Method |
|-------|--------|
| `/api/collections/[id]/publish/npm` | POST |
| `/api/collections/[id]/npm/whoami` | GET |

### Super Admin only (`isSuperAdmin`)

| Route | Method | Notes |
|-------|--------|-------|
| `/api/database/config` | GET | Returns 403 for non-super-admins |
| `/api/database/config` | PUT | Returns 403 for non-super-admins |
| `/api/database/test` | POST | Database connection test |

---

## Environment flags

| Variable | Effect |
|----------|--------|
| `SUPER_ADMIN_EMAIL` | Email address that always receives Admin + `isSuperAdmin=true` in the JWT |
| `DEMO_MODE=true` | Bypasses sign-in; all routes use a synthetic Demo session; write actions allowed on playground collections |
| `SELF_HOSTED=true` | Bypasses all billing limits; usage endpoint returns `null` (unlimited) limits |

---

## Authentication flow

1. **Sign-in** → `POST /api/auth/[...nextauth]` validates credentials, returns signed JWT cookie.
2. **JWT callback** — on every request: if `email === SUPER_ADMIN_EMAIL`, role forced to `Admin` and `isSuperAdmin: true`, no DB hit. Otherwise role is re-fetched from DB if stale (> 60 s TTL).
3. **Middleware** — checks cookie presence only; redirects unauthenticated page requests to `/auth/sign-in`.
4. **API route** — calls `requireAuth()` or `requireRole(Action.X, collectionId?)`. `requireRole` additionally verifies org ownership when `collectionId` is provided.
5. **Client component** — calls `useSession()` to read role and `isSuperAdmin`; shows/hides UI sections accordingly.

---

## Key source files

| File | Purpose |
|------|---------|
| `src/lib/auth/permissions.ts` | Role → action matrix |
| `src/lib/auth/require-auth.ts` | `requireAuth` / `requireRole` guards + org ownership check |
| `src/lib/auth/nextauth.config.ts` | JWT and session callbacks; `isSuperAdmin` propagation |
| `src/types/next-auth.d.ts` | Session and JWT type augmentation |
| `src/middleware.ts` | Edge middleware — cookie presence check + demo mode |
| `src/lib/db/models/CollectionPermission.ts` | Collection-level grants model |
