// src/lib/billing/check-collection-limit.ts
// Phase 23 LIMIT-01 — Collection count guard.
// Pattern mirrors src/lib/auth/assert-org-ownership.ts: returns null on success, NextResponse on block.

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Organization from '@/lib/db/models/Organization';
import TokenCollection from '@/lib/db/models/TokenCollection';
import { LIMITS, type PlanTier } from './tiers';

export async function checkCollectionLimit(
  organizationId: string
): Promise<NextResponse | null> {
  // D-14: SELF_HOSTED bypass — short-circuit BEFORE any DB read
  if (process.env.SELF_HOSTED === 'true') return null;

  if (!organizationId) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  await dbConnect();

  const org = await Organization.findById(organizationId)
    .select('planTier')
    .lean() as { planTier?: PlanTier } | null;

  if (!org) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const tier: PlanTier = org.planTier ?? 'free';
  const max = LIMITS[tier].maxCollections;

  // Pitfall 7 — Infinity is not a valid MongoDB query value; short-circuit in JS.
  if (max === Infinity) return null;

  // D-13: read current count; check in JS (not via Mongo $lt — see Pitfall 7).
  // For POST /api/collections this is low traffic so the read-then-create race window
  // is acceptable. For high-frequency counters (exports) Plan 02 uses findOneAndUpdate.
  const current = await TokenCollection.countDocuments({ organizationId });

  if (current >= max) {
    return NextResponse.json(
      { code: 'LIMIT_EXCEEDED', resource: 'collections', current, max, tier },
      { status: 402 }
    );
  }

  return null;
}
