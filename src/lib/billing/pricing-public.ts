/**
 * Human-readable pricing rows for marketing (landing). Values come from LIMITS only.
 */
import { LIMITS, type PlanTier } from '@/lib/billing/tiers';

function fmt(n: number): string {
  return n === Infinity ? 'Unlimited' : String(n);
}

export function formatLimitValue(
  key: keyof typeof LIMITS.free,
  tier: PlanTier,
): string {
  const v = LIMITS[tier][key];
  return fmt(v as number);
}

export function getPlanTierLimitsForDisplay(tier: PlanTier) {
  const L = LIMITS[tier];
  return {
    collections: fmt(L.maxCollections),
    themesPerCollection: fmt(L.maxThemesPerCollection),
    tokens: fmt(L.maxTokensTotal),
    exportsPerMonth: fmt(L.maxExportsPerMonth),
    requestsPerMinute: fmt(L.rateLimitPerMinute),
  };
}
