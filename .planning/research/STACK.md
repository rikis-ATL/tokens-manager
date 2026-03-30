# Stack Research

**Domain:** Multi-tenant SaaS billing — ATUI Tokens Manager v1.6
**Researched:** 2026-03-30
**Confidence:** HIGH for Stripe SDK + webhook pattern; HIGH for rate-limiter-flexible + MongoDB; HIGH for next-auth JWT extension for orgId; MEDIUM for stripe v17 as version pin (v21 is latest but carries breaking changes not yet warranted)

---

## Context: What This Research Covers

This is a SUBSEQUENT MILESTONE stack document. The existing validated stack (Next.js 13.5.9, React 18.2.0, Mongoose 9.2.2, next-auth v4.24.13, bcryptjs, Resend, shadcn/ui + Tailwind CSS) is locked. This document covers only the NEW dependencies for v1.6: Stripe billing, per-org rate limiting, and multi-tenancy data scoping.

**The verdict: two new production packages, zero new dev dependencies.**

The host environment runs Node.js 20.19.6, which satisfies Stripe SDK v17+ requirements (Node 18+ minimum).

---

## Recommended Stack

### Core Technologies — New Additions Only

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `stripe` | `^17.7.0` | Server-side Stripe API: Checkout Session creation, billing portal sessions, webhook event construction + verification, customer/subscription CRUD | v17 (API version `2024-09-30.acacia`) is the last major before the `2025-03-31.basil` API changes in v18. Pinning `^17` avoids the v18 and v21 breaking changes (decimal_string type overhaul, new OAuth error classes) with no cost — Checkout, billing portal, and subscription webhooks are all stable in v17. Node 18+ required; this project runs Node 20. The `stripe` package is server-only and never imported client-side. |
| `rate-limiter-flexible` | `^10.0.1` | Per-user rate limiting on export + token-update endpoints, backed by the existing MongoDB connection | v10.0.1 is current (published March 2026). Supports `RateLimiterMongo` with a mongoose connection as `storeClient` — zero new infrastructure. Sliding window algorithm prevents burst abuse. ~1.4M weekly downloads, actively maintained. No Redis or Upstash account required — the existing MongoDB connection handles state. |

### No New Client-Side Stripe Packages Needed

`@stripe/stripe-js` and `@stripe/react-stripe-js` are **not required**. The v1.6 Checkout flow uses the server-side redirect pattern: the API route creates a Checkout Session and returns `session.url`; the client does a plain redirect to that URL. `stripe.redirectToCheckout()` was deprecated by Stripe in 2025. No embedded checkout iframe is needed.

### No New Middleware Package Needed

Next.js 13's built-in `middleware.ts` handles org-scoping and auth gating. The existing `withAuth` from next-auth v4 already provides the JWT verification layer. No additional middleware package is required.

---

## Architecture: How the New Stack Integrates

### Stripe Integration Points

```
src/lib/billing/
  ├─ stripe.ts              ← singleton: new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-09-30' })
  ├─ checkout.ts            ← createCheckoutSession(orgId, plan, returnUrl) → session.url
  ├─ portal.ts              ← createBillingPortalSession(stripeCustomerId, returnUrl) → portal.url
  ├─ webhooks.ts            ← constructWebhookEvent(body, sig, secret) + event routing
  └─ limits.ts              ← LIMITS config: Free/Pro/Team tier caps; checkLimit(org, feature)

src/app/api/billing/
  ├─ checkout/route.ts      ← POST: calls billing/checkout.ts, returns { url }
  ├─ portal/route.ts        ← POST: calls billing/portal.ts, returns { url }
  └─ webhook/route.ts       ← POST: raw body via req.text(), stripe.webhooks.constructEvent()
                               handles: checkout.session.completed
                                        invoice.payment_failed
                                        customer.subscription.deleted
```

All Stripe logic is isolated to `src/lib/billing/`. App routes call into billing functions; they never instantiate Stripe directly.

### Webhook Raw Body Pattern (Next.js 13 App Router)

```typescript
// src/app/api/billing/webhook/route.ts
export async function POST(req: Request) {
  const body = await req.text();          // raw body — DO NOT use req.json()
  const sig = req.headers.get('stripe-signature')!;
  const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  // route on event.type ...
}
```

`req.text()` is the correct App Router approach. The old `bodyParser: false` export config is not available in App Router route handlers and is not needed when using `req.text()`.

### Rate Limiting Integration

```typescript
// src/lib/rateLimit.ts
import { RateLimiterMongo } from 'rate-limiter-flexible';
import dbConnect from '@/lib/db/dbConnect';

let rateLimiter: RateLimiterMongo | null = null;

export async function getRateLimiter(): Promise<RateLimiterMongo> {
  if (!rateLimiter) {
    const mongoose = await dbConnect();
    rateLimiter = new RateLimiterMongo({
      storeClient: mongoose.connection,
      keyPrefix:   'rl_export',
      points:      60,      // 60 requests
      duration:    60,      // per 60 seconds
    });
  }
  return rateLimiter;
}

// Usage in API route:
const limiter = await getRateLimiter();
await limiter.consume(userId);   // throws RateLimiterRes on limit exceeded → return 429
```

The lazy-init singleton pattern matches the existing `dbConnect()` pattern used throughout the codebase. The rate limiter persists state in a `rl_export` MongoDB collection — no Redis, no cold-start drift.

### next-auth JWT Extension for orgId

No new packages. Extend the existing `jwt` and `session` callbacks in `[...nextauth]/route.ts`:

```typescript
callbacks: {
  jwt({ token, user }) {
    if (user) {
      token.orgId = (user as any).orgId;    // set on sign-in from User model
      token.plan  = (user as any).plan;     // org plan for client-side gate hints
    }
    return token;
  },
  session({ session, token }) {
    session.user.orgId = token.orgId as string;
    session.user.plan  = token.plan as string;
    return session;
  },
}
```

`orgId` flows from the `User` document → JWT cookie → `useSession()` hook. API routes extract `orgId` from `getServerSession()` — one DB round-trip eliminated per request.

### Mongoose Models — New Files

| Model | Collection | Key Fields |
|-------|------------|------------|
| `Organization` | `organizations` | `name`, `plan` (free/pro/team), `stripeCustomerId`, `subscriptionStatus`, `exportsThisMonth`, `tokenCount`, `lastReset`, `seats` |

Existing `User` model gains `organizationId: ObjectId` (ref `Organization`). Existing `TokenCollection` model gains `organizationId: ObjectId`. All queries gain `.where({ organizationId })` scope.

---

## Installation

```bash
# Production dependencies only — two new packages
yarn add stripe@^17.7.0 rate-limiter-flexible@^10.0.1
```

No dev dependencies needed. Both packages ship with their own TypeScript types.

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `stripe@^17.7.0` | `stripe@^21.0.1` (latest) | v21 changes all `decimal_string` fields from `string` to `Stripe.Decimal` — a breaking type change requiring codebase-wide updates. v18 introduced a new API version (`2025-03-31.basil`) with its own breaking changes. v17 covers all needed APIs (Checkout, billing portal, subscriptions, webhooks) with zero friction. Upgrade to v18+ when Stripe adds features specifically needed. |
| `stripe@^17.7.0` | `stripe@^15.x` | v15 was the "current stable" as of mid-2024 and is still compatible, but v17 is newer with no additional migration cost at this point. |
| `rate-limiter-flexible` | `@upstash/ratelimit` | Upstash requires a Redis instance (either self-hosted or Upstash cloud). This project has no Redis. Adding Redis for 60 req/min rate limiting on two endpoints is infrastructure over-engineering. `rate-limiter-flexible` uses the existing MongoDB connection via `RateLimiterMongo`. |
| `rate-limiter-flexible` | Custom in-memory counter | In-memory counters reset on every cold start / process restart. In serverless or multi-process deployments (even locally with `next dev`'s two processes) this silently fails to enforce limits. MongoDB-backed is the minimum viable persistent approach. |
| `rate-limiter-flexible` | `express-rate-limit` | `express-rate-limit` is designed for Express middleware chains, not Next.js App Router route handlers. Requires adapters and is awkward to use in a function-based handler. |
| Server-redirect Checkout | `@stripe/react-stripe-js` Embedded Checkout | Embedded checkout requires `@stripe/stripe-js` + `@stripe/react-stripe-js` client bundle. The redirect pattern achieves the same outcome with zero client-side bundle addition. `stripe.redirectToCheckout()` was deprecated in 2025; the current pattern is `session.url` redirect. |
| next-auth JWT extension | Separate org lookup middleware | A separate middleware doing a DB fetch on every request adds latency on every page load. The JWT already makes one round-trip at login; embedding `orgId` + `plan` there gives O(0) cost per subsequent request. |
| No adapter (JWT only) | `@auth/mongodb-adapter` | Already rejected in v1.5 research. Credentials provider requires JWT sessions; adapter targets database sessions. Incompatible combination in next-auth v4. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `stripe@^21.x` | Decimal_string breaking type change (`string` → `Stripe.Decimal`) across all affected fields. Webhook parsing methods throw differently. Not worth the migration at this stage. | `stripe@^17.7.0` |
| `@stripe/stripe-js` / `@stripe/react-stripe-js` | Not needed. Server-side redirect Checkout pattern creates session URL on server and redirects. These packages (and the embedded checkout iframe) are for the deprecated `redirectToCheckout` flow or optional embedded checkout UI — neither is needed here. | Server-side `session.url` redirect |
| `@upstash/ratelimit` | Requires Redis — new infrastructure dependency for a modest rate limiting requirement. | `rate-limiter-flexible` with MongoDB |
| `req.json()` in webhook route | Consumes raw body; Stripe signature verification fails because signature is computed over raw bytes, not parsed JSON. | `await req.text()` — App Router method that returns raw string |
| `bodyParser: false` export config | Only valid in Pages Router (`pages/api/`). In App Router route handlers this config is ignored and has no effect. | `await req.text()` in the handler directly |
| `LIMITS` constants scattered in route files | Hard to audit, easy to miss when adding new limits. | Single `src/lib/billing/limits.ts` file exporting `LIMITS` config object; all enforcement calls `checkLimit(org, feature)` |
| Stripe logic in route files | Couples API contract to billing implementation; makes testing harder. | All Stripe calls in `src/lib/billing/`; routes call billing functions |
| `RateLimiterMemory` (in-memory) | Silently resets on cold starts / process restarts. Does not work correctly with serverless or `next dev` (multiple processes). | `RateLimiterMongo` backed by the existing MongoDB connection |

---

## Stack Patterns by Variant

**If `SELF_HOSTED=true` env var is set:**
- Skip all Stripe initialization
- Return `null` from `billing/stripe.ts` singleton
- `checkLimit()` always returns `{ allowed: true }`
- Rate limiter still applies (it's operational, not billing-related)
- No Stripe env vars required in self-hosted deployments

**If org plan is `free`:**
- `checkLimit(org, 'collections')` returns `{ allowed: false, limit: 1 }` when `org.collections >= 1`
- `checkLimit(org, 'integrations')` always returns `{ allowed: false }`
- API routes return HTTP 402 with `{ code: 'LIMIT_EXCEEDED', feature, limit }`
- Client reads 402 + `code` → opens `UpgradeModal`

**If org plan is `pro` or `team`:**
- `checkLimit` passes all features except `seats` (team: 10 max, pro: 1)
- Stripe billing portal session available at `POST /api/billing/portal`

**If Stripe webhook signature verification fails:**
- Return HTTP 400 immediately — do not process the event
- Log the error with the received signature for debugging
- Never update org plan/status without a verified webhook event

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `stripe@^17.7.0` | `node@20.19.6` | Confirmed. Stripe v17+ requires Node 18+; project runs Node 20. |
| `stripe@^17.7.0` | `next@13.5.9` | Confirmed. Stripe is a server-only package imported only in API route handlers. No Next.js version dependency. |
| `stripe@^17.7.0` | `typescript@5.2.2` | Confirmed. Stripe v17 ships TypeScript definitions. No `@types/stripe` needed. |
| `rate-limiter-flexible@^10.0.1` | `mongoose@9.2.2` | Confirmed. `RateLimiterMongo` accepts a mongoose connection (`mongoose.connection`) as `storeClient`. Docs state "Mongoose >=5.2.0". Project uses Mongoose 9. |
| `rate-limiter-flexible@^10.0.1` | `typescript@5.2.2` | Confirmed. Package ships its own type definitions. |
| `rate-limiter-flexible@^10.0.1` | `next@13.5.9` | Confirmed. Used only in server-side route handlers; no edge runtime required. |

---

## Environment Variables Required

| Variable | Purpose | Notes |
|----------|---------|-------|
| `STRIPE_SECRET_KEY` | Stripe API secret key | `sk_live_...` in production, `sk_test_...` in dev. Never expose to client. |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification | From Stripe dashboard → Webhooks → your endpoint → Signing secret. Required for `constructEvent()`. |
| `STRIPE_PRO_PRICE_ID` | Price ID for Pro plan Checkout | From Stripe dashboard. Used when creating Checkout Sessions for Pro upgrades. |
| `STRIPE_TEAM_PRICE_ID` | Price ID for Team plan Checkout | From Stripe dashboard. Used when creating Checkout Sessions for Team upgrades. |
| `SELF_HOSTED` | Bypass billing when `true` | Optional. Skips all Stripe logic and limits. |
| `INITIAL_ORG_NAME` | Name for the default org seeded on first boot | Used by migration script to create the seed Organization document. |

---

## Sources

- [stripe/stripe-node Releases](https://github.com/stripe/stripe-node/releases) — v21.0.1 confirmed latest; v17 breaking changes assessed (HIGH confidence)
- [stripe/stripe-node CHANGELOG.md](https://github.com/stripe/stripe-node/blob/master/CHANGELOG.md) — v17, v18, v21 breaking changes reviewed (HIGH confidence)
- [Migration guide for v18 — stripe/stripe-node Wiki](https://github.com/stripe/stripe-node/wiki/Migration-guide-for-v18) — API version 2025-03-31.basil breaking changes (HIGH confidence)
- [GeeksforGeeks — Stripe Webhook Using NextJS 13 App Router](https://www.geeksforgeeks.org/reactjs/how-to-add-stripe-webhook-using-nextjs-13-app-router/) — `req.text()` webhook pattern confirmed (MEDIUM confidence — community article, cross-checked with Next.js discussion)
- [vercel/next.js Discussion #48885](https://github.com/vercel/next.js/discussions/48885) — `req.text()` vs `req.json()` for Stripe webhooks in App Router (HIGH confidence — official GitHub discussion)
- [Stripe Docs — Remove redirectToCheckout](https://docs.stripe.com/changelog/clover/2025-09-30/remove-redirect-to-checkout) — Confirms `redirectToCheckout` deprecated; server-side `session.url` redirect is current pattern (HIGH confidence)
- [npm: rate-limiter-flexible](https://www.npmjs.com/package/rate-limiter-flexible) — v10.0.1 latest (March 2026), ~1.4M weekly downloads (HIGH confidence)
- [rate-limiter-flexible Wiki — Mongo](https://github.com/animir/node-rate-limiter-flexible/wiki/Mongo) — `RateLimiterMongo` with mongoose connection pattern confirmed (HIGH confidence)
- [NextAuth.js v4 — Callbacks](https://next-auth.js.org/configuration/callbacks#jwt-callback) — JWT + session callback extension for custom claims (HIGH confidence)
- [Stripe Docs — Build a Stripe-hosted checkout page](https://docs.stripe.com/checkout/quickstart) — Current Checkout Session creation pattern (HIGH confidence)

---

*Stack research for: ATUI Tokens Manager v1.6 — Multi-Tenant SaaS Billing*
*Researched: 2026-03-30*
