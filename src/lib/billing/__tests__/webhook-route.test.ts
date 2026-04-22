import { NextRequest, NextResponse } from 'next/server';
import { POST } from '@/app/api/stripe/webhook/route';

// Mock dependencies
jest.mock('@/lib/billing');
jest.mock('@/lib/mongodb');
jest.mock('@/lib/db/models/Organization');
jest.mock('@/lib/db/models/ProcessedWebhookEvent');

const mockGetStripe = jest.fn();
const mockPriceIdToTier = jest.fn();
jest.mocked(require('@/lib/billing')).getStripe = mockGetStripe;
jest.mocked(require('@/lib/billing')).priceIdToTier = mockPriceIdToTier;

const mockDbConnect = jest.mocked(require('@/lib/mongodb').default);
const mockOrganization = jest.mocked(require('@/lib/db/models/Organization').default);
const mockProcessedWebhookEvent = jest.mocked(require('@/lib/db/models/ProcessedWebhookEvent').default);

const mockConstructEvent = jest.fn();
const mockOrgFindByIdAndUpdate = jest.fn();
const mockOrgFindOneAndUpdate = jest.fn();
const mockEventFindOne = jest.fn();
const mockEventCreate = jest.fn();

describe('POST /api/stripe/webhook — Phase 24 STRIPE-03', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...ORIGINAL_ENV,
      SELF_HOSTED: undefined,
      STRIPE_WEBHOOK_SECRET: 'whsec_test'
    };

    mockDbConnect.mockResolvedValue(undefined);
    mockGetStripe.mockReturnValue({
      webhooks: {
        constructEvent: mockConstructEvent
      }
    });
    mockOrganization.findByIdAndUpdate = mockOrgFindByIdAndUpdate;
    mockOrganization.findOneAndUpdate = mockOrgFindOneAndUpdate;
    mockProcessedWebhookEvent.findOne = mockEventFindOne;
    mockProcessedWebhookEvent.create = mockEventCreate;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('D-16: SELF_HOSTED=true returns 400', async () => {
    process.env.SELF_HOSTED = 'true';
    const req = new NextRequest('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      body: 'webhook-body'
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it('returns 500 when STRIPE_WEBHOOK_SECRET is missing', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const req = new NextRequest('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      body: 'webhook-body'
    });

    const res = await POST(req);

    expect(res.status).toBe(500);
  });

  it('returns 400 when stripe-signature header is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      body: 'webhook-body'
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it('returns 400 when signature verification fails', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const req = new NextRequest('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'invalid-sig' },
      body: 'webhook-body'
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it('D-09: skips processing if event already exists (idempotency)', async () => {
    mockConstructEvent.mockReturnValue({ id: 'evt_123', type: 'test.event' });
    mockEventFindOne.mockResolvedValue({ stripeEventId: 'evt_123' });

    const req = new NextRequest('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'valid-sig' },
      body: 'webhook-body'
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockEventCreate).not.toHaveBeenCalled();
    expect(mockOrgFindByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('checkout.session.completed: updates org with Stripe data and planTier', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_123',
      type: 'checkout.session.completed',
      data: {
        object: {
          customer: 'cus_test',
          subscription: 'sub_test',
          metadata: {
            organizationId: 'org123',
            priceId: 'price_pro_test'
          }
        }
      }
    });
    mockEventFindOne.mockResolvedValue(null);
    mockPriceIdToTier.mockReturnValue('pro');
    mockOrgFindByIdAndUpdate.mockResolvedValue({});
    mockEventCreate.mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'valid-sig' },
      body: 'webhook-body'
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockOrgFindByIdAndUpdate).toHaveBeenCalledWith(
      'org123',
      {
        stripeCustomerId: 'cus_test',
        stripeSubscriptionId: 'sub_test',
        planTier: 'pro'
      },
      { new: true }
    );
    expect(mockEventCreate).toHaveBeenCalledWith({ stripeEventId: 'evt_123' });
  });

  it('customer.subscription.updated: updates org planTier based on new price', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_456',
      type: 'customer.subscription.updated',
      data: {
        object: {
          customer: 'cus_test',
          id: 'sub_test',
          items: {
            data: [{ price: { id: 'price_team_test' } }]
          }
        }
      }
    });
    mockEventFindOne.mockResolvedValue(null);
    mockPriceIdToTier.mockReturnValue('team');
    mockOrgFindOneAndUpdate.mockResolvedValue({ _id: 'org123' });
    mockEventCreate.mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'valid-sig' },
      body: 'webhook-body'
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockOrgFindOneAndUpdate).toHaveBeenCalledWith(
      { stripeCustomerId: 'cus_test' },
      {
        stripeSubscriptionId: 'sub_test',
        planTier: 'team'
      },
      { new: true }
    );
    expect(mockEventCreate).toHaveBeenCalledWith({ stripeEventId: 'evt_456' });
  });

  it('customer.subscription.deleted: resets org to free tier and clears subscriptionId', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_789',
      type: 'customer.subscription.deleted',
      data: {
        object: {
          customer: 'cus_test'
        }
      }
    });
    mockEventFindOne.mockResolvedValue(null);
    mockOrgFindOneAndUpdate.mockResolvedValue({ _id: 'org123' });
    mockEventCreate.mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'valid-sig' },
      body: 'webhook-body'
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockOrgFindOneAndUpdate).toHaveBeenCalledWith(
      { stripeCustomerId: 'cus_test' },
      {
        planTier: 'free',
        $unset: { stripeSubscriptionId: 1 }
      },
      { new: true }
    );
    expect(mockEventCreate).toHaveBeenCalledWith({ stripeEventId: 'evt_789' });
  });

  it('ignores unhandled event types but still marks as processed', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_unhandled',
      type: 'invoice.payment_succeeded',
      data: { object: {} }
    });
    mockEventFindOne.mockResolvedValue(null);
    mockEventCreate.mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'valid-sig' },
      body: 'webhook-body'
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockEventCreate).toHaveBeenCalledWith({ stripeEventId: 'evt_unhandled' });
    expect(mockOrgFindByIdAndUpdate).not.toHaveBeenCalled();
    expect(mockOrgFindOneAndUpdate).not.toHaveBeenCalled();
  });
});