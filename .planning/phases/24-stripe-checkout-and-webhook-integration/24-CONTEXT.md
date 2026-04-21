# Phase 24: Stripe Checkout and Webhook Integration - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire Stripe Checkout for plan upgrades and a webhook handler to keep `org.planTier` in sync after payment events. Delivers: a `/upgrade` pricing page (Pro vs Team), Stripe Checkout session creation, Stripe billing portal session, a `/upgrade/success` confirmation page, a new `/account` user page with a Billing section, and a webhook handler for the three lifecycle events. Limit enforcement and the UpgradeModal are Phase 23 (already built).

</domain>

<decisions>
## Implementation Decisions

### Checkout Flow (STRIPE-01)
- **D-01:** App-embedded Pattern A — no separate marketing website. UpgradeModal "Upgrade to Pro" CTA (currently disabled, `data-testid="upgrade-cta"`) is enabled and navigates to `/upgrade`. Label stays "Upgrade to Pro" or changes to "View Plans" — Claude's discretion.
- **D-02:** `/upgrade` is a new in-app page showing Pro vs Team pricing cards side-by-side. Each card has a "Choose Plan" button that calls `POST /api/stripe/checkout` with the selected `priceId`. The API creates a Stripe Checkout session (`mode: 'subscription'`) and returns `{ url }` — browser follows the redirect to `checkout.stripe.com`.
- **D-03:** No tier pre-selection in the UpgradeModal — the modal CTA routes to `/upgrade` where the user picks their tier. This keeps the modal simple and avoids a secondary selector UI.

### Post-Checkout Flow
- **D-04:** Dedicated `/upgrade/success` page as the Stripe `success_url`. Page shows an upgrade confirmation, calls `GET /api/org/usage` to display the new plan, and auto-redirects to `/collections` after 3 seconds. `cancel_url` points back to `/upgrade`.
- **D-05:** Plan is NOT in JWT (Phase 23 decision — do not cache). The success page and usage badge both re-fetch from `GET /api/org/usage` which reads `org.planTier` live from the DB. No NextAuth session update needed.

### Billing Portal (STRIPE-02)
- **D-06:** A new `/account` page is built in Phase 24. It has a Billing section showing: current plan tier, a "Manage subscription" button (for Pro/Team), and subscription status. The "Manage subscription" button calls `POST /api/stripe/portal` which creates a Stripe billing portal session and redirects the user to `billing.stripe.com`.
- **D-07:** Free-tier users on `/account` see current plan + "Upgrade" link pointing to `/upgrade` instead of the manage-subscription button.

### Webhook Handler (STRIPE-03)
- **D-08:** Webhook route at `POST /api/stripe/webhook`. CRITICAL: must use `req.text()` (not `req.json()`) for Stripe HMAC signature verification — `req.json()` parses the body first and breaks the raw bytes needed for `stripe.webhooks.constructEvent()`.
- **D-09:** `ProcessedWebhookEvent` MongoDB collection for idempotency. Schema: `{ stripeEventId: string (unique index), processedAt: Date }`. Before processing any event, check if `stripeEventId` exists — skip and return 200 if so.
- **D-10:** Three event types handled:
  - `checkout.session.completed` → look up org by `stripeCustomerId`, update `org.planTier` based on price ID → tier mapping, store `stripeSubscriptionId` on org
  - `customer.subscription.updated` → look up org by `stripeCustomerId`, re-map `planTier` from current price ID
  - `customer.subscription.deleted` → reset `org.planTier` to `'free'`, clear `stripeSubscriptionId`

### Org Model Extensions
- **D-11:** Add `stripeCustomerId?: string` and `stripeSubscriptionId?: string` to the Organization model. These are set on `checkout.session.completed` and needed for billing portal session creation and subscription event routing.
- **D-12:** Price ID → tier mapping via env vars: `STRIPE_PRO_PRICE_ID` → `'pro'`, `STRIPE_TEAM_PRICE_ID` → `'team'`. Mapping function lives in `src/lib/billing/` (isolation boundary — BILLING-07).

### Established Pre-decisions (do not re-ask)
- **D-13:** `stripe@^17.7.0` pinned — v18 introduces `2025-03-31.basil` API breaking changes.
- **D-14:** No `@stripe/stripe-js` or `@stripe/react-stripe-js` — server-side `session.url` redirect only.
- **D-15:** All Stripe SDK imports and billing logic stay in `src/lib/billing/` (BILLING-07).
- **D-16:** `SELF_HOSTED=true` bypass: skip checkout/portal session creation gracefully when self-hosted.

### Claude's Discretion
- Exact label on the UpgradeModal CTA button ("Upgrade to Pro" vs "View Plans")
- `/account` page layout and additional user profile fields beyond billing
- Loading and error states on the `/upgrade/success` page
- Whether `/upgrade` is accessible when already on Pro/Team (show "already on this plan" state or redirect to `/account`)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — STRIPE-01, STRIPE-02, STRIPE-03 requirements

### Phase 23 Foundation (billing module already built)
- `.planning/phases/23-billing-module-and-limit-enforcement/23-CONTEXT.md` — UpgradeModal decisions (D-04, D-05), 402 payload shape, api-client interceptor, org model fields
- `src/components/billing/UpgradeModal.tsx` — Disabled CTA button to enable and wire to `/upgrade`
- `src/components/billing/UpgradeModalProvider.tsx` — Global modal provider context
- `src/lib/billing/tiers.ts` — LIMITS config (single source of truth for tier caps)
- `src/lib/api-client.ts` — Central 402 interceptor; Phase 24 adds Stripe redirect calls here or alongside

### Org Model (extend in Phase 24)
- `src/lib/db/models/Organization.ts` — Add `stripeCustomerId` and `stripeSubscriptionId` fields

### Auth Pattern (compose billing after)
- `src/lib/auth/require-auth.ts` — requireAuth() pattern used in all new API routes

### Existing API Patterns
- `src/app/api/org/usage/route.ts` — GET /api/org/usage used by success page and usage badge

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `requireAuth()` in `src/lib/auth/require-auth.ts` — all new API routes (`/api/stripe/checkout`, `/api/stripe/portal`, `/api/stripe/webhook`) use this
- `Organization` Mongoose model — add `stripeCustomerId` and `stripeSubscriptionId` here
- `UpgradeModal.tsx` — Phase 24 enables the disabled CTA button and routes it to `/upgrade`
- `GET /api/org/usage` — used by the `/upgrade/success` page to confirm new plan tier

### Established Patterns
- Route handler pattern: `requireAuth()` → business logic → `NextResponse.json()`
- Mongoose model guard: `(mongoose.models.X as Model<XDoc>) || mongoose.model<XDoc>('X', schema)` — use for `ProcessedWebhookEvent` model
- `SELF_HOSTED` env check: short-circuit before any Stripe SDK call (copy pattern from Phase 23 limit functions)

### Integration Points
- `src/components/billing/UpgradeModal.tsx` — enable CTA, navigate to `/upgrade`
- `src/lib/db/models/Organization.ts` — extend with Stripe fields
- `src/app/layout.tsx` — `/account` page layout (no provider changes needed)
- `src/app/api/stripe/` — new API directory for checkout, portal, webhook routes

</code_context>

<specifics>
## Specific Ideas

- `/upgrade` page: side-by-side Pro vs Team pricing cards. Each card shows LIMITS from `tiers.ts` (collections, themes, tokens, exports, rate limit). "Choose Plan" button per card calls the checkout API.
- `/upgrade/success` page: simple confirmation ("You're now on Pro!"), show new plan tier from `GET /api/org/usage`, 3-second auto-redirect to `/collections`.
- `/account` page: minimal for Phase 24 — current plan badge, "Manage subscription" button (Pro/Team) or "Upgrade" link (free), no need for full profile editing in this phase.
- `ProcessedWebhookEvent` model: just `stripeEventId` (unique) + `processedAt`. TTL index on `processedAt` (90 days) to keep collection small — Claude's discretion.

</specifics>

<deferred>
## Deferred Ideas

- Full user profile editing on `/account` (name, email, password) — future phase
- Team-tier seat management / inviting members from `/account` — future phase
- Trial period / free trial flow — not in scope for Phase 24
- Stripe metered billing / usage-based pricing — not in scope

</deferred>

---

*Phase: 24-stripe-checkout-and-webhook-integration*
*Context gathered: 2026-04-21*
