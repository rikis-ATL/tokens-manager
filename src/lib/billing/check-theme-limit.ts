// src/lib/billing/check-theme-limit.ts
// Phase 23 LIMIT-02 — theme count guard per collection (free=2, pro=10, team=Infinity).
// Replaces the hardcoded `existingThemes.length >= 10` in POST /api/collections/[id]/themes.
// BILLING-01: LIMITS is the single source of truth — no other file may hardcode a cap number.

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Organization from '@/lib/db/models/Organization';
import TokenCollection from '@/lib/db/models/TokenCollection';
import { LIMITS, type PlanTier } from './tiers';

export async function checkThemeLimit(
  organizationId: string,
  collectionId: string
): Promise<NextResponse | null> {
  if (process.env.SELF_HOSTED === 'true') return null;
  if (!organizationId || !collectionId) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  await dbConnect();

  const org = await Organization.findById(organizationId)
    .select('planTier')
    .lean() as { planTier?: PlanTier } | null;

  if (!org) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

  const tier: PlanTier = org.planTier ?? 'free';
  const max = LIMITS[tier].maxThemesPerCollection;

  // Pitfall 7 — Infinity: short-circuit before any collection read.
  if (max === Infinity) return null;

  const coll = await TokenCollection.findById(collectionId)
    .select('themes')
    .lean() as { themes?: unknown[] } | null;

  if (!coll) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

  const current = coll.themes?.length ?? 0;

  if (current >= max) {
    return NextResponse.json(
      { code: 'LIMIT_EXCEEDED', resource: 'themes', current, max, tier },
      { status: 402 }
    );
  }

  return null;
}
