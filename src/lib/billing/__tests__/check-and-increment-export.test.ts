import { checkAndIncrementExport } from '../check-and-increment-export';

jest.mock('@/lib/mongodb', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));

const mockFindOneAndUpdate = jest.fn().mockResolvedValue(null);
const mockUpdateOne = jest.fn().mockResolvedValue({ acknowledged: true });
const mockOrgLean = jest.fn();
const mockOrgSelect = jest.fn();
const mockOrgFindById = jest.fn(() => ({ select: mockOrgSelect.mockReturnValue({ lean: mockOrgLean }) }));

jest.mock('@/lib/db/models/Organization', () => ({
  __esModule: true,
  default: {
    findById: (id: string) => mockOrgFindById(id),
    findOneAndUpdate: (...a: unknown[]) => mockFindOneAndUpdate(...a),
    updateOne: (...a: unknown[]) => mockUpdateOne(...a),
  },
}));

describe('checkAndIncrementExport — LIMIT-04/05 + D-12 lazy UTC reset', () => {
  const ORIG = process.env;
  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...ORIG, SELF_HOSTED: undefined };
    // Re-establish mock chains after resetAllMocks
    mockOrgSelect.mockReturnValue({ lean: mockOrgLean });
    mockOrgFindById.mockReturnValue({ select: mockOrgSelect });
    mockFindOneAndUpdate.mockResolvedValue(null);
    mockUpdateOne.mockResolvedValue({ acknowledged: true });
  });
  afterAll(() => { process.env = ORIG; });

  it('D-14: SELF_HOSTED bypasses all calls', async () => {
    process.env.SELF_HOSTED = 'true';
    expect(await checkAndIncrementExport('org1')).toBeNull();
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  it('calls findOneAndUpdate with a UTC-month start $lt filter (D-12)', async () => {
    mockOrgLean.mockResolvedValue({ planTier: 'free', usage: { exportsThisMonth: 0 } });
    await checkAndIncrementExport('org1');
    expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(1);
    const filter = mockFindOneAndUpdate.mock.calls[0][0];
    expect(filter._id).toBe('org1');
    expect(filter['usage.exportResetAt']).toEqual({ $lt: expect.any(Date) });
    const monthStart = filter['usage.exportResetAt'].$lt as Date;
    // Must be UTC first-of-month at 00:00:00 — day=1, hours=0
    expect(monthStart.getUTCDate()).toBe(1);
    expect(monthStart.getUTCHours()).toBe(0);
    expect(monthStart.getUTCMinutes()).toBe(0);
  });

  it('under cap returns null and $inc the counter', async () => {
    mockOrgLean.mockResolvedValue({ planTier: 'free', usage: { exportsThisMonth: 5 } });
    const result = await checkAndIncrementExport('org1');
    expect(result).toBeNull();
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { _id: 'org1' },
      { $inc: { 'usage.exportsThisMonth': 1 } }
    );
  });

  it('at cap returns 402 with D-02 payload and does NOT increment', async () => {
    mockOrgLean.mockResolvedValue({ planTier: 'free', usage: { exportsThisMonth: 10 } });
    const result = await checkAndIncrementExport('org1');
    expect(result!.status).toBe(402);
    const body = await result!.json();
    expect(body).toEqual({ code: 'LIMIT_EXCEEDED', resource: 'exports', current: 10, max: 10, tier: 'free' });
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  it('team tier (Infinity) returns null and does NOT increment', async () => {
    mockOrgLean.mockResolvedValue({ planTier: 'team', usage: { exportsThisMonth: 999 } });
    const result = await checkAndIncrementExport('org1');
    expect(result).toBeNull();
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  it('returns 404 when org not found', async () => {
    mockOrgLean.mockResolvedValue(null);
    const result = await checkAndIncrementExport('org1');
    expect(result!.status).toBe(404);
  });
});
