---
phase: 24
slug: stripe-checkout-and-webhook-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-21
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x |
| **Config file** | jest.config.js (check before creating) |
| **Quick run command** | `yarn jest --testPathPattern=billing --passWithNoTests` |
| **Full suite command** | `yarn jest --passWithNoTests` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `yarn jest --testPathPattern=billing --passWithNoTests`
- **After every plan wave:** Run `yarn jest --passWithNoTests`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 24-01-01 | 01 | 1 | STRIPE-01 | T-24-01 / — | stripe package installed | unit | `node -e "require('stripe')" && echo ok` | ✅ / ❌ W0 | ⬜ pending |
| 24-01-02 | 01 | 1 | STRIPE-01 | T-24-02 | Stripe singleton not re-initialized | unit | `yarn jest --testPathPattern=stripe-client` | ❌ W0 | ⬜ pending |
| 24-01-03 | 01 | 2 | STRIPE-01 | T-24-03 | Checkout session created with metadata.priceId | unit | `yarn jest --testPathPattern=checkout` | ❌ W0 | ⬜ pending |
| 24-01-04 | 01 | 2 | STRIPE-02 | T-24-04 | Billing portal session created | unit | `yarn jest --testPathPattern=billing-portal` | ❌ W0 | ⬜ pending |
| 24-02-01 | 02 | 3 | STRIPE-03 | T-24-05 | Webhook uses req.text() not req.json() | unit | `yarn jest --testPathPattern=webhook` | ❌ W0 | ⬜ pending |
| 24-02-02 | 02 | 3 | STRIPE-03 | T-24-06 | Idempotency: duplicate events rejected | unit | `yarn jest --testPathPattern=webhook` | ❌ W0 | ⬜ pending |
| 24-02-03 | 02 | 3 | STRIPE-03 | T-24-07 | All 3 event types handled | unit | `yarn jest --testPathPattern=webhook` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/billing/__tests__/stripe-client.test.ts` — stubs for STRIPE-01
- [ ] `src/lib/billing/__tests__/checkout.test.ts` — stubs for STRIPE-01
- [ ] `src/lib/billing/__tests__/webhook-handler.test.ts` — stubs for STRIPE-03
- [ ] jest config confirmed or created

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| UpgradeModal → Stripe Checkout redirect | STRIPE-01 | Requires live Stripe test mode and browser | Click Upgrade in UI, verify redirect to Stripe Checkout, complete with test card 4242... |
| Session refresh after checkout | STRIPE-01 | Requires live checkout completion | Complete checkout, verify UI tier badge updates without page reload |
| Billing portal opens | STRIPE-02 | Requires existing Stripe customer | Navigate to billing settings, click Manage Subscription |
| Webhook delivery via Stripe CLI | STRIPE-03 | Requires `stripe listen` forwarding | Run `stripe listen --forward-to localhost:3000/api/stripe/webhook`, trigger test events |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
