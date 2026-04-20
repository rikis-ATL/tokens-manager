// src/lib/billing/check-token-limit.ts
// Phase 23 LIMIT-03 — Live token count aggregation across all org collections (D-07, D-14, D-15).
// D-07 mandates live aggregation (not a cached counter) to eliminate drift.

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Organization from '@/lib/db/models/Organization';
import TokenCollection from '@/lib/db/models/TokenCollection';
import { countTokensInCollection } from '@/lib/utils/count-tokens';
import { LIMITS, type PlanTier } from './tiers';

export async function checkTokenLimit(
  organizationId: string
): Promise<NextResponse | null> {
  if (process.env.SELF_HOSTED === 'true') return null;
  if (!organizationId) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  await dbConnect();

  const org = await Organization.findById(organizationId)
    .select('planTier')
    .lean() as { planTier?: PlanTier } | null;

  if (!org) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

  const tier: PlanTier = org.planTier ?? 'free';
  const max = LIMITS[tier].maxTokensTotal;

  // Pitfall 7 — Infinity is not a valid MongoDB query value; short-circuit in JS.
  if (max === Infinity) return null;

  // D-07: live aggregation. Pitfall 4 — acceptable perf for free tier (500 token cap).
  const docs = await TokenCollection.find({ organizationId })
    .select('tokens')
    .lean() as Array<{ tokens?: unknown }>;

  const current = docs.reduce((sum, d) => sum + countTokensInCollection(d.tokens ?? {}), 0);

  if (current >= max) {
    return NextResponse.json(
      { code: 'LIMIT_EXCEEDED', resource: 'tokens', current, max, tier },
      { status: 402 }
    );
  }

  return null;
}
