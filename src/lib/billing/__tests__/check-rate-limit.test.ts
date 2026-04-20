import { checkRateLimit } from '../check-rate-limit';

jest.mock('@/lib/mongodb', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));

const mockOrgLean = jest.fn();
const mockOrgSelect = jest.fn();
const mockOrgFindById = jest.fn(() => ({ select: mockOrgSelect.mockReturnValue({ lean: mockOrgLean }) }));
jest.mock('@/lib/db/models/Organization', () => ({
  __esModule: true,
  default: { findById: (id: string) => mockOrgFindById(id) },
}));

const mockConsume = jest.fn();
jest.mock('rate-limiter-flexible', () => {
  class RateLimiterMongo {
    constructor(public opts: unknown) {}
    async consume(userId: string) { return mockConsume(userId); }
  }
  class RateLimiterRes { msBeforeNext = 60_000; }
  return { __esModule: true, RateLimiterMongo, RateLimiterRes };
});

jest.mock('mongoose', () => ({ __esModule: true, default: { connection: {} }, connection: {} }));

describe('checkRateLimit — Phase 23 RATE-01', () => {
  const ORIG_ENV = process.env;
  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...ORIG_ENV, SELF_HOSTED: undefined };
    // Re-establish mock chains after resetAllMocks
    mockOrgSelect.mockReturnValue({ lean: mockOrgLean });
    mockOrgFindById.mockReturnValue({ select: mockOrgSelect });
  });
  afterAll(() => { process.env = ORIG_ENV; });

  it('D-14: SELF_HOSTED=true returns null without any DB or limiter calls', async () => {
    process.env.SELF_HOSTED = 'true';
    const result = await checkRateLimit('u1', 'org1');
    expect(result).toBeNull();
    expect(mockConsume).not.toHaveBeenCalled();
    expect(mockOrgFindById).not.toHaveBeenCalled();
  });

  it('returns 401 when userId is empty/undefined (D-11: key must be session.user.id)', async () => {
    const result = await checkRateLimit('', 'org1');
    expect(result!.status).toBe(401);
  });

  it('returns null when limiter.consume resolves (under limit)', async () => {
    mockOrgLean.mockResolvedValue({ planTier: 'free' });
    mockConsume.mockResolvedValue({ remainingPoints: 59 });
    const result = await checkRateLimit('u1', 'org1');
    expect(result).toBeNull();
    expect(mockConsume).toHaveBeenCalledWith('u1');
  });

  it('returns 429 with D-03 payload when limiter.consume rejects', async () => {
    mockOrgLean.mockResolvedValue({ planTier: 'free' });
    mockConsume.mockRejectedValue(Object.assign(new Error('rl'), { msBeforeNext: 30_000 }));
    const result = await checkRateLimit('u1', 'org1');
    expect(result!.status).toBe(429);
    const body = await result!.json();
    expect(body.code).toBe('RATE_LIMITED');
    expect(typeof body.retryAfterSeconds).toBe('number');
  });

  it('uses free tier points (60) when organizationId is not provided', async () => {
    mockConsume.mockResolvedValue({ remainingPoints: 59 });
    const result = await checkRateLimit('u1');
    expect(result).toBeNull();
    expect(mockOrgFindById).not.toHaveBeenCalled();
  });
});
