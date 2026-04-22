import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import dbConnect from '@/lib/mongodb';
import Organization from '@/lib/db/models/Organization';
import { getStripe, priceIdToTier } from '@/lib/billing';

export async function POST(req: NextRequest) {
  if (process.env.SELF_HOSTED === 'true') {
    return NextResponse.json({ error: 'Checkout unavailable in self-hosted mode' }, { status: 400 });
  }

  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const raw = body?.priceId;
  const priceId = typeof raw === 'string' ? raw.trim() : '';
  if (!priceId) {
    return NextResponse.json({ error: 'priceId required' }, { status: 400 });
  }

  if (priceIdToTier(priceId) === null) {
    return NextResponse.json({ error: 'Invalid priceId' }, { status: 400 });
  }

  const organizationId = auth.user.organizationId;
  if (!organizationId) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  await dbConnect();
  const org = await Organization.findById(organizationId).select('stripeCustomerId name').lean() as { stripeCustomerId?: string; name?: string } | null;

  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  const stripe = getStripe();
  const baseUrl = process.env.NEXTAUTH_URL ?? '';

  const sessionOptions: any = {
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { organizationId, priceId },
    success_url: baseUrl + '/upgrade/success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: baseUrl + '/upgrade'
  };

  if (org.stripeCustomerId) {
    sessionOptions.customer = org.stripeCustomerId;
  } else {
    sessionOptions.customer_email = auth.user.email ?? undefined;
  }

  const session = await stripe.checkout.sessions.create(sessionOptions);

  return NextResponse.json({ url: session.url });
}