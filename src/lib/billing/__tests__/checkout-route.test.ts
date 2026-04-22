import { NextRequest, NextResponse } from 'next/server';
import { POST } from '@/app/api/stripe/checkout/route';

// Mock dependencies
jest.mock('@/lib/auth/require-auth');
jest.mock('@/lib/mongodb');
jest.mock('@/lib/db/models/Organization');
jest.mock('@/lib/billing');

const mockRequireAuth = jest.mocked(require('@/lib/auth/require-auth').requireAuth);
const mockDbConnect = jest.mocked(require('@/lib/mongodb').default);
const mockOrganization = jest.mocked(require('@/lib/db/models/Organization').default);
const mockGetStripe = jest.fn();
const mockPriceIdToTier = jest.fn();
jest.mocked(require('@/lib/billing')).getStripe = mockGetStripe;
jest.mocked(require('@/lib/billing')).priceIdToTier = mockPriceIdToTier;

const mockSessionCreate = jest.fn();

describe('POST /api/stripe/checkout — Phase 24 STRIPE-01', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...ORIGINAL_ENV,
      SELF_HOSTED: undefined,
      NEXTAUTH_URL: 'https://app.example.com',
      STRIPE_PRO_PRICE_ID: 'price_pro',
      STRIPE_TEAM_PRICE_ID: 'price_team'
    };

    mockDbConnect.mockResolvedValue(undefined);
    mockGetStripe.mockReturnValue({
      checkout: {
        sessions: {
          create: mockSessionCreate
        }
      }
    });
    mockSessionCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/session_123' });
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('D-16: SELF_HOSTED=true returns 400 before any auth/DB/SDK call', async () => {
    process.env.SELF_HOSTED = 'true';
    const req = new NextRequest('http://localhost:3000/api/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify({ priceId: 'price_pro' })
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(mockRequireAuth).not.toHaveBeenCalled();
    expect(mockSessionCreate).not.toHaveBeenCalled();
    expect(mockOrganization.findById).not.toHaveBeenCalled();
  });

  it('401 when requireAuth returns a NextResponse', async () => {
    mockRequireAuth.mockResolvedValue(new NextResponse(null, { status: 401 }));
    const req = new NextRequest('http://localhost:3000/api/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify({ priceId: 'price_pro' })
    });

    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('400 when body is not JSON', async () => {
    mockRequireAuth.mockResolvedValue({ user: { organizationId: 'org1', email: 'user@example.com' } });
    const req = new NextRequest('http://localhost:3000/api/stripe/checkout', {
      method: 'POST',
      body: 'not-json'
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid JSON body');
  });

  it('400 when priceId is missing', async () => {
    mockRequireAuth.mockResolvedValue({ user: { organizationId: 'org1', email: 'user@example.com' } });
    const req = new NextRequest('http://localhost:3000/api/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify({})
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('priceId required');
  });

  it('T-24-03: 400 when priceIdToTier returns null (unknown priceId)', async () => {
    mockRequireAuth.mockResolvedValue({ user: { organizationId: 'org1', email: 'user@example.com' } });
    mockPriceIdToTier.mockReturnValue(null);
    const req = new NextRequest('http://localhost:3000/api/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify({ priceId: 'price_unknown' })
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid priceId');
    expect(mockSessionCreate).not.toHaveBeenCalled();
  });

  it('404 when user has no organizationId', async () => {
    mockRequireAuth.mockResolvedValue({ user: { organizationId: '', email: 'u@e.com' } });
    mockPriceIdToTier.mockReturnValue('pro');
    const req = new NextRequest('http://localhost:3000/api/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify({ priceId: 'price_pro' })
    });

    const res = await POST(req);

    expect(res.status).toBe(404);
  });

  it('404 when Organization.findById returns null', async () => {
    mockRequireAuth.mockResolvedValue({ user: { organizationId: 'org1', email: 'user@example.com' } });
    mockPriceIdToTier.mockReturnValue('pro');
    mockOrganization.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null)
      })
    });
    const req = new NextRequest('http://localhost:3000/api/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify({ priceId: 'price_pro' })
    });

    const res = await POST(req);

    expect(res.status).toBe(404);
  });

  it('happy path: creates session with metadata.organizationId AND metadata.priceId, customer_email when no existing customer', async () => {
    mockRequireAuth.mockResolvedValue({ user: { organizationId: 'org1', email: 'user@example.com' } });
    mockPriceIdToTier.mockReturnValue('pro');
    mockOrganization.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ name: 'Test Org' })
      })
    });

    const req = new NextRequest('http://localhost:3000/api/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify({ priceId: 'price_pro' })
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe('https://checkout.stripe.com/session_123');
    expect(mockSessionCreate).toHaveBeenCalledWith({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: 'price_pro', quantity: 1 }],
      metadata: { organizationId: 'org1', priceId: 'price_pro' },
      customer_email: 'user@example.com',
      success_url: 'https://app.example.com/upgrade/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://app.example.com/upgrade'
    });
  });

  it('re-uses existing stripeCustomerId (pitfall 2 — no duplicate customer)', async () => {
    mockRequireAuth.mockResolvedValue({ user: { organizationId: 'org1', email: 'user@example.com' } });
    mockPriceIdToTier.mockReturnValue('pro');
    mockOrganization.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ stripeCustomerId: 'cus_existing', name: 'Test Org' })
      })
    });

    const req = new NextRequest('http://localhost:3000/api/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify({ priceId: 'price_pro' })
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockSessionCreate).toHaveBeenCalledWith({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: 'price_pro', quantity: 1 }],
      metadata: { organizationId: 'org1', priceId: 'price_pro' },
      customer: 'cus_existing',
      success_url: 'https://app.example.com/upgrade/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://app.example.com/upgrade'
    });
  });
});