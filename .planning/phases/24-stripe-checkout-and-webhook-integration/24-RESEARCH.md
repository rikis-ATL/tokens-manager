# Phase 24: Stripe Checkout and Webhook Integration - Research

**Researched:** 2026-04-21
**Domain:** Stripe Checkout, Billing Portal, Webhooks, Next.js App Router, MongoDB idempotency
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Checkout Flow (STRIPE-01)**
- D-01: App-embedded Pattern A — no separate marketing website. UpgradeModal CTA (`data-testid="upgrade-cta"`) is enabled and navigates to `/upgrade`.
- D-02: `/upgrade` is a new in-app page showing Pro vs Team pricing cards side-by-side. Each card's "Choose Plan" button calls `POST /api/stripe/checkout` with the selected `priceId`. Returns `{ url }` — browser follows redirect to `checkout.stripe.com`.
- D-03: No tier pre-selection in UpgradeModal — modal CTA routes to `/upgrade`.

**Post-Checkout Flow**
- D-04: Dedicated `/upgrade/success` page as the Stripe `success_url`. Shows confirmation, calls `GET /api/org/usage` for new plan, auto-redirects to `/collections` after 3 seconds. `cancel_url` = `/upgrade`.
- D-05: Plan is NOT in JWT. Success page and usage badge re-fetch from `GET /api/org/usage`. No NextAuth session update needed.

**Billing Portal (STRIPE-02)**
- D-06: New `/account` page built in Phase 24 with a Billing section: current plan tier, "Manage subscription" button (Pro/Team), subscription status. Button calls `POST /api/stripe/portal` → redirects to `billing.stripe.com`.
- D-07: Free-tier users on `/account` see "Upgrade" link pointing to `/upgrade` instead of manage-subscription button.

**Webhook Handler (STRIPE-03)**
- D-08: Webhook route at `POST /api/stripe/webhook`. CRITICAL: must use `req.text()` (not `req.json()`) for Stripe HMAC signature verification.
- D-09: `ProcessedWebhookEvent` MongoDB collection for idempotency. Schema: `{ stripeEventId: string (unique index), processedAt: Date }`. Check before processing; skip + return 200 if already processed.
- D-10: Three event types handled:
  - `checkout.session.completed` → look up org by `stripeCustomerId`, update `org.planTier` from price ID, store `stripeSubscriptionId`
  - `customer.subscription.updated` → look up org by `stripeCustomerId`, re-map `planTier` from current price ID
  - `customer.subscription.deleted` → reset `org.planTier` to `'free'`, clear `stripeSubscriptionId`

**Org Model Extensions**
- D-11: Add `stripeCustomerId?: string` and `stripeSubscriptionId?: string` to Organization model.
- D-12: Price ID → tier mapping via env vars: `STRIPE_PRO_PRICE_ID` → `'pro'`, `STRIPE_TEAM_PRICE_ID` → `'team'`. Mapping function in `src/lib/billing/`.

**Established Pre-decisions (do not re-ask)**
- D-13: `stripe@^17.7.0` pinned — v18 introduces `2025-03-31.basil` API breaking changes.
- D-14: No `@stripe/stripe-js` or `@stripe/react-stripe-js` — server-side `session.url` redirect only.
- D-15: All Stripe SDK imports and billing logic stay in `src/lib/billing/` (BILLING-07).
- D-16: `SELF_HOSTED=true` bypass: skip checkout/portal session creation gracefully when self-hosted.

### Claude's Discretion
- Exact label on the UpgradeModal CTA button ("Upgrade to Pro" vs "View Plans")
- `/account` page layout and additional user profile fields beyond billing
- Loading and error states on the `/upgrade/success` page
- Whether `/upgrade` is accessible when already on Pro/Team (show "already on this plan" state or redirect to `/account`)

### Deferred Ideas (OUT OF SCOPE)
- Full user profile editing on `/account` (name, email, password) — future phase
- Team-tier seat management / inviting members from `/account` — future phase
- Trial period / free trial flow — not in scope for Phase 24
- Stripe metered billing / usage-based pricing — not in scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STRIPE-01 | Stripe Checkout session creation for plan upgrades | D-02 locked; `stripe.checkout.sessions.create()` with `mode: 'subscription'` documented below |
| STRIPE-02 | Billing portal session for subscription management | D-06 locked; `stripe.billingPortal.sessions.create()` documented below |
| STRIPE-03 | Webhook handler using `req.text()` with `ProcessedWebhookEvent` idempotency guard | D-08/D-09 locked; raw body + idempotency pattern documented below |
</phase_requirements>

---

## Summary

Phase 24 wires Stripe Checkout into the existing billing module built in Phase 23. The infrastructure (tiers, limit checks, UpgradeModal, 402 interceptor, org model) is already in place — this phase adds the payment flow on top of it.

The three deliverables are self-contained: (1) a checkout session API + `/upgrade` pricing page + `/upgrade/success` confirmation page; (2) a billing portal session API + `/account` page; (3) a webhook handler that keeps `org.planTier` in sync after Stripe events. The plan is NOT cached in the JWT (D-05), so no session refresh is needed — the success page simply re-fetches `GET /api/org/usage` which reads `planTier` live from MongoDB.

The most critical constraint is the webhook handler: it MUST read the raw request body via `req.text()` before calling `stripe.webhooks.constructEvent()`. Next.js App Router's `req.json()` consumes and parses the body stream, breaking the HMAC signature verification. This is a known sharp edge with App Router and is the top pitfall to guard in plan verification.

**Primary recommendation:** Build in three focused waves — (1) Org model extensions + Stripe singleton + price ID mapping, (2) checkout/portal API routes + `/upgrade` + `/account` pages, (3) webhook handler + `ProcessedWebhookEvent` model.

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 24 |
|-----------|-------------------|
| Package manager: always `yarn`, never `npm` | Install stripe with `yarn add stripe@^17.7.0` |
| `src/lib/billing/` isolation boundary (BILLING-07) | All Stripe SDK code, price ID mapping, and Stripe singleton go here |
| `SELF_HOSTED=true` bypass in all billing functions | Checkout and portal routes must short-circuit before any Stripe SDK call when self-hosted |
| `requireAuth()` → business logic → `NextResponse.json()` route pattern | All three new API routes (`/api/stripe/checkout`, `/api/stripe/portal`, `/api/stripe/webhook`) follow this pattern |
| Mongoose model guard: `(mongoose.models.X as Model<XDoc>) \|\| mongoose.model<XDoc>('X', schema)` | Required for `ProcessedWebhookEvent` model to survive Next.js hot reload |
| SOLID / separation of concerns | Price ID → tier mapping is a standalone function in `src/lib/billing/`, not inlined in the webhook handler |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| stripe | 17.7.0 (pinned, D-13) | Server-side Stripe SDK | Only server SDK needed; v18 breaks API with `2025-03-31.basil` changes |

**stripe@17.7.0 verified as latest v17.x release** [VERIFIED: npm registry — `npm view stripe@17` shows 17.7.0 as most recent v17 tag]

**stripe is NOT currently installed** [VERIFIED: grep of package.json found no stripe dependency — must be added in Wave 0/Plan 01]

### No Client-Side Stripe Required

D-14 locks out `@stripe/stripe-js` and `@stripe/react-stripe-js`. The checkout flow uses server-side session creation and a browser redirect to `checkout.stripe.com` — no Stripe Elements, no client SDK.

### Installation

```bash
yarn add stripe@^17.7.0
```

### Supporting Libraries (already installed)

| Library | Purpose |
|---------|---------|
| mongoose (^9.2.2) | `ProcessedWebhookEvent` model; org model extension |
| next-auth (^4.24.13) | `requireAuth()` used in all new routes |
| next (13.5.9) | App Router `NextRequest` / `NextResponse` |

---

## Architecture Patterns

### Recommended New File Structure

```
src/
├── lib/
│   └── billing/
│       ├── stripe-client.ts          # Stripe singleton (lazy init, SELF_HOSTED guard)
│       ├── price-id-to-tier.ts       # STRIPE_PRO_PRICE_ID / STRIPE_TEAM_PRICE_ID → PlanTier
│       ├── tiers.ts                  # (existing — unchanged)
│       ├── index.ts                  # (extend barrel exports)
│       └── ...                       # (existing check functions — unchanged)
├── db/
│   └── models/
│       ├── Organization.ts           # extend: + stripeCustomerId, stripeSubscriptionId
│       └── ProcessedWebhookEvent.ts  # new: idempotency guard
├── app/
│   ├── upgrade/
│   │   ├── page.tsx                  # Pro vs Team pricing cards
│   │   └── success/
│   │       └── page.tsx              # Confirmation + auto-redirect
│   ├── account/
│   │   └── page.tsx                  # Current plan + Manage subscription / Upgrade link
│   └── api/
│       └── stripe/
│           ├── checkout/
│           │   └── route.ts          # POST — create Checkout session
│           ├── portal/
│           │   └── route.ts          # POST — create Billing Portal session
│           └── webhook/
│               └── route.ts          # POST — webhook handler (req.text() CRITICAL)
└── components/
    └── billing/
        ├── UpgradeModal.tsx           # (Phase 23 — enable CTA button, add router.push('/upgrade'))
        └── ...
```

### Pattern 1: Stripe Singleton (Lazy Init)

**What:** Single Stripe instance initialized once, guarded for SELF_HOSTED.
**When to use:** Import `getStripe()` at the top of any billing function that needs the SDK.

```typescript
// src/lib/billing/stripe-client.ts
// Source: Stripe Node.js SDK docs — singleton pattern
import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (process.env.SELF_HOSTED === 'true') {
    throw new Error('Stripe unavailable in self-hosted mode');
  }
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
    _stripe = new Stripe(key, { apiVersion: '2024-06-20' });
  }
  return _stripe;
}
```

[ASSUMED] The `apiVersion: '2024-06-20'` is the stable API version for stripe@17.x. Confirm against the Stripe changelog or stripe SDK TypeScript types before using.

### Pattern 2: Checkout Session Creation

**What:** Server-side POST route creates a Checkout session and returns `{ url }` to the client.
**When to use:** Called when the user clicks "Choose Plan" on `/upgrade`.

```typescript
// src/app/api/stripe/checkout/route.ts
// Source: [ASSUMED] Stripe Checkout docs pattern
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { getStripe } from '@/lib/billing/stripe-client';
import dbConnect from '@/lib/mongodb';
import Organization from '@/lib/db/models/Organization';

export async function POST(req: NextRequest) {
  if (process.env.SELF_HOSTED === 'true') {
    return NextResponse.json({ error: 'Checkout unavailable in self-hosted mode' }, { status: 400 });
  }

  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { priceId } = await req.json();
  if (!priceId) return NextResponse.json({ error: 'priceId required' }, { status: 400 });

  await dbConnect();
  const org = await Organization.findById(auth.user.organizationId).lean();
  if (!org) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    customer: org.stripeCustomerId ?? undefined,   // re-use if exists
    customer_email: org.stripeCustomerId ? undefined : auth.user.email ?? undefined,
    metadata: { organizationId: auth.user.organizationId! },
    success_url: `${process.env.NEXTAUTH_URL}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXTAUTH_URL}/upgrade`,
  });

  return NextResponse.json({ url: session.url });
}
```

Key params:
- `mode: 'subscription'` — required for recurring plans [ASSUMED: standard Stripe Checkout param]
- `customer` — pass existing `stripeCustomerId` to avoid creating a duplicate Stripe customer [ASSUMED]
- `metadata.organizationId` — stored on the session; readable in `checkout.session.completed` webhook event [ASSUMED]
- `success_url` includes `{CHECKOUT_SESSION_ID}` template var which Stripe fills in [ASSUMED]
- `NEXTAUTH_URL` is already in env (used by next-auth) [VERIFIED: existing codebase uses it]

### Pattern 3: Billing Portal Session Creation

**What:** Server-side POST route creates a Stripe Billing Portal session for subscription management.
**When to use:** Called when Pro/Team user clicks "Manage subscription" on `/account`.

```typescript
// src/app/api/stripe/portal/route.ts
// Source: [ASSUMED] Stripe Billing Portal docs pattern
export async function POST(req: NextRequest) {
  if (process.env.SELF_HOSTED === 'true') {
    return NextResponse.json({ error: 'Portal unavailable in self-hosted mode' }, { status: 400 });
  }

  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  await dbConnect();
  const org = await Organization.findById(auth.user.organizationId)
    .select('stripeCustomerId planTier')
    .lean();

  if (!org?.stripeCustomerId) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 400 });
  }

  const stripe = getStripe();
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${process.env.NEXTAUTH_URL}/account`,
  });

  return NextResponse.json({ url: portalSession.url });
}
```

[ASSUMED] Billing portal must be configured in the Stripe Dashboard (customer portal settings) before `billingPortal.sessions.create` will work. This is an ops prerequisite, not a code step.

### Pattern 4: Webhook Handler — CRITICAL req.text()

**What:** Stripe sends POST events to this route. Must read raw body for HMAC verification.
**When to use:** This is the ONLY pattern — never use `req.json()` for Stripe webhooks.

```typescript
// src/app/api/stripe/webhook/route.ts
// CRITICAL: req.text() preserves raw bytes for stripe.webhooks.constructEvent()
// Source: [ASSUMED] Stripe Next.js webhook docs
import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/billing/stripe-client';
import { handleWebhookEvent } from '@/lib/billing/webhook-handler';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();                             // CRITICAL — not req.json()
  const sig = req.headers.get('stripe-signature');

  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 });

  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  await handleWebhookEvent(event);
  return NextResponse.json({ received: true });
}

// CRITICAL: Disable Next.js body parsing — must be disabled for webhook routes
export const config = {
  api: {
    bodyParser: false,
  },
};
```

**IMPORTANT: App Router note.** In Next.js 13+ App Router, body parsing config (`export const config = { api: { bodyParser: false } }`) applies to Pages Router only. In App Router, `req.text()` directly reads the raw body stream — no config needed. [ASSUMED: based on Next.js App Router docs behavior; verify if the project uses hybrid routing]

Given this project uses App Router (confirmed from codebase), `req.text()` is the correct and sufficient pattern. No additional `export const config` is needed.

### Pattern 5: ProcessedWebhookEvent Idempotency Model

**What:** MongoDB document storing processed Stripe event IDs to prevent duplicate handling.
**When to use:** Every webhook event is checked against this collection before processing.

```typescript
// src/lib/db/models/ProcessedWebhookEvent.ts
import mongoose, { Schema, Model } from 'mongoose';

interface IProcessedWebhookEvent {
  stripeEventId: string;
  processedAt: Date;
}

const schema = new Schema<IProcessedWebhookEvent>({
  stripeEventId: { type: String, required: true, unique: true },
  processedAt: {
    type: Date,
    default: () => new Date(),
    expires: 60 * 60 * 24 * 90,   // TTL: 90 days (Claude's discretion per CONTEXT.md specifics)
  },
});

const ProcessedWebhookEvent: Model<IProcessedWebhookEvent> =
  (mongoose.models.ProcessedWebhookEvent as Model<IProcessedWebhookEvent>) ||
  mongoose.model<IProcessedWebhookEvent>('ProcessedWebhookEvent', schema);

export default ProcessedWebhookEvent;
```

Idempotency check pattern:

```typescript
// In webhook handler, before processing:
const existing = await ProcessedWebhookEvent.findOne({ stripeEventId: event.id });
if (existing) {
  return NextResponse.json({ received: true });  // Already processed — return 200
}
// ... process event ...
await ProcessedWebhookEvent.create({ stripeEventId: event.id });
```

[ASSUMED] The TTL index uses the `expires` shorthand on the Date field — this is the Mongoose TTL index shorthand equivalent to `{ expireAfterSeconds: N }` at schema level.

### Pattern 6: Price ID → Tier Mapping

**What:** Pure function that maps Stripe price IDs (from env vars) to PlanTier strings.
**When to use:** Called in the webhook handler and checkout route to determine the correct tier.

```typescript
// src/lib/billing/price-id-to-tier.ts
import type { PlanTier } from './tiers';

export function priceIdToTier(priceId: string): PlanTier | null {
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return 'pro';
  if (priceId === process.env.STRIPE_TEAM_PRICE_ID) return 'team';
  return null;
}
```

### Pattern 7: Webhook Event Handlers

**What:** Three event type handlers called from the main webhook route.

```typescript
// checkout.session.completed:
// - event.data.object is a Stripe.Checkout.Session
// - session.customer = stripeCustomerId (string)
// - session.subscription = stripeSubscriptionId (string)
// - session.metadata.organizationId = org ID we embedded at session creation
// - get price ID from: session.line_items (requires expand) OR metadata
// SAFER: use session.metadata.organizationId to find org, then lookup subscription for price ID

// customer.subscription.updated:
// - event.data.object is a Stripe.Subscription
// - sub.customer = stripeCustomerId
// - sub.items.data[0].price.id = current price ID → map to tier

// customer.subscription.deleted:
// - event.data.object is a Stripe.Subscription
// - sub.customer = stripeCustomerId
// - Reset org.planTier to 'free', clear stripeSubscriptionId
```

[ASSUMED] For `checkout.session.completed`, the `line_items` are not included by default — they require expanding (`expand: ['line_items']` at session creation or a separate `stripe.checkout.sessions.retrieve(id, { expand: ['line_items'] })` call. The safer approach is to store the `priceId` in session `metadata` at creation time, or look up the subscription from `session.subscription` in the webhook.

**Recommended approach (verified against known Stripe patterns):** In `checkout.session.completed`, read `session.subscription` to get the `subscriptionId`, then call `stripe.subscriptions.retrieve(subscriptionId)` to get the current price ID. [ASSUMED — cross-verify with Stripe docs before implementing]

### Anti-Patterns to Avoid

- **Using `req.json()` in the webhook handler:** Parses and discards the raw body stream. HMAC verification will always fail with "No signatures found matching the expected signature for payload".
- **Caching planTier in JWT:** D-05 locks this out. After checkout completes, `GET /api/org/usage` is the source of truth. Never read tier from `session.user`.
- **Creating a new Stripe customer on every checkout:** Pass `customer: org.stripeCustomerId` when it exists to re-use the existing Stripe customer record.
- **Processing webhooks without idempotency check:** Stripe may deliver events more than once (retry on non-2xx response, network hiccups). Always check `ProcessedWebhookEvent` before executing DB updates.
- **Returning non-200 from webhook after HMAC verification passes:** Stripe will retry on any 4xx/5xx. After successful verification, always return 200 even if your internal logic skips (e.g. unknown event type).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HMAC signature verification | Custom crypto comparison | `stripe.webhooks.constructEvent()` | Constant-time comparison, handles encoding edge cases |
| Idempotency across retries | Custom "seen events" in-memory Map | `ProcessedWebhookEvent` MongoDB collection | Survives process restarts, serverless cold starts, multiple instances |
| Customer portal UI | Custom subscription management UI | Stripe Billing Portal (`billingPortal.sessions.create`) | Handles cancellation, plan changes, payment method updates — all PCI compliant |
| Price → tier mapping from Stripe metadata | Querying Stripe for product/price details | Env var mapping (`STRIPE_PRO_PRICE_ID`) | Zero Stripe API calls at enforcement time; fully controlled by operator |

---

## Common Pitfalls

### Pitfall 1: req.json() Breaks Webhook Signature Verification
**What goes wrong:** `stripe.webhooks.constructEvent(rawBody, sig, secret)` throws "No signatures found matching the expected signature for payload".
**Why it happens:** `req.json()` reads and parses the body stream. When the raw bytes are later read for HMAC, the stream is already consumed (or the bytes differ from the original).
**How to avoid:** ALWAYS use `const rawBody = await req.text()` in the webhook handler. The App Router does not require `bodyParser: false` config — `req.text()` directly accesses the raw stream.
**Warning signs:** Signature errors in logs even when `STRIPE_WEBHOOK_SECRET` is correctly set.

### Pitfall 2: Duplicate Stripe Customer Creation
**What goes wrong:** Each checkout creates a new Stripe customer, leading to multiple customer records for the same org.
**Why it happens:** `stripe.checkout.sessions.create()` called without the `customer` param when `org.stripeCustomerId` already exists.
**How to avoid:** Read `org.stripeCustomerId` before creating the session. Pass `customer: org.stripeCustomerId` when it exists. Only pass `customer_email` for first-time checkout (when no `stripeCustomerId`).
**Warning signs:** Stripe Dashboard shows multiple customers with the same email.

### Pitfall 3: checkout.session.completed Line Items Not Available
**What goes wrong:** `session.line_items` is undefined or empty in the webhook event object.
**Why it happens:** Stripe does not expand `line_items` by default in webhook payloads — they are a sub-resource.
**How to avoid:** In `checkout.session.completed`, use `session.subscription` (the subscription ID) to retrieve the subscription and get the price ID, OR store `priceId` in `metadata` at session creation time.
**Warning signs:** `session.line_items` is null/undefined in the webhook handler.

### Pitfall 4: Webhook Events Retried After Non-200 Response
**What goes wrong:** The same webhook event is processed multiple times, causing duplicate `planTier` updates.
**Why it happens:** Stripe retries webhook delivery if it receives a non-2xx response or a timeout.
**How to avoid:** Return 200 immediately after HMAC verification passes, even for unknown event types or skipped events. Use `ProcessedWebhookEvent` to guard against duplicate processing on retry.
**Warning signs:** `planTier` toggling unexpectedly; multiple `ProcessedWebhookEvent` insert errors.

### Pitfall 5: Billing Portal Not Configured in Stripe Dashboard
**What goes wrong:** `stripe.billingPortal.sessions.create()` throws an error about the portal not being configured.
**Why it happens:** The Customer Portal requires an initial setup in the Stripe Dashboard (allowed features, return URL, branding) before sessions can be created.
**How to avoid:** Complete the Stripe Dashboard Customer Portal configuration as an ops prerequisite before Phase 24 is tested.
**Warning signs:** Stripe API error `customer_portal_no_configuration` or similar.

### Pitfall 6: SELF_HOSTED Bypass Not First in Route Handler
**What goes wrong:** A Stripe SDK call executes on a self-hosted instance, throwing an error about missing `STRIPE_SECRET_KEY`.
**Why it happens:** SELF_HOSTED check placed after `requireAuth()` or after DB reads.
**How to avoid:** Check `process.env.SELF_HOSTED === 'true'` as the FIRST statement in checkout and portal route handlers, before `requireAuth()` or any other logic. Return a graceful response.

### Pitfall 7: stripe@17 apiVersion Type Constraint
**What goes wrong:** TypeScript error on `apiVersion` string — v17 SDK requires a specific API version string that matches its type definitions.
**Why it happens:** stripe@17 ships TypeScript types that enumerate valid `apiVersion` values — an arbitrary string will fail type checking.
**How to avoid:** Use the `apiVersion` value from the stripe@17 type exports (typically `'2024-06-20'` or the version exported by the package). Check `node_modules/stripe/types/index.d.ts` after install to find the valid value. [ASSUMED — verify after `yarn add stripe@^17.7.0`]

---

## Code Examples

### Checkout Session Creation (Full Flow)

```typescript
// POST /api/stripe/checkout
// 1. SELF_HOSTED guard
// 2. requireAuth()
// 3. Read org.stripeCustomerId from MongoDB
// 4. stripe.checkout.sessions.create() with priceId from request body
// 5. Return { url } — client does window.location.href = url

const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  payment_method_types: ['card'],
  line_items: [{ price: priceId, quantity: 1 }],
  customer: org.stripeCustomerId ?? undefined,
  customer_email: org.stripeCustomerId ? undefined : auth.user.email ?? undefined,
  metadata: {
    organizationId: auth.user.organizationId!,
    priceId,                   // store so webhook can avoid expand call
  },
  success_url: `${process.env.NEXTAUTH_URL}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${process.env.NEXTAUTH_URL}/upgrade`,
});
// session.url is the redirect target
```

[ASSUMED] `metadata.priceId` is a valid metadata field on Checkout sessions. Stripe allows arbitrary string metadata.

### Webhook Event Routing

```typescript
// In handleWebhookEvent(event: Stripe.Event):
switch (event.type) {
  case 'checkout.session.completed': {
    const session = event.data.object as Stripe.Checkout.Session;
    // session.customer (stripeCustomerId), session.subscription, session.metadata.priceId
    const tier = priceIdToTier(session.metadata?.priceId ?? '');
    if (!tier) break;
    await Organization.findOneAndUpdate(
      { stripeCustomerId: session.customer as string },
      { planTier: tier, stripeSubscriptionId: session.subscription as string }
    );
    break;
  }
  case 'customer.subscription.updated': {
    const sub = event.data.object as Stripe.Subscription;
    const priceId = sub.items.data[0]?.price.id;
    const tier = priceIdToTier(priceId ?? '') ?? 'free';
    await Organization.findOneAndUpdate(
      { stripeCustomerId: sub.customer as string },
      { planTier: tier }
    );
    break;
  }
  case 'customer.subscription.deleted': {
    const sub = event.data.object as Stripe.Subscription;
    await Organization.findOneAndUpdate(
      { stripeCustomerId: sub.customer as string },
      { planTier: 'free', stripeSubscriptionId: null }
    );
    break;
  }
}
```

[ASSUMED] TypeScript cast `as Stripe.Checkout.Session` and `as Stripe.Subscription` are the correct event object types for these event types in stripe@17.

### UpgradeModal CTA Wire-Up

```typescript
// In UpgradeModal.tsx — change the disabled Button to:
import { useRouter } from 'next/navigation';

const router = useRouter();

<Button
  data-testid="upgrade-cta"
  onClick={() => { onClose(); router.push('/upgrade'); }}
>
  View Plans
</Button>
```

[VERIFIED: `useRouter` from `next/navigation` is already used in the codebase (found in auth pages)]

### /upgrade/success Auto-Redirect

```typescript
// src/app/upgrade/success/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UpgradeSuccessPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<string | null>(null);

  useEffect(() => {
    // Fetch new plan tier from live DB
    fetch('/api/org/usage').then(r => r.json()).then(d => setPlan(d.plan));
    // Auto-redirect after 3 seconds
    const timer = setTimeout(() => router.push('/collections'), 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div>
      <h1>Upgrade successful!</h1>
      {plan && <p>You are now on the {plan} plan.</p>}
    </div>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router `bodyParser: false` config for webhooks | App Router `req.text()` — no config needed | Next.js 13 App Router | Eliminates the `export const config` boilerplate; `req.text()` is sufficient |
| `req.rawBody` (Express pattern) | `req.text()` (Web API) | Next.js App Router | `NextRequest` is a Web API `Request` — `.text()` is the standard method |
| Stripe `checkout.sessions.create` with `payment_method_types` | `payment_method_types` still supported in v17; automatic payment methods available | stripe@15+ | Explicit `['card']` remains safe for v17; can omit for Stripe-managed methods |
| `stripe@18` with `2025-03-31.basil` API | Pinned to `stripe@^17.7.0` | 2025 | v18 introduces breaking API changes; project pins v17 (D-13) |

**Deprecated/outdated:**
- `@stripe/stripe-js` client SDK: Not needed for this flow (D-14). Server-side redirect pattern is current Stripe-recommended approach for SaaS subscription upgrades.
- Three-argument `getServerSession(req, res, authOptions)`: Not applicable here (already established in require-auth.ts comments) — all new routes use `requireAuth()` which uses the single-argument form.

---

## Org Model Extension

The `Organization` model (at `src/lib/db/models/Organization.ts`) needs two new optional fields per D-11:

```typescript
// Add to IOrganization interface:
stripeCustomerId?: string;
stripeSubscriptionId?: string;

// Add to orgSchema:
stripeCustomerId: { type: String, sparse: true },   // sparse index for findOneAndUpdate lookup
stripeSubscriptionId: { type: String },
```

**Sparse index on `stripeCustomerId`:** The webhook handler does `Organization.findOneAndUpdate({ stripeCustomerId: ... })`. Without an index this is a collection scan. A sparse index is appropriate because most orgs start with no Stripe customer. [ASSUMED — adding sparse index is best practice; verify against existing index patterns in codebase]

---

## Environment Variables Required

| Variable | Used By | Notes |
|----------|---------|-------|
| `STRIPE_SECRET_KEY` | `stripe-client.ts` | Stripe Dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | webhook handler | Stripe Dashboard → Webhooks → endpoint signing secret |
| `STRIPE_PRO_PRICE_ID` | `price-id-to-tier.ts`, checkout route | Stripe Dashboard → Products → Pro plan price ID |
| `STRIPE_TEAM_PRICE_ID` | `price-id-to-tier.ts`, checkout route | Stripe Dashboard → Products → Team plan price ID |
| `NEXTAUTH_URL` | checkout success/cancel URLs | Already present in env for next-auth |
| `SELF_HOSTED` | all checkout/portal routes | Already present from Phase 23 |

**Ops prerequisite (not a code task):** Stripe price IDs must be created in the Stripe Dashboard before Phase 24 can be tested end-to-end. This was noted in STATE.md pending todos.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Stripe SDK | ✓ | confirmed (node -e works) | — |
| stripe npm package | All Stripe API calls | ✗ (not installed) | — | Must install via `yarn add stripe@^17.7.0` in Plan 01 |
| MongoDB / Mongoose | ProcessedWebhookEvent, org extension | ✓ | mongoose ^9.2.2 installed | — |
| STRIPE_SECRET_KEY env var | stripe-client.ts | Unknown (not in codebase) | — | Must be added to .env.local by developer |
| STRIPE_WEBHOOK_SECRET env var | webhook handler | Unknown | — | Must be added to .env.local by developer |
| STRIPE_PRO_PRICE_ID env var | price ID mapping | Unknown | — | Ops step: create in Stripe Dashboard |
| STRIPE_TEAM_PRICE_ID env var | price ID mapping | Unknown | — | Ops step: create in Stripe Dashboard |

**Missing dependencies with no fallback (block execution):**
- `stripe` npm package — install in Wave 1 task 1
- `STRIPE_SECRET_KEY` — developer must add to `.env.local` before end-to-end testing
- `STRIPE_WEBHOOK_SECRET` — developer must configure Stripe webhook endpoint and add to `.env.local`
- Stripe Dashboard billing portal configuration — ops prerequisite before portal feature can be tested

**Missing dependencies with fallback:**
- `STRIPE_PRO_PRICE_ID` / `STRIPE_TEAM_PRICE_ID` — code can be written and deployed without these; tests can mock; only needed for live Stripe testing

---

## Validation Architecture

> `workflow.nyquist_validation` key is absent from config.json — treating as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest (confirmed: `@testing-library/react` in package.json, `__tests__` dirs exist) |
| Config file | Check for `jest.config.*` in project root |
| Quick run command | `yarn test --testPathPattern=billing` |
| Full suite command | `yarn test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STRIPE-01 | Checkout session API returns `{ url }` | unit (mock Stripe SDK) | `yarn test --testPathPattern=stripe/checkout` | ❌ Wave 0 |
| STRIPE-02 | Portal session API returns `{ url }` | unit (mock Stripe SDK) | `yarn test --testPathPattern=stripe/portal` | ❌ Wave 0 |
| STRIPE-03 | Webhook verifies signature, checks idempotency, updates org.planTier | unit (mock stripe.webhooks.constructEvent) | `yarn test --testPathPattern=stripe/webhook` | ❌ Wave 0 |
| STRIPE-03 | ProcessedWebhookEvent prevents duplicate processing | unit | same webhook test file | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `yarn test --testPathPattern=billing`
- **Per wave merge:** `yarn test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/lib/billing/__tests__/stripe-checkout.test.ts` — covers STRIPE-01
- [ ] `src/lib/billing/__tests__/stripe-portal.test.ts` — covers STRIPE-02
- [ ] `src/lib/billing/__tests__/stripe-webhook.test.ts` — covers STRIPE-03
- [ ] `src/lib/billing/__tests__/price-id-to-tier.test.ts` — unit test for pure function

Note: The existing billing `__tests__` directory exists at `src/lib/billing/__tests__/` [VERIFIED: ls output]. New test files should follow the naming convention of existing tests there.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `requireAuth()` on all three new API routes |
| V3 Session Management | no | Plan not in JWT; no session mutation needed |
| V4 Access Control | yes | Org ownership check — org is resolved from `session.user.organizationId`, not from request body |
| V5 Input Validation | yes | `priceId` validated against known env var values before use; reject unknown price IDs |
| V6 Cryptography | yes | `stripe.webhooks.constructEvent()` — never hand-roll HMAC; Stripe SDK handles it |

### Known Threat Patterns for Stripe Integration

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Forged webhook event (fake tier upgrade) | Spoofing | `stripe.webhooks.constructEvent()` HMAC verification; `STRIPE_WEBHOOK_SECRET` required |
| Replay of valid webhook event | Repudiation | `ProcessedWebhookEvent` idempotency guard; Stripe event IDs are unique |
| Cross-org billing portal access | Elevation of Privilege | Portal session uses `org.stripeCustomerId` resolved from authenticated session, not from request param |
| Injecting arbitrary `priceId` via checkout request | Tampering | `priceId` from request is used as-is in Stripe session; Stripe validates the price ID exists — however, mapping only writes `planTier` for known IDs; unknown price IDs should be rejected or ignored gracefully |
| `organizationId` spoofing via metadata | Spoofing | Don't use `session.metadata.organizationId` from webhook as the sole lookup — cross-reference with `session.customer` (stripeCustomerId) which is set by Stripe, not by request body |

**Security note on `metadata.organizationId`:** While convenient, `session.metadata` can be populated by a malicious request if your checkout API doesn't validate the caller's org. Since `POST /api/stripe/checkout` reads `auth.user.organizationId` from the server session (not from the request body), and sets `metadata.organizationId` from that trusted source, this is safe. [ASSUMED — verify the implementation sets metadata from server session only]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `apiVersion: '2024-06-20'` is the correct stable version for stripe@17.7.0 | Stripe singleton pattern | TypeScript compile error; check `node_modules/stripe/types` after install |
| A2 | `session.line_items` requires expansion in webhook; storing `priceId` in metadata is valid | Checkout session creation, webhook handler | Webhook can't determine tier from session; use subscription lookup as fallback |
| A3 | `stripe.billingPortal.sessions.create()` is the correct API method name in stripe@17 | Portal pattern | Runtime error; verify against SDK types after install |
| A4 | TTL index using `expires` shorthand on Date field in Mongoose schema works as expected | ProcessedWebhookEvent model | TTL not applied; collection grows unbounded |
| A5 | `as Stripe.Checkout.Session` and `as Stripe.Subscription` are the correct event object types in stripe@17 | Webhook event routing | TypeScript errors; may need to adjust casts |
| A6 | Sparse index on `stripeCustomerId` is appropriate for the webhook lookup query | Org model extension | Collection scan on every webhook event; add index explicitly if omitted |
| A7 | `NEXTAUTH_URL` is already set in the project's `.env.local` | Checkout success/cancel URLs | Invalid redirect URLs; need to add/verify |
| A8 | Billing portal configuration in Stripe Dashboard is a separate ops step not tracked in code | Pitfall 5 | Portal sessions fail until configured; must be in pre-testing checklist |

---

## Open Questions

1. **stripe@17 correct `apiVersion` string**
   - What we know: stripe@17.7.0 uses a TypeScript-enumerated `apiVersion` type
   - What's unclear: The exact string value (likely `'2024-06-20'` but not verified in this session)
   - Recommendation: After `yarn add stripe@^17.7.0`, check `node_modules/stripe/types/index.d.ts` for `ApiVersion` type and use that exact string

2. **checkout.session.completed price ID retrieval**
   - What we know: `line_items` requires expansion; `session.subscription` provides the subscription ID
   - What's unclear: Whether storing `priceId` in `metadata` at session creation is simpler than expanding or retrieving subscription
   - Recommendation: Store `priceId` in `metadata` at checkout session creation (simplest, no extra Stripe API call in webhook)

3. **Existing jest.config location**
   - What we know: `__tests__` directories exist; `@testing-library/react` is installed
   - What's unclear: Exact jest config file path and test script in package.json
   - Recommendation: Plan 01 should check `jest.config.*` and `package.json` test scripts before creating test files

---

## Sources

### Primary (HIGH confidence)
- `/Users/user/dev/tokens-manager/.planning/phases/24-stripe-checkout-and-webhook-integration/24-CONTEXT.md` — All locked decisions
- `/Users/user/dev/tokens-manager/src/lib/billing/` — Existing Phase 23 billing module (tiers, check functions, UpgradeModal)
- `/Users/user/dev/tokens-manager/src/lib/db/models/Organization.ts` — Current org schema
- `/Users/user/dev/tokens-manager/src/lib/auth/require-auth.ts` — Auth pattern for new routes
- npm registry: `npm view stripe@17` — confirmed 17.7.0 is latest v17.x; 18.x (22.0.2 latest) confirmed as separate major

### Secondary (MEDIUM confidence)
- Stripe Node.js SDK docs patterns (Checkout, Billing Portal, Webhooks) — [ASSUMED] based on training knowledge; not verified via Context7 or WebFetch in this session
- Next.js App Router webhook `req.text()` pattern — [ASSUMED] widely documented community pattern; consistent with Web API `Request` spec

### Tertiary (LOW confidence)
- Specific TypeScript cast types for Stripe event objects in v17 — training knowledge only; must verify after install

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — stripe@17.7.0 verified as latest v17.x via npm registry
- Architecture: HIGH — patterns derived directly from locked decisions in CONTEXT.md and existing codebase patterns
- Stripe API specifics: MEDIUM — training knowledge, not verified via Context7 (Stripe not in Context7)
- Pitfalls: HIGH — req.text() is a well-known sharp edge, idempotency pattern is standard

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (Stripe API stable; stripe@17 pinned)
