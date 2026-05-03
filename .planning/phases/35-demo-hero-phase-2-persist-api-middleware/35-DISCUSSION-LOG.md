# Phase 35: Demo Hero Phase 2 — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-03
**Phase:** 35 — Demo Hero Phase 2 — Persist, API Sandbox, Middleware, Hero Default
**Areas discussed:** Session persist scope, API guard fix strategy, Hero path + middleware, Hero default + overlay CTAs

---

## Session Persist Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Demo role only | Only Demo users on playground use sessionStorage | |
| Any user on any playground collection | All users on isPlayground=true use sessionStorage | ✓ (with clarification) |
| Unauthenticated hero visitor too | Anonymous pre-auth visitors also get sessionStorage | |

**User's choice:** Any user on a playground collection — but Admin still saves to DB. Clarified: Admin can disable playground mode via settings page, at which point normal DB writes resume. All users (including Admin) on an active playground use sessionStorage.

**Wiring location:** Tokens page (`page.tsx`) — on mount merge session over MongoDB data; on token change, if `collection.isPlayground` write sessionStorage instead of calling API.

---

## API Guard Fix Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Change handlers to WritePlayground | Switch Action.Write → Action.WritePlayground in write handlers | Initially selected |
| Add fallback in requireRole | Add Demo-awareness inside requireRole | |
| Add requireWriteOrPlayground helper | New helper combining both | |

**Refined via clarification:** User's mental model is "playground = sessionStorage for everyone." The client intercepts saves — when `isPlayground=true`, the page never calls write API endpoints. `require-auth.ts` and action types stay unchanged; `WritePlayground` logic is a server-side safety net only.

---

## Hero Path + Middleware

| Option | Description | Selected |
|--------|-------------|----------|
| PLAYGROUND_COLLECTION_ID env var | Middleware reads env var to identify public hero path | ✓ |
| /hero route with redirect | Add /hero as public alias | |
| isPlayground DB check | Not feasible in Edge middleware | |

**Public access approach:** Auto-sign-in flow — unauthenticated visitor → middleware detects playground path → redirects to `/auth/auto-demo` → auto-signs in using `DEMO_ADMIN_EMAIL` + `DEMO_ADMIN_PASSWORD` env vars → redirected to playground as Demo user. User confirmed this approach.

**Notes:** `/auth/auto-demo` must return 404 when `DEMO_MODE=false` to prevent credential exposure.

---

## Hero Default + Overlay CTAs

| Option | Description | Selected |
|--------|-------------|----------|
| URL param ?graph=full | Middleware appends param; page reads on mount and sets fullscreen=true | ✓ |
| Auto-detect isPlayground | Page defaults to fullscreen when isPlayground | |

| Option | Description | Selected |
|--------|-------------|----------|
| Sign up + Contact us | Two overlay buttons | |
| Sign up only | Single CTA | |
| Claude's discretion | | |

**Overlay decision:** User wants placeholder overlay divs scaffolded for future guided onboarding. For MVP: one overlay div with "Get started free" button linking to `/auth/signup`. No dismiss mechanism. Only visible when `session.user.role === 'Demo'`.

---

## Claude's Discretion

- Exact positioning of overlay div (top-right vs bottom-right of graph panel)
- Whether `?graph=full` is parsed server-side or client-side
- Error handling for unconfigured auto-demo env vars

## Deferred Ideas

- Guided onboarding flow (out of scope — future phase)
- Anonymous (no session) playground editing
- Public snapshot API
- Fullscreen preference localStorage persistence (from Phase 34)
