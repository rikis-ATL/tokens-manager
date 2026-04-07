---
phase: 17-auth-api-routes-and-sign-in-flow
verified: 2026-03-28T00:00:00Z
status: passed
score: 19/19 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Sign-in with wrong email shows 'No account found with that email' inline below the form"
    expected: "Error text renders below the form, not as a toast or alert"
    why_human: "Inline rendering and exact message text require browser observation — Plan 17-04 human checkpoint approved this"
  - test: "After setup completes, user is auto signed in and redirected to /"
    expected: "No sign-in step required after the setup form is submitted"
    why_human: "Auto sign-in flow is runtime behavior — Plan 17-04 human checkpoint approved this"
  - test: "Session persists across browser refresh"
    expected: "UserMenu still shows display name and collections page loads normally after Cmd+R"
    why_human: "JWT cookie persistence requires browser verification — Plan 17-04 human checkpoint approved this"
---

# Phase 17: Auth API Routes and Sign-In Flow — Verification Report

**Phase Goal:** Users can sign in, stay signed in across refresh, and sign out — the full auth round-trip works end to end
**Verified:** 2026-03-28
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

All truths are drawn from the combined must_haves across Plans 01, 02, 03, and 04.

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Sign-in with wrong email returns 'No account found with that email' | VERIFIED | `authorize()` at line 24: `throw new Error('No account found with that email')` — Plan 17-04 human approved |
| 2  | Sign-in with wrong password returns 'Incorrect password' | VERIFIED | `authorize()` at line 29: `throw new Error('Incorrect password')` |
| 3  | Disabled accounts return same error as wrong password (no status leak) | VERIFIED | `authorize()` at line 25: disabled check throws `'Incorrect password'` explicitly |
| 4  | POST /api/auth/setup creates first Admin user with status:'active' and returns 200 | VERIFIED | `route.ts` line 49–55: `User.create({ ..., role: 'Admin', status: 'active' })` + `NextResponse.json({ ok: true })` |
| 5  | POST /api/auth/setup returns 403 when any user already exists | VERIFIED | `route.ts` line 30–32: `countDocuments()` guard, returns `{ status: 403 }` |
| 6  | GET /api/auth/setup returns { setupRequired: true, email } when no users exist | VERIFIED | `route.ts` line 14–16: `count === 0` → includes `email: process.env.SUPER_ADMIN_EMAIL` |
| 7  | GET /api/auth/setup returns { setupRequired: false } when users exist (no email) | VERIFIED | `route.ts` line 17: `NextResponse.json({ setupRequired: false })` — no email field |
| 8  | useSession() callable from any client component without error | VERIFIED | `AuthProviders.tsx`: `SessionProvider` wraps entire app tree via `layout.tsx` |
| 9  | usePermissions() returns { role, canPerform } from any client component | VERIFIED | `PermissionsContext.tsx` lines 34–36: exports `usePermissions()` returning `{ role, canPerform }` |
| 10 | SessionProvider is outer wrapper, PermissionsProvider is inner — correct nesting | VERIFIED | `AuthProviders.tsx` lines 8–13: `<SessionProvider><PermissionsProvider>` — correct order |
| 11 | layout.tsx has no 'use client' directive (remains a Server Component) | VERIFIED | Grep on `layout.tsx` found no 'use client' directive |
| 12 | /auth/sign-in shows centered card form with email and password fields | VERIFIED | `sign-in/page.tsx` lines 40–98: full centered card with email + password `Input` components; 101 lines substantive |
| 13 | Submitting correct credentials redirects to / | VERIFIED | `sign-in/page.tsx` line 36: `router.push('/')` on success — Plan 17-04 human approved |
| 14 | Inline error displays below the form for wrong credentials | VERIFIED | `sign-in/page.tsx` lines 83–85: conditional `<p>` renders `{error}` below form |
| 15 | Submit button disabled with spinner and 'Signing in...' during submission | VERIFIED | `sign-in/page.tsx` lines 87–96: `disabled={loading}` + `Loader2` + 'Signing in...' text |
| 16 | /auth/setup shows displayName + password + confirmPassword form | VERIFIED | `setup/page.tsx` lines 112–181: all three fields present; 186 lines substantive |
| 17 | Navigating to /auth/setup when users exist redirects to /auth/sign-in | VERIFIED | `setup/page.tsx` lines 29–31: `router.replace('/auth/sign-in')` when `!data.setupRequired` |
| 18 | OrgHeader shows UserMenu with initials avatar + display name and Sign out dropdown | VERIFIED | `OrgHeader.tsx` line 71: `<UserMenu />` rendered; `UserMenu.tsx` 49 lines with initials + dropdown |
| 19 | Clicking Sign out redirects to /auth/sign-in | VERIFIED | `UserMenu.tsx` line 43: `signOut({ callbackUrl: '/auth/sign-in' })` |

**Score:** 19/19 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/auth/nextauth.config.ts` | authorize() with throw-based errors + displayName in return | VERIFIED | Lines 24, 25, 29: three `throw new Error(...)` calls; line 30: `name: user.displayName`; 65 lines |
| `src/app/api/auth/setup/route.ts` | GET + POST handlers for first-user bootstrap | VERIFIED | Exports `GET` (lines 11–18) and `POST` (lines 25–58); `User.countDocuments()` + `User.create()` present |
| `src/context/PermissionsContext.tsx` | PermissionsProvider + usePermissions() hook | VERIFIED | `'use client'` line 1; exports `PermissionsProvider` (line 18) and `usePermissions` (line 34); 36 lines |
| `src/components/providers/AuthProviders.tsx` | AuthProviders nesting SessionProvider > PermissionsProvider | VERIFIED | `'use client'` line 1; correct nesting order; imports `PermissionsProvider`; 14 lines |
| `src/app/layout.tsx` | AuthProviders wrapping LayoutShell | VERIFIED | Line 6: `import { AuthProviders }`; lines 26–28: `<AuthProviders><LayoutShell>...</LayoutShell></AuthProviders>`; no `'use client'` |
| `src/app/auth/sign-in/page.tsx` | Sign-in page with credential form, inline errors, loading state | VERIFIED | 101 lines; `signIn('credentials', { redirect: false })`; dual ok+error guard; inline error `<p>`; spinner |
| `src/app/auth/setup/page.tsx` | First-user setup page with displayName + password + auto sign-in | VERIFIED | 186 lines; mount GET check; three form fields; POST then `signIn()` auto sign-in; `setupEmail` from GET state |
| `src/components/layout/UserMenu.tsx` | User avatar + sign-out dropdown | VERIFIED | 49 lines; exports `UserMenu`; loading skeleton; initials avatar; `signOut({ callbackUrl: '/auth/sign-in' })` |
| `src/components/layout/OrgHeader.tsx` | OrgHeader with UserMenu in top-right | VERIFIED | Line 8: `import { UserMenu }`; line 71: `<UserMenu />` inside `flex items-center gap-3` container |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `nextauth.config.ts` | `User` model | `User.findOne()` | WIRED | Line 23: `User.findOne({ email: credentials.email.toLowerCase() })` |
| `api/auth/setup/route.ts` | `User` model | `User.countDocuments()` + `User.create()` | WIRED | Lines 13, 29: `countDocuments()`; line 49: `User.create(...)` |
| `app/auth/setup/page.tsx` | `/api/auth/setup` | `fetch('/api/auth/setup')` POST | WIRED | Line 26: `fetch('/api/auth/setup')` GET on mount; line 62: `fetch('/api/auth/setup', { method: 'POST', ... })` |
| `app/auth/sign-in/page.tsx` | `next-auth/react signIn` | `signIn('credentials', { redirect: false })` | WIRED | Lines 22–26: `signIn('credentials', { redirect: false, email, password })` |
| `app/auth/setup/page.tsx` | `next-auth/react signIn` | POST then signIn() auto sign-in | WIRED | Line 76: `signIn('credentials', { redirect: false, email: setupEmail, password })` |
| `UserMenu.tsx` | `next-auth/react signOut` | `signOut({ callbackUrl: '/auth/sign-in' })` | WIRED | Line 43: `signOut({ callbackUrl: '/auth/sign-in' })` in DropdownMenuItem onClick |
| `layout.tsx` | `AuthProviders.tsx` | import + JSX wrapping LayoutShell | WIRED | Line 6: import; lines 26–28: `<AuthProviders><LayoutShell>` |
| `AuthProviders.tsx` | `PermissionsContext.tsx` | import PermissionsProvider | WIRED | Line 4: `import { PermissionsProvider } from '@/context/PermissionsContext'` |
| `PermissionsContext.tsx` | `permissions.ts` | import canPerform, Role, ActionType | WIRED | Lines 5–6: `import { canPerform } from '@/lib/auth/permissions'` and type imports |

---

### Requirements Coverage

All requirement IDs declared across plans for Phase 17: **AUTH-01, AUTH-03, AUTH-04, AUTH-05**

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|---------------|-------------|--------|----------|
| AUTH-01 | 17-01, 17-03, 17-04 | User can sign in with email and password | SATISFIED | `sign-in/page.tsx` calls `signIn('credentials', ...)` with real form; `authorize()` performs bcrypt comparison; human-verified in Plan 17-04 |
| AUTH-03 | 17-02, 17-03, 17-04 | Signed-in session persists across browser refresh (JWT) | SATISFIED | `SessionProvider` wired in `layout.tsx` via `AuthProviders`; JWT strategy configured in `nextauth.config.ts` (`strategy: 'jwt'`, 30-day maxAge); human-verified in Plan 17-04 |
| AUTH-04 | 17-03, 17-04 | User can sign out from any page | SATISFIED | `UserMenu` in `OrgHeader` calls `signOut({ callbackUrl: '/auth/sign-in' })`; `OrgHeader` is present on all collection/detail pages; human-verified in Plan 17-04 |
| AUTH-05 | 17-01, 17-03, 17-04 | First user to complete registration is automatically granted Admin role | SATISFIED | `POST /api/auth/setup` creates user with `role: 'Admin'` and `status: 'active'`; setup page auto signs in after creation; human-verified in Plan 17-04 |

**Orphaned requirements check:** REQUIREMENTS.md traceability table maps only AUTH-01, AUTH-03, AUTH-04, AUTH-05 to Phase 17 — exactly what the plans declare. No orphaned requirements.

**Cross-check note:** REQUIREMENTS.md also marks AUTH-06 (SUPER_ADMIN_EMAIL enforcement) as complete from Phase 16 — this is handled in `nextauth.config.ts` JWT callback (lines 48–50) which was established in Phase 16 and carried forward. Not a Phase 17 requirement but the implementation is visible and correct.

---

### Anti-Patterns Found

No anti-patterns detected. Specifically checked:

- No TODO/FIXME/HACK/PLACEHOLDER comments in any phase 17 files
- HTML `placeholder` attributes in input fields are standard form attributes, not code stubs
- `return null` in `UserMenu.tsx` line 20 is intentional behavior (documented: Phase 18 will redirect unauthenticated users) — not a stub
- No empty implementations (`return {}`, `return []`, handler-only-prevents-default)
- No fetch calls with ignored responses

---

### Human Verification — Already Approved

Plan 17-04 was a blocking human verification checkpoint. Per the prompt instructions, this checkpoint was explicitly approved by the user. The following runtime behaviors were confirmed in the browser:

1. **Sign-in error messages (AUTH-01)** — "No account found with that email" and "Incorrect password" display inline below the form (not as generic "CredentialsSignin")
2. **First-user setup (AUTH-05)** — Setup form appears with no users in DB; completing form auto signs in and redirects to `/`; revisiting `/auth/setup` after setup redirects to `/auth/sign-in`
3. **Successful sign-in (AUTH-01)** — Correct credentials redirect to `/`; UserMenu shows initials + display name
4. **Session persistence (AUTH-03)** — Browser refresh preserves session; UserMenu and collections page load normally
5. **Sign out (AUTH-04)** — UserMenu dropdown "Sign out" redirects to `/auth/sign-in`; session cleared

All 5 scenarios passed on first attempt (17-04-SUMMARY.md, zero issues encountered).

---

### Gaps Summary

No gaps. All 19 must-have truths are verified, all 9 artifacts exist and are substantive, all 9 key links are wired, all 4 requirements are satisfied, and the human verification checkpoint was explicitly approved by the user.

---

_Verified: 2026-03-28_
_Verifier: Claude (gsd-verifier)_
