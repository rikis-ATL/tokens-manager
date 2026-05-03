---
phase: 35-demo-hero-phase-2-persist-api-middleware
reviewed: 2026-05-03T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - .env.local.example
  - src/app/auth/auto-demo/AutoDemoClient.tsx
  - src/app/auth/auto-demo/page.tsx
  - src/app/collections/[id]/tokens/page.tsx
  - src/components/demo/DemoOverlayCTA.tsx
  - src/components/graph/GraphPanelWithChrome.tsx
  - src/middleware.ts
findings:
  critical: 2
  warning: 3
  info: 3
  total: 8
status: issues_found
---

# Phase 35: Code Review Report

**Reviewed:** 2026-05-03T00:00:00Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

This phase introduces the demo-hero flow: a middleware-driven redirect for unauthenticated visitors hitting the playground collection, an auto-sign-in page that fetches credentials from a server API and signs in via NextAuth, session-storage persistence for playground edits, and a `DemoOverlayCTA` rendered inside the graph chrome. The overall approach is sound and well-structured.

Two critical issues were found: the demo credentials API (`/api/demo/credentials`) leaks the plain-text admin password over the wire to the browser, creating a credential-exposure risk, and `auto-demo/page.tsx` passes a user-controlled `callbackUrl` query parameter directly to NextAuth without validation, enabling open-redirect attacks. Three warnings cover open-redirect risk in non-demo middleware, a missing `callbackUrl` sanitisation in `AutoDemoClient`, and the `savePlaygroundSession` return value being silently ignored on every write. Three info items address code duplication, commented-out JSX, and stale `console.log`/`console.warn` calls.

---

## Critical Issues

### CR-01: Demo credentials API exposes plain-text password to the browser

**File:** `src/app/api/demo/credentials/route.ts:1`
**Issue:** `GET /api/demo/credentials` returns `{ email, password }` as a JSON response that the client reads and passes to `signIn()`. Any visitor with DevTools or a network proxy can capture the shared demo admin password. Even though the credential is only for the demo org, this is an information-disclosure vulnerability: the password can be reused if the same value is set on any other service, and it permanently exposes the seeded credentials once the page is accessed.

**Fix:** Move the sign-in call to a server-side API route that performs the sign-in server-side (using `auth()` / server-action sign-in) and issues a session cookie, never exposing the password to the client at all. If a client-side NextAuth `signIn()` call is required for the redirect flow, pass only a short-lived signed token (HMAC or JWT with a 30s TTL) instead of the raw password, and validate it in the credentials provider.

Minimal interim fix — replace the credentials endpoint with a sign-in relay:
```ts
// /api/demo/auto-sign-in/route.ts  (new file)
export async function POST(req: NextRequest) {
  if (!isDemoMode()) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const callbackUrl = sanitizeCallbackUrl(req.nextUrl.searchParams.get('callbackUrl'));
  // signIn server-side via next-auth v5 or redirect the user directly
  // — never return the password in the response body
}
```

---

### CR-02: Unvalidated `callbackUrl` enables open-redirect via `/auth/auto-demo`

**File:** `src/app/auth/auto-demo/page.tsx:14`
**Issue:** The page reads `callbackUrl` directly from the incoming query string and forwards it to `AutoDemoClient` without any validation:
```ts
const callbackUrl = searchParams.callbackUrl ?? '/collections';
```
`AutoDemoClient` passes this value to `signIn('credentials', { callbackUrl })`. NextAuth may follow the redirect after sign-in, so a crafted link `https://example.com/auth/auto-demo?callbackUrl=https://evil.com` would redirect the newly-authenticated demo user to an external domain. In DEMO_MODE this page is publicly reachable and is linked to from the middleware redirect, so it is a realistic attack surface.

**Fix:** Validate that `callbackUrl` is a relative path (starts with `/`) and does not start with `//` (protocol-relative URL). Reject or strip anything that looks like an absolute URL:
```ts
function sanitizeCallbackUrl(raw: string | undefined): string {
  const DEFAULT = '/collections';
  if (!raw) return DEFAULT;
  // Must be relative and not protocol-relative
  if (!raw.startsWith('/') || raw.startsWith('//')) return DEFAULT;
  // Block data: and javascript: embedded in the path
  if (/^\/\//i.test(raw)) return DEFAULT;
  return raw;
}

const callbackUrl = sanitizeCallbackUrl(searchParams.callbackUrl);
```

---

## Warnings

### WR-01: Non-demo middleware passes raw `pathname` as `callbackUrl` without encoding

**File:** `src/middleware.ts:69`
**Issue:** In the non-demo branch the middleware builds the sign-in redirect as:
```ts
signInUrl.searchParams.set('callbackUrl', pathname);
```
`pathname` does not include the query string. If a user navigates to `/collections/abc/tokens?graph=full`, after sign-in they will land on `/collections/abc/tokens` without `?graph=full`, silently dropping parameters. More importantly, `callbackUrl` is set to the raw `pathname` only — if the sign-in page ever reflects this without validation, the same open-redirect class applies here too. This is not an immediate bug (NextAuth validates same-origin callbackUrls by default), but the `pathname`-only value loses search parameters.

**Fix:**
```ts
const dest = req.nextUrl.pathname + req.nextUrl.search;
signInUrl.searchParams.set('callbackUrl', dest);
```

---

### WR-02: `savePlaygroundSession` failure is silently dropped on every write path

**File:** `src/app/collections/[id]/tokens/page.tsx:457-464` (and ~531, ~570, ~607, ~636)
**Issue:** `savePlaygroundSession()` returns `false` when sessionStorage is unavailable or the data is too large (>5 MB), but every call site ignores the return value. The user receives no feedback that their edit was not persisted:
```ts
savePlaygroundSession({ collectionId: id, tokens: toSave, graphState: ..., lastModified: Date.now() });
return;
```
If storage is full or unavailable the playground silently loses data on the next page reload. This is especially problematic because the playground deliberately skips the MongoDB write path.

**Fix:** Check the return value and show a warning toast on failure:
```ts
const saved = savePlaygroundSession({ ... });
if (!saved) {
  showErrorToast('Could not save playground changes locally. Storage may be full.');
}
```
A shared helper for the playground save + error-check would avoid repeating this across the five call sites.

---

### WR-03: `mergePlaygroundData` silently drops `graphState: null` from session

**File:** `src/lib/playground/session-storage.ts:105-116`
**Issue:** `mergePlaygroundData` always spreads `session.graphState` over the base, including when it is `null`:
```ts
return { ...base, tokens: session.tokens, graphState: session.graphState };
```
A session saved with `graphState: null` (which is the default for `PlaygroundSession`) will overwrite the base's populated `graphState` with `null`, silently discarding the graph layout loaded from MongoDB. In `page.tsx` line 349-354, the merge result is then only applied when `merged.graphState` is truthy, but that guard is in the consumer, not the merge function itself. If a new call site forgets the guard, the bug will surface.

**Fix:** Preserve the base `graphState` when the session value is `null`:
```ts
return {
  ...base,
  tokens: session.tokens,
  graphState: session.graphState ?? base.graphState,
};
```

---

## Info

### IN-01: Duplicated JSON-download implementation (`handleDownloadJSON` / `handleDownloadJSONFromHeader`)

**File:** `src/app/collections/[id]/tokens/page.tsx:1298-1343`
**Issue:** `handleDownloadJSON` (line 1298) and `handleDownloadJSONFromHeader` (line 1329) are identical functions — same content generation, same blob creation, same `a.click()` pattern, same success toast, same file name. `handleDownloadJSON` is defined but never called (the only invocations use `handleDownloadJSONFromHeader`), making it dead code.

**Fix:** Remove `handleDownloadJSON` and keep only `handleDownloadJSONFromHeader`, or extract a single `downloadJSON()` helper and call it in both places.

---

### IN-02: Commented-out JSX left in production component

**File:** `src/app/collections/[id]/tokens/page.tsx:1422-1425`
**Issue:** A block of commented-out JSX remains in the rendered header:
```tsx
{/* <h1 className="text-lg line-height-0">
  {collectionName}
</h1> */}
```
Dead commented-out code adds noise and should be removed or restored.

---

### IN-03: `console.log` / `console.warn` / `console.error` left in production paths

**File:** `src/app/collections/[id]/tokens/page.tsx:1233-1254`
**Issue:** Several `console.log` and `console.warn` calls remain in GitHub export/import helpers that are exercised in production:
- Line 1233: `console.warn('No GitHub config available for loading branches')`
- Line 1239: `console.log('Loading branches for repository:', githubConfig.repository)`
- Line 1248: `console.error('Failed to load branches:', error)`
- Line 1253: `console.log('GitHub config check:', githubConfig)`
- Line 1273: `console.log('GitHub config check:', githubConfig)`

The `githubConfig.token` is passed in from state (line 1241) — while the log on line 1239 logs only `githubConfig.repository`, patterns like this are easy to accidentally extend to include the token. Clean these up to use the project's `showErrorToast` pattern or remove them.

---

_Reviewed: 2026-05-03T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
