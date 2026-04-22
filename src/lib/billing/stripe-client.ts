// src/lib/billing/stripe-client.ts
// Phase 24 D-15 (isolation boundary — stripe SDK imports live here only)
// Phase 24 D-16 (SELF_HOSTED bypass — SDK never initializes on self-hosted instances)
// Pattern: lazy module-scoped singleton; Next.js hot reload safe because module scope
// is re-evaluated on code change but stable within a single request handler invocation.

import Stripe from 'stripe';

let _stripe: Stripe | null = null;

/**
 * Returns the shared Stripe SDK instance.
 *
 * @throws Error('Stripe unavailable in self-hosted mode') when process.env.SELF_HOSTED === 'true'
 * @throws Error('STRIPE_SECRET_KEY is not set') when the env var is missing or empty
 *
 * Callers (all in src/lib/billing/ or src/app/api/stripe/*) should wrap calls in
 * try/catch OR short-circuit on SELF_HOSTED FIRST before invoking, matching the
 * pattern in check-collection-limit.ts line 15.
 */
export function getStripe(): Stripe {
  if (process.env.SELF_HOSTED === 'true') {
    throw new Error('Stripe unavailable in self-hosted mode');
  }
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
    _stripe = new Stripe(key, { apiVersion: '2025-02-24.acacia' });
  }
  return _stripe;
}

/** Test-only reset hook — internal use from jest test files only. Do not call from production code. */
export function __resetStripeForTests(): void {
  _stripe = null;
}