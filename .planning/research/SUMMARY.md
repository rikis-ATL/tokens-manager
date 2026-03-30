# Project Research Summary

**Project:** ATUI Tokens Manager v1.6 — Multi-Tenant SaaS Billing
**Domain:** Multi-tenant billing layer on top of an existing Next.js 13.5.9 + Mongoose + NextAuth v4 design token management tool
**Researched:** 2026-03-30
**Confidence:** HIGH

## Executive Summary

This milestone adds a multi-tenant organization model, tiered subscription billing via Stripe, per-org usage enforcement, and rate limiting to an existing and stable application. The existing stack is locked; only two new production dependencies are introduced: `stripe@^17.7.0` (server-only, pinned below the v18 breaking API changes) and `rate-limiter-flexible@^10.0.1` (backed by the existing MongoDB connection, no Redis required). The entire billing surface is isolated behind a `src/lib/billing/` module boundary — no Stripe SDK code is permitted in route handlers directly. No client-side Stripe packages are needed; the checkout flow uses the server-side `session.url` redirect pattern.

The recommended approach is strict dependency-ordered delivery: org model and multi-tenant data scoping first, then the billing enforcement module and LIMITS config, then Stripe Checkout and webhook integration. Every subsequent phase depends on `organizationId` being present on documents and in the session JWT. The single most important implementation detail is that `organizationId` must be backfilled onto every pre-existing document before the field is made required in Mongoose — omitting this step causes silent data loss with no error thrown. Cross-tenant isolation (always filtering queries by `organizationId`) and webhook idempotency are the two other failure modes most likely to cause production incidents.

The key risks are: orphaned pre-migration documents (silent, detectable only by count assertions), cross-tenant data leakage through unscoped `findById` queries (the most severe class of multi-tenant bug), Stripe webhook raw-body parsing failure (100% webhook rejection if `req.json()` is used instead of `req.text()`), duplicate webhook processing without an idempotency guard, and stale plan data in the JWT after a Stripe upgrade. All five risks have clear mitigations documented in the research and must be addressed at the phase where they originate, not as hardening steps.

---

## Key Findings

### Recommended Stack

The existing stack requires only two additions. `stripe@^17.7.0` is pinned below v18 to avoid the `2025-03-31.basil` API version breaking changes and the `Stripe.Decimal` type overhaul in v21; all needed Stripe APIs (Checkout, billing portal, subscriptions, webhooks) are stable in v17. `rate-limiter-flexible@^10.0.1` uses `RateLimiterMongo` backed by the existing Mongoose connection, eliminating any Redis infrastructure dependency. No client-side Stripe packages are needed: the checkout flow uses the server-side `session.url` redirect pattern (`stripe.redirectToCheckout()` was deprecated by Stripe in 2025). The Stripe singleton must throw at module load time if `STRIPE_SECRET_KEY` is missing, and must never be initialized when `SELF_HOSTED=true`.

**Core technologies (new additions only):**
- `stripe@^17.7.0`: Server-only Stripe SDK — Checkout Session creation, billing portal sessions, webhook verification, subscription CRUD. Pinned below v18 breaking changes. Node 18+ required; project runs Node 20.
- `rate-limiter-flexible@^10.0.1`: Per-user sliding window rate limiting backed by MongoDB — zero new infrastructure, lazy-init singleton matching existing `dbConnect()` pattern.
- NextAuth JWT extension (no new package): `organizationId` injected into JWT and session callbacks at sign-in, eliminating per-request DB lookup for org context.

**Avoid:**
- `stripe@^21.x` — breaking `Stripe.Decimal` type overhaul across all affected fields
- `@stripe/stripe-js` / `@stripe/react-stripe-js` — not needed for server-side redirect checkout
- `@upstash/ratelimit` — requires Redis; MongoDB-backed limiter is sufficient for single-instance
- `req.json()` in the webhook route — consumes the raw body stream, breaks Stripe HMAC signature verification
- `bodyParser: false` export config — Pages Router only; ignored in App Router route handlers
- `RateLimiterMemory` — silently resets on server restart / cold starts

---

### Expected Features

All v1.6 features are new. Existing features (RBAC, invite flow, token CRUD, export, themes, user management) are complete and must not be re-planned.

**Must have (table stakes — P1 for v1.6 launch):**
- Org model: `Organization` document with plan, stripeCustomerId, subscriptionStatus, usage counters, seat count
- Self-serve org signup: org created atomically at registration, user assigned Admin, `organizationId` in JWT
- Data migration: existing documents backfilled to initial org via `INITIAL_ORG_NAME` env var
- `LIMITS` config in `src/lib/billing/tiers.ts`: single source of truth for all tier caps
- Tier enforcement at API layer: 402 response with structured payload before any write operation
- Self-hosted bypass: `SELF_HOSTED=true` skips all billing checks and Stripe initialization
- Usage tracking: `exportsThisMonth`, `tokenCount`, `usageResetAt` embedded on Org document
- Lazy monthly reset: atomic reset on first request after month rollover, no cron required
- Stripe Checkout: server-side redirect to Stripe-hosted page; plan updated only via webhook
- Stripe billing portal: self-serve payment management via Stripe-hosted portal redirect
- Webhook handler: `checkout.session.completed`, `invoice.payment_failed`, `customer.subscription.deleted` with idempotency guard
- Upgrade modal: triggered by 402 response, shows limit context and upgrade CTA; reused across all limit types
- Limit enforcement blocks on: collection create, token save, theme create, export, integrations
- Rate limiting: 60 req/min per user ID on export and token-update endpoints

**Should have (add when core is stable — P2):**
- Pre-limit warnings at 80% usage (amber indicator before hard block)
- `customer.subscription.updated` webhook for mid-cycle plan changes via billing portal
- Cancellation retention coupon configured via Stripe Dashboard (zero code)

**Defer (v2+):**
- Usage-based overages via Stripe Meters API
- Multi-org membership / org switching (session model changes required)
- Enterprise tier with custom pricing
- Invoice history UI in-app (Stripe portal covers this for v1.6)

**Anti-features to avoid:**
- Custom payment form with Stripe Elements — PCI burden; Stripe Checkout handles payment securely
- Plan update on Checkout success redirect — tab-close or network failure means missed updates; webhook is the only reliable path
- Client-side limit enforcement only — trivially bypassable; server enforcement is mandatory
- Real-time usage dashboard with push updates — unnecessary complexity for infrequently changing data
- Multi-org membership for v1.6 — session model requires org context on every request; one org per user is correct scope

---

### Architecture Approach

The architecture adds a strict isolation layer. All Stripe and billing logic lives exclusively in `src/lib/billing/` — route handlers call named service functions and act on return values only; they never import the Stripe SDK directly. Limit enforcement sits between the auth check and business logic in each route handler (not in Next.js middleware, which cannot use Mongoose in the Edge runtime). The `Organization` Mongoose model carries embedded usage counters (`exportsThisMonth`, `tokenCount`) to avoid aggregate queries at check time. The webhook route must use `req.text()` and is intentionally unauthenticated to HTTP session auth — the Stripe signature check is the authentication mechanism.

**Major components:**
1. `Organization` model (`src/lib/db/models/Organization.ts`) — tenant root document; carries plan, Stripe IDs, usage counters, seat count; `organizationId` added to User and TokenCollection models
2. `src/lib/billing/` module — isolated boundary: `stripe.ts` (singleton), `tiers.ts` (LIMITS config), `limits.ts` (check functions), `usage.ts` (increment/lazy reset), `checkout.ts` (session creation), `rate-limit.ts` (in-process Map keyed by user ID), `webhooks/` (handler per event type)
3. NextAuth JWT extension (`nextauth.config.ts`) — `organizationId` injected at sign-in; plan read from Org document at enforcement time (not cached in JWT to avoid staleness after upgrade)
4. Data migration bootstrap — idempotent boot-time script: seed org from `INITIAL_ORG_NAME`, backfill `organizationId` on all existing User and TokenCollection documents, create compound indexes, assert zero unscoped documents before boot continues
5. `UpgradeModal` component — reusable shadcn Dialog triggered by a global 402 response interceptor; limit-specific text derived from `limitType` + `LIMITS` config

**Key patterns:**
- Limit check order in every write route: `requireRole` → load org → `checkXxxLimit(org, ...)` → return 402 or proceed → update usage
- Webhook idempotency: `ProcessedWebhookEvent` MongoDB collection checked before processing, recorded after success; return 200 for already-processed events
- Org lookup in subscription events: always by `stripeCustomerId` (stored at checkout completion); never by session metadata (absent in subscription events)
- Rate limit key: always `session.user.id`, never client IP (IP is spoofable via `X-Forwarded-For`)
- `assertOrgOwnership(collectionId, orgId)` helper: compound `{ _id, organizationId }` filter on all tenant-owned resource lookups; returns 404 (not 403) to avoid confirming resource existence

---

### Critical Pitfalls

1. **organizationId backfill missing — silent data loss** — Mongoose schema defaults do not apply to existing documents. Run explicit `updateMany({ organizationId: { $exists: false } }, { $set: { organizationId: seedOrgId } })` on `TokenCollection` and `User` before making the field required. Assert `countDocuments({ organizationId: { $exists: false } }) === 0` before the app continues booting. Address in: TENANT-03 (must run atomically with the schema change, not after it).

2. **Cross-tenant data leakage via unscoped `findById`** — Every query taking a resource ID from an HTTP request must be a compound filter `{ _id, organizationId }`. Existing route handlers that use `TokenCollection.findById(id)` without org scoping allow Org A to read Org B's data by guessing MongoDB ObjectIds. Create `assertOrgOwnership()` helper; audit all existing routes in the same phase. Return 404 (not 403). Address in: TENANT-01 (before billing work begins).

3. **Webhook raw body consumed by `req.json()`** — HMAC signature verification fails 100% of the time if the body stream is consumed before `constructEvent()`. Use `await req.text()` exclusively in the webhook route. `bodyParser: false` is a Pages Router concept; it is ignored in App Router. Address in: STRIPE-03 (initial webhook handler, not as a fix).

4. **Webhook processed multiple times without idempotency guard** — Stripe guarantees at-least-once delivery and retries on non-2xx responses. Without an idempotency guard, `checkout.session.completed` can activate a subscription twice, and `customer.subscription.deleted` can double-send cancellation emails. Address in: STRIPE-03 (implement alongside the first handler).

5. **Stale JWT plan after Stripe upgrade** — If plan is cached in the JWT, the upgrade modal persists for up to 60 seconds after a successful Stripe payment because the JWT still carries `plan: 'free'`. Mitigation: do not cache plan in the JWT; read from the Org document at enforcement time. On the Stripe success redirect, call `useSession().update()` to force a JWT refresh. Address in: TENANT-01/BILLING-02 (settle JWT design before Stripe checkout is wired).

6. **Checkout session metadata absent in subscription events** — `checkout.session.completed` carries `metadata.organizationId`; subsequent `customer.subscription.updated` / `customer.subscription.deleted` events carry subscription-level metadata only. Link `stripeCustomerId` to the org at checkout completion; look up org by `stripeCustomerId` in all subsequent handlers. Also set `organizationId` in Stripe Customer metadata as a persistent fallback. Address in: STRIPE-01/STRIPE-03 (checkout creation and webhook handler must be designed together).

7. **Tier limit race condition on concurrent creates** — Check-then-act with `countDocuments()` is not atomic. Two concurrent requests can both read count = 0, both pass the limit check, and both create documents, leaving the org over its Free tier limit. Use conditional `$lt` update on the Org's denormalized counter: `findOneAndUpdate({ _id: orgId, tokenCount: { $lt: limit } }, { $inc: { tokenCount: delta } })`. No result = limit hit. Address in: BILLING-01/LIMIT-01.

8. **Missing compound index on organizationId** — Every collection listing query becomes a full COLLSCAN without `{ organizationId: 1, name: 1 }` and `{ organizationId: 1, updatedAt: -1 }` indexes. MongoDB is silent about this; latency degrades linearly with document count. Add indexes in the same commit that adds the field. Address in: TENANT-01.

---

## Implications for Roadmap

Based on the dependency graph surfaced across all four research files, the work must proceed in strict dependency order. Every billing and enforcement feature reads `organizationId` from the session, which requires the Org model and data migration to be complete first. Stripe customer binding must exist before Checkout or portal sessions can be created. The webhook handler must be correct from day one — idempotency and raw body handling are not hardening steps.

### Phase 1: Org Model and Multi-Tenant Foundation

**Rationale:** Every subsequent feature depends on `organizationId` existing on documents and in the session. This phase has no prerequisites. It must also audit and patch all existing route handlers for cross-tenant isolation — deferring this creates a security vulnerability that only grows harder to fix.
**Delivers:** `Organization` Mongoose model; `organizationId` added to User and TokenCollection; JWT extension (`organizationId` in token + session); idempotent data migration bootstrap with backfill and count assertion; compound indexes on both models; `assertOrgOwnership()` helper applied to all existing collection route handlers; self-serve org signup at registration.
**Addresses:** TENANT-01, TENANT-02, TENANT-03
**Avoids:** Cross-tenant leakage (Pitfall 2), orphaned documents (Pitfall 1), missing indexes (Pitfall 8), stale JWT design (Pitfall 5)
**Research flag:** Standard patterns — MongoDB multi-tenancy by `organizationId` is well-documented. No deep research needed.

### Phase 2: Billing Module and Limit Enforcement

**Rationale:** With the org model in place, the billing module skeleton and LIMITS config can be established before any Stripe code exists. This defines the enforcement interface all route modifications will use and ensures the `SELF_HOSTED` bypass is centralized before routes are touched. Rate limiting is stateless (in-process Map) and belongs here.
**Delivers:** `src/lib/billing/` module skeleton; `tiers.ts` (LIMITS config — Free/Pro/Team caps); `limits.ts` (check functions returning `{ allowed: true | false }`); `rate-limit.ts` (in-process Map keyed by `session.user.id`); `usage.ts` (lazy UTC-month reset + atomic `$inc`); self-hosted bypass (`isSelfHosted()` checked first in all limit functions); 402 responses with structured payload on all write routes; `UpgradeModal` client component triggered by global 402 interceptor.
**Addresses:** BILLING-01, BILLING-03, BILLING-04, BILLING-05, BILLING-06, USAGE-01, USAGE-02, RATE-01, LIMIT-01 through LIMIT-05, UXUP-01
**Avoids:** Layer violation — Stripe code in routes (Pitfall 6 setup), race condition on limit checks (Pitfall 7), rate limit IP bypass (Pitfall 8 / Pitfall 10), timezone off-by-one on reset (Pitfall 11)
**Research flag:** Standard patterns. Rate limiter is a simple in-process Map. No deep research needed.

### Phase 3: Stripe Checkout and Webhook Integration

**Rationale:** Only after limit enforcement exists should payment flows be added. The webhook handler must be correct from the first commit — idempotency and raw body handling are not hardening steps. Checkout and webhook handler must be designed together because `stripeCustomerId` written at checkout completion is the only reliable org identifier in subsequent subscription events.
**Delivers:** `stripe.ts` singleton (throws if key missing; skipped when `SELF_HOSTED=true`); `checkout.ts` (Checkout Session creation + billing portal session); webhook route at `POST /api/billing/webhooks/route.ts` using `req.text()`; `ProcessedWebhookEvent` idempotency guard; `checkout.session.completed` / `invoice.payment_failed` / `customer.subscription.deleted` handlers; Checkout success page with `useSession().update()` refresh; Stripe env vars documented.
**Addresses:** STRIPE-01, STRIPE-02, STRIPE-03, BILLING-02
**Avoids:** Raw body pitfall (Pitfall 3), duplicate webhook processing (Pitfall 4), out-of-order event delivery (Pitfall 5), metadata scoping mismatch (Pitfall 6), stale JWT plan (Pitfall 5)
**Research flag:** Stripe webhook patterns are high-confidence. Review Pitfalls 3–6 during task planning for this phase. No additional research needed.

### Phase Ordering Rationale

- **Org model before billing:** Enforcement reads `organizationId` from the session on every request. Without it, no billing check has context to operate against.
- **LIMITS config before enforcement routes:** All limit checks import from `LIMITS`; the config shape defines which fields the Org document must carry. Establishing the config first prevents field drift between schema and enforcement.
- **Billing module skeleton before Stripe code:** Establishes the isolation boundary before any Stripe calls exist. Prevents the natural gravitational pull of writing Stripe calls directly in route handlers.
- **Checkout and webhook together:** `stripeCustomerId` flows from checkout → webhook → subsequent subscription events. Splitting these phases risks a design mismatch between how the checkout session stores org identity and how webhook handlers look it up.
- **Usage tracking in Phase 2:** Lazy reset and increment must be in place before export and token-save routes are modified for limit checks. UTC month boundary logic (`getUTCMonth()` / `getUTCFullYear()`) must be correct from the start.
- **Cross-tenant isolation in Phase 1:** Auditing and patching all existing route handlers for org-scoped queries must happen before billing work, not alongside it. A route that leaks data across tenants is a security issue; billing work should not be shipped alongside an open security gap.

### Research Flags

All three phases use well-documented patterns with HIGH-confidence sources. No `research-phase` run is needed for any phase in this milestone.

- **Phase 1 (Org Model):** MongoDB multi-tenancy is a standard pattern; JWT extension follows the existing `role` pattern already in the codebase.
- **Phase 2 (Billing Module):** In-process rate limiting, LIMITS config, and 402 enforcement are straightforward. The PITFALLS.md documents the exact implementation for rate limit key selection, UTC reset logic, and atomic limit checks.
- **Phase 3 (Stripe):** Stripe Checkout and webhooks are comprehensively documented in official sources. STACK.md provides the exact code pattern for `req.text()`, singleton initialization, and webhook handler structure.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Two-package addition verified against Node 20.19.6, Mongoose 9.2.2, TypeScript 5.2.2. Stripe version pin rationale cross-checked against official changelogs and migration guides. |
| Features | HIGH (core) / MEDIUM (UX) | Stripe flows and tier enforcement from official Stripe docs. Upgrade prompt UX and 80% pre-limit warnings from community consensus (multiple sources agree on pattern). |
| Architecture | HIGH | Billing isolation boundary, webhook raw body pattern, org scoping patterns, and JWT extension all from official sources and confirmed Next.js App Router behavior. In-process rate limiting is MEDIUM (acknowledged single-instance trade-off; upgrade path to RateLimiterMongo documented). |
| Pitfalls | HIGH | Pitfalls 1–4, 6, 9, 12 verified from official docs, codebase direct inspection, and known App Router behavior. Pitfalls 7, 10, 11 from community consensus backed by MongoDB and Stripe documentation. |

**Overall confidence:** HIGH

### Gaps to Address

- **JWT plan staleness resolution:** Two valid approaches exist — never cache plan in JWT (simpler, one extra DB read at enforcement time) vs. extend the existing 60-second TTL re-fetch to include plan. The team must choose one before Phase 3 begins. Recommended: do not cache plan in the JWT; always read from Org document at enforcement time. The `useSession().update()` call on the success page handles post-checkout UX.

- **Rate limiter deployment assumption:** The in-process Map rate limiter is documented as a single-instance assumption. If the application is deployed to Vercel (serverless, multi-instance), the rate limiter must use `RateLimiterMongo` from `rate-limiter-flexible` or Upstash Redis before launch. Confirm the deployment target before Phase 2 implementation begins.

- **Stripe price IDs:** `STRIPE_PRO_PRICE_ID` and `STRIPE_TEAM_PRICE_ID` must be created in the Stripe Dashboard before Phase 3 work starts. This is an ops step, not a code decision — flag in the Phase 3 kickoff checklist.

- **Idempotency store design:** An in-process `Set` works for single-instance webhook idempotency but does not survive restarts or work across multiple instances. A `ProcessedWebhookEvent` MongoDB collection is the correct solution for any production deployment. Confirm which is appropriate for the v1.6 deployment target.

---

## Sources

### Primary (HIGH confidence)
- [stripe/stripe-node Releases + CHANGELOG.md](https://github.com/stripe/stripe-node/releases) — v17 pin rationale; v18/v21 breaking changes assessed
- [Migration guide for v18 — stripe/stripe-node Wiki](https://github.com/stripe/stripe-node/wiki/Migration-guide-for-v18) — API version `2025-03-31.basil` breaking changes
- [Stripe Docs — Subscriptions webhooks](https://docs.stripe.com/billing/subscriptions/webhooks) — event types, delivery guarantees, idempotency requirements
- [Stripe Docs — Customer portal](https://docs.stripe.com/customer-management) — billing portal session creation pattern
- [Stripe Docs — Remove redirectToCheckout](https://docs.stripe.com/changelog/clover/2025-09-30/remove-redirect-to-checkout) — confirms server-side `session.url` redirect as current pattern
- [Stripe Docs — Build a subscriptions integration](https://docs.stripe.com/billing/subscriptions/build-subscriptions) — Checkout Session + webhook flow
- [vercel/next.js Discussion #48885](https://github.com/vercel/next.js/discussions/48885) — `req.text()` vs `req.json()` for Stripe webhooks in App Router
- [npm: rate-limiter-flexible](https://www.npmjs.com/package/rate-limiter-flexible) — v10.0.1 latest (March 2026), `RateLimiterMongo` pattern
- [rate-limiter-flexible Wiki — Mongo](https://github.com/animir/node-rate-limiter-flexible/wiki/Mongo) — `storeClient` pattern with Mongoose connection
- [NextAuth.js v4 — Callbacks](https://next-auth.js.org/configuration/callbacks#jwt-callback) — JWT + session extension for custom claims

### Secondary (MEDIUM confidence)
- [GeeksforGeeks — Stripe Webhook Using NextJS 13 App Router](https://www.geeksforgeeks.org/reactjs/how-to-add-stripe-webhook-using-nextjs-13-app-router/) — `req.text()` pattern (cross-checked with official discussion)
- [Pedro Alonso: Stripe + Next.js Complete Guide 2025](https://www.pedroalonso.net/blog/stripe-nextjs-complete-guide-2025/) — Checkout flow patterns
- [DEV Community: Stripe Subscription Lifecycle in Next.js 2026](https://dev.to/thekarlesi/stripe-subscription-lifecycle-in-nextjs-the-complete-developer-guide-2026-4l9d) — lifecycle event handling
- [Appcues: freemium upgrade prompts](https://www.appcues.com/blog/best-freemium-upgrade-prompts) — upgrade modal UX framing
- [Kinde: Usage Caps and Alerts in Billing UX](https://kinde.com/learn/billing/pricing/integrating-usage-caps-alerts-and-spend-limits-in-billing-ux/) — 80% pre-limit warning pattern
- [GeeksforGeeks: Multi-Tenant Architecture in MongoDB](https://www.geeksforgeeks.org/dbms/build-a-multi-tenant-architecture-in-mongodb/) — `organizationId` scoping pattern
- [magicbell.com: Stripe Webhooks Complete Guide](https://www.magicbell.com/blog/stripe-webhooks-guide) — idempotency and retry handling

---

*Research completed: 2026-03-30*
*Ready for roadmap: yes*
