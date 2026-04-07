# Phase 20: Email Invite Flow and Account Setup - Research

**Researched:** 2026-03-28
**Domain:** Email delivery (Resend), invite token lifecycle, account setup flow, RBAC-gated page routing
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Invite trigger & form:**
- Invite modal is triggered from the /org/users page (Phase 20 builds this stub page)
- Fields: Email + Role (Admin / Editor / Viewer) only — no optional message
- On success: modal closes; the table row appearing is the visual confirmation — no separate toast
- Duplicate check: if email already has a pending invite or active account, show an inline validation error inside the modal (no silent replacement)

**Email template:**
- Simple styled email — minimal HTML, not a fully-branded template
- Content: app name + assigned role + setup link + expiry notice (e.g. "Link expires in 7 days")
- Invite token expiry: 7 days
- No inviter name in the email

**Pending invites display:**
- /org/users stub page built in Phase 20; Phase 21 extends it with active member rows
- Single unified table with a Status column — pending invites are rows in the same table, not a separate section
- Columns: Email | Role | Status badge (Pending / Expired) | Expiry date | Actions
- Row actions: Resend (generates new token, sends fresh email, resets 7-day clock) + Revoke (deletes invite)
- /org/users nav link is added to the main nav, visible to Admins only (RBAC already in place)

**Account setup page (/setup?token=...):**
- Centered card layout — matches the existing sign-in page style
- Fields: Display Name + Password
- Password requirements shown as inline hint text below the password field; validation error only shown after the field is touched
- After successful setup: user is signed in and redirected to the specific collection if the invite carried a collectionId; otherwise redirects to collections home
- Invites are org-level (role only) but the Admin can optionally attach a specific collectionId — stored on the Invite document and used for the post-setup redirect
- Invite token is single-use: attempting to load the setup page a second time after account setup shows an error page

### Claude's Discretion

- Exact error page design for expired / already-used invite tokens
- Password minimum length (8 characters is standard)
- Loading / submission states on the invite modal and setup form
- Revoke confirmation dialog (or immediate with undo)

### Deferred Ideas (OUT OF SCOPE)

- None — discussion stayed within phase scope

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| USER-02 | Admin can invite a new user by entering their email address | Invite modal + POST /api/invites API route; duplicate-check query against User + Invite collections |
| USER-03 | Invited user receives an email with a magic link to create their account (sent via Resend) | Resend SDK v2/v3 with `html` parameter; `RESEND_API_KEY` env var; single-use token in query string |
| USER-04 | Invited user can set display name and password during account setup | `/auth/invite-setup` page; GET token validation + POST account creation + auto sign-in via `signIn('credentials')` |
| USER-07 | Pending invitations are visible in the Users list with expiry status | GET /api/invites returns Invite documents; computed `isExpired` badge from `expiresAt` vs `new Date()` |

</phase_requirements>

---

## Summary

Phase 20 adds three tightly-linked capabilities: Admin can send invites by email, the invited user can complete account setup via a unique link, and pending invites are visible in a new `/org/users` page. All three require new API routes, a new UI page/modal, and integration with the Resend email delivery service.

The project's data model is already prepared. `src/lib/db/models/Invite.ts` defines the full Invite schema (email, hashed token, status, expiresAt, createdBy, role). `src/lib/auth/invite.ts` provides `generateInviteToken()`, `hashToken()`, and `isInviteExpired()` utilities. The User schema has `status: 'invited' | 'active' | 'disabled'` and `displayName` + `passwordHash` fields. Nothing in the data layer needs to be created from scratch — only the Invite model needs one field added (`collectionId?: string` for the optional post-setup redirect).

The main new dependency is `resend` (currently v3.x stable — npm shows 6.9.4 as latest, but the API surface for basic `resend.emails.send({ from, to, subject, html })` has been stable since v2). Resend is installed as a server-only import in API route handlers. No `react-email` package is needed because the CONTEXT.md decision locks to minimal HTML email templates. The `RESEND_API_KEY` env var must be added to `.env.local` and documented.

**Primary recommendation:** Install `resend` package, add `collectionId` field to Invite model, build the invite API (`POST /api/invites`, `GET /api/invites`, `DELETE /api/invites/[id]`, `POST /api/invites/[id]/resend`), build the setup page at `/auth/invite-setup`, build the `/org/users` stub page, and add the "Users" nav item (Admin-only) to `OrgSidebar`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `resend` | ^3.x (npm latest: 6.9.4) | Email delivery via Resend API | Official SDK; `html` parameter avoids `react-email` dep; stable since v2 |
| `next-auth` (existing) | ^4.24.13 | Auto sign-in after account setup via `signIn('credentials')` | Already installed and configured |
| `bcryptjs` (existing) | ^2.4.3 | Hash invited user's password during account setup | Already installed |
| `mongoose` (existing) | ^9.2.2 | Invite document persistence; query by token hash | Already installed |
| `crypto` (Node built-in) | built-in | `generateInviteToken()` / `hashToken()` — already in src/lib/auth/invite.ts | No install needed |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `sonner` (existing) | ^2.0.7 | Error toasts on the invite modal (fetch failures, network errors) | Not for invite-sent success — table row appearance IS the success confirmation |
| `lucide-react` (existing) | ^0.577.0 | Status badge icons, action button icons | Nav item icon for "Users" |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain `html` parameter in Resend | `@react-email/render` + React components | React Email adds a full component tree; CONTEXT.md locks to minimal HTML — not needed |
| `resend` SDK | Raw `fetch` to Resend REST API | SDK is 1 import vs. manual headers/auth/error handling |
| Single-use token in query string | JWT invite token | Short-lived crypto token in DB matches Phase 16 decision (`crypto.randomBytes(32)` established pattern); no extra dep |

**Installation:**
```bash
yarn add resend
```

---

## Architecture Patterns

### Recommended Project Structure

New files for Phase 20:

```
src/
├── app/
│   ├── api/
│   │   └── invites/
│   │       ├── route.ts                    # GET (list pending) + POST (create invite + send email)
│   │       └── [id]/
│   │           ├── route.ts                # DELETE (revoke)
│   │           └── resend/
│   │               └── route.ts            # POST (resend: new token + new email)
│   ├── auth/
│   │   └── invite-setup/
│   │       └── page.tsx                    # /auth/invite-setup?token=... (invited user account setup)
│   └── org/
│       └── users/
│           └── page.tsx                    # /org/users (Admin-only stub: invite table)
├── components/
│   └── org/
│       └── InviteModal.tsx                 # Invite form modal (email + role fields)
└── lib/
    └── email/
        └── invite-email.ts                 # buildInviteEmailHtml(email, role, setupUrl, expiresAt)
```

Existing files that need modification:

```
src/
├── lib/
│   └── db/models/
│       └── Invite.ts                       # Add optional collectionId field
├── components/layout/
│   └── OrgSidebar.tsx                      # Add "Users" nav item (Admin-only, isAdmin from usePermissions())
└── middleware.ts                           # Add /org/users role check (redirect non-Admin to /collections)
```

### Pattern 1: Resend Email Sending (Plain HTML)

**What:** Call `resend.emails.send()` from a Next.js App Router route handler with `html` parameter.
**When to use:** Any server-side email dispatch — invite creation, resend action.

```typescript
// Source: https://resend.com/docs/send-with-nextjs
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const { data, error } = await resend.emails.send({
  from: 'ATUI Tokens Manager <onboarding@resend.dev>', // dev: resend sandbox; prod: verified domain
  to: [inviteEmail],
  subject: `You've been invited to ATUI Tokens Manager`,
  html: buildInviteEmailHtml(inviteEmail, role, setupUrl),
});

if (error) {
  return NextResponse.json({ error: 'Failed to send invite email' }, { status: 500 });
}
```

### Pattern 2: Invite Token Creation and Storage

**What:** Generate plaintext token, store SHA-256 hash in DB, send plaintext in email URL.
**When to use:** POST /api/invites (create) and POST /api/invites/[id]/resend (regenerate).

```typescript
// Source: existing src/lib/auth/invite.ts
import { generateInviteToken, hashToken } from '@/lib/auth/invite';

const plainToken = generateInviteToken();       // 64 hex chars — goes in email URL
const hashedToken = hashToken(plainToken);      // SHA-256 — stored in DB

await Invite.create({
  email: email.toLowerCase(),
  token: hashedToken,                           // store hash only
  role,
  createdBy: session.user.id,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  status: 'pending',
  collectionId: collectionId ?? undefined,      // Phase 20 addition
});

const setupUrl = `${process.env.NEXTAUTH_URL}/auth/invite-setup?token=${plainToken}`;
```

### Pattern 3: Token Validation on Account Setup Page

**What:** GET /api/invites/validate?token=... validates the token on page load; POST creates the user and marks invite accepted.
**When to use:** `/auth/invite-setup` page — validate on mount, submit on form.

```typescript
// GET /api/invites/validate?token=... (public endpoint — no requireAuth)
const { token } = searchParams;
if (!token) return NextResponse.json({ valid: false, reason: 'missing' }, { status: 400 });

import { hashToken, isInviteExpired } from '@/lib/auth/invite';
const hashedToken = hashToken(token);
const invite = await Invite.findOne({ token: hashedToken });

if (!invite) return NextResponse.json({ valid: false, reason: 'not-found' }, { status: 404 });
if (invite.status === 'accepted') return NextResponse.json({ valid: false, reason: 'used' }, { status: 410 });
if (isInviteExpired(invite.expiresAt)) return NextResponse.json({ valid: false, reason: 'expired' }, { status: 410 });

return NextResponse.json({ valid: true, email: invite.email, role: invite.role });
```

### Pattern 4: Auto Sign-In After Account Setup

**What:** Call `signIn('credentials', { redirect: false })` client-side after account creation succeeds.
**When to use:** POST /api/auth/invite-setup → success → signIn → redirect.

```typescript
// Source: existing pattern from src/app/auth/setup/page.tsx
const result = await signIn('credentials', {
  redirect: false,
  email: invite.email,   // stored from GET /api/invites/validate response
  password,              // from form field
});

if (!result?.ok || result?.error) {
  setError('Account created but sign-in failed. Please sign in manually.');
  router.push('/auth/sign-in');
  return;
}

// Redirect to collectionId if invite carried one, else to /collections
router.push(collectionId ? `/collections/${collectionId}` : '/collections');
```

### Pattern 5: Admin-Only Route Guard in Middleware

**What:** Extend existing `withAuth` middleware to redirect non-Admin users away from `/org/users`.
**When to use:** Any page that should be Admin-only.

The existing `withAuth` middleware uses `req.nextauth.token` to access JWT data. The JWT already has `token.role` (set in `authOptions` callbacks).

```typescript
// src/middleware.ts — extend the existing middleware function body:
if (req.nextUrl.pathname.startsWith('/org/users')) {
  if (req.nextauth.token?.role !== 'Admin') {
    return NextResponse.redirect(new URL('/collections', req.url));
  }
}
```

This approach is consistent with existing middleware patterns and confirmed by next-auth v4 docs: the middleware function body has access to `req.nextauth.token` after the `authorized` callback passes.

### Pattern 6: Duplicate Check Before Invite Creation

**What:** Reject invite if email already has an active User record or a pending (non-expired) Invite.
**When to use:** POST /api/invites handler before creating invite document.

```typescript
// Check for existing active/invited user
const existingUser = await User.findOne({ email: email.toLowerCase() });
if (existingUser) {
  return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
}

// Check for existing non-expired pending invite
const existingInvite = await Invite.findOne({
  email: email.toLowerCase(),
  status: 'pending',
  expiresAt: { $gt: new Date() },  // not yet expired
});
if (existingInvite) {
  return NextResponse.json({ error: 'A pending invitation already exists for this email' }, { status: 409 });
}
```

### Pattern 7: OrgSidebar Admin-Only Nav Item

**What:** Render "Users" nav item only when `isAdmin` is true from `usePermissions()`.
**When to use:** OrgSidebar navItems array — conditionally include Users item.

```typescript
// Source: existing pattern from src/components/layout/OrgSidebar.tsx
import { usePermissions } from '@/context/PermissionsContext';
import { Users } from 'lucide-react';

const { isAdmin } = usePermissions();

const navItems = [
  { href: '/collections', label: 'Collections', icon: LayoutGrid, badge: null },
  { href: '/settings', label: 'Settings', icon: SlidersHorizontal, badge: dbBadge },
  ...(isAdmin ? [{ href: '/org/users', label: 'Users', icon: Users, badge: null }] : []),
];
```

### Anti-Patterns to Avoid

- **Storing plaintext tokens in DB:** Only store the SHA-256 hash; the plaintext is one-way — already established pattern from Phase 16.
- **Using `react` parameter in Resend with React Email:** Context.md locks to minimal HTML; adding `@react-email/render` adds complexity not needed here.
- **Redirecting instead of returning JSON from API routes:** API routes always return JSON errors; page redirects happen in middleware or client-side router only.
- **Multiple withAuth configurations:** Extend the single `middleware.ts` function body rather than creating separate matchers — keeps auth logic consolidated.
- **Allowing multiple pending invites for the same email:** The duplicate check (Pattern 6) prevents this; silent replacement is explicitly not allowed per CONTEXT.md.
- **Adding TTL index on Invite.expiresAt:** The Invite schema comment already flags this: "Do NOT add TTL index — documents kept with status='accepted' for audit trail." Documents are manually expired via status field.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email delivery | Custom SMTP/nodemailer | `resend` SDK | Rate limiting, deliverability, tracking, TLS handled by Resend |
| Token generation | Custom UUID/random | `crypto.randomBytes(32)` (already in invite.ts) | Already in codebase; no new dep |
| Password hashing | Custom hash | `bcryptjs` (already installed) | Already in codebase; bcrypt cost factor handling |
| Auto sign-in | Custom session creation | `signIn('credentials')` from next-auth | Already established in admin setup flow (Phase 17) |
| Role access guard | Custom server component session check | `withAuth` middleware + `req.nextauth.token?.role` | Edge middleware — runs before React; no DB hit |

**Key insight:** The token, hashing, auth, and email utility infrastructure is largely pre-built. Phase 20 primarily connects these pieces together via new API routes and UI.

---

## Common Pitfalls

### Pitfall 1: Invite Model Missing collectionId

**What goes wrong:** The account setup redirect to a specific collection (per CONTEXT.md) requires `collectionId` stored on the Invite document. The existing Invite schema does NOT have this field — it will be ignored or cause a mongoose validation error if passed.
**Why it happens:** Invite schema was designed before collectionId redirect was specified.
**How to avoid:** Add `collectionId: { type: String, required: false }` to inviteSchema in `src/lib/db/models/Invite.ts` before building the POST /api/invites handler.
**Warning signs:** TypeScript error when setting `collectionId` on Invite.create(); redirect always goes to `/collections` even when collectionId is set.

### Pitfall 2: Token Validation URL — useSearchParams() in App Router

**What goes wrong:** In Next.js 13 App Router, `useSearchParams()` in a Client Component must be wrapped in `<Suspense>` or it causes a static rendering error. The invite-setup page reads `?token=` from the URL.
**Why it happens:** Next.js 13 requires `<Suspense>` boundary around any Client Component that uses `useSearchParams()`.
**How to avoid:** Either (a) wrap the invite-setup page in a Suspense boundary, or (b) pass `searchParams` as a prop via a Server Component wrapper.
**Pattern:** Use a thin Server Component wrapper that passes `searchParams.token` as a prop to the Client Component form — same pattern used in other Next.js 13 App Router pages in the project.

### Pitfall 3: RESEND_API_KEY Not Set

**What goes wrong:** `new Resend(undefined)` creates a client that throws at send time, not at import time. The route handler will 500 silently.
**Why it happens:** Missing env var only fails at runtime.
**How to avoid:** Add an explicit guard at route handler initialization: `if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'Email service not configured' }, { status: 503 });`
**Warning signs:** Invite creates in DB but email is never received; Resend SDK throws `Missing API key`.

### Pitfall 4: Single-Use Token — Race Condition on Double Submit

**What goes wrong:** User double-clicks the setup form submit button; two concurrent requests arrive; both find the invite as `pending` and both try to create the user and mark it `accepted`. Second request will fail on unique email index, but may return a confusing error.
**Why it happens:** No optimistic lock on Invite document.
**How to avoid:** Use a Mongoose findOneAndUpdate with `$set: { status: 'accepted' }` and a `{ status: 'pending' }` filter — only one request will successfully update; the second finds status already `'accepted'` and returns an appropriate error. Alternatively, the unique index on User.email provides the hard stop — catch duplicate key error and return 409.

### Pitfall 5: /org/users Not in LayoutShell isOrgRoute()

**What goes wrong:** `isOrgRoute()` in `LayoutShell.tsx` checks `pathname === '/collections' || pathname === '/settings'` — `/org/users` won't be caught, so it will fall into the default AppHeader+AppSidebar shell instead of the OrgHeader+OrgSidebar shell.
**Why it happens:** `isOrgRoute` uses exact path matching and `/org/users` is a new path not yet listed.
**How to avoid:** Update `isOrgRoute()` to also match `/org` prefix paths: `pathname.startsWith('/org') || pathname === '/collections' || pathname === '/settings'`.

### Pitfall 6: authorize() Blocks 'invited' Status Users

**What goes wrong:** The existing `authorize()` in `nextauth.config.ts` explicitly allows `invited` status users to sign in (only `disabled` is blocked). After account setup, the user status is set to `active` — BUT the invited user has no password set when the invite is created, so they can only sign in after completing the setup page. The setup page itself calls `signIn('credentials')` which triggers `authorize()`.
**Why it happens:** At the moment of auto sign-in on the setup page, the user's status will have just been set to `active` by the POST /api/auth/invite-setup handler, so this should work. But if the POST /api/auth/invite-setup does not set `status: 'active'`, the user status remains `invited` — which per the authorize() comment IS allowed. Either way the sign-in succeeds, but the status should be set to `active` for correctness (Phase 21 will filter by status).
**How to avoid:** POST /api/auth/invite-setup must set `status: 'active'` explicitly (same as POST /api/auth/setup does for the first admin).

### Pitfall 7: Resend Rate Limits in Testing

**What goes wrong:** Resend's free tier allows 100 emails/day and `onboarding@resend.dev` is sandbox only (emails only delivered to verified addresses). In dev, if you invite a non-verified address, the email appears to send (200 response) but is silently dropped.
**Why it happens:** Sandbox domain restriction.
**How to avoid:** In dev, invite your own verified email address. Document `RESEND_API_KEY=re_...` env var setup in the Phase 20 plan. Production requires a verified sending domain (already noted in STATE.md as a known operational gap).

---

## Code Examples

Verified patterns from official sources and existing codebase:

### Resend Basic Send (Plain HTML)

```typescript
// Source: https://resend.com/docs/send-with-nextjs
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

const { data, error } = await resend.emails.send({
  from: 'ATUI Tokens Manager <onboarding@resend.dev>',
  to: [recipientEmail],
  subject: `You've been invited to ATUI Tokens Manager as ${role}`,
  html: `<p>You've been invited to ATUI Tokens Manager as <strong>${role}</strong>.</p>
         <p><a href="${setupUrl}">Set up your account</a></p>
         <p>This link expires in 7 days.</p>`,
});
```

### Token Hash Lookup

```typescript
// Source: src/lib/auth/invite.ts
import { hashToken, isInviteExpired } from '@/lib/auth/invite';
import Invite from '@/lib/db/models/Invite';

const hashedToken = hashToken(plainToken);
const invite = await Invite.findOne({ token: hashedToken }).lean();
```

### Atomic Invite Accept (prevent race condition)

```typescript
// Atomic findOneAndUpdate — only one request wins
const invite = await Invite.findOneAndUpdate(
  { token: hashedToken, status: 'pending' },   // filter: only pending
  { $set: { status: 'accepted' } },
  { new: true }
);
if (!invite) {
  // invite was already accepted (race) or not found
  return NextResponse.json({ error: 'Invite not found or already used' }, { status: 410 });
}
```

### POST /api/auth/invite-setup — Create User from Invite

```typescript
// Pattern mirrors POST /api/auth/setup, adapted for invited users
const user = await User.create({
  displayName: displayName.trim(),
  email: invite.email,
  passwordHash: await bcrypt.hash(password, 12),
  role: invite.role,
  status: 'active',   // must be explicit — schema defaults to 'invited'
});
```

### Middleware Role Guard for /org/users

```typescript
// Extends existing src/middleware.ts
function middleware(req) {
  // Redirect authenticated users away from sign-in
  if (req.nextUrl.pathname === '/auth/sign-in' && req.nextauth.token) {
    return NextResponse.redirect(new URL('/collections', req.url));
  }
  // Guard /org/users — Admin only
  if (req.nextUrl.pathname.startsWith('/org/users')) {
    if (req.nextauth.token?.role !== 'Admin') {
      return NextResponse.redirect(new URL('/collections', req.url));
    }
  }
  return NextResponse.next();
}
```

### LayoutShell isOrgRoute Fix

```typescript
// Extend isOrgRoute in src/components/layout/LayoutShell.tsx
function isOrgRoute(pathname: string): boolean {
  return pathname === '/collections'
    || pathname === '/settings'
    || pathname.startsWith('/org');
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| nodemailer + SMTP | Resend SDK (`resend` package) | 2023–present | No SMTP config; REST API; better deliverability |
| JWT-signed invite tokens | `crypto.randomBytes(32)` + SHA-256 hash stored in DB | Phase 16 decision | No extra dep; hash in DB means plaintext is never stored |
| Pages Router API routes | App Router Route Handlers (`route.ts`) | Next.js 13 App Router | Already the project's pattern since Phase 17 |

**Deprecated/outdated:**
- `nodemailer`: Not suitable here — `resend` is the explicit choice per CONTEXT.md.
- `@auth/mongodb-adapter`: Incompatible with Credentials+JWT strategy — established rejection in Phase 16.
- `react` parameter in Resend + `@react-email/render`: Not needed; `html` string is sufficient for the minimal email design specified.

---

## Open Questions

1. **`collectionId` on Invite model — optional or omit by default?**
   - What we know: CONTEXT.md says "Admin can optionally attach a specific collectionId"; post-setup redirect uses it if present.
   - What's unclear: Whether the InviteModal in Phase 20 exposes a UI picker for collectionId, or it is deferred to a future phase.
   - Recommendation: Add `collectionId?: string` as an optional field on the Invite schema now (simple DB schema change). The InviteModal in Phase 20 can omit the UI picker — redirect defaults to `/collections` when absent. Phase 21 can add the picker UI.

2. **`/org/users` route in LayoutShell — where does `/org/` prefix route detection live?**
   - What we know: `isOrgRoute()` currently checks `pathname === '/collections' || pathname === '/settings'`.
   - What's unclear: Should `/org/*` routes use the OrgHeader+OrgSidebar shell? Yes — the decisions say the users page matches the existing /org pattern.
   - Recommendation: Update `isOrgRoute()` to `pathname.startsWith('/org') || ...` as described in Pitfall 5.

3. **Resend API key for local dev — which address to use as `from`?**
   - What we know: `onboarding@resend.dev` is the Resend sandbox from-address (delivers only to verified addresses). Production requires a verified domain (STATE.md operational gap).
   - What's unclear: Whether the team has a verified domain ready.
   - Recommendation: Use `onboarding@resend.dev` for Phase 20 with a code comment noting production requirement. The env var `RESEND_API_KEY` must be set in `.env.local` (documented in plan Wave 0).

---

## Sources

### Primary (HIGH confidence)
- Resend official docs (https://resend.com/docs/send-with-nextjs) — send pattern, `html` parameter, App Router route handler
- Resend API reference (https://resend.com/docs/api-reference/emails/send-email) — request params, error patterns
- `src/lib/auth/invite.ts` — token generation and hashing (project codebase)
- `src/lib/db/models/Invite.ts` — Invite schema (project codebase)
- `src/lib/db/models/User.ts` — User schema and status values (project codebase)
- `src/middleware.ts` — existing withAuth pattern and `req.nextauth.token` access (project codebase)
- `src/app/auth/setup/page.tsx` — existing account setup flow for auto sign-in pattern (project codebase)
- next-auth v4 docs (https://next-auth.js.org/configuration/nextjs) — `withAuth`, `req.nextauth.token`, role checks

### Secondary (MEDIUM confidence)
- npm registry (resend package page) — confirmed latest version 6.9.4 (stable v3 API surface)
- WebSearch results confirming `html` parameter works without `react-email` in Resend SDK
- WebSearch confirming `withAuth` middleware body has access to `req.nextauth.token?.role`

### Tertiary (LOW confidence)
- None required — all critical patterns verified against official docs or existing codebase.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Resend official docs confirmed; all other libs already in project
- Architecture: HIGH — patterns are extensions of existing Phase 17/18/19 patterns in codebase
- Pitfalls: HIGH for token/hashing/auth patterns (project codebase confirmed); MEDIUM for Resend-specific behavior (sandbox restriction, rate limits from docs)

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (Resend SDK API surface is stable; next-auth v4 frozen)
