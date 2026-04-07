# Phase 18: Middleware and Route Handler Guards - Research

**Researched:** 2026-03-28
**Domain:** Next.js middleware, next-auth v4 session verification, CVE-2025-29927, Route Handler guard utility
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Route exclusions**
- Middleware protects all page routes except `/auth/*` (sign-in, NextAuth callbacks)
- Matcher also excludes `_next/static`, `_next/image`, and `favicon.ico` — no auth logic on static assets
- No public API routes — all `/api/*` routes require auth
- Middleware handles page requests only; API 401s are handled by `requireAuth()` inside each Route Handler (clean separation of concerns)

**Redirect behavior**
- Middleware preserves `callbackUrl` on redirect: `/auth/sign-in?callbackUrl=/original/path`
- Default post-sign-in landing (no `callbackUrl`): `/collections`
- Signed-in users visiting `/auth/sign-in` directly are redirected to `/collections`

**requireAuth() contract**
- Returns the session object `{ user: { id, email, role } }` on success — handlers can use identity without calling `getServerSession` again
- On failure, returns a `NextResponse.json({ error: 'Unauthorized' }, { status: 401 })` — caller pattern: `const authResult = await requireAuth(req); if (authResult instanceof NextResponse) return authResult;`
- JWT-only validation — no DB lookup per request; deleted users can act until token expires (revocation is a later concern)

**401 response format**
- Body: `{ error: 'Unauthorized' }` — simple JSON, machine-readable key
- No `WWW-Authenticate` header (session-cookie-based app, no client acts on it)
- No client-side 401 handling in this phase (toast/redirect on 401 is a future UI concern)

### Claude's Discretion
- Exact `matcher` regex pattern in `middleware.ts`
- How `requireAuth()` reads the session internally (`getServerSession` vs `getToken`)
- File structure within `src/lib/auth/` for the utility

### Deferred Ideas (OUT OF SCOPE)
- Client-side 401 handling (fetch interceptor, redirect to sign-in on 401) — future UI phase
- User revocation / immediate session invalidation on delete — future auth hardening phase
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-02 | Unauthenticated users are redirected to the sign-in page | Next.js middleware with `withAuth` / manual `getToken` redirect logic; matcher excludes `/auth/*` and static assets |
| ARCH-02 | All 18 existing write Route Handlers are guarded with `getServerSession()` / `requireAuth()` — middleware alone is not a security boundary | `requireAuth()` utility using `getServerSession(authOptions)` (no req/res in App Router); caller returns early on `instanceof NextResponse` |
</phase_requirements>

---

## Summary

Phase 18 adds two complementary security layers: (1) a Next.js middleware file that redirects unauthenticated page requests to `/auth/sign-in?callbackUrl=...`, and (2) a `requireAuth()` utility called at the top of every existing write Route Handler so that even if middleware is bypassed the API returns 401.

The project already runs next@13.5.9, which is the backport that patches CVE-2025-29927 (released 2025-03-22). The fix randomises the internal `x-middleware-subrequest` token so an attacker cannot craft a header that bypasses middleware. This means the success criterion "curl with `x-middleware-subrequest` does not bypass auth" is already satisfied by the version upgrade completed in Phase 16. The Phase 18 work is to write the middleware logic itself and add `requireAuth()` guards to the 18 write Route Handlers.

For middleware, the recommended approach is next-auth's `withAuth` helper (JWT strategy only — which is what this project uses). It reads the JWT cookie without a DB lookup, making it safe for the Edge runtime. For `requireAuth()` inside Route Handlers the recommended call is `getServerSession(authOptions)` with just `authOptions` — App Router Route Handlers do NOT accept the `(req, res, authOptions)` three-argument form used by Pages API routes.

**Primary recommendation:** Write a single `src/middleware.ts` using `withAuth` with a negative-lookahead matcher that excludes `/auth/`, `_next/static`, `_next/image`, and `favicon.ico`. Write `src/lib/auth/require-auth.ts` containing `requireAuth()` that calls `getServerSession(authOptions)` and returns either the session or a 401 `NextResponse`. Add the two-line guard to each of the 18 write handlers.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next-auth | ^4.24.13 (already installed) | `withAuth` middleware helper, `getServerSession`, JWT verification | Project already uses v4; v5 requires Next.js 14+ |
| next | 13.5.9 (already installed) | `NextResponse`, `NextRequest`, middleware runtime | Locked version — CVE-2025-29927 patched in this version |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `next-auth/middleware` | (bundled with next-auth) | `withAuth` and `getToken` exports | Middleware runtime — reads JWT cookie in Edge; no DB call |
| `next-auth/next` | (bundled with next-auth) | `getServerSession` | Route Handler guards — Node runtime; reads session from JWT |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `withAuth` middleware helper | Manual `getToken` + `NextResponse.redirect` | `withAuth` adds token on `req.nextauth.token`; manual gives finer control over redirect URL shape (callbackUrl encoding) |
| `getServerSession(authOptions)` in requireAuth | `getToken({ req })` in requireAuth | `getServerSession` returns the full typed session; `getToken` returns the raw JWT — either works, but `getServerSession` matches the interface (`session.user.id`, `session.user.role`) already defined in authOptions callbacks |

**Installation:** No new packages required. `next-auth` is already installed.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── middleware.ts                          # NEW — Next.js middleware entry point
├── lib/
│   └── auth/
│       ├── nextauth.config.ts             # EXISTING — authOptions
│       ├── permissions.ts                 # EXISTING
│       ├── invite.ts                      # EXISTING
│       └── require-auth.ts               # NEW — requireAuth() utility
└── app/
    └── api/
        └── [all 18 write route files]    # MODIFIED — add requireAuth() call
```

### Pattern 1: Middleware with withAuth (page route protection)

**What:** Export `withAuth` as the default middleware export. The `authorized` callback reads the JWT token; if it returns `false`, next-auth redirects to `pages.signIn` (already configured as `/auth/sign-in`). The `callbackUrl` query param is appended automatically by next-auth on the redirect.

**When to use:** Page routes that require any authenticated session (no RBAC in this phase).

**Example:**
```typescript
// src/middleware.ts
// Source: https://next-auth.js.org/configuration/nextjs#middleware
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    // Optional: redirect signed-in users away from /auth/sign-in
    if (req.nextUrl.pathname.startsWith('/auth/sign-in') && req.nextauth.token) {
      return NextResponse.redirect(new URL('/collections', req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
);

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /auth/* (sign-in page, NextAuth callbacks at /api/auth/*)
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico
     */
    '/((?!auth|_next/static|_next/image|favicon\\.ico).*)',
  ],
};
```

**Important nuance on matcher:** The matcher `/((?!auth|...).*)`  excludes paths starting with `auth` — this covers both `/auth/sign-in` (page) and `/api/auth/...` (NextAuth callback endpoints). Since the CONTEXT decision says "Middleware handles page requests only; API 401s handled by `requireAuth()`", the matcher should only match page routes, not `/api/` routes. Two valid approaches:

- **Approach A — exclude `/api` from matcher (recommended):** Add `api` to the exclusion list. This keeps the middleware purely for page UX. Route Handlers do their own auth via `requireAuth()`.
  ```typescript
  '/((?!api|auth|_next/static|_next/image|favicon\\.ico).*)'
  ```
- **Approach B — match only page routes explicitly:** More verbose but maximally clear.

Approach A is recommended because it matches the CONTEXT separation of concerns decision exactly.

### Pattern 2: requireAuth() utility

**What:** A single async function in `src/lib/auth/require-auth.ts` that calls `getServerSession(authOptions)`, checks for null, and returns either the session or a `NextResponse` 401.

**When to use:** Top of every write Route Handler function before any business logic.

**Example:**
```typescript
// src/lib/auth/require-auth.ts
// Source: https://github.com/nextauthjs/next-auth/discussions/7828
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { authOptions } from './nextauth.config';

export type AuthResult = Session | NextResponse;

export async function requireAuth(): Promise<AuthResult> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return session;
}
```

**Caller pattern in Route Handlers:**
```typescript
// Source: CONTEXT.md requireAuth() contract
import { requireAuth } from '@/lib/auth/require-auth';
import { NextResponse } from 'next/server';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  // authResult is now typed as Session — can use authResult.user.id, authResult.user.role
  // ... rest of handler
}
```

**Critical:** App Router Route Handlers call `getServerSession(authOptions)` with **only one argument** — the authOptions config object. The three-argument form `getServerSession(req, res, authOptions)` is for Pages API routes only and throws `"res.getHeader is not a function"` in App Router context.

### Anti-Patterns to Avoid

- **Calling `getServerSession(req, res, authOptions)` in App Router Route Handlers:** App Router `Request` and `Response` objects are Web API types, not Node.js `IncomingMessage`/`ServerResponse`. The three-argument form requires Node types. Always use `getServerSession(authOptions)` (one argument) in App Router.
- **Relying solely on middleware for API security:** CVE-2025-29927 demonstrated that middleware can be bypassed. State.md and CONTEXT.md explicitly require Route Handler guards as the actual security boundary.
- **Calling `getServerSession` on GET/read handlers (this phase):** ARCH-02 specifies write Route Handlers. Read-only handlers (GET) are out of scope for Phase 18.
- **Importing authOptions from the NextAuth route file:** `authOptions` lives in `src/lib/auth/nextauth.config.ts` — import from there, not from `src/app/api/auth/[...nextauth]/route.ts`, to avoid circular import risk.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT cookie verification in middleware | Custom cookie parsing + JWT decode logic | `withAuth` from `next-auth/middleware` | Handles cookie name differences between dev/prod, secret rotation, algorithm config, signed-in redirect |
| Session extraction in Route Handlers | Manual cookie read + JWT.verify | `getServerSession(authOptions)` | Handles session strategy abstraction, callbacks, token merging — single source of truth |
| callbackUrl encoding | Manual `encodeURIComponent(pathname)` | `withAuth` redirect (automatic) | next-auth automatically appends `?callbackUrl=` on unauthorized redirect when using `withAuth` |

**Key insight:** next-auth v4's `withAuth` and `getServerSession` are purpose-built for exactly this use case. Any custom re-implementation replicates logic that next-auth already handles, including edge cases around cookie names (`__Secure-next-auth.session-token` in production vs `next-auth.session-token` in dev).

---

## Complete Audit: 18 Write Route Handlers

All of the following need `requireAuth()` added as the first call. Grouped by file.

| # | File | HTTP Method | Route |
|---|------|------------|-------|
| 1 | `src/app/api/collections/route.ts` | POST | `/api/collections` |
| 2 | `src/app/api/collections/[id]/route.ts` | PUT | `/api/collections/[id]` |
| 3 | `src/app/api/collections/[id]/route.ts` | DELETE | `/api/collections/[id]` |
| 4 | `src/app/api/collections/[id]/duplicate/route.ts` | POST | `/api/collections/[id]/duplicate` |
| 5 | `src/app/api/collections/[id]/themes/route.ts` | POST | `/api/collections/[id]/themes` |
| 6 | `src/app/api/collections/[id]/themes/[themeId]/route.ts` | PUT | `/api/collections/[id]/themes/[themeId]` |
| 7 | `src/app/api/collections/[id]/themes/[themeId]/route.ts` | DELETE | `/api/collections/[id]/themes/[themeId]` |
| 8 | `src/app/api/collections/[id]/themes/[themeId]/tokens/route.ts` | PATCH | `/api/collections/[id]/themes/[themeId]/tokens` |
| 9 | `src/app/api/export/github/route.ts` | POST | `/api/export/github` |
| 10 | `src/app/api/import/github/route.ts` | POST | `/api/import/github` |
| 11 | `src/app/api/figma/import/route.ts` | POST | `/api/figma/import` |
| 12 | `src/app/api/export/figma/route.ts` | POST | `/api/export/figma` |
| 13 | `src/app/api/tokens/[...path]/route.ts` | PUT | `/api/tokens/[...path]` |
| 14 | `src/app/api/build-tokens/route.ts` | POST | `/api/build-tokens` |
| 15 | `src/app/api/database/config/route.ts` | PUT | `/api/database/config` |
| 16 | `src/app/api/database/test/route.ts` | POST | `/api/database/test` |
| 17 | `src/app/api/github/branches/route.ts` | POST | `/api/github/branches` |
| 18 | `src/app/api/auth/setup/route.ts` | POST | `/api/auth/setup` |

**Special case — handler 18 (`/api/auth/setup` POST):** This is the bootstrap endpoint. It already has a self-contained guard (`count > 0` returns 403). Adding `requireAuth()` to this handler would break first-time setup because no user exists yet. The CONTEXT.md statement "No public API routes" was intended for *collection/data routes*. The planner should mark this handler as an explicit exception — add a comment explaining why it is excluded from `requireAuth()`, and verify the existing `count > 0` guard is sufficient. The net result is **17 write Route Handlers get `requireAuth()`**, with handler 18 documented as an intentional exception.

---

## Common Pitfalls

### Pitfall 1: Three-argument getServerSession in App Router

**What goes wrong:** Developer uses `getServerSession(req, res, authOptions)` in a Route Handler. Gets runtime error `res.getHeader is not a function` because App Router `Response` is the Web API type, not Node.js `ServerResponse`.

**Why it happens:** The NextAuth docs prominently show the `(req, res, authOptions)` form for Pages API routes. Developers copy-paste without noticing the App Router difference.

**How to avoid:** Always call `getServerSession(authOptions)` with one argument in App Router contexts (Route Handlers, Server Components). The single-argument form works in both Next.js 13+ App Router and older Pages router.

**Warning signs:** TypeScript will not catch this — the types are compatible in some overloads. The error only surfaces at runtime.

### Pitfall 2: Matcher runs on /api/ routes, conflicting with requireAuth()

**What goes wrong:** Middleware matcher includes `/api/*` routes. When middleware redirects an unauthenticated API request to `/auth/sign-in`, the client (which made a `fetch()` call) receives an HTML redirect instead of a JSON 401, breaking the UI.

**Why it happens:** Using the default negative-lookahead pattern `/((?!_next/static|_next/image|favicon.ico).*)` without adding `api` to the exclusion list.

**How to avoid:** Add `api` to the matcher exclusion list: `/((?!api|auth|_next/static|_next/image|favicon\\.ico).*)`. API routes return 401 from `requireAuth()` — middleware does not touch them.

**Warning signs:** `fetch()` calls in client components fail with HTML parse errors rather than JSON errors.

### Pitfall 3: withAuth authorized callback returns undefined instead of false

**What goes wrong:** `authorized: ({ token }) => token?.role === 'admin'` — when `token` is null, `token?.role` is `undefined`, and `undefined === 'admin'` is `false`. This is fine. But a poorly written callback like `authorized: ({ token }) => token && someCondition` returns `null` when `token` is null, which is falsy but TypeScript may not catch it.

**Why it happens:** Implicit boolean coercion differences.

**How to avoid:** Always return an explicit boolean: `authorized: ({ token }) => !!token`. Phase 18 only checks for authentication (not role), so `!!token` is the correct expression.

### Pitfall 4: withAuth middleware not running on /auth/sign-in redirect loop

**What goes wrong:** If the matcher includes `/auth/sign-in`, an unauthenticated user visiting `/auth/sign-in` triggers middleware, which redirects them to `/auth/sign-in?callbackUrl=...`, which triggers middleware again — infinite redirect loop.

**Why it happens:** Including `auth` in the matcher pattern when it should be excluded.

**How to avoid:** The negative-lookahead `(?!auth|...)` in the matcher ensures `/auth/*` paths are excluded. Verify the regex correctly excludes both `/auth/sign-in` and `/api/auth/...`.

### Pitfall 5: CVE-2025-29927 — confirmed closed at 13.5.9 but worth verifying

**What goes wrong:** A test with `curl -H "x-middleware-subrequest: middleware" http://localhost:3000/collections` would bypass auth on vulnerable versions.

**Why it is closed:** Next.js 13.5.9 backport (released 2025-03-22) validates the header against a randomly generated hex token. The project was already upgraded to 13.5.9 in Phase 16 specifically for this CVE.

**How to verify:** The success criterion can be validated with: `curl -v -H "x-middleware-subrequest: middleware" http://localhost:3000/collections` — should receive a redirect to `/auth/sign-in`, not the collections page.

**Warning signs:** If the collections page loads without a session cookie, the patch is not active. Confirm `package.json` shows `"next": "13.5.9"` and `node_modules/next/package.json` version matches.

---

## Code Examples

Verified patterns from official sources:

### Complete middleware.ts

```typescript
// src/middleware.ts
// Source: https://next-auth.js.org/configuration/nextjs#middleware
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    // Redirect already-authenticated users away from sign-in page
    if (req.nextUrl.pathname === '/auth/sign-in' && req.nextauth.token) {
      return NextResponse.redirect(new URL('/collections', req.url));
    }
    // All other authenticated requests: proceed normally
    return NextResponse.next();
  },
  {
    callbacks: {
      // Return true = proceed; false = redirect to signIn page (configured in authOptions.pages.signIn)
      // next-auth automatically appends ?callbackUrl=<current-path> on redirect
      authorized: ({ token }) => !!token,
    },
  },
);

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - api/          (API routes — guarded by requireAuth() inside each handler)
     * - auth/         (/auth/sign-in, /auth/setup, /api/auth/... NextAuth callbacks)
     * - _next/static  (static files)
     * - _next/image   (image optimization)
     * - favicon.ico
     */
    '/((?!api|auth|_next/static|_next/image|favicon\\.ico).*)',
  ],
};
```

### Complete require-auth.ts

```typescript
// src/lib/auth/require-auth.ts
// Source: https://github.com/nextauthjs/next-auth/discussions/7828 + authOptions contract
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { authOptions } from './nextauth.config';

export type AuthResult = Session | NextResponse;

/**
 * Call at the top of every write Route Handler.
 * Returns the session on success, or a NextResponse 401 on failure.
 *
 * Usage:
 *   const authResult = await requireAuth();
 *   if (authResult instanceof NextResponse) return authResult;
 *   // authResult is now Session — use authResult.user.id / authResult.user.role
 */
export async function requireAuth(): Promise<AuthResult> {
  // App Router Route Handlers use single-argument form (no req/res)
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return session;
}
```

### Route Handler guard usage

```typescript
// Any write Route Handler — first two lines of every handler function
import { requireAuth } from '@/lib/auth/require-auth';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  // authResult is Session — proceed with business logic
  try {
    // ... existing handler body unchanged ...
  } catch (error) {
    // ... existing error handling unchanged ...
  }
}
```

### Matcher pattern — confirmed valid regex

The pattern `/((?!api|auth|_next/static|_next/image|favicon\\.ico).*)` is the standard Next.js negative-lookahead pattern from official Next.js 14 docs (applies equally to 13.5.x). The pattern:
- `(?!...)` — negative lookahead: do not match paths starting with any of these
- `api` — excludes `/api/*`
- `auth` — excludes `/auth/*`
- `_next/static` — excludes Next.js static asset serving
- `_next/image` — excludes Next.js image optimisation
- `favicon\\.ico` — escaped dot (`.ico` extension)
- `.*` — match everything else

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages router `export default middleware` with `req, res` | App Router `withAuth` from `next-auth/middleware` | Next.js 13.0 (App Router GA) | Route Handlers use Web API Request/Response — no `req.getHeader` style methods |
| `getServerSession(req, res, authOptions)` | `getServerSession(authOptions)` | next-auth v4 + App Router | Three-argument form breaks in App Router; one-argument form works everywhere |
| x-middleware-subrequest bypass (CVE-2025-29927) | Patched in 13.5.9 (2025-03-22) | March 2025 | Project is already on 13.5.9 — CVE closed; no action needed |

**Deprecated/outdated:**
- `import { middleware } from 'next-auth/middleware'` direct export without `withAuth`: Works for simple "must be logged in" cases but does not support the signed-in-user redirect to `/collections` that this phase requires.
- `withAuth` with database session strategy: next-auth docs explicitly state `withAuth` only supports `"jwt"` strategy. The project uses `strategy: "jwt"` — compatible.

---

## Open Questions

1. **Does `/api/auth/setup` POST count among the "18 write Route Handlers"?**
   - What we know: The requirement says "18 existing write Route Handlers". Counting all HTTP-mutating methods across all route files yields exactly 18 (including `POST /api/auth/setup`).
   - What's unclear: Should a pre-auth bootstrap endpoint receive `requireAuth()` when it must work before any user exists?
   - Recommendation: Mark as explicit exception. Add a comment in the handler explaining the rationale. Document the count as "17 guarded + 1 explicit exception". The existing `count > 0` guard prevents abuse post-setup.

2. **`withAuth` vs manual `getToken` in middleware**
   - What we know: `withAuth` calls `getToken` internally and provides `req.nextauth.token`. The signed-in-user redirect to `/collections` requires checking the token in the middleware function body.
   - What's unclear: Whether `withAuth` correctly handles the `callbackUrl` parameter automatically or whether it needs to be set manually.
   - Recommendation: Use `withAuth` — it automatically appends `?callbackUrl=<pathname>` on redirect when `authorized()` returns `false` because next-auth reads `pages.signIn` from `authOptions`. Verified: `authOptions.pages.signIn` is already set to `/auth/sign-in` in `nextauth.config.ts`.

---

## Sources

### Primary (HIGH confidence)

- `https://next-auth.js.org/configuration/nextjs` — `withAuth` middleware API, authorized callback, matcher config
- `https://nextjs.org/docs/14/app/building-your-application/routing/middleware` — Official Next.js 14 middleware docs (applies to 13.5.x), matcher regex syntax, `NextResponse.redirect` patterns
- `https://github.com/nextauthjs/next-auth/discussions/7828` — Confirmed: `getServerSession(authOptions)` single-argument form for App Router Route Handlers

### Secondary (MEDIUM confidence)

- `https://vercel.com/blog/postmortem-on-next-js-middleware-bypass` — CVE-2025-29927 fix details, 13.5.9 backport confirmed (2025-03-22)
- `https://nvd.nist.gov/vuln/detail/CVE-2025-29927` — CVE details, affected versions, patched versions

### Tertiary (LOW confidence)

- WebSearch: Multiple sources confirming `/((?!api|auth|_next/static|_next/image|favicon.ico).*)` as the standard matcher pattern — consistent across multiple blogs; confirmed by official Next.js docs example.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; next-auth and next are existing dependencies
- Architecture: HIGH — patterns verified against official next-auth and Next.js docs; App Router signature confirmed via GitHub discussion
- Pitfalls: HIGH — App Router signature pitfall confirmed by GitHub issue thread; CVE status confirmed by Vercel postmortem; others derived from direct analysis of existing route handler signatures
- Route handler audit: HIGH — all 20 route files read directly from codebase; write methods counted

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (next-auth v4 is stable; no expected breaking changes in this timeframe)
