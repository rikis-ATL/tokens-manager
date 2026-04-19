# Phase 23: Billing Module and Limit Enforcement - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 23-billing-module-and-limit-enforcement
**Areas discussed:** 402 error payload shape, UpgradeModal Phase 23 scope, Usage counter storage, Header usage badge

---

## 402 Error Payload Shape

| Option | Description | Selected |
|--------|-------------|----------|
| Structured | `{ code: 'LIMIT_EXCEEDED', resource, current, max, tier }` | ✓ |
| Minimal | `{ error: '...limit reached', upgrade: true }` | |

**User's choice:** Structured payload
**Notes:** Allows UpgradeModal to render specific messaging per limit type (e.g., "You've used 1/1 collections on the Free plan")

---

## Rate Limit Status Code

| Option | Description | Selected |
|--------|-------------|----------|
| 429 for rate limits | HTTP standard — 429 = slow down, 402 = pay to unlock | ✓ |
| 402 for everything | Treat rate limits as a tier feature | |

**User's choice:** 429 for rate limits, 402 for billing limits

---

## UpgradeModal Phase 23 Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Full tier comparison UI | Build complete modal now; CTA button disabled until Phase 24 | ✓ |
| Minimal placeholder | Simple "you've hit your limit" message with disabled button | |

**User's choice:** Full tier comparison UI with disabled CTA

---

## UpgradeModal Location

| Option | Description | Selected |
|--------|-------------|----------|
| Global provider + hook | UpgradeModalProvider in layout; useUpgradeModal() hook | ✓ |
| Inline per feature | Each capped UI renders its own modal | |

**User's choice:** Global provider + useUpgradeModal() hook

---

## Usage Counter Storage

| Option | Description | Selected |
|--------|-------------|----------|
| Embedded on Organization | usage: { exportsThisMonth, exportResetAt } on Org doc | ✓ |
| Separate OrgUsage collection | New MongoDB collection with org ref | |

**User's choice:** Embedded on Organization document

---

## tokenCount Accuracy

| Option | Description | Selected |
|--------|-------------|----------|
| Live DB count | Aggregation on PUT /api/collections/[id] — no drift | ✓ |
| Cached counter on Org | Increment/decrement on token operations — risk of drift | |

**User's choice:** Live DB aggregation

---

## Header Usage Badge

| Option | Description | Selected |
|--------|-------------|----------|
| Compact badge | Pill in header: org + plan + counts; clicks to UpgradeModal | ✓ |
| Expanded usage strip | Dedicated bar below header with progress bars | |

**User's choice:** Compact badge

**Metrics selected:** org name + plan tier, token count, export count (AI key status omitted)

**User notes:** "in the app header i want to display: org name, token count, api use etc"

---

## Claude's Discretion

- Exact UpgradeModal tier table layout and copy
- Header badge loading/error state
- Debounce/cache for GET /api/org/usage

## Deferred Ideas

- Stripe Checkout CTA — Phase 24
- AI API key status in header badge — decided against for now
