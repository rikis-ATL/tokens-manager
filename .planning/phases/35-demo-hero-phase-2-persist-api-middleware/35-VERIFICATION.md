---
phase: 35-demo-hero-phase-2-persist-api-middleware
verified: 2026-05-03T10:09:02Z
status: human_needed
score: 4/4 must-haves verified
overrides_applied: 0
re_verification: false
human_verification:
  - test: "Navigate to /collections/[PLAYGROUND_COLLECTION_ID]/tokens when unauthenticated (DEMO_MODE=true, PLAYGROUND_COLLECTION_ID set) — verify browser redirects to /auth/auto-demo and auto-signs in as Demo user, landing on the playground with the graph expanded fullscreen"
    expected: "Unauthenticated visitor lands on playground tokens page with graph in fullscreen; URL includes ?graph=full; session role is Demo"
    why_human: "Requires DEMO_MODE=true, PLAYGROUND_COLLECTION_ID set, and a live NextAuth session to verify the middleware redirect chain and auto-sign-in flow end-to-end"
  - test: "On a playground collection (isPlayground=true), make a token edit and verify no network request is made to PUT /api/collections/[id]"
    expected: "No PUT request in network tab; sessionStorage key for the collection is updated with the new token value"
    why_human: "Requires browser devtools to inspect network requests and sessionStorage state; cannot be verified by static analysis"
  - test: "Reload the playground collection page after making edits — verify edits are restored from sessionStorage (not overwritten by MongoDB data)"
    expected: "Token values match what was edited in the previous session; MongoDB data is not shown"
    why_human: "Requires browser interaction to set sessionStorage state, reload, and inspect rendered token values"
  - test: "Verify DemoOverlayCTA appears only for Demo-role users — sign in as Admin user, navigate to a playground collection, confirm no overlay CTA is visible"
    expected: "No 'Get started free' button visible for Admin; button visible when signed in as Demo user"
    why_human: "Visual role-conditional rendering requires a live session with different role values; cannot be verified from static code"
---

# Phase 35: Demo Hero Phase 2 Verification Report

**Phase Goal:** Complete the demo/playground experience — session-storage persistence for playground edits, auto-sign-in hero flow via middleware, graph fullscreen via ?graph=full URL param, DemoOverlayCTA for demo users.
**Verified:** 2026-05-03T10:09:02Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | sessionStorage persist wired — hero and signed-in Demo edits go to sessionStorage, not MongoDB | ✓ VERIFIED | `isPlayground` state/ref set from `col.isPlayground`; `mergePlaygroundData` called on load; 7 handler guards confirmed at lines 456, 528, 569, 601, 631, 709, 1086 in page.tsx |
| 2 | Demo user blocked from non-playground writes — require-auth.ts Write vs WritePlayground enforced | ✓ VERIFIED | `Demo` role only has `Action.WritePlayground` in permissions.ts (line 30); `requireRole(Action.Write)` on PUT /api/collections/[id] route returns 403 for Demo; client-side guards (D-04) prevent fetch calls entirely when `isPlaygroundRef.current === true` |
| 3 | Middleware serves hero path publicly — unauthenticated visitor redirected to /auth/auto-demo with callbackUrl | ✓ VERIFIED | `isHeroPath()` helper in middleware.ts (lines 15-18); hero redirect block before `isDemoPublicPath` check (line 40-47); `/auth/auto-demo` covered by existing `/auth` prefix in `DEMO_PUBLIC_PATH_PREFIXES` |
| 4 | Hero default state — playground collection opens with graph expanded via ?graph=full | ✓ VERIFIED | `useSearchParams` imported (page.tsx line 4); `initialFullscreen` derived from `searchParams.get('graph') === 'full'` (line 106); passed to `GraphPanelWithChrome` (line 1668); `useState(initialFullscreen ?? false)` in `GraphPanelWithChrome.tsx` (line 33) |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/graph/GraphPanelWithChrome.tsx` | initialFullscreen prop + DemoOverlayCTA injection | ✓ VERIFIED | `initialFullscreen?: boolean` in interface (line 29); destructured as `{ initialFullscreen, ...panelProps }` (line 32); `useState(initialFullscreen ?? false)` (line 33); `<DemoOverlayCTA />` rendered inside `flex-1 min-h-0 relative` container (lines 58-61) |
| `src/app/collections/[id]/tokens/page.tsx` | useSearchParams wiring + isPlayground state/ref + 7 write guards | ✓ VERIFIED | All wiring confirmed; `savePlaygroundSession` called 7 times; `isPlaygroundRef.current` checked 7 times in handlers |
| `.env.local.example` | PLAYGROUND_COLLECTION_ID documented | ✓ VERIFIED | Lines 17-18: commented entry with explanatory comment referencing middleware auto-sign-in |
| `src/middleware.ts` | isHeroPath helper + hero redirect block | ✓ VERIFIED | `PLAYGROUND_ID` const (line 13); `isHeroPath()` function (lines 15-18); redirect block (lines 39-47); callbackUrl includes `?graph=full` (line 44) |
| `src/app/auth/auto-demo/page.tsx` | Server component with notFound() guard | ✓ VERIFIED | No `'use client'`; `isDemoMode()` guard with `notFound()` (lines 10-12); renders `AutoDemoClient` with `callbackUrl` prop |
| `src/app/auth/auto-demo/AutoDemoClient.tsx` | Client component — fetch credentials + signIn on mount | ✓ VERIFIED | `'use client'` (line 1); `fetch('/api/demo/credentials')` in `useEffect` (line 16); `signIn('credentials', { redirect: true, callbackUrl })` (lines 22-27); error handling present |
| `src/components/demo/DemoOverlayCTA.tsx` | Role-gated CTA overlay | ✓ VERIFIED | `useSession()` role check (line 16); `if (!isDemoUser) return null` (line 18); `Button asChild size="sm"` with `Link href="/auth/signup"` (lines 22-24); `absolute top-3 right-3 z-10` positioning (line 21); no dismiss mechanism |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `page.tsx` | `GraphPanelWithChrome.tsx` | `initialFullscreen={initialFullscreen}` prop | ✓ WIRED | Line 1668: `initialFullscreen={initialFullscreen}` passed in graphPanel JSX |
| `GraphPanelWithChrome.tsx` | `TokenGraphPanel.tsx` | `{...panelProps}` spread (initialFullscreen excluded) | ✓ WIRED | Line 59: `<TokenGraphPanel {...panelProps} />`; `initialFullscreen` destructured out at line 32 |
| `page.tsx` | `src/lib/playground/session-storage.ts` | import of savePlaygroundSession, loadPlaygroundSession, mergePlaygroundData | ✓ WIRED | Lines 57-59: all three functions imported; `mergePlaygroundData` called at line 345; `savePlaygroundSession` called 7× in handlers |
| `src/middleware.ts` | `src/app/auth/auto-demo/page.tsx` | `NextResponse.redirect` to `/auth/auto-demo` with callbackUrl | ✓ WIRED | Lines 41-47 in middleware; `/auth` prefix in `DEMO_PUBLIC_PATH_PREFIXES` allows access |
| `AutoDemoClient.tsx` | `/api/demo/credentials` | `fetch('/api/demo/credentials')` on mount | ✓ WIRED | Line 16 in AutoDemoClient.tsx |
| `AutoDemoClient.tsx` | NextAuth CredentialsProvider | `signIn('credentials', { redirect: true, callbackUrl })` | ✓ WIRED | Lines 22-27 in AutoDemoClient.tsx |
| `GraphPanelWithChrome.tsx` | `DemoOverlayCTA.tsx` | import and JSX render inside relative container | ✓ WIRED | Line 7: import; line 60: `<DemoOverlayCTA />` rendered |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `GraphPanelWithChrome.tsx` | `isFullscreen` (seeded from `initialFullscreen`) | `useSearchParams().get('graph') === 'full'` in page.tsx | Yes — URL param evaluated at runtime | ✓ FLOWING |
| `DemoOverlayCTA.tsx` | `session?.user?.role` | `useSession()` → NextAuth JWT (server-issued) | Yes — server-issued JWT claims | ✓ FLOWING |
| `page.tsx` playground merge | `mergedTokens`, `mergedGs` | `loadPlaygroundSession(id)` → sessionStorage; `mergePlaygroundData` overlays on MongoDB base | Yes — real sessionStorage + MongoDB data | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| `isHeroPath` returns false when PLAYGROUND_ID unset | Static analysis: `if (!PLAYGROUND_ID) return false` at line 16 | Guard present | ✓ PASS |
| `initialFullscreen` not forwarded to TokenGraphPanel | `{ initialFullscreen, ...panelProps }` destructuring; `{...panelProps}` spread | initialFullscreen absent from panelProps | ✓ PASS |
| Only one fullscreen toggle button | `grep "onClick.*setIsFullscreen" GraphPanelWithChrome.tsx` returns 1 line | Single toggle at line 51 | ✓ PASS |
| 7 `savePlaygroundSession` calls (one per handler) | `grep -c "savePlaygroundSession" page.tsx` = 7 | Confirmed | ✓ PASS |
| TypeScript compiles clean | `yarn tsc --noEmit` exit code 0, no output | Clean | ✓ PASS |
| auto-demo page.tsx has no 'use client' | `grep -c "'use client'" src/app/auth/auto-demo/page.tsx` = 0 | Server component confirmed | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DEMO-02 | 35-02-PLAN.md | Session-storage persist for playground edits | ✓ SATISFIED | mergePlaygroundData on load + 7 write guards in page.tsx |
| DEMO-03 | 35-02-PLAN.md | Block Demo writes to real MongoDB collections | ✓ SATISFIED | Client-side isPlaygroundRef guards (primary); server-side Demo→WritePlayground permission (safety net) |
| DEMO-04 | 35-03-PLAN.md | Middleware hero path auto-redirect + auto sign-in | ✓ SATISFIED | isHeroPath in middleware.ts; /auth/auto-demo page + AutoDemoClient |
| DEMO-05 | 35-01-PLAN.md, 35-04-PLAN.md | Hero default state (?graph=full) + DemoOverlayCTA | ✓ SATISFIED | initialFullscreen wired via useSearchParams; DemoOverlayCTA in GraphPanelWithChrome |

**Note:** DEMO-02 through DEMO-05 are referenced in ROADMAP.md and plan frontmatter but have no formal definition entries in `.planning/REQUIREMENTS.md`. They are treated as phase-internal requirement IDs. The REQUIREMENTS.md traceability table does not map these IDs to Phase 35. This is an informational gap — the requirements are satisfied in implementation but not formally documented in the requirements register.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/auth/auto-demo/AutoDemoClient.tsx` | 33 | `// eslint-disable-next-line react-hooks/exhaustive-deps` | ℹ️ Info | Intentional — `callbackUrl` is a stable server component prop; documented in plan decisions |

No blockers or stubs found. The eslint-disable is intentional per plan decision and correctly documented.

### Human Verification Required

#### 1. End-to-end auto-sign-in hero flow

**Test:** With `DEMO_MODE=true`, `PLAYGROUND_COLLECTION_ID` set to a valid collection ID, and `DEMO_ADMIN_EMAIL`/`DEMO_ADMIN_PASSWORD` configured — visit `/collections/[PLAYGROUND_COLLECTION_ID]/tokens` in a browser where no session exists (private window or cleared cookies).
**Expected:** Browser redirects to `/auth/auto-demo?callbackUrl=.../tokens?graph=full` → automatic sign-in → landing on the playground tokens page with the graph panel in fullscreen. Session role is `Demo`.
**Why human:** Requires a live Next.js environment with DEMO_MODE=true, valid MongoDB collection, and NextAuth configured with credentials provider. Cannot be verified by static analysis.

#### 2. sessionStorage write-intercept (no MongoDB calls)

**Test:** On a collection with `isPlayground=true`, open browser devtools Network tab, make a token edit (change a value), wait for the debounce.
**Expected:** No PUT request to `/api/collections/[id]` appears in the network tab. sessionStorage key `playground_session_[id]` is updated with the new token value.
**Why human:** Requires browser network inspector and runtime state verification.

#### 3. sessionStorage draft restoration on page reload

**Test:** Edit tokens on a playground collection, reload the page (same browser tab/session), observe the initial rendered token values.
**Expected:** Edited values are shown (restored from sessionStorage), not the original MongoDB values.
**Why human:** Requires verifying rendered DOM values match sessionStorage, not MongoDB.

#### 4. DemoOverlayCTA role gate

**Test:** Sign in as Admin user, navigate to a playground collection — confirm no "Get started free" button appears. Sign in as Demo user (via auto-demo flow), navigate to same page — confirm "Get started free" button is visible at top-right of the graph panel.
**Expected:** Button absent for Admin; button present for Demo in both normal and fullscreen graph states.
**Why human:** Visual and role-conditional rendering; requires live session with different user roles.

### Gaps Summary

No automated gaps found. All 4 must-have truths are verified, all 7 artifacts exist and are substantive and wired, all key links are connected, TypeScript compiles clean.

One informational note: DEMO-02 through DEMO-05 are not formally defined in `.planning/REQUIREMENTS.md` (only DEMO-01 is indirectly referenced via PROJECT.md). The ROADMAP.md success criteria served as the authoritative source for this verification.

Awaiting 4 human verification items before this phase can be signed off.

---

_Verified: 2026-05-03T10:09:02Z_
_Verifier: Claude (gsd-verifier)_
