# Architecture Research

**Domain:** Multi-tenant SaaS billing integration — ATUI Tokens Manager v1.6
**Researched:** 2026-03-30
**Confidence:** HIGH for org model + scoping patterns; HIGH for Stripe webhook handling; HIGH for billing service isolation; MEDIUM for in-process rate limiting (no Redis dependency, trade-off acknowledged)

---

## Context: What This Research Covers

This is a SUBSEQUENT MILESTONE architecture document. The existing Next.js 13.5.6 + Mongoose + NextAuth v4 + JWT stack is locked. This document covers only the NEW structural decisions required for v1.6: Organization model, multi-tenant data scoping, `src/lib/billing/` isolation boundary, usage tracking, Stripe integration, and rate limiting.

**Key constraint:** ALL Stripe and billing logic lives in `src/lib/billing/`. No payment code in `src/app/api/` route handlers directly. Route handlers call billing service functions and act on return values only.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Next.js App Router                          │
│                                                                      │
│  src/app/api/                                                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────┐  │
│  │ collections/ │ │  build-     │ │   export/    │ │ billing/  │  │
│  │  [id]/...   │ │  tokens/    │ │ github|figma │ │ checkout  │  │
│  │             │ │             │ │              │ │ portal    │  │
│  │  (modified) │ │  (modified) │ │  (modified)  │ │ webhooks  │  │
│  └──────┬──────┘ └──────┬──────┘ └──────┬───────┘ └─────┬─────┘  │
│         │               │               │                │         │
├─────────┴───────────────┴───────────────┴────────────────┴─────────┤
│                     Limit Check Layer (NEW)                          │
│         src/lib/billing/limits.ts — checkLimit(org, action)         │
├─────────────────────────────────────────────────────────────────────┤
│                     src/lib/billing/ (NEW — isolated)                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  │
│  │  stripe.ts  │ │ checkout.ts │ │  webhooks/  │ │  usage.ts   │  │
│  │ (singleton) │ │             │ │  handlers/  │ │             │  │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘  │
│  ┌─────────────┐ ┌─────────────┐ ┌───────────────┐                 │
│  │  limits.ts  │ │  tiers.ts   │ │ rate-limit.ts │                 │
│  │             │ │  (LIMITS    │ │               │                 │
│  │             │ │  config)    │ │               │                 │
│  └─────────────┘ └─────────────┘ └───────────────┘                 │
├─────────────────────────────────────────────────────────────────────┤
│                     src/lib/auth/ (existing, modified)               │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  require-auth.ts (extended with org lookup)                │     │
│  │  nextauth.config.ts (organizationId injected into JWT)     │     │
│  └────────────────────────────────────────────────────────────┘     │
├─────────────────────────────────────────────────────────────────────┤
│                     src/lib/db/models/ (modified + new)              │
│  ┌──────────┐ ┌──────────────┐ ┌────────────┐ ┌───────────────┐   │
│  │  User.ts │ │TokenCollect. │ │Organizati- │ │CollectionPerm │   │
│  │ +orgId   │ │  +orgId      │ │  on.ts     │ │   (existing)  │   │
│  │(modified)│ │ (modified)   │ │  (NEW)     │ │               │   │
│  └──────────┘ └──────────────┘ └────────────┘ └───────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│                         MongoDB                                      │
│  ┌────────────┐ ┌────────────┐ ┌───────────────┐                   │
│  │organizations│ │  users     │ │tokencollections│                  │
│  └────────────┘ └────────────┘ └───────────────┘                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Organization Model Design

### IOrganization Schema (NEW)

```typescript
// src/lib/db/models/Organization.ts

export type Plan = 'free' | 'pro' | 'team';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing' | 'none';

export interface IOrganization {
  _id: string;
  name: string;
  plan: Plan;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: SubscriptionStatus;
  // Usage tracking
  exportsThisMonth: number;
  tokenCount: number;
  usageResetAt: Date;          // When exportsThisMonth was last zeroed
  // Seat tracking (Team plan)
  seatCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}
```

**Rationale for embedded usage fields:** Token counts and export counts are read on every API request that might hit a limit. Embedding them in the Organization document means a single `Organization.findById()` call provides everything needed. A separate UsageEvent collection would require an aggregate query on every request — unnecessary for this scale.

**Monthly reset strategy:** Lazy reset. When `usageResetAt` is older than 30 days (not the calendar month start), the billing service resets `exportsThisMonth = 0` and updates `usageResetAt` at the time of first export in the new period. This avoids a cron dependency while still being accurate enough for flat-subscription enforcement.

### organizationId Propagation

**User model modification (MODIFIED — not replaced):**

```typescript
// Add to existing IUser interface:
organizationId: string;  // required, references Organization._id

// Add to existing userSchema:
organizationId: { type: String, required: true, index: true }
```

**TokenCollection model modification (MODIFIED — not replaced):**

```typescript
// Add to existing ITokenCollection interface:
organizationId: string;  // required, references Organization._id

// Add to existing tokenCollectionSchema:
organizationId: { type: String, required: true, index: true }
```

**Migration strategy (TENANT-03):** On first boot, a bootstrap function (following the pattern of `collection-bootstrap.ts`) reads `INITIAL_ORG_NAME` env var, creates one Organization document if none exist, then patches all existing Users and TokenCollections with that org's `_id`. Idempotent — runs on every boot but no-ops if an org already exists. This follows the existing `bootstrapCollectionGrants()` precedent exactly.

### JWT Session Extension

```typescript
// In nextauth.config.ts jwt callback — add organizationId to token:
token.organizationId = user.organizationId;

// In session callback — expose to session:
session.user.organizationId = token.organizationId;
```

`next-auth.d.ts` must be extended to declare `organizationId` on both `JWT` and `Session['user']`. This is the established pattern already used for `id` and `role`.

**Why put organizationId in the JWT:** The session is already the boundary where auth state is propagated. Adding `organizationId` here means every route handler has immediate access via `session.user.organizationId` after `requireRole()` — no extra DB call needed for the org ID itself.

---

## Billing Service Isolation Pattern

### Module Boundary: `src/lib/billing/`

This directory is the only place Stripe SDK code may live. Route handlers import from `src/lib/billing/` and receive plain results. They never import `stripe` directly.

```
src/lib/billing/
├── stripe.ts              # Stripe singleton — import stripe from './stripe'
├── tiers.ts               # LIMITS config, plan definitions
├── limits.ts              # checkLimit(), checkIntegrationAccess(), isSelfHosted()
├── rate-limit.ts          # checkRateLimit() — in-process fixed window
├── usage.ts               # incrementExports(), refreshTokenCount(), lazyResetIfDue()
├── checkout.ts            # createCheckoutSession(), createBillingPortalSession()
├── index.ts               # barrel export
└── webhooks/
    ├── index.ts           # constructStripeEvent() wrapper — raw body required
    ├── checkout-completed.ts
    ├── invoice-payment-failed.ts
    └── subscription-deleted.ts
```

### stripe.ts — Singleton Pattern

```typescript
// src/lib/billing/stripe.ts
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

export default stripe;
```

The singleton throws at module load time if the key is missing. In self-hosted mode (`SELF_HOSTED=true`), route handlers check `isSelfHosted()` before reaching any billing call, so this module is never imported in that mode.

### tiers.ts — LIMITS Config (BILLING-01)

```typescript
// src/lib/billing/tiers.ts

export type Plan = 'free' | 'pro' | 'team';

export interface TierLimits {
  maxCollections: number;
  maxTokens: number;
  maxThemesPerCollection: number;
  maxExportsPerMonth: number;
  maxExportSizeKb: number;
  integrationsEnabled: boolean;
  maxSeats: number;
}

export const LIMITS: Record<Plan, TierLimits> = {
  free: {
    maxCollections: 1,
    maxTokens: 500,
    maxThemesPerCollection: 1,
    maxExportsPerMonth: 10,
    maxExportSizeKb: 100,
    integrationsEnabled: false,
    maxSeats: 1,
  },
  pro: {
    maxCollections: 10,
    maxTokens: 5000,
    maxThemesPerCollection: 5,
    maxExportsPerMonth: 100,
    maxExportSizeKb: Infinity,
    integrationsEnabled: true,
    maxSeats: 1,
  },
  team: {
    maxCollections: 10,
    maxTokens: 5000,
    maxThemesPerCollection: 5,
    maxExportsPerMonth: 100,
    maxExportSizeKb: Infinity,
    integrationsEnabled: true,
    maxSeats: 10,
  },
};

export const STRIPE_PRICE_IDS: Record<'pro' | 'team', string> = {
  pro:  process.env.STRIPE_PRICE_ID_PRO  ?? '',
  team: process.env.STRIPE_PRICE_ID_TEAM ?? '',
};
```

All limits are in one place. When a tier changes, only `LIMITS` changes — not route handlers.

### limits.ts — Limit Check Functions

```typescript
// src/lib/billing/limits.ts
import type { IOrganization } from '@/lib/db/models/Organization';
import { LIMITS } from './tiers';

export type LimitCheckResult =
  | { allowed: true }
  | { allowed: false; reason: string; upgradeRequired: true };

export function checkCollectionLimit(org: IOrganization, currentCount: number): LimitCheckResult {
  if (isSelfHosted()) return { allowed: true };
  const limit = LIMITS[org.plan].maxCollections;
  if (currentCount >= limit) {
    return { allowed: false, reason: `Plan allows ${limit} collection(s).`, upgradeRequired: true };
  }
  return { allowed: true };
}

export function checkTokenLimit(org: IOrganization, currentCount: number): LimitCheckResult { ... }
export function checkThemeLimit(org: IOrganization, currentCount: number): LimitCheckResult { ... }
export function checkExportLimit(org: IOrganization): LimitCheckResult { ... }
export function checkExportSizeLimit(org: IOrganization, sizeKb: number): LimitCheckResult { ... }
export function checkIntegrationAccess(org: IOrganization): LimitCheckResult { ... }

export function isSelfHosted(): boolean {
  return process.env.SELF_HOSTED === 'true';
}
```

**How route handlers use this:**

```typescript
// POST /api/collections/route.ts — CREATE collection example:
const authResult = await requireRole(Action.CreateCollection);
if (authResult instanceof NextResponse) return authResult;

const org = await Organization.findById(authResult.user.organizationId).lean();
const collections = await repo.listByOrg(authResult.user.organizationId);
const limitResult = checkCollectionLimit(org, collections.length);
if (!limitResult.allowed) {
  return NextResponse.json(
    { error: limitResult.reason, upgradeRequired: true },
    { status: 402 }
  );
}
// ... proceed with collection creation
```

HTTP 402 signals the client to show the upgrade modal. The `upgradeRequired: true` field in the body distinguishes this from other 4xx errors.

---

## Where Limits Are Checked: Service vs Route vs Middleware

**Decision: limits are checked in route handlers, not middleware.**

| Approach | Why Not |
|----------|---------|
| Next.js `middleware.ts` (Edge runtime) | Edge runtime cannot use Mongoose. `Organization.findById()` is a Node.js call. Additionally, `config.matcher` already excludes `api/` from middleware — adding billing enforcement there would require restructuring the existing auth separation. |
| Generic middleware function wrapping all routes | Limits are per-action (collection count, token count, export count), not per-path. A generic wrapper cannot determine which limit to enforce without action context. |
| Business logic service that calls route concerns | Violates the isolation boundary — billing service must not know about HTTP or routing. |

**Correct pattern:** Route handler is responsible for:
1. Auth check (`requireRole`)
2. Load org from `session.user.organizationId`
3. Call `checkXxxLimit(org, ...)` from `src/lib/billing/limits.ts`
4. Return 402 if blocked
5. Proceed with business logic if allowed
6. Call usage update after success

This keeps billing isolation intact: the billing module provides pure check functions and side-effecting usage mutations, but has no knowledge of HTTP.

---

## Stripe Webhook Handler Security

### Route: `POST /api/billing/webhooks/route.ts`

The webhook handler is the one place where raw body access is mandatory. Next.js 13 App Router uses the Web API `Request` object — the body is a readable stream consumed once.

```typescript
// src/app/api/billing/webhooks/route.ts
import { headers } from 'next/headers';
import { constructStripeEvent } from '@/lib/billing/webhooks';
import {
  handleCheckoutCompleted,
  handleInvoicePaymentFailed,
  handleSubscriptionDeleted,
} from '@/lib/billing/webhooks';

export async function POST(req: Request): Promise<Response> {
  const body = await req.text();            // raw string — NOT req.json()
  const sig  = headers().get('stripe-signature') ?? '';

  const event = constructStripeEvent(body, sig);
  if (!event) {
    return new Response('Webhook signature verification failed', { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object);
      break;
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;
    // Unknown events: return 200 — Stripe retries on non-2xx
  }

  return new Response('ok', { status: 200 });
}
```

```typescript
// src/lib/billing/webhooks/index.ts
import stripe from '../stripe';
import type Stripe from 'stripe';

export function constructStripeEvent(
  rawBody: string,
  sig: string
): Stripe.Event | null {
  try {
    return stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return null;
  }
}
```

**Critical constraint:** `req.text()` must be called before any other body access. Using `req.json()` consumes the stream; re-serializing the parsed object changes whitespace and breaks the Stripe HMAC signature match.

**Do not call `requireAuth()`** on the webhook route. Stripe signs the payload — the signature check is the authentication mechanism. The endpoint is intentionally unauthenticated to HTTP session auth.

### Webhook Handlers

```typescript
// src/lib/billing/webhooks/checkout-completed.ts
export async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const organizationId = session.metadata?.organizationId;
  if (!organizationId) return;
  await Organization.findByIdAndUpdate(organizationId, {
    stripeCustomerId: session.customer as string,
    stripeSubscriptionId: session.subscription as string,
    plan: session.metadata?.plan ?? 'pro',
    subscriptionStatus: 'active',
  });
}

// src/lib/billing/webhooks/invoice-payment-failed.ts
export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  await Organization.findOneAndUpdate(
    { stripeCustomerId: customerId },
    { subscriptionStatus: 'past_due' }
  );
}

// src/lib/billing/webhooks/subscription-deleted.ts
export async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  await Organization.findOneAndUpdate(
    { stripeCustomerId: customerId },
    { plan: 'free', subscriptionStatus: 'canceled', stripeSubscriptionId: null }
  );
}
```

**organizationId in Stripe metadata:** Embed `organizationId` and `plan` when creating the checkout session. This is the only reliable bridge between Stripe's customer record and the app's Organization document across async webhook delivery — no session state is available in webhook context.

---

## Usage Tracking Architecture

### usage.ts

```typescript
// src/lib/billing/usage.ts
import Organization from '@/lib/db/models/Organization';
import type { IOrganization } from '@/lib/db/models/Organization';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function lazyResetIfDue(org: IOrganization): Promise<IOrganization> {
  if (Date.now() - org.usageResetAt.getTime() > THIRTY_DAYS_MS) {
    return Organization.findByIdAndUpdate(
      org._id,
      { exportsThisMonth: 0, usageResetAt: new Date() },
      { new: true }
    ).lean() as Promise<IOrganization>;
  }
  return org;
}

export async function incrementExports(orgId: string): Promise<void> {
  await Organization.findByIdAndUpdate(orgId, { $inc: { exportsThisMonth: 1 } });
}

export async function refreshTokenCount(orgId: string, count: number): Promise<void> {
  await Organization.findByIdAndUpdate(orgId, { tokenCount: count });
}
```

**Token count tracking:** `tokenCount` in Organization is updated whenever tokens are saved to a collection. The route handler for `PUT /api/collections/[id]` calculates the token count after save and calls `refreshTokenCount`. Counting at write time avoids an aggregate query at check time.

**Export count:** Incremented atomically with `$inc` after a successful export. The check happens before the export using the current `org.exportsThisMonth` value. Minor race at concurrent requests — acceptable for flat-subscription enforcement at this scale.

---

## Rate Limiting Architecture

### Placement: In-Process Map in `src/lib/billing/rate-limit.ts`

**Decision: in-process Map-based rate limiter, not Redis, not middleware.**

| Option | Assessment |
|--------|------------|
| Next.js `middleware.ts` (Edge) | Excluded from `api/` in `config.matcher`. Restructuring the matcher to include api/ risks breaking the existing auth separation pattern. |
| Upstash Redis + `@upstash/ratelimit` | Correct for serverless/multi-instance. Adds external dependency and Redis infrastructure cost — overkill for a single-instance self-hosted tool. |
| In-process Map with fixed window | Zero dependencies. Works for single-process Node.js. Resets on server restart (acceptable — 60 req/min window means worst case is a 60-second reset). Future-proof: replace the implementation without changing call sites. |

```typescript
// src/lib/billing/rate-limit.ts

interface BucketEntry { count: number; windowStart: number; }

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;
const buckets = new Map<string, BucketEntry>();

// Prune stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (now - entry.windowStart > WINDOW_MS * 2) buckets.delete(key);
  }
}, 5 * 60 * 1000);

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterMs: number };

export function checkRateLimit(userId: string): RateLimitResult {
  const now = Date.now();
  const entry = buckets.get(userId);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    buckets.set(userId, { count: 1, windowStart: now });
    return { allowed: true };
  }
  if (entry.count >= MAX_REQUESTS) {
    return { allowed: false, retryAfterMs: WINDOW_MS - (now - entry.windowStart) };
  }
  entry.count++;
  return { allowed: true };
}
```

**Usage in route handlers (RATE-01):**

```typescript
const rl = checkRateLimit(authResult.user.id);
if (!rl.allowed) {
  return NextResponse.json(
    { error: 'Rate limit exceeded. Try again shortly.' },
    { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } }
  );
}
```

**Affected routes:** `POST /api/build-tokens`, `POST /api/export/github`, `POST /api/export/figma`, `PUT /api/collections/[id]` (token save).

**Upgrade path:** If the app moves to multi-instance deployment, replace `checkRateLimit()` body with `@upstash/ratelimit` behind the same function signature. Call sites in route handlers do not change.

---

## Checkout and Billing Portal

### New API Routes

```
src/app/api/billing/
├── checkout/route.ts       # POST — creates Stripe Checkout session
├── portal/route.ts         # POST — creates Stripe billing portal session
└── webhooks/route.ts       # POST — receives Stripe events
```

### checkout.ts — Service Functions

```typescript
// src/lib/billing/checkout.ts
export async function createCheckoutSession(
  org: IOrganization,
  plan: 'pro' | 'team',
  returnUrl: string
) {
  return stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: STRIPE_PRICE_IDS[plan], quantity: 1 }],
    customer: org.stripeCustomerId ?? undefined,
    customer_creation: org.stripeCustomerId ? undefined : 'always',
    success_url: `${returnUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${returnUrl}/billing/cancel`,
    metadata: {
      organizationId: org._id.toString(),
      plan,
    },
  });
}

export async function createBillingPortalSession(
  org: IOrganization,
  returnUrl: string
) {
  if (!org.stripeCustomerId) throw new Error('No Stripe customer — cannot open portal');
  return stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: returnUrl,
  });
}
```

---

## Data Flow

### Collection Creation with Limit Check

```
Client POST /api/collections
    ↓
requireRole(CreateCollection)         →  401/403 if unauthorized
    ↓
Organization.findById(session.user.organizationId)
    ↓
lazyResetIfDue(org)                   →  reset exportsThisMonth if > 30 days
    ↓
repo.listByOrg(orgId).length
    ↓
checkCollectionLimit(org, count)      →  402 { upgradeRequired: true } if at limit
    ↓
repo.create({ ...data, organizationId })
    ↓
200 OK
```

### Export with Rate Limit + Usage Limit Check

```
Client POST /api/build-tokens
    ↓
requireRole(Write)                    →  401/403 if unauthorized
    ↓
checkRateLimit(session.user.id)       →  429 if > 60 req/min
    ↓
Organization.findById(organizationId)
    ↓
lazyResetIfDue(org)
    ↓
checkExportLimit(org)                 →  402 if exportsThisMonth >= limit
    ↓
buildTokens(...)                      →  ZIP buffer
    ↓
checkExportSizeLimit(org, sizeKb)     →  402 if over size limit (Free tier)
    ↓
incrementExports(orgId)               →  $inc exportsThisMonth
    ↓
200 OK + ZIP
```

### Stripe Webhook Flow

```
Stripe POST /api/billing/webhooks
    ↓
req.text()                            →  raw body string (never req.json())
    ↓
headers().get('stripe-signature')
    ↓
constructStripeEvent(body, sig)       →  400 if HMAC signature invalid
    ↓
switch event.type
    ├── checkout.session.completed    →  handleCheckoutCompleted()
    │                                    update org: plan, stripeCustomerId,
    │                                    subscriptionId, subscriptionStatus
    ├── invoice.payment_failed        →  handleInvoicePaymentFailed()
    │                                    update org: subscriptionStatus = 'past_due'
    └── customer.subscription.deleted →  handleSubscriptionDeleted()
                                         update org: plan = 'free', status = 'canceled'
    ↓
200 'ok'
```

### Self-Serve Org Signup Flow

```
New user registers at POST /api/auth/signup
    ↓
Create Organization { name, plan: 'free' }
    ↓
Create User { organizationId: org._id, role: 'Admin', status: 'active' }
    ↓
Sign in → JWT contains { id, role, organizationId }
    ↓
All subsequent requests scope to organizationId from session
```

---

## Recommended Project Structure (New + Modified Files)

```
src/
├── lib/
│   ├── billing/                         # NEW — complete billing isolation boundary
│   │   ├── stripe.ts                    # NEW — Stripe SDK singleton
│   │   ├── tiers.ts                     # NEW — LIMITS config, Plan + TierLimits types
│   │   ├── limits.ts                    # NEW — pure check functions, isSelfHosted()
│   │   ├── rate-limit.ts                # NEW — in-process fixed window rate limiter
│   │   ├── usage.ts                     # NEW — incrementExports, refreshTokenCount, lazyResetIfDue
│   │   ├── checkout.ts                  # NEW — createCheckoutSession, createBillingPortalSession
│   │   ├── index.ts                     # NEW — barrel export
│   │   └── webhooks/
│   │       ├── index.ts                 # NEW — constructStripeEvent wrapper
│   │       ├── checkout-completed.ts    # NEW
│   │       ├── invoice-payment-failed.ts # NEW
│   │       └── subscription-deleted.ts  # NEW
│   ├── db/models/
│   │   ├── Organization.ts              # NEW — org document, plan, Stripe IDs, usage fields
│   │   ├── User.ts                      # MODIFIED — add organizationId field
│   │   └── TokenCollection.ts           # MODIFIED — add organizationId field
│   └── auth/
│       ├── nextauth.config.ts           # MODIFIED — inject organizationId into JWT + session
│       └── require-auth.ts              # MODIFIED — add org load helper (optional)
├── app/api/
│   ├── billing/                         # NEW — thin route handlers only
│   │   ├── checkout/route.ts            # NEW — calls createCheckoutSession()
│   │   ├── portal/route.ts              # NEW — calls createBillingPortalSession()
│   │   └── webhooks/route.ts            # NEW — raw body + constructStripeEvent + dispatch
│   ├── auth/
│   │   └── signup/route.ts              # NEW — creates Org + User atomically
│   ├── collections/route.ts             # MODIFIED — org scoping + collection limit check
│   ├── collections/[id]/route.ts        # MODIFIED — org scoping + token count refresh on PUT
│   ├── collections/[id]/themes/route.ts # MODIFIED — theme limit check on POST
│   ├── build-tokens/route.ts            # MODIFIED — rate limit + export limit + size limit
│   ├── export/github/route.ts           # MODIFIED — rate limit + integration check
│   └── export/figma/route.ts            # MODIFIED — rate limit + integration check
└── types/
    └── next-auth.d.ts                   # MODIFIED — declare organizationId on JWT + Session['user']
```

---

## Component Responsibilities

| Component | Responsibility | Status |
|-----------|---------------|--------|
| `Organization` model | Owns plan, Stripe IDs, usage counters, seat count | NEW |
| `src/lib/billing/tiers.ts` | Single source of truth for all tier limits; only file changed when tiers change | NEW |
| `src/lib/billing/limits.ts` | Pure check functions — no DB calls, no Stripe calls, no HTTP | NEW |
| `src/lib/billing/rate-limit.ts` | In-process fixed window per user ID; isolated behind function boundary | NEW |
| `src/lib/billing/usage.ts` | Sole writer of org usage counters; lazy reset logic | NEW |
| `src/lib/billing/checkout.ts` | Creates Stripe session objects; only Stripe write operations | NEW |
| `src/lib/billing/webhooks/` | Handles Stripe async events; updates org document from event payloads | NEW |
| Route handlers | Auth → rate limit → org load → limit check → business logic → usage update | MODIFIED |
| `nextauth.config.ts` | Injects `organizationId` into JWT at sign-in; re-fetches if stale (follow existing role re-fetch pattern) | MODIFIED |
| Migration bootstrap | Creates seed org from `INITIAL_ORG_NAME`, patches existing users + collections; idempotent | NEW |

---

## Build Order (Phase Dependencies)

The following dependency order must be respected:

1. **Organization model** — everything else depends on org documents existing
2. **Migration bootstrap** — patches existing users + collections before any request tries to read `organizationId`
3. **LIMITS config (`tiers.ts`) + check functions (`limits.ts`)** — no deps; pure config; can be built early
4. **User + TokenCollection schema modifications** — adds `organizationId` field
5. **`nextauth.config.ts` + `next-auth.d.ts`** — injects `organizationId` into session
6. **Self-serve signup route** — depends on Organization model + updated User model
7. **Stripe singleton + checkout + webhooks** — depends on Organization model
8. **Rate limiter** — depends only on session (step 5); no other deps
9. **Route handler modifications** — depends on all of the above (steps 1-8)

**Do not build webhook handlers before the Organization model.** Handlers write to org documents; the model must exist and be migrated first.

---

## Scaling Considerations

| Scale | Architecture |
|-------|-------------|
| Current (single org / small team) | Embedded usage in org document; in-process rate limiter; no caching needed |
| Small SaaS (< 100 orgs) | Same architecture holds; in-process rate limiter valid for single-instance deployment |
| Medium SaaS (100–10k orgs) | Replace in-process rate limiter with `@upstash/ratelimit`; MongoDB indexes on `organizationId` already specified in schemas |
| Large SaaS (10k+ orgs) | Move usage tracking to a separate events collection with time-series aggregation; consider read replicas for hot org documents |

**First bottleneck:** The in-process rate limiter does not survive process restart and is not shared across multiple Node.js instances. If the app moves to multi-instance deployment, replace the `checkRateLimit()` body with a Redis-backed implementation. Call sites at route handlers do not change.

---

## Anti-Patterns

### Anti-Pattern 1: Billing Logic in Route Handlers

**What people do:** Import `stripe` directly in route files, write limit checks inline, update org state inline.

**Why it's wrong:** Billing logic scatters across 10+ route files. Tier limit changes require hunting every route. Webhook handlers cannot share logic with route-level enforcement. Violates BILLING-07.

**Do this instead:** All Stripe imports and limit enforcement go in `src/lib/billing/`. Route handlers call service functions and act on typed results.

### Anti-Pattern 2: organizationId as Mongoose ObjectId with populate()

**What people do:** Define `organizationId` as `Schema.Types.ObjectId` with `ref: 'Organization'` and call `.populate('organizationId')`.

**Why it's wrong:** The existing codebase uses plain string IDs for cross-document references (`userId`, `collectionId`, `createdBy`). Introducing `.populate()` on the hot path (every API request) adds query complexity inconsistent with the established pattern.

**Do this instead:** `organizationId: { type: String, required: true, index: true }` — consistent with every other cross-document reference in the codebase.

### Anti-Pattern 3: req.json() in Webhook Handler

**What people do:** `const body = await req.json()` then pass `JSON.stringify(body)` to `stripe.webhooks.constructEvent()`.

**Why it's wrong:** Stripe's HMAC signature is computed over the original raw byte sequence. Re-serializing from a parsed object changes whitespace and key ordering, making it impossible to reproduce the original signature.

**Do this instead:** `const body = await req.text()` — read the stream once, pass the string directly to `constructStripeEvent()`.

### Anti-Pattern 4: Storing Tier Limits in the Organization Document

**What people do:** Copy `maxCollections`, `maxTokens`, etc. onto the org document at signup time.

**Why it's wrong:** When limits change for a tier, every org document must be migrated. Stale limit values on documents conflict with the intended tier config.

**Do this instead:** Store only `plan: 'free' | 'pro' | 'team'` on the org. Look up limits at check time from `LIMITS[org.plan]` in `tiers.ts`. The config is the single source of truth.

### Anti-Pattern 5: Limit Checks in Next.js Middleware

**What people do:** Move billing limit enforcement to `src/middleware.ts` to intercept all API calls centrally.

**Why it's wrong:** Next.js middleware runs on the Edge runtime, which does not support Mongoose (Node.js runtime). The existing `config.matcher` already excludes `api/` routes from middleware intentionally. Adding billing checks there would require restructuring the auth middleware pattern that currently works correctly.

**Do this instead:** Keep limit checks in route handlers, called after `requireAuth()` returns a valid session.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Stripe Checkout | Server-only SDK call in `src/lib/billing/checkout.ts` | Never import Stripe SDK in client components. `STRIPE_SECRET_KEY` env var. |
| Stripe Billing Portal | Same service module as checkout | Requires existing `stripeCustomerId` on org — only available after first subscription. |
| Stripe Webhooks | `POST /api/billing/webhooks` — raw body via `req.text()` | `STRIPE_WEBHOOK_SECRET` is a separate env var from `STRIPE_SECRET_KEY`. Register endpoint in Stripe dashboard. |
| MongoDB / Mongoose | Organization model added to existing connection | Follows hot-reload guard: `mongoose.models.Organization \|\| mongoose.model(...)`. |

### Internal Boundaries

| Boundary | Communication | Rule |
|----------|---------------|------|
| `src/lib/billing/` → route handlers | Typed return values (`LimitCheckResult`, `RateLimitResult`, Stripe objects) | Billing module never imports from `src/app/` |
| Route handlers → `src/lib/billing/` | Direct function calls | Routes call billing; billing does not call routes |
| `Organization` ↔ `User` / `TokenCollection` | `organizationId` string field (not ObjectId ref) | Matches existing `userId` / `collectionId` string-key pattern |
| JWT session → route handlers | `session.user.organizationId` (string) | Injected at sign-in; follow existing role re-fetch pattern for staleness |
| Webhook route → webhook handlers | Function calls with typed Stripe event objects | Raw body stays in route handler; parsed event passed to handlers |

---

## Sources

- [Stripe Webhook Signature Verification — Official Docs](https://docs.stripe.com/webhooks/signature) — HIGH confidence
- [Receive Stripe Events — Official Docs](https://docs.stripe.com/webhooks) — HIGH confidence
- [Next.js App Router + Stripe Webhook Signature Verification](https://kitson-broadhurst.medium.com/next-js-app-router-stripe-webhook-signature-verification-ea9d59f3593f) — MEDIUM confidence (community; aligns with official docs pattern)
- [Next.js 13 App Router: Fix Stripe Webhook Signature Verification Failure](https://openillumi.com/en/en-nextjs13-stripe-webhook-signature-error-fix/) — MEDIUM confidence
- [Build a Multi-Tenant Architecture — MongoDB Official Docs](https://www.mongodb.com/docs/atlas/build-multi-tenant-arch/) — HIGH confidence
- [Upstash Rate Limiting for Next.js](https://upstash.com/blog/nextjs-ratelimiting) — MEDIUM confidence (vendor docs; alternative to chosen in-process approach, documented for upgrade path)
- [How to Build an In-Memory Rate Limiter in Next.js — freeCodeCamp](https://www.freecodecamp.org/news/how-to-build-an-in-memory-rate-limiter-in-nextjs/) — MEDIUM confidence

---

*Architecture research for: Multi-tenant SaaS billing integration — ATUI Tokens Manager v1.6*
*Researched: 2026-03-30*
