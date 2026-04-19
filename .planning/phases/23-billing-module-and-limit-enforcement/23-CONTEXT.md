# Phase 23: Billing Module and Limit Enforcement - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Build `src/lib/billing/` with tiers config (free/pro/team), limit check functions, usage tracking with lazy UTC-month reset, rate limiting (per user ID), `SELF_HOSTED` bypass, 402 responses on all capped API routes, an UpgradeModal UI triggered on 402s, and a compact usage badge in the app header. Stripe Checkout and webhook integration are Phase 24.

</domain>

<decisions>
## Implementation Decisions

### planTier on Organization
- **D-01:** Add `planTier: { type: String, enum: ['free', 'pro', 'team'], default: 'free' }` to the Organization model. Default is 'free' — most restrictive. This was deliberately deferred from Phase 22.

### 402 Error Payload Shape
- **D-02:** Structured payload for billing limit hits: `{ code: 'LIMIT_EXCEEDED', resource: string, current: number, max: number, tier: string }`. Example: `{ code: 'LIMIT_EXCEEDED', resource: 'collections', current: 1, max: 1, tier: 'free' }`.
- **D-03:** Rate limit hits (RATE-01: 60 req/min per user) return **429 Too Many Requests**, not 402. The UpgradeModal only fires on 402 responses. This keeps HTTP semantics clean: 402 = pay to unlock, 429 = slow down.

### UpgradeModal
- **D-04:** Build the full tier comparison UI in Phase 23 — tier feature table, current plan badge, "Upgrade Plan" CTA. The CTA button is present but disabled/placeholder state until Phase 24 wires it to Stripe Checkout.
- **D-05:** Global `UpgradeModalProvider` in the app layout (`src/app/layout.tsx`). Any component calls `useUpgradeModal()` to trigger it. Central 402 interceptor in the API client layer calls `useUpgradeModal()` with the parsed payload — no per-component modal wiring needed.

### Usage Tracking Storage
- **D-06:** Usage counters embedded on the Organization document: `usage: { exportsThisMonth: number, exportResetAt: Date }`. No separate collection — atomic `$lt` checks and lazy reset stay as single-document operations.
- **D-07:** `tokenCount` is computed via live DB aggregation at PUT `/api/collections/[id]` time — not a cached counter. Eliminates drift. Free tier limit: 500 tokens across all org collections.

### Header Usage Badge
- **D-08:** Compact badge in the app header shows: org name + plan tier, token count (`342/500 tokens`), export count (`3/10 exports this month`). AI API key status omitted from the badge. Clicking the badge opens the UpgradeModal.
- **D-09:** Badge data fetched from a new endpoint `GET /api/org/usage` — returns `{ orgName, plan, tokenCount, tokenMax, exportsThisMonth, exportsMax }`.

### Established Pre-decisions (from STATE.md — do not re-ask)
- **D-10:** `rate-limiter-flexible@^10.0.1` with `RateLimiterMongo` — backed by existing Mongoose connection, zero new infrastructure.
- **D-11:** Rate limit key is always `session.user.id` — never client IP (IP is spoofable via X-Forwarded-For).
- **D-12:** Lazy UTC-month reset via atomic `findOneAndUpdate` before limit check on first export of a new month.
- **D-13:** Atomic `$lt` check for all limit enforcement — prevents race-condition over-creation.
- **D-14:** `SELF_HOSTED=true` checked first in all limit functions — short-circuits before any DB read.
- **D-15:** All Stripe SDK imports and billing logic stay in `src/lib/billing/` (BILLING-07 isolation boundary).

### Claude's Discretion
- Exact tier feature comparison table layout and copy in UpgradeModal
- Loading state for the header usage badge
- Debounce/cache duration for the GET /api/org/usage endpoint
- Error state in header badge when usage fetch fails

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — BILLING-01–07, LIMIT-01–05, RATE-01 requirements (full billing module scope)

### Phase 22 Foundation (must build on these)
- `.planning/phases/22-org-model-and-multi-tenant-foundation/22-CONTEXT.md` — Organization model decisions, assertOrgOwnership pattern, JWT extension
- `src/lib/db/models/Organization.ts` — Minimal org schema; Phase 23 adds `planTier` and `usage` fields
- `src/lib/auth/require-auth.ts` — requireAuth() pattern; billing checks compose after this

### Existing Auth/Middleware Patterns
- `src/lib/auth/require-auth.ts` — requireAuth() → assertOrgOwnership() → billing check pattern
- `src/app/api/user/settings/check/route.ts` — Example of `SELF_HOSTED` env var check pattern

### App Layout (UpgradeModal provider goes here)
- `src/app/layout.tsx` — Root layout where UpgradeModalProvider must be added

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `requireAuth()` in `src/lib/auth/require-auth.ts` — Billing checks compose after this in route handlers
- `Organization` Mongoose model — Add `planTier` and `usage` fields here
- `SELF_HOSTED` check pattern from `src/app/api/user/settings/check/route.ts` — Copy this guard pattern into billing functions
- `src/app/layout.tsx` — Root layout; `UpgradeModalProvider` wraps children here

### Established Patterns
- Route handlers: `requireAuth()` → `assertOrgOwnership()` → business logic. Billing checks slot in after `assertOrgOwnership()`.
- Mongoose model guard: `(mongoose.models.X as Model<XDoc>) || mongoose.model<XDoc>('X', schema)` — use for any new models
- Error response pattern: `NextResponse.json({ error }, { status: N })` — match for 402/429 responses

### Integration Points
- `POST /api/collections` — add LIMIT-01 collection count check
- `POST /api/collections/[id]/themes` — add LIMIT-02 theme count check
- `PUT /api/collections/[id]` — add LIMIT-03 token count check (live aggregation)
- File export and GitHub push endpoints — add LIMIT-04 export rate check
- Figma export endpoint — add LIMIT-05 export check
- App header component — add usage badge with GET /api/org/usage data
- `src/app/layout.tsx` — wrap with UpgradeModalProvider

</code_context>

<specifics>
## Specific Ideas

- Header badge: "Allied Telesis • Free | 342/500 tokens | 3/10 exports" — clicking opens UpgradeModal
- UpgradeModal CTA: "Upgrade to Pro" button present but disabled with tooltip "Available soon" until Phase 24
- The `GET /api/org/usage` endpoint is also useful for the UpgradeModal to show current usage context

</specifics>

<deferred>
## Deferred Ideas

- Stripe Checkout session creation — Phase 24
- Billing portal session — Phase 24
- Webhook handler (`req.text()` pattern, ProcessedWebhookEvent) — Phase 24
- AI API key status in header badge — decided against for now; can add later

</deferred>

---

*Phase: 23-billing-module-and-limit-enforcement*
*Context gathered: 2026-04-20*
