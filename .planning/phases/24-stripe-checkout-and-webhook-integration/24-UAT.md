---
status: complete
phase: 24-stripe-checkout-and-webhook-integration
source:
  - 24-01-SUMMARY.md
  - 24-02-SUMMARY.md
  - 24-03-SUMMARY.md
started: 2026-04-25T00:00:00.000Z
updated: 2026-04-25T00:00:00.000Z
---

## Current Test

[testing complete]

## Tests

### 1. Stripe package installed and billing module isolated
expected: Run `node -e "require('stripe')" && echo ok` — prints "ok". Stripe import exists ONLY in `src/lib/billing/stripe-client.ts` — not in pages, components, or other lib files.
result: pass

### 2. Organization model extended with Stripe fields
expected: Open MongoDB or run a quick query — Organization documents have (or can have) `stripeCustomerId` and `stripeSubscriptionId` fields. The app starts cleanly with no schema errors.
result: pass

### 3. UpgradeModal triggers on collection limit
expected: Sign in as a free-tier user. Create a collection (the first one). Try to create a second collection. An UpgradeModal should appear with messaging about hitting the collections limit and options to view plans.
result: pass

### 4. /upgrade pricing page renders correctly
expected: Navigate to `/upgrade`. Page shows two pricing cards side by side — Pro and Team. Each card lists limits (collections, tokens, exports, etc.) pulled from the LIMITS config. Both "Choose Pro" and "Choose Team" buttons are visible.
result: pass

### 5. Checkout session initiates from /upgrade
expected: Click "Choose Pro" (requires STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PRO_PRICE_ID configured). Button shows "Redirecting…" briefly, then browser navigates to `checkout.stripe.com` showing the correct Pro plan price.
result: pass

### 6. /upgrade/success confirms upgrade after checkout
expected: After completing Stripe Checkout with test card `4242 4242 4242 4242`, browser lands on `/upgrade/success`. Page shows "Upgrade successful!" then "You are now on the pro plan." after ~1 second. Auto-redirects to `/collections` after ~3 seconds.
result: pass

### 7. Header tier badge updates after upgrade
expected: After completing checkout and returning to the app, the header tier badge shows "pro" (not "free"). User can now create multiple collections without hitting the limit.
result: blocked
blocked_by: third-party
reason: "stripe listen was not running — webhook never fired, org.planTier not updated in DB, header stays free"

### 8. /account page — free user view
expected: Sign in as a free user and navigate to `/account`. Page shows: current plan badge "free", organization name, and an "Upgrade" link (not a "Manage subscription" button).
result: pass
note: /account page is not linked from the user/header menu — admin users can only reach it via direct URL

### 9. /account page — paid user view + billing portal
expected: As a paid user (after upgrade), navigate to `/account`. Shows plan badge "pro" (or "team"), organization name, and a "Manage subscription" button. Clicking it redirects to `billing.stripe.com` portal.
result: pass
note: Verified via manual DB update (planTier set to pro). Webhook delivery timing means badge won't update automatically without a page refresh after webhook processes.

### 10. Webhook processes checkout.session.completed
expected: With `stripe listen --forward-to localhost:3000/api/stripe/webhook` running, complete a test checkout. Server logs show "Updated organization [id] to pro plan". Organization document in MongoDB shows `planTier: 'pro'`, `stripeCustomerId`, and `stripeSubscriptionId` populated.
result: pass
note: Full end-to-end flow confirmed — reset org to free, completed checkout, header showed "pro" on redirect to /collections. Webhook fired and updated org correctly.

### 11. Webhook idempotency — duplicate events skipped
expected: Replay the same Stripe webhook event (re-send from Stripe Dashboard or CLI). Server logs show "Event evt_xxx already processed, skipping" and the organization is NOT double-processed. `processedwebhookevents` collection has exactly one entry for that event ID.
result: pass
note: Logs confirmed "already processed, skipping". One document visible in processedwebhookevents collection in cluster explorer.

### 12. Webhook processes customer.subscription.updated
expected: Change the subscription plan in Stripe Dashboard (e.g., pro → team). Server logs show "Updated organization [id] to team plan". App reflects "team" badge after page refresh.
result: pass
note: Added Team product + removed Pro product in Stripe Dashboard. Logs showed "Updated organization to team plan". Header badge confirmed "team" after refresh.

### 13. Webhook processes customer.subscription.deleted — free reset
expected: Cancel the subscription in Stripe Dashboard or billing portal. Server logs show "Reset organization [id] to free plan". App reflects "free" badge and collection limits re-enforced.
result: pass
note: Cancelled subscription in Stripe Dashboard. Logs showed "Reset organization to free plan". Header badge confirmed "free" after refresh.

## Summary

total: 13
passed: 12
issues: 1
skipped: 0
blocked: 1
pending: 0

## Gaps

- truth: "Header tier badge updates after upgrade when stripe listen is running"
  status: resolved
  reason: "Test 7 failed only because stripe listen was not running — no code bug. Test 10 confirmed full end-to-end works correctly with webhook forwarding active. Setup documentation should note stripe listen as a required step for local testing."
  severity: minor
  test: 7
  artifacts: []
  missing:
    - "Document stripe listen as required prerequisite in local dev setup / README"

- truth: "/account page is accessible to admin users from the main navigation"
  status: failed
  reason: "User noted /account has no link in the user/header menu — only reachable via direct URL"
  severity: minor
  test: 8
  artifacts: []
  missing:
    - "Add /account link to user menu for admin role"
