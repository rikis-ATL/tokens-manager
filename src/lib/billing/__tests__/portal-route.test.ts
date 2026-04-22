import { NextRequest, NextResponse } from 'next/server';
import { POST } from '@/app/api/stripe/portal/route';

// Mock dependencies
jest.mock('@/lib/auth/require-auth');
jest.mock('@/lib/mongodb');
jest.mock('@/lib/db/models/Organization');
jest.mock('@/lib/billing');

const mockRequireAuth = jest.mocked(require('@/lib/auth/require-auth').requireAuth);
const mockDbConnect = jest.mocked(require('@/lib/mongodb').default);
const mockOrganization = jest.mocked(require('@/lib/db/models/Organization').default);
const mockGetStripe = jest.fn();
jest.mocked(require('@/lib/billing')).getStripe = mockGetStripe;

const mockPortalCreate = jest.fn();

describe('POST /api/stripe/portal — Phase 24 STRIPE-02', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...ORIGINAL_ENV,
      SELF_HOSTED: undefined,
      NEXTAUTH_URL: 'https://app.example.com'
    };

    mockDbConnect.mockResolvedValue(undefined);
    mockGetStripe.mockReturnValue({
      billingPortal: {
        sessions: {
          create: mockPortalCreate
        }
      }
    });
    mockPortalCreate.mockResolvedValue({ url: 'https://billing.stripe.com/p/session/bps_xxx' });
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('D-16: SELF_HOSTED=true returns 400 before any auth/DB/SDK call', async () => {
    process.env.SELF_HOSTED = 'true';
    const req = new NextRequest('http://localhost:3000/api/stripe/portal', { method: 'POST' });

    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(mockRequireAuth).not.toHaveBeenCalled();
    expect(mockPortalCreate).not.toHaveBeenCalled();
    expect(mockOrganization.findById).not.toHaveBeenCalled();
  });

  it('401 when requireAuth returns NextResponse', async () => {
    mockRequireAuth.mockResolvedValue(new NextResponse(null, { status: 401 }));
    const req = new NextRequest('http://localhost:3000/api/stripe/portal', { method: 'POST' });

    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('404 when user has no organizationId', async () => {
    mockRequireAuth.mockResolvedValue({ user: { organizationId: '' } });
    const req = new NextRequest('http://localhost:3000/api/stripe/portal', { method: 'POST' });

    const res = await POST(req);

    expect(res.status).toBe(404);
  });

  it('400 when org has no stripeCustomerId (free tier — D-07)', async () => {
    mockRequireAuth.mockResolvedValue({ user: { organizationId: 'org1' } });
    mockOrganization.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ planTier: 'free' })
      })
    });
    const req = new NextRequest('http://localhost:3000/api/stripe/portal', { method: 'POST' });

    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('No billing account found');
    expect(mockPortalCreate).not.toHaveBeenCalled();
  });

  it('happy path: creates portal session with correct return_url', async () => {
    mockRequireAuth.mockResolvedValue({ user: { organizationId: 'org1' } });
    mockOrganization.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ stripeCustomerId: 'cus_abc', planTier: 'pro' })
      })
    });
    const req = new NextRequest('http://localhost:3000/api/stripe/portal', { method: 'POST' });

    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe('https://billing.stripe.com/p/session/bps_xxx');
    expect(mockPortalCreate).toHaveBeenCalledWith({
      customer: 'cus_abc',
      return_url: 'https://app.example.com/account'
    });
  });
});