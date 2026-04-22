import { NextRequest, NextResponse } from 'next/server';
import { getStripe, priceIdToTier } from '@/lib/billing';
import dbConnect from '@/lib/mongodb';
import Organization from '@/lib/db/models/Organization';
import ProcessedWebhookEvent from '@/lib/db/models/ProcessedWebhookEvent';

export async function POST(req: NextRequest) {
  if (process.env.SELF_HOSTED === 'true') {
    return NextResponse.json({ error: 'Webhooks unavailable in self-hosted mode' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook configuration error' }, { status: 500 });
  }

  const body = await req.text(); // D-08: Must use text() not json() for signature verification
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  await dbConnect();

  // D-09: Idempotency check
  const existingEvent = await ProcessedWebhookEvent.findOne({ stripeEventId: event.id });
  if (existingEvent) {
    console.log(`Event ${event.id} already processed, skipping`);
    return NextResponse.json({ received: true });
  }

  try {
    // D-10: Handle the three event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark event as processed
    await ProcessedWebhookEvent.create({ stripeEventId: event.id });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Error processing webhook event ${event.id}:`, error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

async function handleCheckoutSessionCompleted(session: any) {
  const { customer, subscription, metadata } = session;

  if (!customer || !metadata?.organizationId) {
    console.error('Missing customer or organizationId in checkout.session.completed');
    return;
  }

  const planTier = metadata.priceId ? priceIdToTier(metadata.priceId) : null;
  if (!planTier) {
    console.error('Unable to map priceId to tier:', metadata.priceId);
    return;
  }

  await Organization.findByIdAndUpdate(
    metadata.organizationId,
    {
      stripeCustomerId: customer,
      stripeSubscriptionId: subscription,
      planTier,
    },
    { new: true }
  );

  console.log(`Updated organization ${metadata.organizationId} to ${planTier} plan`);
}

async function handleSubscriptionUpdated(subscription: any) {
  const { customer, id: subscriptionId, items } = subscription;

  if (!customer) {
    console.error('Missing customer in customer.subscription.updated');
    return;
  }

  // Get the price ID from the subscription items
  const priceId = items?.data?.[0]?.price?.id;
  const planTier = priceId ? priceIdToTier(priceId) : null;

  if (!planTier) {
    console.error('Unable to map subscription priceId to tier:', priceId);
    return;
  }

  const result = await Organization.findOneAndUpdate(
    { stripeCustomerId: customer },
    {
      stripeSubscriptionId: subscriptionId,
      planTier,
    },
    { new: true }
  );

  if (result) {
    console.log(`Updated organization ${result._id} to ${planTier} plan`);
  } else {
    console.error(`No organization found with stripeCustomerId: ${customer}`);
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  const { customer } = subscription;

  if (!customer) {
    console.error('Missing customer in customer.subscription.deleted');
    return;
  }

  const result = await Organization.findOneAndUpdate(
    { stripeCustomerId: customer },
    {
      planTier: 'free',
      $unset: { stripeSubscriptionId: 1 },
    },
    { new: true }
  );

  if (result) {
    console.log(`Reset organization ${result._id} to free plan`);
  } else {
    console.error(`No organization found with stripeCustomerId: ${customer}`);
  }
}