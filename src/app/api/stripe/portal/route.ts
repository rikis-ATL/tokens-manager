import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import dbConnect from '@/lib/mongodb';
import Organization from '@/lib/db/models/Organization';
import { getStripe } from '@/lib/billing';

export async function POST(_req: NextRequest) {
  if (process.env.SELF_HOSTED === 'true') {
    return NextResponse.json({ error: 'Portal unavailable in self-hosted mode' }, { status: 400 });
  }

  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const organizationId = auth.user.organizationId;
  if (!organizationId) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  await dbConnect();
  const org = await Organization.findById(organizationId).select('stripeCustomerId planTier').lean() as { stripeCustomerId?: string; planTier?: string } | null;

  if (!org?.stripeCustomerId) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 400 });
  }

  const stripe = getStripe();
  const baseUrl = process.env.NEXTAUTH_URL ?? '';

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: baseUrl + '/account'
  });

  return NextResponse.json({ url: portalSession.url });
}