// src/lib/billing/check-and-increment-export.ts
// Phase 23 LIMIT-04/LIMIT-05 — Export counter with D-12 lazy UTC-month reset (no cron).
// Callers: POST /api/export/figma, POST /api/export/github.

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Organization from '@/lib/db/models/Organization';
import { LIMITS, type PlanTier } from './tiers';

interface OrgUsageDoc {
  planTier?: PlanTier;
  usage?: { exportsThisMonth?: number; exportResetAt?: Date };
}

export async function checkAndIncrementExport(
  organizationId: string
): Promise<NextResponse | null> {
  if (process.env.SELF_HOSTED === 'true') return null;
  if (!organizationId) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  await dbConnect();

  // D-12: lazy UTC-month reset. First of current UTC month.
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  // Atomic: only the request that wins the $lt comparison performs the reset.
  await Organization.findOneAndUpdate(
    { _id: organizationId, 'usage.exportResetAt': { $lt: monthStart } },
    { $set: { 'usage.exportsThisMonth': 0, 'usage.exportResetAt': monthStart } }
  );

  const org = await Organization.findById(organizationId)
    .select('planTier usage')
    .lean() as OrgUsageDoc | null;

  if (!org) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

  const tier: PlanTier = org.planTier ?? 'free';
  const max = LIMITS[tier].maxExportsPerMonth;

  // Pitfall 7 — Infinity: short-circuit before any counter read or increment.
  if (max === Infinity) return null;

  const current = org.usage?.exportsThisMonth ?? 0;
  if (current >= max) {
    return NextResponse.json(
      { code: 'LIMIT_EXCEEDED', resource: 'exports', current, max, tier },
      { status: 402 }
    );
  }

  // D-13: atomic increment after successful check
  await Organization.updateOne(
    { _id: organizationId },
    { $inc: { 'usage.exportsThisMonth': 1 } }
  );

  return null;
}
