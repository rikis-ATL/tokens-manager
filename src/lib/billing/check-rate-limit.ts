// src/lib/billing/check-rate-limit.ts
// Phase 23 RATE-01 — Per-user-ID rate limiter (D-10, D-11, D-14).
// CRITICAL: key is ALWAYS session.user.id — NEVER client IP (D-11; X-Forwarded-For is spoofable).

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { RateLimiterMongo, RateLimiterRes } from 'rate-limiter-flexible';
import dbConnect from '@/lib/mongodb';
import Organization from '@/lib/db/models/Organization';
import { LIMITS, type PlanTier } from './tiers';

// Cache one limiter per `points` value (tiers differ: free=60, pro=120, team=300).
// Module-level singletons survive across warm invocations; cold starts rebuild from Mongo-backed counters.
const limiterCache = new Map<number, RateLimiterMongo>();

function getRateLimiter(points: number): RateLimiterMongo {
  let limiter = limiterCache.get(points);
  if (!limiter) {
    // Pitfall 1 — dbConnect() MUST be awaited before this runs. Callers do so.
    limiter = new RateLimiterMongo({
      storeClient: mongoose.connection,
      keyPrefix: `rl_user_${points}`,
      points,
      duration: 60, // seconds
    });
    limiterCache.set(points, limiter);
  }
  return limiter;
}

async function resolveTierPoints(organizationId: string | undefined): Promise<number> {
  if (!organizationId) return LIMITS.free.rateLimitPerMinute;
  const org = await Organization.findById(organizationId)
    .select('planTier')
    .lean() as { planTier?: PlanTier } | null;
  const tier: PlanTier = org?.planTier ?? 'free';
  return LIMITS[tier].rateLimitPerMinute;
}

/**
 * Consume one rate-limit token for the given user.
 * Returns null when the consume succeeds; NextResponse 429 when the user has exceeded their tier's rateLimitPerMinute.
 * Never returns 402 — rate limits use HTTP 429 per D-03 (keeps UpgradeModal scoped to payment prompts).
 */
export async function checkRateLimit(
  userId: string | undefined,
  organizationId?: string
): Promise<NextResponse | null> {
  if (process.env.SELF_HOSTED === 'true') return null;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await dbConnect();

  const points = await resolveTierPoints(organizationId);
  const limiter = getRateLimiter(points);

  try {
    await limiter.consume(userId);
    return null;
  } catch (e) {
    const retryAfter = e instanceof RateLimiterRes ? Math.ceil(e.msBeforeNext / 1000) : 60;
    return NextResponse.json(
      { code: 'RATE_LIMITED', retryAfterSeconds: retryAfter },
      { status: 429 }
    );
  }
}
