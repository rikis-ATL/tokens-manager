import { checkCollectionLimit } from '../check-collection-limit';

jest.mock('@/lib/mongodb', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));

const mockOrgLean = jest.fn();
const mockOrgSelect = jest.fn(() => ({ lean: mockOrgLean }));
const mockOrgFindById = jest.fn(() => ({ select: mockOrgSelect }));
const mockCountDocuments = jest.fn();

jest.mock('@/lib/db/models/Organization', () => ({
  __esModule: true,
  default: { findById: (id: string) => mockOrgFindById(id) },
}));
jest.mock('@/lib/db/models/TokenCollection', () => ({
  __esModule: true,
  default: { countDocuments: (...args: unknown[]) => mockCountDocuments(...args) },
}));

describe('checkCollectionLimit — Phase 23 LIMIT-01', () => {
  const ORIGINAL_ENV = process.env;
  beforeEach(() => {
    mockOrgLean.mockReset();
    mockOrgSelect.mockClear();
    mockOrgFindById.mockClear();
    mockCountDocuments.mockReset();
    process.env = { ...ORIGINAL_ENV, SELF_HOSTED: undefined };
  });
  afterAll(() => { process.env = ORIGINAL_ENV; });

  it('D-14: SELF_HOSTED=true short-circuits and returns null without DB reads', async () => {
    process.env.SELF_HOSTED = 'true';
    const result = await checkCollectionLimit('org1');
    expect(result).toBeNull();
    expect(mockOrgFindById).not.toHaveBeenCalled();
    expect(mockCountDocuments).not.toHaveBeenCalled();
  });

  it('returns 404 when organizationId is empty string', async () => {
    const result = await checkCollectionLimit('');
    expect(result).not.toBeNull();
    expect(result!.status).toBe(404);
  });

  it('returns 404 when Organization not found', async () => {
    mockOrgLean.mockResolvedValue(null);
    const result = await checkCollectionLimit('org1');
    expect(result!.status).toBe(404);
  });

  it('free tier with 0 existing returns null (under cap)', async () => {
    mockOrgLean.mockResolvedValue({ planTier: 'free' });
    mockCountDocuments.mockResolvedValue(0);
    const result = await checkCollectionLimit('org1');
    expect(result).toBeNull();
  });

  it('free tier with 1 existing returns 402 with D-02 payload shape', async () => {
    mockOrgLean.mockResolvedValue({ planTier: 'free' });
    mockCountDocuments.mockResolvedValue(1);
    const result = await checkCollectionLimit('org1');
    expect(result).not.toBeNull();
    expect(result!.status).toBe(402);
    const body = await result!.json();
    expect(body).toEqual({
      code: 'LIMIT_EXCEEDED',
      resource: 'collections',
      current: 1,
      max: 1,
      tier: 'free',
    });
  });

  it('defaults to free tier when org document has no planTier field', async () => {
    mockOrgLean.mockResolvedValue({});  // no planTier
    mockCountDocuments.mockResolvedValue(1);
    const result = await checkCollectionLimit('org1');
    expect(result!.status).toBe(402);
    const body = await result!.json();
    expect(body.tier).toBe('free');
  });

  it('team tier skips count query entirely (Pitfall 7 — Infinity)', async () => {
    mockOrgLean.mockResolvedValue({ planTier: 'team' });
    const result = await checkCollectionLimit('org1');
    expect(result).toBeNull();
    expect(mockCountDocuments).not.toHaveBeenCalled();
  });
});
