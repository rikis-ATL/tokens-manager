# Feature Research

**Domain:** Multi-tenant SaaS billing — tiered plans, Stripe subscriptions, per-org usage enforcement
**Researched:** 2026-03-30
**Confidence:** HIGH (Stripe official docs + verified patterns), MEDIUM (upgrade UX and usage-reset patterns from community consensus)

---

## Scope Note

This file covers ONLY the new v1.6 features. Existing features (RBAC, NextAuth, invite flow, token
CRUD, export, themes, org user management) are already built and must not be re-planned.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in any paid SaaS. Missing these = product feels broken or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Self-serve org signup at registration | Every SaaS creates an org on sign-up; users expect to be "in" something immediately | LOW | New user POST creates Org + assigns Admin role; `organizationId` attached to session via NextAuth callbacks. Extends existing NextAuth `session` callback |
| Org-scoped data isolation | Users expect their data to be private to their org; multi-tenancy with `organizationId` filter on every query | MEDIUM | Every Mongoose query must include `{ organizationId }` — no exceptions. Middleware helper enforced at service layer, not per-route |
| Configurable tier limits (not hardcoded) | Developers and self-hosters expect to tune limits via config, not code changes | LOW | Single `LIMITS` config object in `src/lib/billing/limits.ts`; all limit checks import from there. Shape: `LIMITS[plan][limitKey]` |
| Hard enforcement at API layer | Limits must be enforced server-side; client-side guards are UX only | MEDIUM | Billing middleware called before write operations; returns 402 with structured payload. Client-side checks are supplemental only |
| Stripe Checkout for plan upgrade | Industry-standard payment flow; users trust Stripe-hosted checkout pages | MEDIUM | Create checkout session via API route; redirect to Stripe; Stripe redirects back to success URL. Store `organizationId` in Stripe session metadata |
| Stripe billing portal for self-serve management | Users expect to manage payment method, download invoices, cancel — without contacting support | LOW | Generate portal session URL server-side (`stripe.billingPortal.sessions.create`); redirect client to Stripe-hosted portal. No custom billing UI to build |
| Webhook-driven plan sync | Org plan must update when Stripe processes payment or cancellation — tab-close resilient | MEDIUM | Handle `checkout.session.completed`, `invoice.payment_failed`, `customer.subscription.deleted`; verify signature; update org document atomically |
| Upgrade prompt when limit is hit | Users expect a clear explanation and a direct path to upgrade — not a generic error | LOW | Modal triggered by 402 response; shows limit context + upgrade CTA. Global response handler in client detects 402 and opens modal |
| Monthly usage reset | Export counts and other quotas reset each calendar month | LOW | Lazy reset: check `lastReset` date on each request; reset if month has rolled over via atomic `findOneAndUpdate`. No cron dependency |
| Self-hosted bypass mode | Developers self-hosting expect to disable all billing machinery via env var | LOW | `SELF_HOSTED=true` → skip all limit checks, skip Stripe, return unlimited entitlements. No Stripe SDK initialized |
| Rate limiting on write endpoints | Users expect fair-use protection; prevents abuse of export and token-save endpoints | MEDIUM | Per-user sliding window; 60 req/min on export and token-update endpoints; return 429 with `Retry-After` header |

### Differentiators (Competitive Advantage)

Features that add real value beyond what users assume. These justify the paid tiers.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Contextual upgrade prompts (not generic paywalls) | Show exactly which limit was hit and how much headroom the next tier gives; reduces friction and increases conversion | MEDIUM | 402 payload includes `{ limitType, current, limit, plan, upgradePlans }`; modal renders limit-specific messaging, not a generic "upgrade" wall |
| Pre-limit warnings at 80% usage | Warn before the wall; users who receive proactive warnings convert better than users who hit a hard block | MEDIUM | Track usage percentage; show amber indicator at 80%, red at 100%. Requires usage read on page load or in API response headers |
| Self-hosted mode as a first-class feature | Allows open-source/enterprise deploy without Stripe dependency; expands addressable market to teams with data sovereignty requirements | LOW | Single `SELF_HOSTED` env check in billing middleware; returns mock "unlimited" entitlements; no Stripe SDK calls made |
| Isolated billing module (`src/lib/billing/`) | Keeps payment logic out of route handlers; enables unit testing and future payment provider swap without touching API routes | LOW | All Stripe calls, limit checks, usage increment, and webhook handling live in this module; routes call named service functions only |
| Lazy usage reset (no cron required) | Simplifies deployment; no scheduler infrastructure needed for basic monthly quota reset | LOW | On each guarded request, check `lastReset < startOf(currentMonth)`; if stale, atomically reset counter with `$set: { 'usage.exportsThisMonth': 0, 'usage.lastReset': now }` before proceeding |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Custom invoice history UI | Users want to see past invoices in-app | Stripe billing portal already does this perfectly; duplicating it is wasted effort and a maintenance burden when Stripe changes invoice formats | Redirect to Stripe billing portal — it handles invoices, receipts, payment history natively |
| Metered/usage-based billing overages | "Charge per export over limit" sounds more flexible than hard blocks | Requires Stripe Meters API, async usage reporting, prorated invoices — dramatically more complex than flat subscriptions; risk of surprise charges creates customer support load | Enforce hard limits with upgrade prompts; defer overages to a future milestone post-PMF |
| Multi-org membership (user in multiple orgs) | Power users want to switch between client workspaces | Session model requires org context on every request; multi-org requires org-switching UI, per-org session context, complex permission resolution | Single org per user for v1.6; org transfer or re-invite to a new org covers 90% of use cases |
| Real-time usage dashboard with push updates | "I want to see my usage live" | SSE or polling adds infrastructure complexity; usage data changes infrequently and is not time-critical | Show usage on page load via normal fetch; refresh on navigation |
| Enterprise tier / custom pricing | Sales teams want bespoke deals | Custom pricing requires manual Stripe configuration per customer, out-of-band contracts, bespoke limit overrides per org | Defer to post-PMF; v1.6 only needs Free / Pro / Team |
| Client-side limit enforcement only | Faster to implement; no API changes | Client-side can be bypassed with browser dev tools; all limits must be enforced at the API layer | Always enforce at API; use client-side as UX supplement only |
| Stripe Elements (custom payment form) | Full control over payment UI | PCI compliance burden; requires form security audit; Stripe Checkout handles this correctly and is already trusted by users | Use Stripe Checkout (hosted page); no custom payment form needed |
| Update plan on Checkout success redirect | Simpler than webhook handling | Tab-close, network failure, or race with the webhook means the plan may not be updated; success redirect is not reliable | Always update plan via `checkout.session.completed` webhook only; show "processing" state on success URL |

---

## Feature Dependencies

```
[Org Model (organizationId on all docs)]
    └──required by──> [Tier Limit Enforcement]
    └──required by──> [Usage Tracking]
    └──required by──> [Stripe Customer binding]
    └──required by──> [Rate Limiting (per-org context)]

[Stripe Customer binding (stripeCustomerId on Org)]
    └──required by──> [Stripe Checkout flow]
    └──required by──> [Stripe Billing Portal]
    └──required by──> [Webhook plan sync]

[Webhook plan sync]
    └──required by──> [Correct plan reflected in DB after payment]
    └──feeds──> [Tier Limit Enforcement (reads plan from DB)]

[LIMITS config (src/lib/billing/limits.ts)]
    └──required by──> [Tier Limit Enforcement]
    └──required by──> [Upgrade Prompt (knows what to display)]
    └──required by──> [Self-Hosted Bypass (knows what to skip)]

[Tier Limit Enforcement]
    └──required by──> [Upgrade Prompt UX (needs 402 + structured payload)]
    └──required by──> [Collection create block]
    └──required by──> [Token save block]
    └──required by──> [Theme create block]
    └──required by──> [Export block]
    └──required by──> [Integration block]

[Usage Tracking (exportsThisMonth, tokenCount, lastReset on Org)]
    └──required by──> [Monthly Reset logic]
    └──required by──> [Pre-limit warnings]
    └──required by──> [Export limit enforcement]

[Self-Hosted Bypass (SELF_HOSTED env var)]
    └──short-circuits──> [Tier Limit Enforcement] (returns unlimited)
    └──short-circuits──> [Stripe Checkout] (route returns 501)
    └──short-circuits──> [Stripe Billing Portal] (route returns 501)

[Existing NextAuth session]
    └──extended by──> [organizationId in JWT]
    └──extended by──> [plan in JWT or per-request org lookup]
```

### Dependency Notes

- **Org Model must be built first.** Every other billing and usage feature reads `organizationId` from the session. Without org scoping on the data layer, limit enforcement has no context to check against.
- **LIMITS config before enforcement.** All enforcement code imports from `LIMITS`; the config shape defines what fields the Org document must carry.
- **Stripe Customer binding before Checkout.** `stripeCustomerId` must be stored on the Org before a checkout session can be created or a portal session can be generated.
- **Webhook sync before Checkout is user-facing.** The Checkout success URL must not be the source of plan truth. Never update the plan on the success redirect — only on `checkout.session.completed` webhook (prevents missed updates if user closes tab).
- **Self-Hosted Bypass is a cross-cutting concern.** Must be checked first in all billing middleware; if `SELF_HOSTED=true` the rest of the billing stack is skipped entirely without DB reads.
- **Existing NextAuth session callbacks must be extended.** `organizationId` (and optionally `plan`) must travel in the JWT to avoid a DB lookup on every API request. This is a low-risk extension to the existing auth setup.

---

## MVP Definition (v1.6)

### Launch With

Minimum feature set needed to ship a working multi-tenant SaaS billing layer.

- [ ] Org model: `Organization` document with `plan`, `stripeCustomerId`, `subscriptionStatus`, `usage` fields — TENANT-01, BILLING-02
- [ ] Self-serve org signup: org created at registration, user assigned Admin — TENANT-02
- [ ] Data migration: existing data scoped to initial org via `INITIAL_ORG_NAME` env — TENANT-03
- [ ] LIMITS config: single source of truth for all tier limits — BILLING-01
- [ ] Tier enforcement: Free / Pro / Team limits checked at API layer before writes — BILLING-03, BILLING-04, BILLING-05
- [ ] Self-hosted bypass: `SELF_HOSTED=true` disables all limits and Stripe — BILLING-06
- [ ] Usage tracking: `exportsThisMonth`, `tokenCount`, `lastReset` per org — USAGE-01
- [ ] Lazy monthly reset: reset usage counters when month rolls over — USAGE-02
- [ ] Stripe Checkout: upgrade flow from Free to Pro or Team — STRIPE-01
- [ ] Stripe billing portal: org admin redirected to Stripe-hosted self-serve portal — STRIPE-02
- [ ] Webhook handler: `checkout.session.completed`, `invoice.payment_failed`, `customer.subscription.deleted` — STRIPE-03
- [ ] Upgrade modal: triggered on 402 response, shows limit context + CTA — UXUP-01
- [ ] Limit blocks with upgrade prompt on: collection create, token save, theme create, export, integrations — LIMIT-01 through LIMIT-05
- [ ] Rate limiting: 60 req/min per user on export and token-update endpoints — RATE-01

### Add After Validation (v1.x)

- [ ] Pre-limit warnings at 80% usage — requires usage percentage surfaced in API responses or response headers; low complexity once usage tracking exists
- [ ] `customer.subscription.updated` webhook — handles plan upgrades/downgrades initiated via billing portal (not just cancellation); adds resilience for mid-cycle plan changes
- [ ] Cancellation retention offer — configure via Stripe Dashboard to show coupon when customer attempts cancellation in portal; zero code required

### Future Consideration (v2+)

- [ ] Usage-based overages (Stripe Meters API) — requires metered billing products, async reporting, prorated invoices
- [ ] Multi-org membership / org switching — session model changes required; separate milestone
- [ ] Enterprise tier with custom pricing — sales-led, manual Stripe configuration
- [ ] Invoice history UI in-app — Stripe portal covers this for v1.6
- [ ] SSO / OAuth providers — email/password sufficient for initial SaaS tier

---

## Implementation Detail: Each Feature

### Self-Serve Org Signup

**Expected behavior:** When a new user registers, an `Organization` document is created atomically with the user. The user becomes the org's Admin. The org starts on the `free` plan. The `organizationId` is embedded in the NextAuth JWT via the `callbacks.jwt` function so all subsequent API calls have org context without a DB lookup.

**Dependency on existing auth:** NextAuth `signIn` / `callbacks.jwt` / `callbacks.session` in `src/app/api/auth/[...nextauth]/route.ts` must be extended. The existing User model needs an `organizationId` field. The existing `session.user` type must be augmented to carry `organizationId` (already a TypeScript pattern used for `role`).

### Tier Limit Enforcement

**Expected behavior:** Before any write (create collection, save tokens, create theme, export), the API route calls a billing service function that:
1. Checks `process.env.SELF_HOSTED` — if true, returns `{ allowed: true }` immediately.
2. Reads the org's `plan` from session JWT or a cached org lookup.
3. Checks the relevant limit from `LIMITS[plan]`.
4. Reads current usage from the org document.
5. Returns `{ allowed: false, payload: { limitType, current, limit, plan, upgradePlans } }` if exceeded — route returns 402.
6. Returns `{ allowed: true }` if under limit — route proceeds.

The 402 payload is consumed by the client to populate the `UpgradeModal` with limit-specific text.

### Stripe Checkout Flow

**Expected behavior:**
1. User clicks "Upgrade to Pro/Team" in the upgrade modal or settings page.
2. Client calls `POST /api/billing/checkout` with `{ plan: 'pro' | 'team' }`.
3. Route creates a Stripe Checkout session (`mode: 'subscription'`) with the correct price ID. Pass `customer: org.stripeCustomerId` if org already has one; Stripe creates a new customer otherwise. Include `metadata: { organizationId }` so the webhook can find the org.
4. Route returns `{ url }` and client `window.location = url`.
5. On success, Stripe redirects to `?success=true`. Show a "We're activating your plan" pending state — do not read plan from URL state.
6. `checkout.session.completed` webhook fires; handler updates org `plan`, `stripeCustomerId`, `subscriptionStatus`. Client refreshes org state via poll or re-fetch.

**Why not update on success URL:** The tab may close before redirect, the redirect may fail, or the webhook may arrive before the redirect. The webhook is the only reliable update path (HIGH confidence — Stripe official docs).

### Stripe Billing Portal

**Expected behavior:**
1. Org Admin clicks "Manage Billing" in settings.
2. Client calls `POST /api/billing/portal`.
3. Route calls `stripe.billingPortal.sessions.create({ customer: org.stripeCustomerId, return_url: currentUrl })`.
4. Route returns `{ url }` and client redirects.
5. Stripe portal handles: payment method update, plan change, cancellation, invoice download.
6. On cancellation, `customer.subscription.deleted` webhook fires; handler downgrades org to `plan: 'free'`, sets `subscriptionStatus: 'canceled'`.

**Prerequisite:** Org must have a `stripeCustomerId`. If org is on Free with no Stripe customer, show "Upgrade to a paid plan first" instead of a billing portal link.

### Webhook Handler

**Expected behavior:** Single route at `POST /api/webhooks/stripe`.

- Stripe requires the raw request body for signature verification — this route must use `req.text()` or a raw body parser, not Next.js's default JSON parsing. This is a known footgun.
- Verify: `stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)`. Return 400 on failure.
- Idempotency guard: store `event.id` and skip if already processed. A simple Set in-process works for single-instance; use DB or Redis for multi-instance.
- Switch on `event.type`:
  - `checkout.session.completed`: Update org plan + stripeCustomerId + subscriptionStatus using `session.metadata.organizationId`.
  - `invoice.payment_failed`: Set org `subscriptionStatus: 'past_due'`; optionally send email via Resend (already installed in project).
  - `customer.subscription.deleted`: Downgrade org to `plan: 'free'`, set `subscriptionStatus: 'canceled'`.
- Respond 200 within 5 seconds. Stripe retries up to 35 times over 3 days on failure — idempotency guard prevents double-processing on retries.

### Usage Tracking and Monthly Reset

**Expected behavior:** `Organization` document carries:
```
usage: {
  exportsThisMonth: Number,
  tokenCount:       Number,
  lastReset:        Date
}
```

**Lazy reset pattern:** On any request that checks export quota:
1. Read `org.usage.lastReset`.
2. If `lastReset < startOf(currentMonth)`, atomically reset: `findOneAndUpdate({ _id: orgId, 'usage.lastReset': { $lt: startOfMonth } }, { $set: { 'usage.exportsThisMonth': 0, 'usage.lastReset': now } })`. The stale-check in the query condition prevents double-reset under concurrent requests.
3. Proceed with the now-current usage value.

**tokenCount** is not time-windowed — it reflects current token count. Options:
- Increment on token save, decrement on delete via `$inc` (fast, but can drift if writes fail mid-operation).
- Recount from collection documents on each limit check (always accurate, slightly slower). Recommended for v1.6 given collection count is bounded (max 10 on Pro).

### Upgrade Prompt UX

**Expected behavior:**
- All limit-enforcing API routes return 402 with structured JSON: `{ error: 'LIMIT_EXCEEDED', limitType: 'collections' | 'tokens' | 'themes' | 'exports' | 'integrations', current: N, limit: N, plan: 'free', upgradePlans: ['pro', 'team'] }`.
- Client has a response interceptor (Axios interceptor or fetch wrapper) that detects 402 and opens an `UpgradeModal` component.
- Modal shows: what action was attempted, current usage vs. limit, what the next tier allows, and a CTA button that initiates the Checkout flow.
- Modal language is opportunity-framed, not punitive: "You've reached your [X] limit on the Free plan. Upgrade to Pro to continue." Not: "Access denied" or "Permission error."
- The modal is a single component reused across all limit types. Limit-specific text is derived from `limitType` in the 402 payload + the `LIMITS` config.

### Rate Limiting

**Expected behavior:** 60 requests per minute per authenticated user on:
- `POST /api/collections/[id]/export`
- `PUT /api/collections/[id]/tokens` (token save)

**Implementation decision:** Depends on deployment target.
- Single-instance server (Docker, self-hosted): In-process sliding window using `Map<userId, timestamps[]>` — zero external dependencies.
- Multi-instance / serverless (Vercel): `@upstash/ratelimit` + Upstash Redis — sliding window algorithm, HTTP-based, pay-per-request pricing. Required because ephemeral instances cannot share in-process state.

For v1.6 (single server assumed), in-process is sufficient. Flag this as a deployment assumption in STACK.md.

Return 429 with `Retry-After: N` header. Self-hosted mode: rate limiting still applies — it is not billing-related.

### Self-Hosted Bypass Mode

**Expected behavior:** When `SELF_HOSTED=true` in the environment:
- All calls to billing middleware return `{ allowed: true }` immediately. No DB reads.
- Stripe-related API routes (`/api/billing/checkout`, `/api/billing/portal`, `/api/webhooks/stripe`) return 501 Not Implemented.
- Org model still exists but `plan` field is set to `'self_hosted'` (a sentinel value signaling unlimited).
- No Stripe SDK is initialized; `STRIPE_SECRET_KEY` env var is not required. The Stripe import is guarded by a runtime check.
- `subscriptionStatus` defaults to `'active'` for self-hosted orgs.

This pattern is consistent with open-core SaaS tools (Gitea, Outline, Mattermost). The bypass is enforced at the billing middleware layer — not scattered through individual route handlers.

---

## Dependencies on Existing Stack

| Existing Feature | How v1.6 Depends On It | Change Required |
|-----------------|------------------------|-----------------|
| NextAuth.js sessions | Must extend `callbacks.jwt` + `callbacks.session` to include `organizationId` | Add `organizationId` to JWT and session type augmentation |
| Mongoose User model | Must add `organizationId: ObjectId` field | Add field with `{ ref: 'Organization' }` + nullable for migration period |
| Resend email | Reuse for `invoice.payment_failed` notification (optional) | No change; call existing email service from webhook handler |
| API route structure (`src/app/api/`) | New billing routes at `src/app/api/billing/checkout`, `src/app/api/billing/portal`, `src/app/api/webhooks/stripe` | New routes only |
| shadcn/ui | `UpgradeModal` uses existing Dialog + Button primitives | New component using existing primitives |
| MongoDB/Mongoose | `Organization` is a new top-level Mongoose model | New model + index on `organizationId` for all collection queries |
| All existing collection write API routes | Must add `organizationId` scope to every query + call billing middleware | Touches every collection, token, theme, and export API route |

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Org model + data scoping | HIGH | MEDIUM | P1 |
| LIMITS config | HIGH | LOW | P1 |
| Self-hosted bypass | HIGH (for self-hosters) | LOW | P1 |
| Self-serve org signup | HIGH | LOW | P1 |
| Data migration (INITIAL_ORG_NAME) | HIGH | LOW | P1 |
| Tier enforcement at API layer | HIGH | MEDIUM | P1 |
| Stripe Checkout upgrade flow | HIGH | MEDIUM | P1 |
| Webhook plan sync | HIGH | MEDIUM | P1 |
| Upgrade prompt modal | HIGH | LOW | P1 |
| Billing portal redirect | MEDIUM | LOW | P1 |
| Usage tracking + lazy reset | MEDIUM | LOW | P1 |
| Rate limiting | MEDIUM | MEDIUM | P1 |
| Pre-limit 80% warnings | MEDIUM | LOW | P2 |
| `subscription.updated` webhook | MEDIUM | LOW | P2 |
| Cancellation retention coupon | LOW | LOW | P3 |
| Usage-based overages | LOW | HIGH | P3 (v2+) |

**Priority key:**
- P1: Must have for v1.6 launch
- P2: Add when core is stable, within milestone
- P3: Future consideration

---

## Sources

- [Stripe: Using webhooks with subscriptions](https://docs.stripe.com/billing/subscriptions/webhooks) — HIGH confidence (official docs)
- [Stripe: Customer portal documentation](https://docs.stripe.com/customer-management) — HIGH confidence (official docs)
- [Stripe: Idempotent requests](https://docs.stripe.com/api/idempotent_requests) — HIGH confidence (official docs)
- [Stripe: Build a subscriptions integration](https://docs.stripe.com/billing/subscriptions/build-subscriptions) — HIGH confidence (official docs)
- [Pedro Alonso: Stripe + Next.js Complete Guide 2025](https://www.pedroalonso.net/blog/stripe-nextjs-complete-guide-2025/) — MEDIUM confidence
- [DEV Community: Stripe Subscription Lifecycle in Next.js 2026](https://dev.to/thekarlesi/stripe-subscription-lifecycle-in-nextjs-the-complete-developer-guide-2026-4l9d) — MEDIUM confidence
- [Appcues: How freemium SaaS products convert users with upgrade prompts](https://www.appcues.com/blog/best-freemium-upgrade-prompts) — MEDIUM confidence
- [Kinde: Integrating Usage Caps, Alerts, and Spend Limits in Billing UX](https://kinde.com/learn/billing/pricing/integrating-usage-caps-alerts-and-spend-limits-in-billing-ux/) — MEDIUM confidence
- [Upstash: Rate Limiting Next.js API Routes](https://upstash.com/blog/nextjs-ratelimiting) — MEDIUM confidence
- [GeeksforGeeks: Build a Multi-Tenant Architecture in MongoDB](https://www.geeksforgeeks.org/dbms/build-a-multi-tenant-architecture-in-mongodb/) — MEDIUM confidence
- [magicbell.com: Stripe Webhooks Complete Guide](https://www.magicbell.com/blog/stripe-webhooks-guide) — MEDIUM confidence

---

*Feature research for: ATUI Tokens Manager v1.6 — Multi-Tenant SaaS Billing*
*Researched: 2026-03-30*
