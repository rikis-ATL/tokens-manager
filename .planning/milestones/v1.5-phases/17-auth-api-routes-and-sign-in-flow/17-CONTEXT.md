# Phase 17: Auth API Routes and Sign-In Flow - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Full auth round-trip — sign-in page, first-user bootstrap (setup page), session persistence via SessionProvider + PermissionsProvider wired into LayoutShell, and sign-out. Nothing about route guarding (Phase 18) or RBAC enforcement (Phase 19). The output is: users can sign in, stay signed in, and sign out.

</domain>

<decisions>
## Implementation Decisions

### Sign-in page design
- Centered card on plain background — classic auth layout, no split screen
- Header shows app name only: "ATUI Tokens Manager" (no logo)
- Respects system/app dark mode (consistent with Phase 14 dark mode support)
- On successful sign-in → redirect to `/` (collections list)

### Error and loading states
- Errors shown inline below the form, inside the card — no toast
- Error messages are specific: distinguish "No account found with that email" from "Incorrect password" (internal tool, account enumeration not a concern)
- Disabled accounts → generic error same as wrong password (don't reveal account status)
- During submission: button disabled + spinner + text changes to "Signing in…"; fields remain editable

### First-user bootstrap
- Separate `/auth/setup` page — not part of the sign-in page
- Setup page detects 0 users in DB; if users already exist → redirect to `/auth/sign-in`
- Fields: display name + password only (email comes from `SUPER_ADMIN_EMAIL` env var — not collected on the form)
- After successful setup → auto sign-in and redirect to `/` (no extra sign-in step)

### Sign-out placement
- Top-right header: initials avatar + display name → dropdown with "Sign out"
- Sets up the pattern Phase 21 will build on (more dropdown items)
- Avatar shows initials in a circle (brand color), display name next to it
- While session is loading → skeleton/placeholder to prevent layout shift
- After signing out → redirect to `/auth/sign-in`

### Claude's Discretion
- Exact card dimensions and spacing
- Initials avatar color (brand color or role-based)
- Password confirmation field on setup (likely yes, Claude decides)
- Form validation (client-side before submit vs server-only)
- Dropdown trigger style (button vs div, exact sizing)

</decisions>

<specifics>
## Specific Ideas

- Setup page is one-time only and self-closing — once users exist, navigating there redirects away
- Sign-in and setup pages should share visual language (same card style)
- The header user area is new UI added in this phase — keep it minimal; Phase 21 adds role display and admin links

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 17-auth-api-routes-and-sign-in-flow*
*Context gathered: 2026-03-28*
