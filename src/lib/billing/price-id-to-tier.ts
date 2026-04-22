// src/lib/billing/price-id-to-tier.ts
// Phase 24 D-12 — Price ID to PlanTier mapping via env vars.
// Read each call (no caching) so dev hot-reload reflects .env.local changes.
// D-15: lives in src/lib/billing/ isolation boundary.

import type { PlanTier } from './tiers';

/**
 * Maps a Stripe price ID to the corresponding PlanTier, or null if unknown.
 * Used by:
 *   - Plan 02 checkout route (validates incoming priceId before session creation)
 *   - Plan 03 webhook handler (maps subscription price ID → PlanTier for org update)
 */
export function priceIdToTier(priceId: string): PlanTier | null {
  const p = typeof priceId === 'string' ? priceId.trim() : '';
  if (!p) return null;
  const pro = (process.env.STRIPE_PRO_PRICE_ID ?? '').trim();
  const team = (process.env.STRIPE_TEAM_PRICE_ID ?? '').trim();
  if (pro && p === pro) return 'pro';
  if (team && p === team) return 'team';
  return null;
}