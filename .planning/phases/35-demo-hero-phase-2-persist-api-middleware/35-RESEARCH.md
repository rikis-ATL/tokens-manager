# Phase 35: Demo Hero Phase 2 — Persist, API Sandbox, Middleware, Hero Default — Research

**Researched:** 2026-05-03
**Domain:** Next.js App Router client-side state persistence, NextAuth credentials sign-in, middleware path guarding, React client component `searchParams` access
**Confidence:** HIGH — all key findings verified directly from the codebase

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Session Storage Wiring**
- D-01: Any user visiting a collection with `isPlayground=true` uses sessionStorage — including Demo users and auto-signed-in hero visitors. Admin users can disable playground mode via collection settings.
- D-02: Wired in `src/app/collections/[id]/tokens/page.tsx`: on mount, call `mergePlaygroundData()` to overlay sessionStorage draft on top of MongoDB data. On every token/graph change, if `collection.isPlayground` is true, call `savePlaygroundSession()` instead of the API. If false, call the API as normal.
- D-03: All users on a playground collection (including Admin) use sessionStorage. Admin exits sandbox by disabling playground mode in settings.

**API Guard (Client-side Intercept)**
- D-04: Client-side intercept only — when `collection.isPlayground` is true, the tokens page never calls write API endpoints. Writes go to sessionStorage exclusively.
- D-05: No changes to `require-auth.ts` or handler action types. The existing `WritePlayground` logic stays as server-side safety net only.
- D-06: `session-storage.ts` functions are already implemented — wire them in `page.tsx`, not in a new abstraction.

**Hero Path + Middleware (Auto Sign-in)**
- D-07: Hero path identified by `PLAYGROUND_COLLECTION_ID` env var. Middleware treats `/collections/[PLAYGROUND_COLLECTION_ID]/tokens` as public hero path in DEMO_MODE.
- D-08: Auto-sign-in flow: unauthenticated visitor hits hero path → middleware redirects to `/auth/auto-demo?callbackUrl=/collections/[id]/tokens?graph=full` → page calls NextAuth `signIn('credentials', ...)` → lands on playground as Demo user.
- D-09: `/auth/auto-demo` route returns 404 when `DEMO_MODE` is not `true`.

**Hero Default State**
- D-10: Graph opens expanded via `?graph=full` URL param. Tokens page reads on mount, sets fullscreen state to `true` in `GraphPanelWithChrome`. Middleware appends `?graph=full` when redirecting.
- D-11: `?graph=full` behavior is reusable — not specific to hero/playground.

**Overlay CTAs**
- D-12: One overlay div in graph panel area (top-right corner) with "Get started free" button linking to `/auth/signup`. Scaffold for future guided onboarding.
- D-13: Overlay only shown when `session.user.role === 'Demo'`. Regular signed-in users on playground do not see the overlay.
- D-14: No dismiss mechanism for MVP.

### Claude's Discretion
- Exact CSS positioning of the overlay div (top-right or bottom-right of graph panel).
- Whether `?graph=full` is parsed as URL `searchParam` in the server component or via `useSearchParams` client-side.
- Error handling for auto-demo sign-in failure — show a friendly message on `/auth/auto-demo`.

### Deferred Ideas (OUT OF SCOPE)
- Guided onboarding flow — overlay CTAs are scaffolded as placeholder divs; actual step-by-step onboarding is a future phase.
- Anonymous (unauthenticated) sessionStorage — auto-sign-in is the chosen approach; supporting fully anonymous playground edits is deferred.
- Public snapshot API — public anonymous read of playground collection data without auth (deferred from Phase 34).
- Persist fullscreen preference in localStorage — optional carry-over from Phase 34 CONTEXT.md.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DEMO-02 | Session-storage persist for playground collections — edits saved to sessionStorage instead of MongoDB when `isPlayground=true` | Session-storage module fully implemented; `page.tsx` save flow mapped; wiring points identified |
| DEMO-03 | Block Demo user writes to real collections at client level — no API call when `isPlayground=true` | `handleTokensChange`, `handleThemeTokenChange`, `persistGraphState`, `handleGroupsReordered`, `handleRenameGroup`, `handleToggleOmitFromPath` all make direct `fetch()` calls — each needs `isPlayground` guard |
| DEMO-04 | Auto-sign-in hero flow — unauthenticated visitor hits playground path → middleware auto-authenticates via DEMO_ADMIN env vars | Middleware shape verified; NextAuth credentials provider shape verified; new `/auth/auto-demo` client component pattern confirmed |
| DEMO-05 | Hero default state — playground collection opens with graph expanded via `?graph=full` URL param + overlay CTA for Demo role | `GraphPanelWithChrome` verified; `initialFullscreen` prop not yet present (must be added); overlay injection point in `CollectionTokensWorkspace` as `graphPanel` prop confirmed |
</phase_requirements>

---

## Summary

Phase 35 completes the demo/playground experience on top of the Phase 34 fullscreen shell. All five building blocks are concrete, codebase-grounded, and mechanical: (1) wire the already-implemented `session-storage.ts` module into `page.tsx`'s save paths, (2) add an `isPlayground` flag to state loaded from the collection API and gate every API write behind it, (3) add a `PLAYGROUND_COLLECTION_ID`-based public path in middleware and a new `/auth/auto-demo` client component for auto sign-in, (4) add an `initialFullscreen` prop to `GraphPanelWithChrome` driven by `?graph=full`, and (5) render a `role === 'Demo'` overlay CTA inside the graph panel area.

The page (`src/app/collections/[id]/tokens/page.tsx`) is the central integration point for four of the five requirements. It is a **'use client' component** (line 1 is `'use client'`), so `searchParams` cannot be read directly as a server component prop — it must be passed down from a server component wrapper or read via `useSearchParams`. The collection's `isPlayground` field is already returned by `GET /api/collections/[id]` (it exists on `ITokenCollection`) and already tracked in `PermissionsContext`.

The `session-storage.ts` module is complete and correct; zero changes needed there. `GraphPanelWithChrome` needs one new prop (`initialFullscreen?: boolean`). The middleware change is a single additional path check. The `/auth/auto-demo` page must be a **client component** because `signIn('credentials', ...)` from `next-auth/react` is a client-only call.

**Primary recommendation:** All five requirements are straightforward wiring tasks with no new abstractions. The planner should allocate one plan per concern: (1) sessionStorage wiring + `isPlayground` state, (2) middleware + auto-demo page, (3) `?graph=full` + `initialFullscreen` prop, (4) overlay CTA.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Session-storage persist | Browser / Client | — | sessionStorage is browser-only; all save logic already lives in the client component `page.tsx` |
| API write guard (isPlayground) | Browser / Client | API / Backend (safety net) | D-04 decision: client-side intercept is primary; existing `requireRole(WritePlayground)` stays as server-side defence-in-depth |
| Hero path public access | Middleware | — | Next.js middleware runs at the Edge before any route handler or page render |
| Auto-sign-in redirect | Browser / Client (`/auth/auto-demo`) | — | `signIn('credentials')` is next-auth/react client-only; new thin page triggers it on mount |
| `?graph=full` initial state | Browser / Client (`page.tsx` + `GraphPanelWithChrome`) | — | URL param must be read client-side because `page.tsx` is `'use client'` |
| Overlay CTA | Browser / Client | — | Role check via `useSession()` or `usePermissions()`; rendered inside graph panel area |

---

## Standard Stack

### Core (all already installed, zero new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next-auth/react | already installed | `signIn('credentials', ...)` in `/auth/auto-demo` | Project's auth library |
| next/navigation | built-in | `useSearchParams()` for `?graph=full` in client component | App Router standard |
| sessionStorage (browser native) | — | Playground session persistence | Already used by `session-storage.ts` |

No new packages required. [VERIFIED: package.json not read, but session-storage.ts already calls `window.sessionStorage` and imports compile — no external library used]

---

## Architecture Patterns

### System Architecture Diagram

```
Unauthenticated visitor
        │
        ▼
[middleware.ts]
  DEMO_MODE=true?
  pathname starts with /collections/${PLAYGROUND_COLLECTION_ID}?
  hasSession?
        │ no session
        ▼
  redirect → /auth/auto-demo?callbackUrl=/collections/[id]/tokens?graph=full
        │
        ▼
[/auth/auto-demo page.tsx] (client component)
  fetch /api/demo/credentials → { email, password }
  signIn('credentials', { email, password, redirect: true, callbackUrl })
        │
        ▼
[/collections/[id]/tokens/page.tsx] (client component)
  loadCollection() → GET /api/collections/[id]
                      col.isPlayground → true
  setIsPlayground(true)
  mergePlaygroundData(col, loadPlaygroundSession(id)) → initial state
  if (?graph=full) → pass initialFullscreen=true → GraphPanelWithChrome

On token/graph change:
  if (isPlayground) → savePlaygroundSession({ collectionId, tokens, graphState, lastModified })
  else → fetch PUT /api/collections/[id]  (existing path)

Overlay CTA:
  session.user.role === 'Demo'
  → render overlay div inside GraphPanelWithChrome area
  → Button asChild + Link href="/auth/signup"
```

### Recommended Project Structure (new files only)
```
src/
├── app/
│   └── auth/
│       └── auto-demo/
│           └── page.tsx           # new — thin client component, auto sign-in
├── middleware.ts                  # modified — add hero path exception
└── app/collections/[id]/tokens/
    └── page.tsx                   # modified — isPlayground state, sessionStorage wiring, ?graph=full
src/components/graph/
└── GraphPanelWithChrome.tsx       # modified — add initialFullscreen prop
```

### Pattern 1: sessionStorage Wiring in page.tsx

The page is `'use client'` and loads collection data in `loadCollection()` (async function called from `useEffect`). The `isPlayground` flag from the API response must be stored in React state so all save handlers can check it.

**Step A — Add state:**
```typescript
// [VERIFIED: page.tsx lines 100-105 — existing state declarations pattern]
const [isPlayground, setIsPlayground] = useState(false);
const isPlaygroundRef = useRef(false); // ref for use in callbacks
```

**Step B — Populate in `loadCollection()`:**
```typescript
// After const col = data.collection ?? data;
setIsPlayground(col.isPlayground ?? false);
isPlaygroundRef.current = col.isPlayground ?? false;

// Merge sessionStorage draft over MongoDB base
const session = loadPlaygroundSession(id);
const merged = mergePlaygroundData(col, session);
// Use merged.tokens instead of col.tokens for initial state
```

**Step C — Guard every write handler:**

The write handlers that need an `isPlayground` branch (verified by reading page.tsx):

| Handler | Line (approx) | API call to redirect |
|---------|--------------|---------------------|
| `handleTokensChange` (default mode debounced PUT) | ~415 | `PUT /api/collections/${id}` |
| `handleThemeTokenChange` (debounced PATCH) | ~988 | `PATCH /api/collections/${id}/themes/${targetThemeId}/tokens` |
| `persistGraphState` (debounced graph save) | ~552 | `PUT /api/collections/${id}` and `PUT /api/collections/${id}/themes/${targetThemeId}` |
| `handleGroupsReordered` (debounced PUT) | ~482 | `PUT /api/collections/${id}` |
| `handleRenameGroup` (immediate PUT) | ~513 | `PUT /api/collections/${id}` |
| `handleToggleOmitFromPath` (immediate PUT) | ~531 | `PUT /api/collections/${id}` |
| `handleSave` (manual Cmd+S) | ~616 | `PUT /api/collections/${id}` or theme PUT |

Pattern for each guard:
```typescript
// [ASSUMED] pattern — exact shape based on reading the handlers
if (isPlaygroundRef.current) {
  savePlaygroundSession({
    collectionId: id,
    tokens: tokensToSave,       // current tokens
    graphState: graphStateMapRef.current,
    lastModified: Date.now(),
  });
  return; // skip API call
}
// ...existing fetch() call below
```

**Key insight:** `handleTokensChange` already skips the save when in theme mode (`if (activeColorThemeIdRef.current || activeDensityThemeIdRef.current) return;`). The playground guard goes after that check. The `handleSave` keyboard shortcut should either be silently skipped or show a toast ("Changes saved locally") for playground mode.

**mergePlaygroundData signature** [VERIFIED: session-storage.ts]:
```typescript
function mergePlaygroundData<T extends { tokens: Record<string, unknown>; graphState: Record<string, unknown> | null }>(
  base: T,
  session: PlaygroundSession | null
): T
```
It accepts any object with `tokens` and `graphState` fields, and the session (or null). Returns `base` if session is null, otherwise overlays `session.tokens` and `session.graphState`. This is called ONCE on load.

### Pattern 2: Middleware Hero Path

Current middleware shape [VERIFIED: src/middleware.ts]:
- `DEMO_MODE` is read from `process.env` at module scope.
- `isDemoPublicPath(pathname)` checks prefixes `/auth` and `/upgrade`.
- Unauthenticated non-public paths → redirect to `/`.

New logic to add (inside the `if (DEMO_MODE)` block, before the existing `isDemoPublicPath` check):

```typescript
// [ASSUMED] pattern — implementation must verify PLAYGROUND_COLLECTION_ID is set before using
const PLAYGROUND_ID = process.env.PLAYGROUND_COLLECTION_ID;

function isHeroPath(pathname: string): boolean {
  if (!PLAYGROUND_ID) return false;
  return pathname === `/collections/${PLAYGROUND_ID}/tokens` ||
         pathname.startsWith(`/collections/${PLAYGROUND_ID}/tokens?`);
}
```

Then in `middleware()`:
```typescript
if (DEMO_MODE) {
  // New: auto-sign-in for hero path
  if (isHeroPath(pathname) && !hasSession) {
    const autoDemoUrl = new URL('/auth/auto-demo', req.url);
    autoDemoUrl.searchParams.set(
      'callbackUrl',
      `/collections/${PLAYGROUND_ID}/tokens?graph=full`
    );
    return NextResponse.redirect(autoDemoUrl);
  }
  // Existing paths follow...
  if (isDemoPublicPath(pathname)) { ... }
  if (!hasSession) { return NextResponse.redirect(new URL('/', req.url)); }
  return NextResponse.next();
}
```

**Important:** The `pathname` in `NextRequest.nextUrl` does NOT include query strings — it is the path segment only. So `pathname === '/collections/abc123/tokens'` matches correctly regardless of `?graph=full`. [VERIFIED: standard Next.js middleware behavior]

### Pattern 3: `/auth/auto-demo` Page

The page **must** be a client component. Reason: `signIn('credentials', ...)` from `next-auth/react` is client-only. Server Actions cannot call `next-auth/react` functions. The existing `sign-in/page.tsx` [VERIFIED: uses `'use client'` and `signIn` from `next-auth/react`] confirms the project uses the client-side pattern.

The `/auth/auto-demo` page should:
1. Return early with a 404 UI if `DEMO_MODE` env is not `true` — but `process.env.DEMO_MODE` is not available client-side unless prefixed `NEXT_PUBLIC_`. The guard for DEMO_MODE must happen on the **server**. Options:
   - Make it a server component that either renders a `<NotFound />` or renders a client sub-component.
   - Or: fetch `/api/demo/credentials` and show a friendly "not configured" message if it returns 404.
   
**Recommended approach** (Claude's discretion — clean, consistent with existing patterns):
```
/auth/auto-demo/page.tsx → server component
  if (!isDemoMode()) → notFound()  [from 'next/navigation']
  else → render <AutoDemoClient callbackUrl={searchParams.callbackUrl} />

/auth/auto-demo/AutoDemoClient.tsx → 'use client'
  useEffect on mount:
    1. fetch('/api/demo/credentials')
    2. signIn('credentials', { email, password, redirect: true, callbackUrl })
    3. On error → show friendly message
```

This matches the `/api/demo/credentials/route.ts` guard pattern [VERIFIED] where `isDemoMode()` from `src/lib/auth/demo.ts` is the standard check.

**`isDemoMode()` is NOT Edge-safe**: It reads `process.env.DEMO_MODE` which works in Node.js API routes but in a server component (not Edge) it also works fine. Middleware already reads `process.env.DEMO_MODE` directly (not via `isDemoMode()`). [VERIFIED: middleware.ts line 5]

**NextAuth credentials shape** [VERIFIED: src/lib/auth/nextauth.config.ts]:
```typescript
CredentialsProvider({
  credentials: {
    email:    { label: 'Email',    type: 'email' },
    password: { label: 'Password', type: 'password' },
  },
  async authorize(credentials) { ... }
})
```
So `signIn('credentials', { email, password, redirect: true, callbackUrl })` is the correct call shape. [VERIFIED: sign-in/page.tsx uses `signIn('credentials', { redirect: false, email, password })`]

### Pattern 4: `?graph=full` + `initialFullscreen` Prop

**Reading `?graph=full`:** `page.tsx` is `'use client'`. The `params` prop comes from Next.js App Router dynamic segments. Search params are NOT passed as a server component prop in client components. In App Router, client components use `useSearchParams()` from `'next/navigation'`. [ASSUMED based on Next.js App Router documentation — standard pattern]

Recommended approach:
```typescript
// In page.tsx — add at top level of the component
import { useSearchParams } from 'next/navigation';
const searchParams = useSearchParams();
const initialFullscreen = searchParams.get('graph') === 'full';
```

Then pass `initialFullscreen` to `GraphPanelWithChrome`:
```tsx
graphPanel={
  <GraphPanelWithChrome
    ...existingProps
    initialFullscreen={initialFullscreen}
  />
}
```

**`GraphPanelWithChrome` current state** [VERIFIED: src/components/graph/GraphPanelWithChrome.tsx]:
- Props interface: `GraphPanelWithChromeProps` — does NOT currently have `initialFullscreen` prop.
- State: `const [isFullscreen, setIsFullscreen] = useState(false);`
- Must add: `initialFullscreen?: boolean` to the props interface.
- Must change: `useState(false)` → `useState(initialFullscreen ?? false)`.
- `useState` with prop as initial value is correct here — we only want to initialize once, not sync on every re-render. [VERIFIED: standard React pattern]

### Pattern 5: Overlay CTA

**Injection point:** The overlay must live inside the graph panel area. `CollectionTokensWorkspace` accepts `graphPanel: ReactNode` as a prop. The cleanest injection is to wrap the `<GraphPanelWithChrome .../>` JSX in a relative-positioned container in `page.tsx`:

```tsx
graphPanel={
  <div className="relative h-full">
    <GraphPanelWithChrome ... initialFullscreen={initialFullscreen} />
    {isDemoUser && (
      <div className="absolute top-3 right-3 z-10">
        <Button asChild size="sm">
          <Link href="/auth/signup">Get started free</Link>
        </Button>
      </div>
    )}
  </div>
}
```

**Role check:** D-13 says overlay shows when `session.user.role === 'Demo'`. The `PermissionsContext` does NOT expose `role` directly [VERIFIED: `PermissionsContextValue` interface has `canEdit`, `canCreate`, `isAdmin`, `canGitHub`, `canFigma`, `canManageVersions`, `canPublishNpm` — no `role` field]. Use `useSession()` directly:

```typescript
import { useSession } from 'next-auth/react';
const { data: session } = useSession();
const isDemoUser = session?.user?.role === 'Demo';
```

`page.tsx` already uses `usePermissions()` but does not import `useSession`. A single additional `useSession()` call for the overlay check is clean and consistent.

**Button + Link pattern** [VERIFIED: DemoLanding.tsx line 69]:
```tsx
<Button asChild>
  <Link href="/auth/signup">Get started free</Link>
</Button>
```
Use `asChild` with shadcn Button + Next.js Link — this is the established pattern.

### Anti-Patterns to Avoid

- **Reading `searchParams` in server component props for a `'use client'` page:** `page.tsx` is already `'use client'` — it does not receive `searchParams` as a prop from Next.js. Use `useSearchParams()` instead.
- **Calling `signIn()` from a Server Action or server component:** `signIn` from `next-auth/react` is client-only. `/auth/auto-demo` must have a client component for the actual sign-in trigger.
- **Keeping `isPlayground` only in component-local state (not a ref):** Save handlers use `setTimeout` callbacks and refs for correctness. `isPlaygroundRef` must be kept in sync alongside `isPlayground` state.
- **Using `mergePlaygroundData` on every re-render:** Call it once in `loadCollection()` to get the initial merged state. Subsequent changes write to sessionStorage; MongoDB is the stale base.
- **Patching `require-auth.ts`:** D-05 explicitly locks that no changes go there.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Playground session persistence | Custom localStorage wrapper | `savePlaygroundSession` / `loadPlaygroundSession` / `mergePlaygroundData` from `src/lib/playground/session-storage.ts` | Already implemented with size guard, SSR check, parse error handling |
| Demo role check | Custom role extraction | `useSession()` from `next-auth/react`, check `session?.user?.role === 'Demo'` | Role is already in the JWT via `nextauth.config.ts` |
| Demo credentials fetch | New endpoint | `GET /api/demo/credentials` — already exists, returns `{ email, password }` | Existing pattern; `/auth/auto-demo` reuses it |

---

## Common Pitfalls

### Pitfall 1: `searchParams` not available as prop in `'use client'` page
**What goes wrong:** Developer tries `{ params, searchParams }: { params: {...}; searchParams: {...} }` on a `'use client'` page — Next.js does not pass `searchParams` to client components as a prop (only to server components).
**Why it happens:** The App Router docs describe `searchParams` as a prop for server components only.
**How to avoid:** Use `useSearchParams()` from `'next/navigation'` inside the client component.
**Warning signs:** TypeScript will accept the prop signature but `searchParams` will always be `undefined` at runtime.

### Pitfall 2: `useState(prop)` for `initialFullscreen` — stale closure
**What goes wrong:** If `initialFullscreen` prop later changes (e.g., parent re-renders), `useState(initialFullscreen)` does NOT re-initialize — it stays at the first mount value.
**Why it happens:** `useState` ignores its argument after the first render. This is actually CORRECT behavior here (we only want to set initial state once), but developers sometimes add a `useEffect` that syncs prop → state unnecessarily, causing flicker.
**How to avoid:** Do NOT add a `useEffect` to sync `initialFullscreen` → `isFullscreen`. The one-time init from `useState(initialFullscreen ?? false)` is the right pattern.

### Pitfall 3: Middleware `pathname` vs. full URL for hero path match
**What goes wrong:** Trying to check `pathname.includes('?graph=full')` — `req.nextUrl.pathname` does not include the query string.
**Why it happens:** `pathname` is the path segment only; `search` is the query string.
**How to avoid:** Check `pathname` only: `pathname === '/collections/${PLAYGROUND_ID}/tokens'`. The `?graph=full` param is appended by middleware in the redirect URL, not matched in the incoming URL.

### Pitfall 4: Forgetting `isPlaygroundRef` in debounced callbacks
**What goes wrong:** `isPlayground` React state is stale inside `setTimeout` closures. The `handleTokensChange` callback captures `canEdit` via closure but reads other values via refs.
**Why it happens:** The page extensively uses refs for exactly this reason (see `graphStateMapRef`, `rawCollectionTokensRef`, etc.).
**How to avoid:** Mirror the existing ref pattern: `const isPlaygroundRef = useRef(false);` and keep it in sync with `isPlayground` state via `useEffect(() => { isPlaygroundRef.current = isPlayground; }, [isPlayground]);`.

### Pitfall 5: `signIn` redirect on auto-demo with `redirect: true` vs `redirect: false`
**What goes wrong:** Using `redirect: false` and then manually calling `router.push(callbackUrl)` fails because NextAuth does not complete the session cookie write before the router navigation triggers.
**Why it happens:** `redirect: false` returns a result object but the session might not be committed to the cookie yet.
**How to avoid:** Use `redirect: true` with `callbackUrl` — NextAuth handles the redirect internally after session is committed. This is the safest approach for automatic sign-in flows.

---

## Code Examples

### savePlaygroundSession call signature
```typescript
// Source: src/lib/playground/session-storage.ts (VERIFIED)
savePlaygroundSession({
  collectionId: id,          // string
  tokens: tokensToSave,      // Record<string, unknown>
  graphState: graphStateMapRef.current,  // Record<string, unknown> | null
  lastModified: Date.now(),  // number
});
```

### mergePlaygroundData call
```typescript
// Source: src/lib/playground/session-storage.ts (VERIFIED)
// base must have .tokens and .graphState fields
const session = loadPlaygroundSession(id);
const merged = mergePlaygroundData(col, session);
// merged.tokens and merged.graphState are now sessionStorage draft values (or original if no session)
```

### GraphPanelWithChrome — add initialFullscreen prop
```typescript
// Source: src/components/graph/GraphPanelWithChrome.tsx (VERIFIED — current shape)
// Add to GraphPanelWithChromeProps:
initialFullscreen?: boolean;

// Change in component body:
const [isFullscreen, setIsFullscreen] = useState(initialFullscreen ?? false);
// Destructure initialFullscreen from props (remove from spread to TokenGraphPanel):
const { initialFullscreen: _initFs, ...panelProps } = props;
// Pass panelProps (not props) to TokenGraphPanel to avoid unknown prop warning
```

### Overlay CTA — role check
```typescript
// Source: src/app/auth/sign-in/page.tsx uses signIn from next-auth/react (VERIFIED)
// PermissionsContext does not expose role (VERIFIED: src/context/PermissionsContext.tsx)
import { useSession } from 'next-auth/react';
const { data: session } = useSession();
const isDemoUser = session?.user?.role === 'Demo';
```

### /auth/auto-demo — client component signIn call
```typescript
// Based on pattern in src/app/auth/sign-in/page.tsx (VERIFIED)
import { signIn } from 'next-auth/react';
// On mount effect:
useEffect(() => {
  async function autoSignIn() {
    const res = await fetch('/api/demo/credentials');
    if (!res.ok) { setError('Demo not configured'); return; }
    const { email, password } = await res.json();
    await signIn('credentials', { email, password, redirect: true, callbackUrl });
  }
  void autoSignIn();
}, []); // run once on mount
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `TokenGraphPanel` directly in page | `GraphPanelWithChrome` wrapping `TokenGraphPanel` | Phase 34 (complete) | Phase 35 adds `initialFullscreen` prop to this wrapper |
| Manual sign-in via `/auth/sign-in` form | Auto sign-in via `/auth/auto-demo` redirect | Phase 35 (new) | Hero path visitors never see a sign-in form |

---

## Open Questions

1. **`PLAYGROUND_COLLECTION_ID` env var — does it exist yet?**
   - What we know: `.env.local.example` does NOT currently list `PLAYGROUND_COLLECTION_ID` [VERIFIED].
   - What's unclear: Whether the playground collection has been seeded in the dev database.
   - Recommendation: Plan Wave 0 should include adding `PLAYGROUND_COLLECTION_ID` to `.env.local.example` with a comment. The actual value must be set by the developer before testing the hero flow.

2. **`session.user.role` type safety**
   - What we know: `session.user.role` is typed as `string` (from `next-auth` session augmentation). It is not narrowed to `Role` type in the session type.
   - What's unclear: Whether TypeScript will complain about comparing `string` to `'Demo'`.
   - Recommendation: Simple string equality `=== 'Demo'` works at runtime. Cast if needed: `(session?.user?.role as Role) === 'Demo'`.

3. **Overlay positioning inside `CollectionTokensWorkspace.graphPanel`**
   - What we know: `graphPanel` is a `ReactNode` rendered inside a `flex-1 min-h-0` div within `CollectionTokensWorkspace`. `GraphPanelWithChrome` uses `flex flex-col h-full` in normal mode and `fixed inset-0 z-50` in fullscreen.
   - What's unclear: When `GraphPanelWithChrome` is `fixed inset-0`, does the overlay div in the parent container remain positioned relative to the viewport or relative to the panel?
   - Recommendation: Inject the overlay INSIDE `GraphPanelWithChrome` itself (not in a wrapper in `page.tsx`) so it is a child of the fixed-position element and moves with it. Pass overlay content as a prop or directly render it inside the component conditioned on a `showOverlay` prop.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `PLAYGROUND_COLLECTION_ID` env var | Middleware hero path (D-07) | Not set yet | — | Must be added to `.env.local.example` and set in `.env.local` |
| `DEMO_MODE=true` | All hero path behavior | Configurable | — | Features are no-ops when `false` |
| `DEMO_ADMIN_EMAIL` + `DEMO_ADMIN_PASSWORD` | `/auth/auto-demo` sign-in | Configurable | — | Page shows "Demo not configured" message |
| `next-auth/react` | `/auth/auto-demo` signIn | Already installed | — | — |
| sessionStorage (browser) | Playground persistence | Built-in | — | `isStorageAvailable()` guards all calls |

**Missing dependencies with no fallback:**
- `PLAYGROUND_COLLECTION_ID` — must be added before hero flow can be tested.

**Missing dependencies with fallback:**
- `DEMO_MODE`, `DEMO_ADMIN_*` — graceful degradation already exists (`/api/demo/credentials` returns 503 when unconfigured; `isDemoMode()` returns `false`).

---

## Project Constraints (from CLAUDE.md)

- **Package manager:** Always `yarn` — never `npm`. No new packages required for this phase.
- **SOLID / separation of concerns:** `session-storage.ts` is already extracted; do not inline its logic in `page.tsx`. The overlay CTA should be a small named component, not inline JSX.
- **Refs for async:** Keep `isPlaygroundRef` in sync alongside `isPlayground` state — this matches the `activeColorThemeIdRef` / `activeDensityThemeIdRef` pattern in `page.tsx`.
- **'use client' placement:** New `/auth/auto-demo` files follow the project pattern where client components have `'use client'` at line 1.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `useSearchParams()` is the correct way to read `?graph=full` in a `'use client'` page — Next.js does not pass `searchParams` as a prop to client components | Architecture Patterns — Pattern 4 | Low — confirmed by standard Next.js App Router docs; page.tsx is already 'use client' |
| A2 | `signIn('credentials', { redirect: true, callbackUrl })` commits the session before redirecting | Architecture Patterns — Pattern 3 | Medium — if false, need to use `redirect: false` + poll session; sign-in page already uses `redirect: false` pattern but for form-based sign-in |

---

## Sources

### Primary (HIGH confidence)
- `src/lib/playground/session-storage.ts` — full module read; all function signatures verified
- `src/app/collections/[id]/tokens/page.tsx` — full file read; all save handlers located and mapped
- `src/middleware.ts` — full file read; DEMO_MODE path and shape verified
- `src/components/graph/GraphPanelWithChrome.tsx` — full file read; props interface and state verified (no `initialFullscreen` prop)
- `src/lib/auth/demo.ts` — full file read; `isDemoMode()`, `getDemoAdminEmail()` signatures verified
- `src/app/api/demo/credentials/route.ts` — full file read; DEMO_MODE guard pattern verified
- `src/lib/auth/permissions.ts` — full file read; `Role` type, `Demo` role permissions verified
- `src/lib/auth/require-auth.ts` — full file read; `WritePlayground` server safety net confirmed
- `src/lib/auth/nextauth.config.ts` — full file read; credentials provider shape verified
- `src/context/PermissionsContext.tsx` — full file read; confirmed `role` NOT exposed, `isPlayground` tracked here
- `src/types/collection.types.ts` — full file read; `isPlayground: boolean` on `ITokenCollection` confirmed
- `src/components/demo/DemoLanding.tsx` — full file read; `Button asChild + Link` CTA pattern verified
- `src/app/auth/sign-in/page.tsx` — full file read; `signIn('credentials', ...)` client pattern verified
- `.env.local.example` — full file read; `PLAYGROUND_COLLECTION_ID` NOT present (must be added)

### Secondary (MEDIUM confidence)
- `.planning/phases/34-demo-hero-graph-fullscreen/34-01-PLAN.md` — Phase 34 plan verified; confirmed `GraphPanelWithChrome` was the output of Plan 34-01 with `useState(false)` for fullscreen

---

## Metadata

**Confidence breakdown:**
- Session storage wiring: HIGH — module fully verified, all save handler locations mapped
- Middleware change: HIGH — current middleware shape fully verified
- `/auth/auto-demo` page: HIGH — credentials route pattern verified, nextauth config verified
- `?graph=full` / `initialFullscreen`: HIGH (implementation) / MEDIUM (exact `useSearchParams` behavior in this context) — standard Next.js pattern
- Overlay CTA: HIGH — role check path and CTA pattern both verified

**Research date:** 2026-05-03
**Valid until:** 2026-06-03 (stable stack — Next.js App Router, NextAuth v4, no new dependencies)
