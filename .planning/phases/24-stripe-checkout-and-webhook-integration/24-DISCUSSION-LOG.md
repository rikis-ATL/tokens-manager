# Phase 24: Stripe Checkout and Webhook Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 24-stripe-checkout-and-webhook-integration
**Areas discussed:** Upgrade target & modal UX, Post-checkout flow, Billing portal access

---

## Checkout Pattern

| Option | Description | Selected |
|--------|-------------|----------|
| App-embedded (Pattern A) | In-app checkout via Stripe hosted page — no separate website | ✓ |
| Marketing site-first (Pattern B) | Separate public website initiates checkout; app syncs via webhooks | |

**User's choice:** Pattern A — app-embedded  
**Notes:** User asked whether a separate website was more common. Clarified that Stripe's hosted checkout page IS the external UI — Pattern A is the standard for SaaS tools without a marketing site.

---

## Upgrade Target & Modal UX

| Option | Description | Selected |
|--------|-------------|----------|
| Pro only | Button always initiates Pro checkout | |
| User selects in modal | Modal adds Pro/Team selector before checkout | |
| Route to /upgrade page | UpgradeModal CTA navigates to a new /upgrade page where user selects tier | ✓ |

**User's choice:** "Just send them to the tier page where they can select — don't need to select here"  
**Notes:** User rejected pre-selection in the modal. New `/upgrade` page shows Pro vs Team pricing cards; each card has its own "Choose Plan" CTA that initiates a checkout session for the specific price ID.

---

## Post-Checkout Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated /upgrade/success page | Confirmation page, fetches new plan, auto-redirects to /collections after 3s | ✓ |
| Redirect to /collections + toast | success_url points to /collections?upgraded=true, shows toast | |
| Badge auto-refreshes silently | No special handling; usage badge picks up new plan on next fetch | |

**User's choice:** Dedicated `/upgrade/success` page  
**Notes:** Clean UX, easy to verify. Plan re-fetched from GET /api/org/usage (not JWT) per Phase 23 D-15.

---

## Billing Portal Access

| Option | Description | Selected |
|--------|-------------|----------|
| Usage badge in header | Header badge gains "Manage subscription" link for Pro/Team | |
| Settings page billing section | New Billing tab on existing settings | |
| UpgradeModal adapts | Modal shows "Manage subscription" when user is already paid | |
| New /account page | Dedicated user account page with Billing section | ✓ |

**User's choice:** "User page / subscription" — new `/account` page  
**Notes:** Phase 24 creates a new `/account` page with a Billing section. Pro/Team users see "Manage subscription" button; free users see current plan + "Upgrade" link.

## Tier Page

| Option | Description | Selected |
|--------|-------------|----------|
| New /upgrade page in app | In-app pricing page with Pro/Team cards, each with "Choose Plan" CTA | ✓ |
| Stripe Pricing Table embed | Stripe-rendered widget; requires @stripe/stripe-js | |
| Stripe Customer Portal | Direct portal redirect — no custom pricing UI | |

**User's choice:** New `/upgrade` page  
**Notes:** Keeps @stripe/stripe-js out of the bundle (consistent with Phase 23 pre-decision D-14).

---

## Claude's Discretion

- Exact label on UpgradeModal CTA ("Upgrade to Pro" vs "View Plans")
- `/account` page layout beyond billing section
- Loading/error states on `/upgrade/success`
- ProcessedWebhookEvent TTL index duration
- Behavior on `/upgrade` when user is already on Pro/Team

## Deferred Ideas

- Full user profile editing on `/account` — future phase
- Team seat management from `/account` — future phase
- Trial period / free trial flow — not in scope
