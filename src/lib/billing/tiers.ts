// src/lib/billing/tiers.ts
// Phase 23 — Single source of truth for all tier caps (BILLING-01, D-01, D-15).
// NO other file in the codebase is allowed to hardcode a limit number.

import type { PlanTier } from '@/lib/db/models/Organization';

export type { PlanTier };

export interface TierLimits {
  maxCollections: number;
  maxThemesPerCollection: number;
  maxTokensTotal: number;       // across all org collections (D-07)
  maxExportsPerMonth: number;
  rateLimitPerMinute: number;   // per user ID (D-11)
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
