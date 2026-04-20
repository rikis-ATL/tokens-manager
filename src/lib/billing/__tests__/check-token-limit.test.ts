import { checkTokenLimit } from '../check-token-limit';

jest.mock('@/lib/mongodb', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));

const mockOrgLean = jest.fn();
const mockOrgSelect = jest.fn();
const mockOrgFindById = jest.fn(() => ({ select: mockOrgSelect.mockReturnValue({ lean: mockOrgLean }) }));
jest.mock('@/lib/db/models/Organization', () => ({
  __esModule: true,
  default: { findById: (id: string) => mockOrgFindById(id) },
}));

const mockCollFind = jest.fn();
const mockCollSelect = jest.fn();
const mockCollLean = jest.fn();
jest.mock('@/lib/db/models/TokenCollection', () => ({
  __esModule: true,
  default: {
    find: (...a: unknown[]) => {
      mockCollFind(...a);
      return { select: (...b: unknown[]) => { mockCollSelect(...b); return { lean: () => mockCollLean() }; } };
    },
  },
}));

describe('checkTokenLimit — LIMIT-03 (D-07 live aggregation)', () => {
  const ORIG = process.env;
  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...ORIG, SELF_HOSTED: undefined };
    // Re-establish mock chains after resetAllMocks
    mockOrgSelect.mockReturnValue({ lean: mockOrgLean });
    mockOrgFindById.mockReturnValue({ select: mockOrgSelect });
  });
  afterAll(() => { process.env = ORIG; });

  it('SELF_HOSTED=true bypasses (D-14)', async () => {
    process.env.SELF_HOSTED = 'true';
    expect(await checkTokenLimit('org1')).toBeNull();
    expect(mockOrgFindById).not.toHaveBeenCalled();
  });

  it('free tier with total < 500 returns null', async () => {
    mockOrgLean.mockResolvedValue({ planTier: 'free' });
    mockCollLean.mockResolvedValue([
      { tokens: { token: { c: { $value: '#fff' } } } },
      { tokens: { token: { d: { $value: '#000' } } } },
    ]);
    expect(await checkTokenLimit('org1')).toBeNull();
  });

  it('free tier with total >= 500 returns 402 with D-02 payload', async () => {
    mockOrgLean.mockResolvedValue({ planTier: 'free' });
    // Build 500 tokens across collections
    const tokens: Record<string, { $value: string }> = {};
    for (let i = 0; i < 500; i++) tokens[`t${i}`] = { $value: '#fff' };
    mockCollLean.mockResolvedValue([{ tokens: { token: tokens } }]);
    const result = await checkTokenLimit('org1');
    expect(result!.status).toBe(402);
    const body = await result!.json();
    expect(body).toEqual({ code: 'LIMIT_EXCEEDED', resource: 'tokens', current: 500, max: 500, tier: 'free' });
  });

  it('team tier skips aggregation (Pitfall 7 — Infinity)', async () => {
    mockOrgLean.mockResolvedValue({ planTier: 'team' });
    const result = await checkTokenLimit('org1');
    expect(result).toBeNull();
    expect(mockCollFind).not.toHaveBeenCalled();
  });

  it('404 when org not found', async () => {
    mockOrgLean.mockResolvedValue(null);
    const result = await checkTokenLimit('org1');
    expect(result!.status).toBe(404);
  });
});
