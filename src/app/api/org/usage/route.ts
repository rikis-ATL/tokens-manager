// src/app/api/org/usage/route.ts
// Phase 23 D-08, D-09 — Usage snapshot endpoint for the header badge and UpgradeModal.
// Read-only. Mirrors src/app/api/user/settings/check/route.ts SELF_HOSTED pattern.

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import dbConnect from '@/lib/mongodb';
import Organization from '@/lib/db/models/Organization';
import TokenCollection from '@/lib/db/models/TokenCollection';
import { LIMITS, type PlanTier } from '@/lib/billing';
import { countTokensInCollection } from '@/lib/utils/count-tokens';

interface UsagePayload {
  orgName: string;
  plan: PlanTier;
  tokenCount: number;
  tokenMax: number | null;      // null = unlimited (Infinity not JSON-serializable)
  exportsThisMonth: number;
  exportsMax: number | null;    // null = unlimited
  collectionCount: number;
  collectionMax: number | null; // null = unlimited
}

function toJsonLimit(n: number): number | null {
  return n === Infinity ? null : n;
}

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  // D-14: self-hosted bypass. Returns a synthetic "team"-like payload so the header
  // badge renders "Self-Hosted · team | — / — | — / —" without any DB hit.
  if (process.env.SELF_HOSTED === 'true') {
    const payload: UsagePayload = {
      orgName: 'Self-Hosted',
      plan: 'team',
      tokenCount: 0,
      tokenMax: null,
      exportsThisMonth: 0,
      exportsMax: null,
      collectionCount: 0,
      collectionMax: null,
    };
    return NextResponse.json(payload);
  }

  const orgId = auth.user.organizationId;
  if (!orgId) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

  await dbConnect();
  const org = await Organization.findById(orgId)
    .select('name planTier usage')
    .lean() as {
      name?: string;
      planTier?: PlanTier;
      usage?: { exportsThisMonth?: number; exportResetAt?: Date };
    } | null;

  if (!org) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

  const tier: PlanTier = org.planTier ?? 'free';
  const limits = LIMITS[tier];

  // D-07: live aggregation (same logic as checkTokenLimit).
  const docs = await TokenCollection.find({ organizationId: orgId })
    .select('tokens')
    .lean() as Array<{ tokens?: unknown }>;
  const tokenCount = docs.reduce((sum, d) => sum + countTokensInCollection(d.tokens ?? {}), 0);
  const collectionCount = docs.length;

  const payload: UsagePayload = {
    orgName: org.name ?? 'Organization',
    plan: tier,
    tokenCount,
    tokenMax: toJsonLimit(limits.maxTokensTotal),
    exportsThisMonth: org.usage?.exportsThisMonth ?? 0,
    exportsMax: toJsonLimit(limits.maxExportsPerMonth),
    collectionCount,
    collectionMax: toJsonLimit(limits.maxCollections),
  };

  return NextResponse.json(payload);
}
