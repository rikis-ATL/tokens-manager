---
phase: 35-demo-hero-phase-2-persist-api-middleware
plan: 03
subsystem: auth
tags: [middleware, next-auth, demo-mode, nextjs, server-component]

# Dependency graph
requires:
  - phase: 35-demo-hero-phase-2-persist-api-middleware
    provides: PLAYGROUND_COLLECTION_ID env var and demo credentials API route (/api/demo/credentials)
provides:
  - isHeroPath helper in middleware identifies playground collection tokens path
  - Hero redirect block redirects unauthenticated visitors to /auth/auto-demo?callbackUrl=...?graph=full
  - /auth/auto-demo server component with isDemoMode() notFound() guard
  - AutoDemoClient fetches credentials and calls signIn on mount with redirect:true
affects: [35-04, demo-hero-phase-2]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server component notFound() guard for DEMO_MODE-gated pages"
    - "Client component auto-sign-in pattern: fetch credentials on mount, signIn with redirect:true"
    - "Middleware hero path check with exact equality (not prefix) for security"

key-files:
  created:
    - src/app/auth/auto-demo/page.tsx
    - src/app/auth/auto-demo/AutoDemoClient.tsx
  modified:
    - src/middleware.ts

key-decisions:
  - "isHeroPath uses exact path equality (not startsWith) to avoid broad route capture — security requirement from T-35-03-01"
  - "PLAYGROUND_ID unset returns false from isHeroPath — safe default, no redirect when env var absent"
  - "/auth prefix already in DEMO_PUBLIC_PATH_PREFIXES covers /auth/auto-demo — no list change needed"
  - "AutoDemoClient uses redirect:true (not redirect:false) to avoid race condition where session cookie hasn't committed before router navigation"
  - "callbackUrl excluded from useEffect deps — it is stable for the component lifetime (server component prop)"

patterns-established:
  - "Server component notFound guard: import isDemoMode from lib/auth/demo, call notFound() at top of server component"
  - "Auto sign-in client component: useEffect with empty deps, fetch credentials, signIn with redirect:true and callbackUrl"

requirements-completed: [DEMO-04]

# Metrics
duration: 15min
completed: 2026-05-03
---

# Phase 35 Plan 03: Demo Hero Middleware and Auto-Demo Sign-in Summary

**Middleware hero-path redirect and /auth/auto-demo auto-sign-in page delivering DEMO-04 — unauthenticated visitors to the playground collection are automatically signed in as the Demo user and land on the hero view with the graph expanded**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-03T00:00:00Z
- **Completed:** 2026-05-03T00:15:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added `PLAYGROUND_ID` const and `isHeroPath()` helper to middleware — returns false when env var unset, uses exact path equality for security
- Hero redirect block fires as first check in DEMO_MODE branch — unauthenticated visitors to `/collections/[id]/tokens` are redirected to `/auth/auto-demo?callbackUrl=.../tokens?graph=full`
- `/auth/auto-demo/page.tsx` server component returns 404 outside DEMO_MODE via `notFound()` and renders AutoDemoClient with the callbackUrl prop
- `AutoDemoClient.tsx` fetches `/api/demo/credentials` on mount, calls `signIn('credentials', {redirect: true, callbackUrl})`, shows friendly error if credentials unavailable

## Task Commits

1. **Task 1: Add isHeroPath helper and hero redirect to middleware.ts** - `edbce27` (feat)
2. **Task 2: Create /auth/auto-demo server component and AutoDemoClient** - `e81f428` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/middleware.ts` - Added PLAYGROUND_ID const, isHeroPath() function, and hero redirect block before isDemoPublicPath check
- `src/app/auth/auto-demo/page.tsx` - Server component: isDemoMode() guard with notFound(), renders AutoDemoClient with callbackUrl prop
- `src/app/auth/auto-demo/AutoDemoClient.tsx` - Client component: auto-sign-in via fetch + signIn on mount, loading and error states

## Decisions Made

- `isHeroPath` uses exact equality (`pathname === ...`), not `startsWith`, to avoid overly broad path capture (T-35-03-01 mitigation)
- `/auth/auto-demo` requires no change to `DEMO_PUBLIC_PATH_PREFIXES` — existing `/auth` prefix already covers it
- `redirect: true` in `signIn` call avoids a race condition where the session cookie hasn't been committed before the router navigation fires
- `callbackUrl` is intentionally omitted from `useEffect` deps array — it is a stable server component prop for the component lifetime

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

Ensure `PLAYGROUND_COLLECTION_ID` is set in `.env.local` (or deployment env). Without it, `isHeroPath` always returns false and no redirect occurs. The demo admin credentials (`DEMO_ADMIN_EMAIL`, `DEMO_ADMIN_PASSWORD`, `DEMO_MODE=true`) must also be configured per existing Phase 35 setup documentation.

## Next Phase Readiness

- DEMO-04 delivered: middleware hero path redirect is live
- `/auth/auto-demo` page handles the full sign-in flow autonomously
- Ready for Phase 35-04: hero default state (graph expanded on playground collection route)

---
*Phase: 35-demo-hero-phase-2-persist-api-middleware*
*Completed: 2026-05-03*
