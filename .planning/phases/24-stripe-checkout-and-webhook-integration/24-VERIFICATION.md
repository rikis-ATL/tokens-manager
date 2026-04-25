---
phase: 24-stripe-checkout-and-webhook-integration
verified: 2026-04-25T00:00:00Z
status: human_needed
requirements_covered:
  - STRIPE-01
  - STRIPE-02
  - STRIPE-03
automated_checks: 12/12 passed
human_verification_count: 4
---

# Phase 24 Verification: Stripe Checkout and Webhook Integration

## Goal
Wire Stripe Checkout for plan upgrades and a webhook handler to keep org billing state in sync.

## Automated Checks: 12/12 PASSED

### Success Criteria

| # | Criterion | Verified | Evidence |
|---|-----------|----------|----------|
| 1 | User can initiate Stripe Checkout session | ✅ | `src/app/api/stripe/checkout/route.ts` — creates checkout session with Stripe SDK |
| 2 | Billing portal session creation | ✅ | `src/app/api/stripe/portal/route.ts` exists |
| 3 | `req.text()` for webhook signature — CRITICAL | ✅ | `grep 'req\.text()' webhook/route.ts` matches |
| 4 | `ProcessedWebhookEvent` idempotency guard | ✅ | `src/lib/db/models/ProcessedWebhookEvent.ts` exists |
| 5 | All 3 webhook event types handled | ✅ | `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` all present in webhook route |
| 6 | Success page for session refresh | ✅ | `src/app/upgrade/success/page.tsx` exists |

### Gap Closure (Plan 24-03)

| Must-Have | Verified | Evidence |
|-----------|----------|----------|
| GET /api/org/usage returns `collectionCount` + `collectionMax` | ✅ | `grep 'collectionCount' src/app/api/org/usage/route.ts` matches |
| UpgradeModalProvider routes admins to /account on limit hit | ✅ | `grep "router.push('/account')" UpgradeModalProvider.tsx` matches |
| UpgradeModal fetches real usage from /api/org/usage | ✅ | `grep 'api/org/usage' UpgradeModal.tsx` matches |
| UpgradeModal shows "Contact your admin to upgrade" | ✅ | `grep 'Contact your admin' UpgradeModal.tsx` matches |
| Collections page pre-checks limit before create dialog | ✅ | `handleNewCollection` function with `atLimit` guard in `page.tsx` |
| /account link in UserMenu dropdown | ✅ | `grep 'href="/account"' UserMenu.tsx` matches |
| /account link in OrgSidebar nav | ✅ | `grep 'href.*account' OrgSidebar.tsx` matches |

### Test Coverage

- Billing test suite: **69/69 tests passing** (12 suites)
- TypeScript: **0 errors**
- Code review: 0 critical, 3 warnings addressed in follow-up commit

## Human Verification Required

The following flows require manual testing with a real Stripe account or test environment:

### 1. Complete Stripe Checkout flow
**Steps:**
1. Sign in as a free-tier admin user
2. Open the upgrade modal or navigate to /upgrade
3. Click "Upgrade to Pro" — confirm redirect to Stripe Checkout
4. Complete checkout with Stripe test card `4242 4242 4242 4242`
5. Confirm redirect to /upgrade/success showing new tier

**Expected:** `org.planTier` updated to `pro` or `team` after webhook fires. Session refreshed — header badge shows new tier.

### 2. Webhook delivery and idempotency
**Steps:**
1. Run `stripe listen --forward-to localhost:3000/api/stripe/webhook`
2. Complete a checkout (test 1 above)
3. Confirm `checkout.session.completed` webhook received and processed
4. Replay the same webhook event
5. Confirm it's skipped (idempotency — `processedwebhookevents` collection has the event ID)

**Expected:** Second webhook replay logs "already processed" and makes no DB change.

### 3. Subscription management (portal)
**Steps:**
1. Navigate to /account as a subscribed user
2. Click "Manage subscription"
3. Confirm redirect to Stripe Billing Portal
4. Cancel the subscription from the portal
5. Confirm `customer.subscription.deleted` webhook fires and org reverts to `free` tier

**Expected:** Header badge shows `free` tier after cancellation webhook processes.

### 4. Role-based limit behavior on collections page
**Steps:**
1. Sign in as free-tier **admin** with 1 collection (at limit)
2. Click "New Collection" — confirm redirect to /account (no modal)
3. Sign in as free-tier **non-admin** with 1 collection (at limit)
4. Click "New Collection" — confirm UpgradeModal opens with real collection/token counts and "Contact your admin to upgrade" message

**Expected:** Admin → /account redirect. Non-admin → modal with real counts (not zeros).

## Requirements Traceability

| Requirement | Plan | Status |
|-------------|------|--------|
| STRIPE-01 | 24-01, 24-02 | ✅ Verified automated |
| STRIPE-02 | 24-02 | ✅ Verified automated |
| STRIPE-03 | 24-01, 24-03 | ✅ Verified automated |
