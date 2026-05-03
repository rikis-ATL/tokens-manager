# Phase 35: Demo Hero Phase 2 — Persist, API Sandbox, Middleware, Hero Default — Context

**Gathered:** 2026-05-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete the demo/playground experience:
1. Wire session-storage persist — any user visiting a playground collection (`isPlayground=true`) saves edits to sessionStorage instead of MongoDB.
2. Block Demo writes to real collections at the client level (no API call made when `isPlayground=true`).
3. Auto-sign-in hero flow — unauthenticated visitor hits playground path → middleware auto-authenticates via DEMO_ADMIN env vars → lands on playground as Demo user.
4. Hero default state — playground collection opens with graph expanded via `?graph=full` URL param.
5. Overlay CTA — one positioned overlay div with "Get started free" sign-up button; scaffolded for future guided onboarding.

</domain>

<decisions>
## Implementation Decisions

### Session Storage Wiring

- **D-01:** Any user visiting a collection with `isPlayground=true` uses sessionStorage — this includes Demo users and auto-signed-in hero visitors. Admin users can disable playground mode via the collection settings page (`/collections/[id]/settings/playground`), after which normal MongoDB writes resume.
- **D-02:** Wired in `src/app/collections/[id]/tokens/page.tsx`: on mount, call `mergePlaygroundData()` to overlay sessionStorage draft on top of MongoDB data. On every token/graph change, if `collection.isPlayground` is true, call `savePlaygroundSession()` instead of the API. If false, call the API as normal.
- **D-03:** No sessionStorage for Admin users on playground collections — wait, correction: **all** users on a playground collection (including Admin) use sessionStorage. Admin exits sandbox by disabling playground mode in settings, not by having a bypass in the token-save path.

### API Guard (Client-side Intercept)

- **D-04:** Client-side intercept only — when `collection.isPlayground` is true, the tokens page never calls write API endpoints (PUT collection, PATCH themes, PUT groups). Writes go to sessionStorage exclusively.
- **D-05:** No changes to `require-auth.ts` or handler action types. The existing `WritePlayground` logic in `requireRole` stays as a server-side safety net but is not the primary enforcement mechanism.
- **D-06:** `session-storage.ts` functions (`savePlaygroundSession`, `loadPlaygroundSession`, `mergePlaygroundData`) are already implemented — wire them in `page.tsx`, not in a new abstraction.

### Hero Path + Middleware (Auto Sign-in)

- **D-07:** Hero path identified by `PLAYGROUND_COLLECTION_ID` env var. Middleware reads `process.env.PLAYGROUND_COLLECTION_ID` and treats `/collections/[PLAYGROUND_COLLECTION_ID]/tokens` as the public hero path in `DEMO_MODE`.
- **D-08:** Auto-sign-in flow: unauthenticated visitor hits the hero path → middleware redirects to `/auth/auto-demo` (a new thin page) with `?callbackUrl=/collections/[id]/tokens?graph=full` → `/auth/auto-demo` calls NextAuth `signIn('credentials', { email: DEMO_ADMIN_EMAIL, password: DEMO_ADMIN_PASSWORD, redirect: true, callbackUrl })` → user lands on the playground as Demo user.
- **D-09:** The `/auth/auto-demo` route must only function when `DEMO_MODE=true` — return 404 otherwise to prevent credential exposure.

### Hero Default State

- **D-10:** Graph opens expanded via `?graph=full` URL param. The tokens page reads this on mount and sets fullscreen state to `true` in `GraphPanelWithChrome`. Middleware appends `?graph=full` when redirecting to the playground.
- **D-11:** The `?graph=full` param behavior is reusable — any link to a collection tokens page can append it to open with graph expanded. Not specific to hero/playground.

### Overlay CTAs

- **D-12:** One overlay div positioned in the graph panel area (top-right corner) containing a single "Get started free" button linking to `/auth/signup`. Scaffold is ready for guided onboarding steps to be added in a future phase.
- **D-13:** Overlay is only shown when `session.user.role === 'Demo'` (i.e., the auto-signed-in hero visitor). Regular signed-in users on a playground collection do not see the overlay.
- **D-14:** No dismiss mechanism for MVP — the CTA stays visible throughout the hero session.

### Claude's Discretion

- Exact CSS positioning of the overlay div (top-right or bottom-right of graph panel).
- Whether `?graph=full` is parsed as a URL `searchParam` in the server component or via `useSearchParams` client-side.
- Error handling for auto-demo sign-in failure (e.g., unconfigured env vars) — show a friendly message on `/auth/auto-demo`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Session storage
- `src/lib/playground/session-storage.ts` — already-implemented module with `loadPlaygroundSession`, `savePlaygroundSession`, `mergePlaygroundData`, `clearPlaygroundSession`

### Auth and permissions
- `src/lib/auth/require-auth.ts` — `requireRole` with `WritePlayground` logic (safety net, not primary enforcement)
- `src/lib/auth/permissions.ts` — `Action` enum, Demo role permission set
- `src/middleware.ts` — DEMO_MODE middleware; hero path public access logic goes here
- `src/app/api/demo/credentials/route.ts` — existing demo credentials API (reference for env var usage pattern)
- `src/lib/auth/demo.ts` — `isDemoMode()`, `getDemoAdminEmail()` helpers

### Hero and graph
- `src/app/collections/[id]/tokens/page.tsx` — session wiring, `?graph=full` param, overlay CTA go here
- `src/components/graph/TokenGraphPanel.tsx` — existing graph component
- `src/components/tokens/CollectionTokensWorkspace.tsx` — workspace; `GraphPanelWithChrome` is wired here (Phase 34)
- `src/components/demo/DemoLanding.tsx` — existing demo landing (reference for CTA styling patterns)
- `.planning/phases/34-demo-hero-graph-fullscreen/34-CONTEXT.md` — Phase 34 decisions (fullscreen shell scope)
- `.planning/phases/34-demo-hero-graph-fullscreen/34-01-PLAN.md` — Phase 34 plan (GraphPanelWithChrome implementation)

### Collection model
- `src/types/collection.types.ts` — `ITokenCollection.isPlayground` field
- `src/app/api/collections/[id]/route.ts` — collection GET/PUT handlers

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/playground/session-storage.ts` — complete, just needs wiring at the call site
- `GraphPanelWithChrome` (built in Phase 34) — has fullscreen prop/state; needs to accept initial fullscreen state from `?graph=full`
- `src/app/api/demo/credentials/route.ts` — pattern for DEMO_MODE-only endpoints (use same guard in `/auth/auto-demo`)
- `src/lib/auth/demo.ts` — `isDemoMode()`, `getDemoAdminEmail()` already exist

### Established Patterns
- Middleware reads `DEMO_MODE` from `process.env` (not a build-time constant — correct for Edge)
- Collection `isPlayground` field is already on `ITokenCollection` and returned by the GET handler
- `PermissionsContext` already tracks `isPlayground` and gates `canEdit` via `WritePlayground` — useful reference for overlay CTA visibility check
- New pages at `/auth/*` return 404 when not in the correct mode (see demo/credentials pattern)

### Integration Points
- `src/app/collections/[id]/tokens/page.tsx` — primary integration point for D-02, D-10, D-12
- `src/middleware.ts` — add hero path exception (D-07) and auto-demo redirect (D-08)
- New file: `src/app/auth/auto-demo/page.tsx` — auto sign-in page (D-08, D-09)

</code_context>

<specifics>
## Specific Ideas

- The `/auth/auto-demo` page should be a server component that immediately calls NextAuth signIn or a thin client component that triggers sign-in on mount — whichever is simpler given Next.js App Router constraints.
- The overlay "Get started free" button styling should match the existing `Button` + `Link` pattern from `DemoLanding.tsx` (shadcn/Radix Button, `asChild` pattern).
- Middleware change is minimal: one additional path check `pathname.startsWith('/collections/${PLAYGROUND_COLLECTION_ID}')` in the `isDemoPublicPath` equivalent.

</specifics>

<deferred>
## Deferred Ideas

- **Guided onboarding flow** — the overlay CTAs are scaffolded as placeholder divs; the actual step-by-step onboarding experience is a future phase.
- **Anonymous (unauthenticated) sessionStorage** — auto-sign-in is the chosen approach; supporting fully anonymous (no session) playground edits is deferred.
- **Public snapshot API** — public anonymous read of playground collection data without auth (deferred from Phase 34).
- **Persist fullscreen preference in localStorage** — optional carry-over from Phase 34 CONTEXT.md.

</deferred>

---

*Phase: 35-demo-hero-phase-2-persist-api-middleware*
*Context gathered: 2026-05-03*
