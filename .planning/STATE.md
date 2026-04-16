---
gsd_state_version: 1.0
milestone: v1.6
milestone_name: Multi-Tenant SaaS
status: executing
stopped_at: Milestone v1.6 initialized
last_updated: "2026-04-16T10:08:43.243Z"
last_activity: 2026-04-16
progress:
  total_phases: 19
  completed_phases: 17
  total_plans: 66
  completed_plans: 65
  percent: 98
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-11)

**Core value:** Token collections are always available and editable: stored in MongoDB, accessible via collection-scoped URLs, with per-collection Figma/GitHub config, full CRUD from the collections grid, Figma import/export fully integrated, and a Themes system where each theme is a complete token value set with per-group edit permissions, dark-mode awareness, and theme-targeted export.
**Current focus:** Phase 01 — review-math-node-features

## Current Position

Phase: 10
Plan: Not started
Status: Executing Phase 01
Last activity: 2026-04-16

## Accumulated Context

### Decisions

Key decisions captured from v1.6 research (pre-recorded in PROJECT.md):

- `stripe@^17.7.0` pinned below v18 — v18 introduces `2025-03-31.basil` API breaking changes
- `rate-limiter-flexible@^10.0.1` with `RateLimiterMongo` — backed by existing Mongoose connection; zero new infrastructure; avoids Redis dependency
- No `@stripe/stripe-js` or `@stripe/react-stripe-js` — server-side `session.url` redirect is current Stripe pattern
- `src/lib/billing/` isolation boundary — all Stripe SDK imports and billing logic stay in this module (BILLING-07)
- Do NOT cache plan in JWT — read from Org document at enforcement time to avoid stale plan after Stripe upgrade
- Rate limit key: always `session.user.id`, never client IP — IP spoofable via X-Forwarded-For
- Webhook route uses `req.text()` exclusively — `req.json()` breaks Stripe HMAC signature verification
- `ProcessedWebhookEvent` MongoDB collection for webhook idempotency
- Lazy UTC-month reset (USAGE-02) — atomic `findOneAndUpdate` before limit check on first export of new month
- Atomic `$lt` check for limit enforcement — prevents race-condition over-creation
- `assertOrgOwnership()` returns 404 not 403 — avoids confirming resource existence to cross-tenant requestors
- SELF_HOSTED bypass checked first in all limit functions — short-circuits before any DB read or Stripe call
- Compound `{ _id, organizationId }` indexes on User and TokenCollection — prevents COLLSCAN on collection list queries
- org created atomically with user at registration — organizationId in JWT from first sign-in (v1.5 foundation in place)

### Pending Todos

- Create `feature/v1.6-multi-tenant-saas` git branch before beginning Phase 22 work
- Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`, `STRIPE_TEAM_PRICE_ID`, `INITIAL_ORG_NAME`, `SELF_HOSTED` to `.env.local` documentation before Phase 23/24
- Confirm deployment target (single-instance vs. Vercel serverless) before Phase 23 — determines whether in-process Map or `RateLimiterMongo` is appropriate for rate limiting
- Create Stripe price IDs in Dashboard (ops step) before Phase 24 begins

### Deferred from v1.9

Phases 30 (AI-Assisted Naming and Queries) and 32 (MCP Tool Service Layer) were not started and remain deferred. Requirements AI-11 to AI-14 and MCP-01 remain in PROJECT.md Active section.

## Session Continuity

Last session: 2026-04-11T00:00:00.000Z
Stopped at: Milestone v1.6 initialized
Next action: Run roadmap creation — `/gsd-plan-phase [N]` once roadmap is written
