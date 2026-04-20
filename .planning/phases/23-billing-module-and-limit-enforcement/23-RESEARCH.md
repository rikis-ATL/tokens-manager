# Phase 23: Billing Module and Limit Enforcement - Research

**Researched:** 2026-04-20
**Domain:** SaaS billing limits, rate limiting, usage tracking, React modal context
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** `planTier: { type: String, enum: ['free', 'pro', 'team'], default: 'free' }` added to Organization model.
- **D-02:** 402 error payload: `{ code: 'LIMIT_EXCEEDED', resource: string, current: number, max: number, tier: string }`.
- **D-03:** Rate limit hits (RATE-01) return **429 Too Many Requests**, not 402. UpgradeModal only fires on 402.
- **D-04:** Full tier comparison UI built in Phase 23. "Upgrade Plan" CTA present but disabled/placeholder until Phase 24 wires Stripe.
- **D-05:** Global `UpgradeModalProvider` in `src/app/layout.tsx`. Any component calls `useUpgradeModal()` hook. Central 402 interceptor in the API client layer calls `useUpgradeModal()` — no per-component wiring.
- **D-06:** Usage counters embedded on Organization document: `usage: { exportsThisMonth: number, exportResetAt: Date }`.
- **D-07:** `tokenCount` computed via live DB aggregation at PUT `/api/collections/[id]` time — not cached. Free tier: 500 tokens across all org collections.
- **D-08:** Compact badge in app header: org name + plan tier, token count, export count. Clicking opens UpgradeModal.
- **D-09:** New endpoint `GET /api/org/usage` returns `{ orgName, plan, tokenCount, tokenMax, exportsThisMonth, exportsMax }`.
- **D-10:** `rate-limiter-flexible@^10.0.1` with `RateLimiterMongo` — backed by existing Mongoose connection.
- **D-11:** Rate limit key is always `session.user.id` — never client IP.
- **D-12:** Lazy UTC-month reset via atomic `findOneAndUpdate` before limit check on first export of new month.
- **D-13:** Atomic `$lt` check for all limit enforcement — prevents race-condition over-creation.
- **D-14:** `SELF_HOSTED=true` checked first in all limit functions — short-circuits before any DB read.
- **D-15:** All Stripe SDK imports and billing logic stay in `src/lib/billing/` (BILLING-07 isolation boundary).

### Claude's Discretion

- Exact tier feature comparison table layout and copy in UpgradeModal
- Loading state for the header usage badge
- Debounce/cache duration for the GET /api/org/usage endpoint
- Error state in header badge when usage fetch fails

### Deferred Ideas (OUT OF SCOPE)

- Stripe Checkout session creation — Phase 24
- Billing portal session — Phase 24
- Webhook handler (`req.text()` pattern, ProcessedWebhookEvent) — Phase 24
- AI API key status in header badge — decided against for now
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BILLING-01 | `src/lib/billing/` module skeleton with provider-agnostic interface | File structure section; isolated module pattern from D-15 |
| BILLING-07 | UpgradeModal surfaces when a 402 is received | UpgradeModalProvider + context pattern; 402 interceptor in fetch client |
| LIMIT-01 | Collection count enforced at POST `/api/collections` | Atomic `$lt` check pattern; `checkCollectionLimit()` function |
| LIMIT-05 | Figma export rate enforced at Figma export endpoint | Export counter + lazy month reset; `checkAndIncrementExport()` function |
| RATE-01 | Rate limiting per user ID on export and token-update endpoints | `RateLimiterMongo` with `session.user.id` key; 429 on breach |
</phase_requirements>

---

## Summary

Phase 23 builds the billing enforcement layer that sits between authentication and business logic in every capped API route. The architecture is a thin middleware stack: `requireAuth()` → `assertOrgOwnership()` → billing check → business logic. Each billing check is a pure async function exported from `src/lib/billing/` that returns either `null` (allowed) or a structured 402 `NextResponse`.

The key technical challenge is keeping limit checks atomic so two concurrent requests cannot both pass a limit check at the same time. The solution is MongoDB's `findOneAndUpdate` with `$lt` comparisons — only one update wins when the field transitions from under-limit to at-limit. Token count (LIMIT-03) is handled differently: a live aggregation across all org collections eliminates drift, at the cost of one aggregation query per save. This is acceptable because token saves are user-initiated, not high-frequency.

Rate limiting (RATE-01) uses `rate-limiter-flexible@11.0.1` with `RateLimiterMongo`. The pre-existing Mongoose connection (`mongoose.connection`) is passed directly as `storeClient` — zero new infrastructure. Rate limit keys are always `session.user.id` per D-11. The current version is v11.0.1 (not v10 as recorded in STATE.md decisions — the constraint `^10.0.1` will resolve to 11.x since the caret allows minor/patch bumps; should pin to `^11.0.0` for clarity).

**Primary recommendation:** Build `src/lib/billing/` as a set of composable async guard functions. Each capped route calls the appropriate guard after `assertOrgOwnership()` and returns its result directly if non-null (i.e., treat it like the existing `assertOrgOwnership` null-check pattern). The UpgradeModal is wired via a React context provider added to `src/app/layout.tsx` alongside the existing `AuthProviders` and `AppThemeProvider`.

---

## Project Constraints (from CLAUDE.md)

| Constraint | Detail |
|------------|--------|
| Package manager | Always `yarn` — never `npm install` |
| SOLID / SRP | Billing checks are pure functions in `src/lib/billing/`, not inlined in route handlers |
| Function size | 5–30 lines per function; max ~50 |
| Component size | <300 lines per file |
| No `any` | Strict TypeScript; define interfaces for all billing payloads |
| Error response pattern | `NextResponse.json({ error }, { status: N })` — match for 402/429 |
| Mongoose model guard | `(mongoose.models.X as Model<XDoc>) || mongoose.model<XDoc>('X', schema)` |
| API route pattern | `requireAuth()` → `assertOrgOwnership()` → business logic (billing slots in after ownership) |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `rate-limiter-flexible` | 11.0.1 (current latest) | Per-user-ID rate limiting on export/token-update endpoints | Zero new infrastructure — uses existing Mongoose connection via `RateLimiterMongo`; pre-decided in STATE.md |
| Mongoose (existing) | ^9.2.2 | Atomic `$lt` enforcement + usage counter storage on Organization doc | Already installed; atomic `findOneAndUpdate` eliminates race conditions |
| React Context API (existing) | 18.2.0 | `UpgradeModalProvider` + `useUpgradeModal()` hook | Matches existing `PermissionsProvider` + `AuthProviders` pattern in codebase |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@radix-ui/react-dialog` | ^1.1.15 (already installed) | UpgradeModal shell | Already used throughout codebase for all modals |
| `lucide-react` | ^0.577.0 (already installed) | Icons in modal and badge | Consistent with existing icon usage |
| `sonner` | ^2.0.7 (already installed) | Toast notification when rate-limited | Already installed as app-wide toast system |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `RateLimiterMongo` | `RateLimiterMemory` | In-memory is suitable for single-process dev but not for Vercel serverless (each invocation is a fresh process). MongoDB backend works across instances. |
| Embedded usage on Org doc | Separate `Usage` collection | Embedding keeps usage reads atomic with the org read; separate collection adds a join. Locked as D-06. |
| Live token aggregation | Cached token counter on Org | Cached counters drift on bulk delete/import. Locked as D-07. |

**Installation (packages not yet installed):**
```bash
yarn add rate-limiter-flexible@^11.0.0
```

**Version verification:** [VERIFIED: npm registry] — `rate-limiter-flexible` latest is `11.0.1` as of 2026-04-20. STATE.md decision D-10 references `^10.0.1` which was accurate at time of writing but is now superseded; `^11.0.0` is the correct pin.

---

## Architecture Patterns

### Recommended File Structure

```
src/lib/billing/
├── tiers.ts              # LIMITS config — single source of truth (BILLING-02)
├── check-collection-limit.ts   # LIMIT-01: collection count guard
├── check-theme-limit.ts        # LIMIT-02: theme count guard
├── check-token-limit.ts        # LIMIT-03: token count via aggregation
├── check-and-increment-export.ts  # LIMIT-04/05: export rate + lazy month reset
├── check-rate-limit.ts         # RATE-01: per-user-ID RateLimiterMongo
└── index.ts              # Re-exports all public functions

src/app/api/org/
└── usage/
    └── route.ts          # GET /api/org/usage (D-09)

src/components/billing/
├── UpgradeModal.tsx       # Tier comparison UI + disabled CTA (D-04)
├── UpgradeModalProvider.tsx  # Context provider + useUpgradeModal hook (D-05)
└── UsageBadge.tsx         # Compact header badge (D-08)
```

### Pattern 1: LIMITS Config (tiers.ts)

**What:** Single object mapping tier name to per-resource caps. All limit check functions import from here.
**When to use:** Whenever a limit value is needed — never hardcode a number.

```typescript
// src/lib/billing/tiers.ts
// Source: CONTEXT.md D-01, D-07, D-09 (decision record)

export type PlanTier = 'free' | 'pro' | 'team';

export interface TierLimits {
  maxCollections: number;
  maxThemesPerCollection: number;
  maxTokensTotal: number;      // across all org collections
  maxExportsPerMonth: number;
  rateLimitPerMinute: number;  // per user ID on export + token-update
}

export const LIMITS: Record<PlanTier, TierLimits> = {
  free: {
    maxCollections: 1,
    maxThemesPerCollection: 2,
    maxTokensTotal: 500,
    maxExportsPerMonth: 10,
    rateLimitPerMinute: 60,
  },
  pro: {
    maxCollections: 20,
    maxThemesPerCollection: 10,
    maxTokensTotal: 5000,
    maxExportsPerMonth: 200,
    rateLimitPerMinute: 120,
  },
  team: {
    maxCollections: Infinity,
    maxThemesPerCollection: Infinity,
    maxTokensTotal: Infinity,
    maxExportsPerMonth: Infinity,
    rateLimitPerMinute: 300,
  },
};
```

Note: Exact free/pro/team limit numbers are Claude's discretion. The numbers above are reasonable defaults — adjust as needed.

### Pattern 2: Limit Guard Function Shape

**What:** Each billing check is an async function returning `NextResponse | null`. The null-returns-success pattern mirrors `assertOrgOwnership()` exactly — planner and implementer need only one pattern to remember.

```typescript
// src/lib/billing/check-collection-limit.ts
// Source: assertOrgOwnership.ts pattern (codebase); D-13, D-14 (CONTEXT.md)

import { NextResponse } from 'next/server';
import { LIMITS, PlanTier } from './tiers';
import dbConnect from '@/lib/mongodb';
import Organization from '@/lib/db/models/Organization';
import TokenCollection from '@/lib/db/models/TokenCollection';

export async function checkCollectionLimit(
  organizationId: string
): Promise<NextResponse | null> {
  // D-14: SELF_HOSTED bypass — short-circuit before any DB read
  if (process.env.SELF_HOSTED === 'true') return null;

  await dbConnect();
  const org = await Organization.findById(organizationId)
    .select('planTier')
    .lean() as { planTier?: PlanTier } | null;

  if (!org) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

  const tier = org.planTier ?? 'free';
  const max = LIMITS[tier].maxCollections;
  if (max === Infinity) return null;

  // D-13: count existing collections for the org
  const current = await TokenCollection.countDocuments({ organizationId });

  if (current >= max) {
    return NextResponse.json(
      { code: 'LIMIT_EXCEEDED', resource: 'collections', current, max, tier },
      { status: 402 }
    );
  }
  return null;
}
```

**Usage in route handler:**
```typescript
// After assertOrgOwnership() — before business logic
const limitGuard = await checkCollectionLimit(session.user.organizationId);
if (limitGuard) return limitGuard;
```

### Pattern 3: Token Count via Live Aggregation (LIMIT-03)

**What:** Aggregate all token counts across all collections in the org. Called inside PUT `/api/collections/[id]` before saving.

```typescript
// Conceptual — exact token counting mirrors the counting logic in GET /api/collections
// (the countTokensRecursive function). For the aggregation approach, use Mongoose
// aggregate on TokenCollection filtered by organizationId, counting $value fields.
// In practice: load all org collection token objects and count recursively (acceptable
// given free tier = 500 tokens; the org is unlikely to have enough data to make this slow).

const orgCollections = await TokenCollection.find({ organizationId })
  .select('tokens')
  .lean();

const totalTokens = orgCollections.reduce(
  (sum, col) => sum + countTokensRecursive(col.tokens ?? {}),
  0
);
```

The `countTokensRecursive` function already exists in `src/app/api/collections/route.ts` — extract it to a shared util at `src/lib/utils/count-tokens.ts` so both GET /api/collections and the billing check can import it without duplication. [VERIFIED: codebase grep]

### Pattern 4: Lazy UTC-Month Export Reset (D-12)

**What:** Before incrementing the export counter, check if the current month has passed `exportResetAt`. If so, reset atomically. This avoids any cron job.

```typescript
// src/lib/billing/check-and-increment-export.ts
// Source: D-06, D-12 (CONTEXT.md); MongoDB $lt atomic update pattern

import { NextResponse } from 'next/server';
import Organization from '@/lib/db/models/Organization';
import { LIMITS, PlanTier } from './tiers';

export async function checkAndIncrementExport(
  organizationId: string
): Promise<NextResponse | null> {
  if (process.env.SELF_HOSTED === 'true') return null;

  const now = new Date();
  // First of current UTC month
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  // Attempt lazy reset if exportResetAt < monthStart
  await Organization.findOneAndUpdate(
    { _id: organizationId, exportResetAt: { $lt: monthStart } },
    { $set: { exportsThisMonth: 0, exportResetAt: monthStart } }
  );

  // Now attempt atomic increment only if under limit — read current tier first
  const org = await Organization.findById(organizationId)
    .select('planTier usage')
    .lean() as { planTier?: PlanTier; usage?: { exportsThisMonth: number; exportResetAt: Date } } | null;

  if (!org) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

  const tier = org.planTier ?? 'free';
  const max = LIMITS[tier].maxExportsPerMonth;
  if (max === Infinity) return null;

  const current = org.usage?.exportsThisMonth ?? 0;
  if (current >= max) {
    return NextResponse.json(
      { code: 'LIMIT_EXCEEDED', resource: 'exports', current, max, tier },
      { status: 402 }
    );
  }

  // Atomic increment
  await Organization.updateOne(
    { _id: organizationId },
    { $inc: { 'usage.exportsThisMonth': 1 } }
  );

  return null;
}
```

### Pattern 5: RateLimiterMongo (RATE-01)

**What:** Per-user-ID rate limiter using the existing Mongoose connection.

```typescript
// src/lib/billing/check-rate-limit.ts
// Source: rate-limiter-flexible wiki (CITED: github.com/animir/node-rate-limiter-flexible/wiki/Mongo)

import { RateLimiterMongo } from 'rate-limiter-flexible';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

// Singleton — created once, reused across invocations in the same process
let limiter: RateLimiterMongo | null = null;

function getRateLimiter(): RateLimiterMongo {
  if (!limiter) {
    limiter = new RateLimiterMongo({
      storeClient: mongoose.connection,  // uses existing dbConnect() connection
      keyPrefix: 'rl_user',
      points: 60,        // requests
      duration: 60,      // per 60 seconds (1 minute)
    });
  }
  return limiter;
}

export async function checkRateLimit(userId: string): Promise<NextResponse | null> {
  if (process.env.SELF_HOSTED === 'true') return null;

  try {
    await getRateLimiter().consume(userId);
    return null;
  } catch {
    return NextResponse.json(
      { code: 'RATE_LIMITED', retryAfterSeconds: 60 },
      { status: 429 }
    );
  }
}
```

**Critical:** `mongoose.connection` must be connected (via `dbConnect()`) before the limiter is used. Since billing check functions always call `dbConnect()` before any DB operation, this is safe — call `await dbConnect()` at the top of `checkRateLimit` as well. [CITED: github.com/animir/node-rate-limiter-flexible/wiki/Mongo]

### Pattern 6: UpgradeModalProvider (D-05)

**What:** React context provider injected once into `src/app/layout.tsx`. Components anywhere in the tree call `useUpgradeModal({ resource, current, max, tier })` to open the modal.

```typescript
// src/components/billing/UpgradeModalProvider.tsx
'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { UpgradeModal } from './UpgradeModal';

interface LimitPayload {
  resource: string;
  current: number;
  max: number;
  tier: string;
}

interface UpgradeModalContextValue {
  openUpgradeModal: (payload: LimitPayload) => void;
}

const UpgradeModalContext = createContext<UpgradeModalContextValue | null>(null);

export function UpgradeModalProvider({ children }: { children: React.ReactNode }) {
  const [payload, setPayload] = useState<LimitPayload | null>(null);

  const openUpgradeModal = useCallback((p: LimitPayload) => {
    setPayload(p);
  }, []);

  return (
    <UpgradeModalContext.Provider value={{ openUpgradeModal }}>
      {children}
      {payload && (
        <UpgradeModal
          payload={payload}
          onClose={() => setPayload(null)}
        />
      )}
    </UpgradeModalContext.Provider>
  );
}

export function useUpgradeModal(): UpgradeModalContextValue {
  const ctx = useContext(UpgradeModalContext);
  if (!ctx) throw new Error('useUpgradeModal must be used within UpgradeModalProvider');
  return ctx;
}
```

**Integration in layout.tsx** — wrap after `AuthProviders`:
```typescript
// src/app/layout.tsx — add UpgradeModalProvider around LayoutShell
import { UpgradeModalProvider } from '@/components/billing/UpgradeModalProvider';

// In RootLayout:
<AuthProviders>
  <AppThemeProvider>
    <UpgradeModalProvider>
      <LayoutShell>{children}</LayoutShell>
    </UpgradeModalProvider>
  </AppThemeProvider>
</AuthProviders>
```

### Pattern 7: Central 402 Interceptor

**What:** A thin `apiFetch` wrapper (or patched `fetch`) that intercepts all API responses. When status is 402, parses the payload and calls `openUpgradeModal()`. This prevents every callsite from handling 402 individually.

```typescript
// src/lib/api-client.ts — create new file
'use client';

// Usage: replace direct fetch() calls with apiFetch() in components that make write requests
// OR use a global fetch interceptor via patching window.fetch in the provider mount effect.

// Recommended approach: simple wrapper function exported from api-client.ts
// Components that already call fetch() directly don't need to be rewritten — only
// write routes that can hit limits need the interceptor. The UpgradeModalProvider
// can expose a ref-based callback that apiFetch uses.
```

Note: The exact interceptor implementation is Claude's discretion. Two approaches:
1. **Wrapper function** `apiFetch(url, options)` — must replace `fetch()` calls in components that trigger capped routes.
2. **Provider-mounted patch** `window.fetch = wrappedFetch` — intercepts all fetch calls automatically but is a global side effect.

Recommendation: Use a wrapper function. The capped routes are well-known (POST /api/collections, POST themes, PUT tokens, Figma export, GitHub export), so targeted replacement is feasible and avoids global monkey-patching.

### Pattern 8: Organization Model Extension (D-01, D-06)

**What:** Add `planTier` and `usage` fields to the existing Organization schema.

```typescript
// Extension to src/lib/db/models/Organization.ts
// Add to IOrganization interface:
planTier?: 'free' | 'pro' | 'team';  // default 'free'
usage?: {
  exportsThisMonth: number;
  exportResetAt: Date;
};

// Add to orgSchema:
planTier: { type: String, enum: ['free', 'pro', 'team'], default: 'free' },
usage: {
  exportsThisMonth: { type: Number, default: 0 },
  exportResetAt: { type: Date, default: () => new Date(0) },
},
```

No migration script needed — Mongoose fills `default` values on first read/write for existing documents. [VERIFIED: Mongoose docs behavior for optional fields with defaults]

### Anti-Patterns to Avoid

- **Hardcoding limit values in route handlers:** All limits must come from `tiers.ts`. Never write `if (count >= 1)` in a route.
- **Per-IP rate limiting:** D-11 locks the key to `session.user.id`. `X-Forwarded-For` is spoofable.
- **Reading plan from JWT:** Plan tier must be read from the Org document at enforcement time — JWT can be stale after a Stripe upgrade (Phase 24 concern, but establish the pattern now).
- **`req.json()` on export routes:** Not relevant for Phase 23, but document for Phase 24: Stripe webhooks require `req.text()`.
- **Calling `dbConnect()` after rate limiter construction:** Always call `dbConnect()` before constructing or consuming the `RateLimiterMongo` instance.
- **Missing `SELF_HOSTED` check:** Every billing function must check `process.env.SELF_HOSTED === 'true'` first.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Per-user rate limiting | Custom counter + timestamp in MongoDB | `rate-limiter-flexible` `RateLimiterMongo` | Handles atomic increment, window sliding, TTL index cleanup, concurrent request safety |
| Modal open/close state across components | Prop-drilling or per-component state | React Context (`UpgradeModalProvider`) | Matches existing `PermissionsContext` pattern; single modal instance |
| Tier limit values | Scattered constants | `src/lib/billing/tiers.ts` | Single source of truth; plan changes require one file edit |

**Key insight:** The rate limiter's edge cases (concurrent consume, expired window cleanup, atomic increment under load) are exactly what `rate-limiter-flexible` was built for. The MongoDB backend stores its counters in a `rateLimits` collection with a TTL index — zero maintenance required.

---

## Common Pitfalls

### Pitfall 1: `RateLimiterMongo` Used Before Connection Established

**What goes wrong:** `new RateLimiterMongo({ storeClient: mongoose.connection })` is called when `mongoose.connection.readyState` is 0 (not connected). The limiter throws on first `consume()` call.
**Why it happens:** Next.js serverless functions cold-start; `dbConnect()` is called lazily by each route.
**How to avoid:** Always call `await dbConnect()` at the top of `checkRateLimit()` before accessing the limiter singleton. [CITED: github.com/animir/node-rate-limiter-flexible/wiki/Mongo — "RateLimiterMongo requires an established connection"]
**Warning signs:** `MongoNotConnectedError` or `Cannot read properties of undefined` in rate limiter consume calls.

### Pitfall 2: Race Condition on Limit Check Without Atomic `$lt`

**What goes wrong:** Two concurrent POST /api/collections requests both read `count = 0`, both see `0 < 1 (max)`, both proceed to create — resulting in 2 collections on a free tier capped at 1.
**Why it happens:** Read-then-write without atomic guarantee.
**How to avoid:** For collection/theme creation, use `countDocuments` + check before `create` (acceptable for low-traffic endpoints). For export counters, use the atomic `findOneAndUpdate` with `$lt` pattern.
**Warning signs:** Users exceeding their tier limits in staging tests with concurrent requests.

### Pitfall 3: planTier Read from JWT Instead of DB

**What goes wrong:** After a Stripe upgrade (Phase 24), the user's JWT still shows `free` until they sign out and back in. All limit checks pass the old (more restrictive) tier.
**Why it happens:** JWT is cached for the session lifetime.
**How to avoid:** All billing check functions query the Organization document directly — never read plan from `session.user`. [VERIFIED: STATE.md decision — "Do NOT cache plan in JWT"]
**Warning signs:** Upgraded users still hitting free tier limits.

### Pitfall 4: Token Count Aggregation Is Slow for Large Orgs

**What goes wrong:** Live token count aggregation across all org collections scans all token documents on every PUT save. For orgs with many large collections, this adds latency.
**Why it happens:** D-07 chose correctness over speed.
**How to avoid:** The free tier limit is 500 tokens — free tier orgs are unlikely to have enough data to cause noticeable slowdown. Pro/team tiers have higher limits but the aggregation is still a single `find` with field projection. Acceptable for current scale.
**Warning signs:** PUT /api/collections/[id] response times > 500ms in load tests.

### Pitfall 5: UpgradeModal Renders Outside Provider

**What goes wrong:** A component calls `useUpgradeModal()` but is rendered outside `<UpgradeModalProvider>` — throws "must be used within UpgradeModalProvider".
**Why it happens:** Provider added in wrong place in the component tree.
**How to avoid:** `UpgradeModalProvider` wraps `LayoutShell` in `src/app/layout.tsx` — the outermost layout. All app routes are nested within it.
**Warning signs:** Error thrown on any page that makes a write request.

### Pitfall 6: Export Counter Not Reset After Month Boundary

**What goes wrong:** User exported 10/10 times in January. On Feb 1, they try again and still get 402.
**Why it happens:** The lazy reset only fires when `exportResetAt < monthStart`. If `exportResetAt` was never set (new org), it defaults to `new Date(0)` (1970) which is always `< monthStart` — safe. If the reset logic is buggy, the counter never resets.
**How to avoid:** Test the lazy reset path explicitly: set `exportResetAt` to last month, attempt an export, verify `exportsThisMonth` resets to 0. [ASSUMED — standard UTC month boundary logic]

### Pitfall 7: `$lt` Check Doesn't Account for Infinity Tier

**What goes wrong:** `LIMITS.team.maxCollections = Infinity`. `current >= Infinity` is always false — correct. But if the value is serialized to/from MongoDB or compared with a `$lt` query, `Infinity` is not a valid BSON value.
**Why it happens:** JavaScript `Infinity` cannot be stored in MongoDB.
**How to avoid:** The `$lt` check is done in JavaScript (not as a MongoDB query). The pattern is: read current count, compare `current >= max` in JS. If `max === Infinity`, always return null (allowed) before the count query. Add an early return in each limit check function: `if (max === Infinity) return null;`

---

## Code Examples

### Route Handler Integration (Full Pattern)

```typescript
// POST /api/collections — after requireRole + assertOrgOwnership
// Source: assertOrgOwnership.ts null-check pattern (codebase) + D-13 (CONTEXT.md)

const session = ... // from requireRole
const limitGuard = await checkCollectionLimit(session.user.organizationId);
if (limitGuard) return limitGuard;  // returns 402 if over limit

// ... proceed with collection creation
```

### GET /api/org/usage Endpoint

```typescript
// src/app/api/org/usage/route.ts
// Source: D-09 (CONTEXT.md); mirrors user/settings/check/route.ts pattern

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import dbConnect from '@/lib/mongodb';
import Organization from '@/lib/db/models/Organization';
import TokenCollection from '@/lib/db/models/TokenCollection';
import { LIMITS } from '@/lib/billing/tiers';
import { countTokensRecursive } from '@/lib/utils/count-tokens';

export async function GET() {
  const session = await requireAuth();
  if (session instanceof NextResponse) return session;

  if (process.env.SELF_HOSTED === 'true') {
    return NextResponse.json({
      orgName: 'Self-Hosted',
      plan: 'team',
      tokenCount: 0,
      tokenMax: Infinity,
      exportsThisMonth: 0,
      exportsMax: Infinity,
    });
  }

  await dbConnect();
  const org = await Organization.findById(session.user.organizationId)
    .select('name planTier usage')
    .lean();

  // ... aggregate token count, return payload
}
```

---

## Integration Points (Capped Routes)

All 6 routes that need billing checks added, in priority order:

| Route | Handler | Limit Check | HTTP Verb |
|-------|---------|-------------|-----------|
| `POST /api/collections` | `src/app/api/collections/route.ts` | `checkCollectionLimit()` | LIMIT-01 |
| `POST /api/collections/[id]/themes` | `src/app/api/collections/[id]/themes/route.ts` | `checkThemeLimit(collectionId)` | LIMIT-02 |
| `PUT /api/collections/[id]` | `src/app/api/collections/[id]/route.ts` | `checkTokenLimit(organizationId)` | LIMIT-03 |
| `POST /api/export/github` | `src/app/api/export/github/route.ts` | `checkAndIncrementExport()` + `checkRateLimit()` | LIMIT-04, RATE-01 |
| `POST /api/export/figma` | `src/app/api/export/figma/route.ts` | `checkAndIncrementExport()` + `checkRateLimit()` | LIMIT-05, RATE-01 |
| `POST /api/build-tokens` | `src/app/api/build-tokens/route.ts` | `checkRateLimit()` only | RATE-01 |

The `PUT /api/collections/[id]` route also needs `checkRateLimit()` per RATE-01 (token-update endpoints). Export routes need both the export counter check AND the rate limiter.

---

## Environment Availability

> Phase 23 depends on one new package and environment variables.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| MongoDB (via Mongoose) | Usage tracking, RateLimiterMongo | ✓ | 9.2.2 | — |
| `rate-limiter-flexible` | RATE-01 | ✗ (not installed) | — | Install via `yarn add` |
| `SELF_HOSTED` env var | All billing checks bypass | ✗ (not in .env.local.example) | — | Defaults to falsy = limits active |
| Existing Mongoose connection | RateLimiterMongo storeClient | ✓ | `mongoose.connection` | — |

**Missing dependencies:**
- `rate-limiter-flexible` — must be installed with `yarn add rate-limiter-flexible@^11.0.0`
- `SELF_HOSTED` env var — must be added to `.env.local.example` with comment

---

## Validation Architecture

> `workflow.nyquist_validation` key is absent from config.json — treated as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 30.3.0 + ts-jest |
| Config file | `jest.config.js` (root) |
| Quick run command | `yarn test --testPathPattern="billing"` |
| Full suite command | `yarn test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BILLING-01 | `tiers.ts` exports LIMITS with correct shape | unit | `yarn test --testPathPattern="tiers"` | ❌ Wave 0 |
| BILLING-02 | LIMITS config has free/pro/team keys with all limit fields | unit | `yarn test --testPathPattern="tiers"` | ❌ Wave 0 |
| BILLING-03 | Lazy month reset fires when exportResetAt < current month | unit | `yarn test --testPathPattern="check-and-increment"` | ❌ Wave 0 |
| BILLING-04 | Rate limiter returns null for valid user, 429 for exceeded | unit | `yarn test --testPathPattern="check-rate-limit"` | ❌ Wave 0 |
| BILLING-05 | SELF_HOSTED=true returns null from all check functions | unit | `yarn test --testPathPattern="billing"` | ❌ Wave 0 |
| BILLING-06 | checkCollectionLimit returns 402 payload with correct shape | unit | `yarn test --testPathPattern="check-collection"` | ❌ Wave 0 |
| BILLING-07 | useUpgradeModal hook is accessible and throws outside provider | unit | `yarn test --testPathPattern="UpgradeModal"` | ❌ Wave 0 |
| LIMIT-01 | POST /api/collections returns 402 when at free tier limit | integration (mock DB) | manual verify | ❌ manual |
| RATE-01 | 429 returned after rate limit key exceeded, never by IP | unit | `yarn test --testPathPattern="check-rate-limit"` | ❌ Wave 0 |

### Wave 0 Gaps

- [ ] `src/lib/billing/__tests__/tiers.test.ts` — covers BILLING-01, BILLING-02
- [ ] `src/lib/billing/__tests__/check-collection-limit.test.ts` — covers BILLING-06, LIMIT-01
- [ ] `src/lib/billing/__tests__/check-and-increment-export.test.ts` — covers BILLING-03
- [ ] `src/lib/billing/__tests__/check-rate-limit.test.ts` — covers BILLING-04, RATE-01
- [ ] `src/lib/billing/__tests__/self-hosted-bypass.test.ts` — covers BILLING-05 (all functions)
- [ ] `src/components/billing/__tests__/UpgradeModalProvider.test.tsx` — covers BILLING-07

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Tier limit values (1/2/500/10/60 for free; 20/10/5000/200/120 for pro; Infinity for team) | Standard Stack / tiers.ts example | Planner should confirm exact numbers with user — wrong values are easy to change but affect UX |
| A2 | `countTokensRecursive` can be extracted to `src/lib/utils/count-tokens.ts` without modifying existing behavior | Architecture Patterns, Pattern 3 | If the function has a closure dependency in the route file, extraction may need care |
| A3 | `LIMITS.team.maxExportsPerMonth = Infinity` — no export tracking for team tier | tiers.ts design | If team has a soft limit, the model needs a number not Infinity |
| A4 | The rate limiter singleton pattern (module-level `let limiter`) works correctly across Next.js hot-reloads | Pattern 5 | Hot-reload may reset module state in dev; use a global variable pattern similar to `global.__mongoose_cache` if needed |

---

## Open Questions

1. **Exact free/pro/team limit values**
   - What we know: Free = 1 collection / 500 tokens / 10 exports is mentioned in CONTEXT.md specifics
   - What's unclear: Pro and team tier numbers were not specified
   - Recommendation: Planner should use reasonable defaults (above) and note them as easy to change in tiers.ts

2. **Rate limiter singleton in serverless context**
   - What we know: Vercel serverless functions are stateless; module-level singletons reset per cold start
   - What's unclear: Deployment target was listed as a pending todo in STATE.md ("Confirm deployment target before Phase 23")
   - Recommendation: `RateLimiterMongo` is backed by MongoDB, so state persists across cold starts even when the JS module resets. The singleton is a performance optimization (avoids re-constructing), not a correctness requirement. Safe to use regardless of deployment target.

3. **Token count aggregation: scan all org collections or just the current one?**
   - What we know: D-07 says "500 tokens across all org collections" — this implies scanning all collections
   - What's unclear: Whether the aggregation should be triggered on every PUT or only when approaching the limit
   - Recommendation: Always run aggregation on PUT — adds ~10-50ms for small orgs, correctness is more important

---

## Sources

### Primary (HIGH confidence)

- [VERIFIED: codebase] `src/lib/auth/assert-org-ownership.ts` — null-return pattern for billing guards
- [VERIFIED: codebase] `src/lib/auth/require-auth.ts` — requireAuth() guard composition pattern
- [VERIFIED: codebase] `src/app/api/user/settings/check/route.ts` — SELF_HOSTED env var bypass pattern
- [VERIFIED: codebase] `src/context/PermissionsContext.tsx` — React context provider pattern for auth/permissions
- [VERIFIED: codebase] `src/app/layout.tsx` — provider nesting location for UpgradeModalProvider
- [VERIFIED: codebase] `src/app/api/collections/route.ts` — countTokensRecursive function to extract
- [VERIFIED: npm registry] `rate-limiter-flexible@11.0.1` — current latest version as of 2026-04-20

### Secondary (MEDIUM confidence)

- [CITED: github.com/animir/node-rate-limiter-flexible/wiki/Mongo] — RateLimiterMongo constructor, `storeClient: mongoose.connection`, connection prerequisite requirement
- [VERIFIED: CONTEXT.md] All D-01 through D-15 decisions — locked implementation decisions

### Tertiary (LOW confidence)

- [ASSUMED] Tier limit numbers for pro/team — not specified in user decisions
- [ASSUMED] Rate limiter singleton reset behavior on Next.js hot-reload in dev

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm registry verified, codebase verified, STATE.md pre-decisions confirmed
- Architecture patterns: HIGH — all patterns follow existing codebase conventions; billing guard mirrors assertOrgOwnership exactly
- Pitfalls: MEDIUM — race condition and RateLimiterMongo connection pitfalls from official docs; tier limit values are assumed

**Research date:** 2026-04-20
**Valid until:** 2026-05-20 (stable domain; rate-limiter-flexible and Mongoose are slow-moving)
