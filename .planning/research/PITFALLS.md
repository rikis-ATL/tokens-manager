# Pitfalls Research

**Domain:** Adding multi-tenant org model, configurable tier limits, Stripe subscriptions, and rate limiting to an existing Next.js 13.5.6 + Mongoose + next-auth v4 app
**Researched:** 2026-03-30
**Confidence:** HIGH (Stripe official docs + next-auth GitHub discussions + MongoDB official docs + codebase directly inspected)

---

## Critical Pitfalls

### Pitfall 1: organizationId Backfill Leaves Orphaned Documents

**What goes wrong:**
The migration script adds `organizationId` to the seeded org document and to new documents going forward, but existing `TokenCollection` and `User` documents from v1.0–v1.5 have no `organizationId` field. Mongoose queries filtered by `{ organizationId: orgId }` return zero results for all pre-migration data. The app appears to work (no errors), but all existing collections and users are invisible — silently lost from the UI.

**Why it happens:**
The current `TokenCollection` schema uses `Schema.Types.Mixed` for flexible fields and `userId: { type: String, default: null }` for the prior single-user model. There is no `organizationId` field in the schema yet. Developers write the migration to seed the org, then add `organizationId` to the schema with a default, and assume existing documents will be covered. They are not — Mongoose schema defaults only apply to new documents created through the model, never to documents already in the database.

**How to avoid:**
Run an explicit MongoDB `updateMany` backfill before adding `organizationId` as a required field in the schema:
```js
// In the boot-time migration (TENANT-03):
await TokenCollection.updateMany(
  { organizationId: { $exists: false } },
  { $set: { organizationId: seedOrgId } }
);
await User.updateMany(
  { organizationId: { $exists: false } },
  { $set: { organizationId: seedOrgId } }
);
```
Add the compound index `{ organizationId: 1, name: 1 }` on `TokenCollection` and `{ organizationId: 1, email: 1 }` on `User` only after the backfill completes. Verify the migration by asserting that `await TokenCollection.countDocuments({ organizationId: { $exists: false } })` returns 0 before the app continues booting.

**Warning signs:**
- Collections grid shows 0 collections after migration even though MongoDB Atlas shows documents exist.
- `User.find({ organizationId: orgId })` returns empty array; `User.find({})` returns all users.
- No error is thrown — the query simply returns `[]`.

**Phase to address:**
Org data model phase (TENANT-01/TENANT-03) — the backfill must run atomically with the schema change, not after it.

---

### Pitfall 2: Missing Compound Index on organizationId Causes Full Collection Scans

**What goes wrong:**
After adding `organizationId` to documents, every collection listing query becomes `TokenCollection.find({ organizationId: orgId })`. Without a compound index, this is a full collection scan. With 10 orgs each owning 10 collections, that is 100 documents scanned for every page load. With 1,000 orgs it is 10,000. MongoDB silently falls back to a `COLLSCAN` plan — no error, just degraded latency that worsens over time.

**Why it happens:**
The existing schema only indexes `{ name: 1 }` and `{ userId: 1 }`. Developers add `organizationId` to the document but forget to add an index because the app seems fast during local development with a handful of documents.

**How to avoid:**
Add compound indexes at schema definition time, not as a follow-up:
```js
tokenCollectionSchema.index({ organizationId: 1, name: 1 });
tokenCollectionSchema.index({ organizationId: 1, updatedAt: -1 });
userSchema.index({ organizationId: 1, email: 1 });
```
Run `db.collection.explain("executionStats")` during integration testing to confirm `IXSCAN` not `COLLSCAN` is used on tenant-scoped queries.

**Warning signs:**
- MongoDB Atlas Performance Advisor flags `TokenCollection` queries without an `organizationId` index.
- Response time for the collections grid grows linearly as total document count increases.
- `explain()` output shows `stage: "COLLSCAN"` for `{ organizationId: ... }` filters.

**Phase to address:**
Org data model phase (TENANT-01) — add indexes in the same PR that adds the field.

---

### Pitfall 3: Stripe Webhook Raw Body Consumed Before Signature Verification

**What goes wrong:**
The webhook route handler calls `await req.json()` to parse the body, then passes the parsed object to `stripe.webhooks.constructEvent()`. Signature verification fails with `No signatures found matching the expected signature for payload`. Every webhook event is rejected with a 400, causing Stripe to retry for up to 3 days, eventually disabling the endpoint.

**Why it happens:**
This is a well-documented Next.js 13 App Router behavior. `req.json()` consumes the underlying `ReadableStream`. `constructEvent()` needs the original raw bytes exactly as Stripe transmitted them to recompute the HMAC. Once the stream is consumed and the body is deserialized and re-serialized, byte-level fidelity is lost (encoding, whitespace, key ordering). The Pages Router had `bodyParser: false` as a workaround. The App Router requires `req.text()` instead.

**How to avoid:**
In the webhook route handler, always use `req.text()` to read the raw body string, then pass it directly to `constructEvent()`:
```ts
// src/app/api/webhooks/stripe/route.ts
import { headers } from 'next/headers';
import Stripe from 'stripe';

export async function POST(req: Request) {
  const body = await req.text(); // NOT req.json()
  const sig  = headers().get('stripe-signature') ?? '';
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }
  // handle event...
  return new Response('OK', { status: 200 });
}
```
Never call `req.json()` before `constructEvent()`. No `bodyParser: false` config needed in App Router (it is not applicable to Route Handlers).

**Warning signs:**
- All webhook events arrive but every one returns 400.
- Stripe Dashboard shows `Webhook Error: No signatures found matching the expected signature for payload`.
- Local `stripe listen` shows the same signature error even with the correct `STRIPE_WEBHOOK_SECRET`.

**Phase to address:**
Stripe integration phase (STRIPE-03) — must be addressed in the initial webhook handler, not as a follow-up fix.

---

### Pitfall 4: Webhook Events Processed Multiple Times (Missing Idempotency Guard)

**What goes wrong:**
Stripe retries any webhook that does not receive a 2xx within the timeout window. If the handler is slow (DB write, external API call), or if the handler crashes after partially processing the event, Stripe retries. The handler runs again on the same event. For `checkout.session.completed`, this means a subscription is activated twice. For `invoice.payment_failed`, the org is suspended twice. For `customer.subscription.deleted`, plan is downgraded twice (usually harmless, but can cause double-email sends or double-audit-log entries).

**Why it happens:**
Developers write handlers that are not idempotent by default. They assume Stripe delivers each event exactly once. Stripe's own documentation states: "Webhook endpoints might occasionally receive the same event more than once."

**How to avoid:**
Store processed Stripe event IDs in a `ProcessedWebhookEvent` collection (or add a `processedStripeEventIds` set to the Org document). Before handling any event, check if `event.id` has been processed. After successful handling, record it:
```ts
const existing = await ProcessedEvent.findOne({ stripeEventId: event.id });
if (existing) return new Response('Already processed', { status: 200 });
// ... process the event ...
await ProcessedEvent.create({ stripeEventId: event.id, processedAt: new Date() });
```
Return 200 immediately when the event is already processed — do not return 4xx or Stripe will keep retrying.

**Warning signs:**
- Org plan is set to `pro` twice in logs within seconds.
- Email notifications sent twice for the same billing event.
- MongoDB document updated twice for a single Stripe checkout completion.

**Phase to address:**
Stripe integration phase (STRIPE-03) — implement alongside the first webhook handler, not as a hardening step.

---

### Pitfall 5: Stripe Webhook Out-of-Order Event Delivery Breaks State Machine

**What goes wrong:**
Stripe does not guarantee delivery order. A `customer.subscription.updated` event (plan changed to Pro) can arrive before `customer.subscription.created` (initial subscription). A handler that assumes the subscription record exists in MongoDB when processing `updated` will throw an unhandled error or silently do nothing, leaving the org on the Free plan permanently.

**Why it happens:**
Developers model webhook handlers as a sequential state machine: create → update → delete. Stripe's distributed architecture means events can arrive out of order, especially during high load or retries.

**How to avoid:**
Make each handler fetch authoritative state from Stripe rather than trusting event sequence. For `customer.subscription.updated` or `customer.subscription.deleted`, call `stripe.subscriptions.retrieve(event.data.object.id)` to get current state, then apply an upsert to the Org document:
```ts
// Upsert pattern — safe regardless of event order
await Organization.findOneAndUpdate(
  { stripeCustomerId: subscription.customer as string },
  { $set: { plan: derivePlan(subscription), subscriptionStatus: subscription.status } },
  { upsert: false } // Never create orgs from webhooks — org must already exist
);
```
If the org document is not found, log a structured warning and return 200 (don't 500 — Stripe will retry and the retry likely won't fix a missing org document).

**Warning signs:**
- Org remains on Free plan after successful Stripe Checkout despite correct webhook configuration.
- Handler logs show "Org not found for stripeCustomerId" after subscription events.
- `customer.subscription.updated` fires but the DB update is a no-op because the org document was not yet updated by `checkout.session.completed`.

**Phase to address:**
Stripe integration phase (STRIPE-03).

---

### Pitfall 6: Checkout Session Metadata Not Present in Subscription Events

**What goes wrong:**
The checkout session is created with `metadata: { organizationId: org._id }` so the webhook handler can identify which org completed checkout. The `checkout.session.completed` event contains this metadata. However, subsequent subscription events (`customer.subscription.created`, `customer.subscription.updated`) do NOT carry checkout session metadata — they carry subscription-level metadata, which is different. A handler that reads `event.data.object.metadata.organizationId` on a subscription event finds `undefined` and fails to update the org's plan.

**Why it happens:**
Developers test `checkout.session.completed` correctly, see metadata present, then reuse the same metadata-reading pattern in subscription event handlers. Stripe's metadata scoping is per-object: Session metadata stays on the Session, not the Subscription.

**How to avoid:**
Handle org identification in two distinct ways depending on event type:
1. For `checkout.session.completed`: read `session.metadata.organizationId` to link the `stripeCustomerId` to the Org. Store `stripeCustomerId` on the Org document at this point.
2. For all subsequent subscription events: look up the Org by `stripeCustomerId` (which was stored in step 1), never by metadata.

Also set metadata on the Stripe Customer object (`stripe.customers.update(customerId, { metadata: { organizationId } })`) as a fallback that persists across all customer-related events.

**Warning signs:**
- `checkout.session.completed` handler succeeds, but `customer.subscription.updated` handler logs `organizationId undefined`.
- Org `stripeCustomerId` is stored correctly but plan never updates on renewal.

**Phase to address:**
Stripe integration phase (STRIPE-01 / STRIPE-03) — checkout creation and webhook handler must be designed together.

---

### Pitfall 7: Tier Limit Race Condition on Collection and Token Creation

**What goes wrong:**
The API route for creating a collection reads the current collection count, checks it against the tier limit, and if within limit, creates the document. Under concurrent requests (two browser tabs, a mobile client + desktop, or any parallel action), two requests read the count simultaneously before either write completes. Both see count = 0 (below the limit of 1 for Free tier), both proceed, and two collections are created. The org is now over the Free tier limit with no enforcement.

**Why it happens:**
The check-then-act pattern (read count → compare → insert) is a classic read-modify-write race condition. MongoDB documents are atomic per-document, but a `countDocuments()` followed by an `insertOne()` is not atomic across two calls. Any delay between the count read and the insert (even milliseconds) creates a window.

**How to avoid:**
Use a conditional atomic upsert on the Org's usage counters rather than a separate count query. Two patterns work:

**Option A — Conditional `$inc` with max check (preferred for token counts):**
```ts
const result = await Organization.findOneAndUpdate(
  { _id: orgId, tokenCount: { $lt: tierLimit.maxTokens } },
  { $inc: { tokenCount: delta } },
  { new: true }
);
if (!result) throw new LimitExceededError('Token limit reached');
```

**Option B — `countDocuments` + MongoDB session/transaction (preferred for collection counts):**
Use a MongoDB multi-document transaction to atomically count and insert. This requires a replica set (MongoDB Atlas satisfies this). Alternatively, store `collectionCount` on the Org document and use the `$lt` conditional update pattern above.

Storing denormalized counters (`tokenCount`, `collectionCount`) on the Org document and updating them atomically with the create/delete operations is the most practical approach for this codebase.

**Warning signs:**
- Automated load tests show orgs with more collections than their tier allows.
- Two near-simultaneous POST requests to `/api/collections` both return 201 when only one should have succeeded.
- Free-tier org has 2 collections visible.

**Phase to address:**
Billing enforcement phase (BILLING-01/LIMIT-01) — counters must be atomic from the start, not added as a hardening step.

---

### Pitfall 8: JWT Does Not Reflect Plan Upgrade After Stripe Checkout

**What goes wrong:**
A user upgrades from Free to Pro via Stripe Checkout. The webhook fires, updates the Org document in MongoDB with `plan: 'pro'`. The user's browser session, however, carries a JWT issued at sign-in that encodes `plan: 'free'`. The user returns to the app — the JWT still says Free, limit enforcement reads from the JWT, and the upgrade UI modal keeps appearing. The user believes billing is broken. The plan field in the JWT will only update after the 30-day JWT max age expires (current `maxAge: 30 * 24 * 60 * 60` in `nextauth.config.ts`).

**Why it happens:**
The current JWT callback in `nextauth.config.ts` re-fetches `role` from DB every 60 seconds (the `roleLastFetched` pattern). But it does not re-fetch `organizationId`, `plan`, or `subscriptionStatus` — because these fields do not exist on the JWT yet. Once plan data is added to the JWT, the TTL-based re-fetch pattern must be extended to cover plan data, or plan data must never be cached in the JWT at all.

**How to avoid:**
Two valid approaches:

**Option A — Never put plan in JWT; always read from DB:**
In API route handlers and server components, call `Organization.findById(session.user.organizationId).select('plan')` when limit enforcement is needed. This adds one DB query per relevant request but eliminates staleness. This is the simpler and safer approach given the existing TTL re-fetch pattern.

**Option B — Extend the existing 60-second TTL re-fetch to include plan:**
Add `planLastFetched` to the JWT and re-fetch `plan` and `subscriptionStatus` from the Org document alongside the role re-fetch. The existing pattern in `nextauth.config.ts` (lines 63–77) can be extended to also query `Organization.findOne({ userId: token.id })` and include plan in the returned token.

For the Stripe return URL, redirect to a purpose-built page (`/billing/success?action=refresh`) that calls `useSession().update()` (next-auth v4 supports session update via the `update()` method exposed by `useSession`) to force a JWT refresh immediately after checkout completion.

**Warning signs:**
- User completes Stripe Checkout, is redirected back to the app, but upgrade modal still appears.
- `session.user.plan` shows `free` after a confirmed Pro subscription in Stripe Dashboard.
- The issue self-resolves after 60 seconds (TTL re-fetch kicks in) — this is the tell.

**Phase to address:**
JWT/session design must be settled in the Org data model phase (TENANT-01/BILLING-02) before Stripe checkout is wired up.

---

### Pitfall 9: Billing Logic Scattered Into Route Handlers (Layer Violation)

**What goes wrong:**
Stripe API calls (`stripe.checkout.sessions.create`, `stripe.customers.create`) are written directly inside Next.js Route Handlers. The `STRIPE_SECRET_KEY` is imported in multiple route files. Limit checks (`if (org.plan === 'free' && count >= 1)`) are copy-pasted into collection create, token save, and theme create routes. When the Pro tier limit changes (e.g., from 10 to 15 collections), the change must be made in 3–4 places, and one is always missed.

**Why it happens:**
It is faster to write the Stripe call directly in the route handler than to design an abstraction layer first. The PROJECT.md requirement BILLING-07 ("All Stripe and billing logic lives in `src/lib/billing/`") exists precisely because this is the default gravitational pull during incremental development.

**How to avoid:**
Establish `src/lib/billing/` as an isolated module before writing any Stripe code:
- `src/lib/billing/stripe.ts` — Stripe client singleton
- `src/lib/billing/limits.ts` — LIMITS config object (exported constant, one source of truth)
- `src/lib/billing/enforcement.ts` — `checkLimit(orgId, limitKey)` function called by route handlers
- `src/lib/billing/checkout.ts` — `createCheckoutSession(orgId, planId)` function
- `src/lib/billing/webhooks.ts` — `handleWebhookEvent(event)` function

Route handlers call these functions; they never import `stripe` directly. This matches the BILLING-07 requirement and is critical for the self-hosted bypass (`SELF_HOSTED=true` short-circuits in `enforcement.ts`, not in every route).

**Warning signs:**
- `import Stripe from 'stripe'` appears in any file outside `src/lib/billing/`.
- `process.env.STRIPE_SECRET_KEY` is accessed in a route file.
- Limit values (1, 500, 10) appear as literals in API route files.
- `SELF_HOSTED` check duplicated across multiple routes.

**Phase to address:**
Must be established as the first step of the billing phase, before STRIPE-01 or BILLING-03. The module skeleton should exist before any route touches billing.

---

### Pitfall 10: Rate Limiter Bypassed via Spoofed X-Forwarded-For Header

**What goes wrong:**
The rate limiter for export and token-update endpoints identifies users by IP address extracted from `req.headers['x-forwarded-for']` or `req.headers['x-real-ip']`. An attacker sends requests with a forged `X-Forwarded-For: 1.2.3.4` header, cycling through different fake IPs. Each request appears to come from a new IP, bypassing the 60 req/min per-user limit entirely.

**Why it happens:**
IP-based rate limiting is the first approach most implementations use. In Next.js deployed behind a proxy (Vercel, nginx, Cloudflare), the real client IP is in `x-forwarded-for`. But this header can be set by the client if the edge proxy does not strip and re-inject it.

**How to avoid:**
Rate limit by authenticated user ID, not IP address. Since all rate-limited endpoints (RATE-01: export, token-update) require authentication, `session.user.id` is available from `getServerSession()`. Use the user ID as the rate limit key:
```ts
const session = await getServerSession(authOptions);
const rateLimitKey = `rate:${session.user.id}:export`;
```
If a secondary IP-based limit is desired as defense-in-depth, extract the IP from Vercel's trusted `x-forwarded-for` (which Vercel sets from the real client IP at the edge and cannot be spoofed at the application layer). Do not trust `x-real-ip` or `x-forwarded-for` from arbitrary clients.

For the rate limit store, use an in-memory sliding window (acceptable for single-instance deployment) or Upstash Redis (required for multi-instance/serverless). Do not use MongoDB for rate limit tracking — the write overhead defeats the purpose.

**Warning signs:**
- Load test with rotating `X-Forwarded-For` headers bypasses the limit (each fake IP gets its own window).
- Authenticated user can trigger 600 export requests per minute by cycling headers.
- Rate limit does not apply to the same user across two concurrent browser sessions (because sessions have different IPs).

**Phase to address:**
Rate limiting phase (RATE-01) — key by user ID from the start.

---

### Pitfall 11: Usage Counter Reset Creates Timezone-Dependent Off-by-One

**What goes wrong:**
The `exportsThisMonth` counter resets at midnight UTC on the first of the month. An org in UTC-8 (Pacific Time) resets their counter at 4:00 PM on the last day of the previous month — still in their "current month" subjectively. A different org in UTC+9 (Tokyo) resets at 9:00 AM on the first — already their "next month". The inconsistency is visible in the UI when the billing cycle shown ("resets March 1") doesn't match when the counter actually drops to zero.

More critically, the lazy reset pattern (reset on first request after the 1st rather than via a cron) creates a scenario where `lastReset` is the 28th of a 28-day February, and requests made on March 1 don't reset the counter if the check uses calendar month arithmetic incorrectly (e.g., `new Date().getMonth() !== lastReset.getMonth()` wraps correctly but `new Date().getDate() < lastReset.getDate()` does not apply when months differ).

**Why it happens:**
MongoDB stores dates in UTC. JavaScript `Date` objects are also UTC internally but display in local timezone. Month-boundary logic is easy to get wrong — comparing month numbers works for most months but fails at year boundaries (December → January: both return `0` and `11`, so `month !== lastMonth` correctly detects the rollover only if year is also checked).

**How to avoid:**
Reset based on UTC month boundary using a reliable comparison:
```ts
function needsReset(lastReset: Date): boolean {
  const now    = new Date();
  const reset  = new Date(lastReset);
  return (
    now.getUTCFullYear() > reset.getUTCFullYear() ||
    now.getUTCMonth()    > reset.getUTCMonth()
  );
}
```
Always use `getUTCMonth()` / `getUTCFullYear()`, never `getMonth()` / `getFullYear()`. Document in the UI that the export counter resets on the 1st of each month UTC, not the user's local midnight.

**Warning signs:**
- Org in UTC+13 reports counter reset "yesterday" while still in the same calendar month for UTC users.
- Counter does not reset on January 1 (month rollover from 11 → 0 where a `>` comparison on month alone fails).
- Unit tests using fixed dates in December pass but production resets fail in January.

**Phase to address:**
Usage tracking phase (USAGE-01/USAGE-02).

---

### Pitfall 12: Cross-Tenant Data Leakage via Missing organizationId Filter

**What goes wrong:**
A route handler fetches a collection by `_id` without also filtering by `organizationId`. An authenticated user from Org A constructs a request to `/api/collections/[id]` with the MongoDB `_id` of a collection belonging to Org B. The handler finds the document (it exists), returns it in full, and Org A can read Org B's private token collection. This is a tenant isolation failure — the most severe class of multi-tenant bug.

**Why it happens:**
Before multi-tenancy, every authenticated user could access every collection (single-org model). Route handlers were written as `TokenCollection.findById(id)`. Adding `organizationId` to documents does not automatically add it to existing query filters. Developers miss updating collection-specific GET/PUT/DELETE handlers that only filter by `_id`.

**How to avoid:**
Every MongoDB query that takes a `collectionId` from an HTTP request must be a compound filter:
```ts
// Correct — tenant-scoped lookup
const collection = await TokenCollection.findOne({
  _id: collectionId,
  organizationId: session.user.organizationId,
});
if (!collection) return NextResponse.json({ error: 'Not found' }, { status: 404 });
```
Never use `findById(id)` for tenant-owned resources. Return 404 (not 403) when an org does not own a resource — 403 confirms the resource exists, which leaks information.

Create a helper `assertOrgOwnership(collectionId, orgId)` that performs this check and throws a typed error, used by all collection route handlers.

**Warning signs:**
- GET `/api/collections/[id]` returns 200 for a collection ID belonging to a different org.
- User can view or edit another org's Figma/GitHub config by guessing MongoDB ObjectIds.
- No 404 or 403 is returned when a valid `_id` from another org is used.

**Phase to address:**
Org data model phase (TENANT-01) — all existing route handlers must be audited and patched in this phase, before any billing work starts.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store `plan` in JWT | Avoids DB query on every request | Stale plan after upgrade; upgrade prompts persist for up to 60s | Never — read plan from DB for limit enforcement |
| Hardcode limit values in route handlers | Faster to write | Limit changes require touching N files; risk of inconsistency | Never — use LIMITS config in `src/lib/billing/limits.ts` |
| Import Stripe directly in route handlers | Faster initial development | Breaks isolation; `SELF_HOSTED` bypass must be duplicated everywhere | Never — all Stripe calls go through `src/lib/billing/` |
| IP-based rate limiting without user ID | Simple implementation | Trivially bypassable with header spoofing | Never for authenticated endpoints |
| Skip idempotency on webhook handlers | Saves one DB query per webhook | Duplicate events cause double-activation, double-emails | Never |
| `TokenCollection.findById(id)` without orgId | Less code | Cross-tenant data leakage | Never after multi-tenancy is added |
| Lazy-write `organizationId` (write on next update) | Avoids migration script | Silent data loss when queries filter by orgId | Never — run explicit backfill |
| In-memory rate limit store | No external dependency | Resets on redeploy; does not work across multiple instances | Acceptable for single-instance Vercel deployment only |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Stripe webhooks | `req.json()` before `constructEvent()` | Use `req.text()` to preserve raw bytes for HMAC verification |
| Stripe webhooks | Trusting event order | Fetch authoritative subscription state from Stripe API on each event |
| Stripe webhooks | Assuming metadata propagates from Session to Subscription | Session metadata stays on Session; look up org by `stripeCustomerId` for subscription events |
| Stripe webhooks | Missing idempotency | Store processed `event.id` in DB; return 200 on duplicate |
| next-auth v4 + plan | Adding `plan` to JWT without re-fetch logic | Extend TTL re-fetch in `jwt` callback or never cache plan in JWT |
| next-auth v4 + Stripe return | User returns from Checkout with stale session | Redirect to `/billing/success` that calls `session.update()` to force JWT refresh |
| MongoDB + multi-tenant | `findById()` on tenant-owned resources | Always filter by `{ _id, organizationId }` compound query |
| MongoDB + usage counters | Separate count query then insert | Use atomic `findOneAndUpdate` with `$lt` condition on denormalized counter |
| MongoDB migration | Schema default backfills existing docs | Run explicit `updateMany` with `{ field: { $exists: false } }` filter |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Missing `organizationId` index | Collection listing latency grows linearly with total document count across all orgs | Add `{ organizationId: 1, name: 1 }` compound index before any multi-tenant queries run | 500+ total collections |
| MongoDB for rate limiting (write-per-request) | Export endpoint latency spikes; MongoDB write queue backs up | Use in-memory store (single instance) or Upstash Redis (multi-instance) | ~100 req/s to rate-limited endpoints |
| Webhook handler synchronous DB writes | Stripe timeout (30s) exceeded; Stripe retries flood the endpoint | Keep webhook handler fast — validate signature, enqueue, return 200 immediately | Webhook volume > 50/s |
| `Organization.findOne()` on every request for plan check | +1 DB roundtrip per API call | Cache plan in request context (not JWT); or use a 60s TTL approach same as role | Every API call when billing enforcement is enabled |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Missing `organizationId` filter on collection/token queries | Tenant A reads Tenant B's private token collections | Always use `{ _id, organizationId }` compound filter; return 404 on mismatch |
| Rate limiting by IP instead of user ID | Authenticated users bypass rate limit with header spoofing | Rate limit key = `session.user.id`, never `x-forwarded-for` |
| Skipping Stripe webhook signature verification | Attacker sends fake webhook to activate Pro plan without paying | Always call `stripe.webhooks.constructEvent(rawBody, sig, secret)` before reading event data |
| STRIPE_SECRET_KEY in client-side code or non-billing route | Key exposure; attacker can make arbitrary Stripe API calls | Key accessible only in `src/lib/billing/`; never imported outside |
| Trusting `plan` from JWT for billing decisions | User edits JWT to claim Pro plan | Always re-fetch plan from Organization document for limit enforcement decisions |
| Storing Stripe webhook secret in client env var | Attacker can forge webhooks | `STRIPE_WEBHOOK_SECRET` must be server-only (no `NEXT_PUBLIC_` prefix) |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Upgrade modal appears immediately after successful Stripe Checkout | User is confused — they just paid | Redirect to `/billing/success` that forces session refresh before showing the app |
| Limit block returns HTTP 500 instead of 422 with upgrade prompt | User sees "server error"; no clear action | Return `{ error: 'limit_exceeded', limit: 'collections', upgradeUrl: '/billing' }` with HTTP 422 |
| Token save silently drops tokens when token limit is exceeded | User types tokens, saves, they vanish | Enforce limit at write time with a clear error message and count display in UI |
| Export counter shown as "N/10" without explaining the reset date | User doesn't know when limit resets | Show "N/10 exports · resets [date]" using `lastReset` from Org document |
| Plan downgrade (payment failure) immediately blocks all features | User locked out without warning | Give a 3-day grace period on `invoice.payment_failed`; downgrade only on `customer.subscription.deleted` |

---

## "Looks Done But Isn't" Checklist

- [ ] **organizationId backfill:** Migration script runs `updateMany` with `$exists: false` filter — verify with `countDocuments` assertion before app boot continues.
- [ ] **Compound indexes:** Run `explain("executionStats")` on `TokenCollection.find({ organizationId })` — confirm `IXSCAN`, not `COLLSCAN`.
- [ ] **Webhook signature verification:** Delete `STRIPE_WEBHOOK_SECRET` temporarily and confirm all webhooks are rejected with 400 — proves verification is active.
- [ ] **Webhook idempotency:** Replay the same webhook event twice using Stripe CLI (`stripe events resend evt_xxx`) — confirm second delivery returns 200 without mutating state.
- [ ] **Billing isolation:** `grep -r "from 'stripe'" src/` — all matches must be inside `src/lib/billing/` only.
- [ ] **Tenant query isolation:** Automated test — authenticated User from Org A requests a collection belonging to Org B — must return 404, not 200.
- [ ] **Race condition on limits:** Load test — two concurrent POST `/api/collections` requests with a Free-tier org — only one must succeed.
- [ ] **JWT staleness after upgrade:** Simulate webhook → force session re-read → confirm `session.user.plan` reflects Pro within 60 seconds.
- [ ] **SELF_HOSTED bypass:** Set `SELF_HOSTED=true`, confirm all limit enforcement functions return pass-through, confirm no Stripe API calls are made.
- [ ] **Rate limit by user not IP:** Send 65 requests with rotating `X-Forwarded-For` headers from a single authenticated user — all 65 must hit the rate limit.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| organizationId backfill missed | MEDIUM | Run `updateMany({ organizationId: { $exists: false } }, { $set: { organizationId: seedOrgId } })` in a migration script; verify count; re-deploy |
| Webhook idempotency missing, events doubled | MEDIUM | Identify duplicated Stripe event IDs in logs; manually revert double-applied state changes; add idempotency guard; replay from Stripe Dashboard |
| Cross-tenant data leaked | HIGH | Audit query logs for `findById` calls without `organizationId` filter; patch all affected routes; notify affected orgs if any data was accessed; add integration test suite |
| Rate limiter bypassable | LOW | Replace IP key with user ID key; reset rate limit store; re-deploy |
| Plan stuck as Free after upgrade | LOW | Webhook re-delivery from Stripe Dashboard for the `checkout.session.completed` event; or manually set `plan: 'pro'` in Org document via DB admin |
| Billing code in route handlers | MEDIUM | Extract Stripe calls to `src/lib/billing/`; update all imports; no data migration needed |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| organizationId backfill (Pitfall 1) | Org data model — TENANT-01/TENANT-03 | Boot-time assertion: `countDocuments({ organizationId: { $exists: false } }) === 0` |
| Missing compound index (Pitfall 2) | Org data model — TENANT-01 | `explain()` shows `IXSCAN` on org-scoped collection queries |
| Webhook raw body consumed (Pitfall 3) | Stripe integration — STRIPE-03 | Test with invalid sig → 400; valid sig → 200 |
| Webhook not idempotent (Pitfall 4) | Stripe integration — STRIPE-03 | Replay event twice via `stripe events resend` → no duplicate DB state |
| Out-of-order webhook events (Pitfall 5) | Stripe integration — STRIPE-03 | Send `subscription.updated` without prior `checkout.session.completed` — handler must not crash |
| Session metadata lost in subscription events (Pitfall 6) | Stripe checkout design — STRIPE-01 | Verify `customer.subscription.updated` handler correctly identifies org via `stripeCustomerId` |
| Race condition on limit enforcement (Pitfall 7) | Billing enforcement — BILLING-01/LIMIT-01 | Concurrent load test: two simultaneous creates with Free tier org |
| JWT stale after plan upgrade (Pitfall 8) | JWT design — TENANT-01/BILLING-02 (settled before STRIPE-01) | Simulate upgrade → verify session reflects new plan within TTL |
| Billing logic in route handlers (Pitfall 9) | Billing module setup — before BILLING-03 | `grep -r "from 'stripe'" src/` — no matches outside `src/lib/billing/` |
| Rate limit IP spoofing (Pitfall 10) | Rate limiting — RATE-01 | Load test with rotating `X-Forwarded-For` headers on authenticated session |
| Usage counter timezone bug (Pitfall 11) | Usage tracking — USAGE-01/USAGE-02 | Unit test with dates straddling UTC year/month boundaries |
| Cross-tenant data leakage (Pitfall 12) | Org data model — TENANT-01 | Integration test: org A requests org B's collection ID → 404 |

---

## Sources

- [Stripe: Using webhooks with subscriptions](https://docs.stripe.com/billing/subscriptions/webhooks) — event ordering, metadata scoping
- [Stripe: Resolve webhook signature verification errors](https://docs.stripe.com/webhooks/signature) — raw body requirement
- [Stripe: Idempotent requests](https://docs.stripe.com/api/idempotent_requests) — idempotency keys vs webhook-level idempotency
- [Stigg: Best practices I wish we knew when integrating Stripe webhooks](https://www.stigg.io/blog-posts/best-practices-i-wish-we-knew-when-integrating-stripe-webhooks) — out-of-order events, duplicate events
- [Kitson Broadhurst: Next.js App Router + Stripe Webhook Signature Verification](https://kitson-broadhurst.medium.com/next-js-app-router-stripe-webhook-signature-verification-ea9d59f3593f) — `req.text()` fix
- [next-auth GitHub Discussion #4229: How to manually trigger next-auth to refresh the JWT](https://github.com/nextauthjs/next-auth/discussions/4229) — JWT staleness after plan change
- [MongoDB: Atomicity and Transactions](https://www.mongodb.com/docs/manual/core/write-operations-atomicity/) — single-document atomic writes
- [Abdul Saleem Mohamed Faheem: Handling Race Conditions in Node and MongoDB](https://medium.com/tales-from-nimilandia/handling-race-conditions-and-concurrent-resource-updates-in-node-and-mongodb-by-performing-atomic-9f1a902bd5fa) — atomic conditional updates
- [Traefik: Security Alert — Next.js Middleware Bypass via HTTP Header](https://traefik.io/blog/security-alert-how-attackers-can-bypass-next-js-middleware-with-a-single-http-header) — rate limit header spoofing patterns
- [Hookdeck: How to Implement Webhook Idempotency](https://hookdeck.com/webhooks/guides/implement-webhook-idempotency) — event ID tracking pattern
- [codingcops: MongoDB Migration Guide](https://codingcops.com/mongodb-migration-guide-strategy-tools-pitfalls/) — backfill strategies
- Codebase inspection: `src/lib/auth/nextauth.config.ts` — existing JWT TTL re-fetch pattern (roleLastFetched, 60s TTL)
- Codebase inspection: `src/lib/db/models/TokenCollection.ts` — no organizationId field yet; `userId: null` legacy field
- Codebase inspection: `src/lib/db/models/User.ts` — no organizationId field; single-org model

---
*Pitfalls research for: Multi-tenant SaaS billing (Stripe + Mongoose + next-auth v4) added to existing Next.js 13.5.6 app*
*Researched: 2026-03-30*
