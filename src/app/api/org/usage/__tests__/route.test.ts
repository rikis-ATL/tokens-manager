import { NextResponse } from 'next/server';

jest.mock('@/lib/mongodb', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));

const mockAuth = jest.fn();
jest.mock('@/lib/auth/require-auth', () => ({ requireAuth: () => mockAuth() }));

const mockOrgLean = jest.fn();
const mockOrgSelect = jest.fn();
const mockOrgFindById = jest.fn(() => ({ select: mockOrgSelect.mockReturnValue({ lean: mockOrgLean }) }));
jest.mock('@/lib/db/models/Organization', () => ({
  __esModule: true,
  default: { findById: (id: string) => mockOrgFindById(id) },
}));

const mockCollLean = jest.fn();
const mockCollSelect = jest.fn();
const mockCollFind = jest.fn(() => ({ select: mockCollSelect.mockReturnValue({ lean: mockCollLean }) }));
jest.mock('@/lib/db/models/TokenCollection', () => ({
  __esModule: true,
  default: { find: (q: unknown) => mockCollFind(q) },
}));

import { GET } from '../route';

const SESSION = { user: { id: 'u1', organizationId: 'org1', email: 'a@b', role: 'Admin' }, expires: new Date(Date.now() + 3600_000).toISOString() };

describe('GET /api/org/usage', () => {
  const ORIG = process.env;
  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...ORIG, SELF_HOSTED: undefined };
    // Re-establish mock chains after resetAllMocks
    mockOrgSelect.mockReturnValue({ lean: mockOrgLean });
    mockCollSelect.mockReturnValue({ lean: mockCollLean });
    mockOrgFindById.mockReturnValue({ select: mockOrgSelect });
    mockCollFind.mockReturnValue({ select: mockCollSelect });
  });
  afterAll(() => { process.env = ORIG; });

  it('returns 401 when requireAuth returns a NextResponse', async () => {
    mockAuth.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    const result = await GET();
    expect(result.status).toBe(401);
  });

  it('SELF_HOSTED=true returns self-hosted payload with null limits (Infinity serialized)', async () => {
    process.env.SELF_HOSTED = 'true';
    mockAuth.mockResolvedValue(SESSION);
    const result = await GET();
    const body = await result.json();
    expect(body).toEqual({
      orgName: 'Self-Hosted',
      plan: 'team',
      tokenCount: 0,
      tokenMax: null,
      exportsThisMonth: 0,
      exportsMax: null,
    });
    expect(mockOrgFindById).not.toHaveBeenCalled();
  });

  it('returns 404 when org not found', async () => {
    mockAuth.mockResolvedValue(SESSION);
    mockOrgLean.mockResolvedValue(null);
    const result = await GET();
    expect(result.status).toBe(404);
  });

  it('returns free-tier payload with numeric limits', async () => {
    mockAuth.mockResolvedValue(SESSION);
    mockOrgLean.mockResolvedValue({
      name: 'Acme',
      planTier: 'free',
      usage: { exportsThisMonth: 3, exportResetAt: new Date() },
    });
    mockCollLean.mockResolvedValue([{ tokens: { token: { c: { $value: '#fff' } } } }]);
    const result = await GET();
    const body = await result.json();
    expect(body).toEqual({
      orgName: 'Acme',
      plan: 'free',
      tokenCount: 1,
      tokenMax: 500,
      exportsThisMonth: 3,
      exportsMax: 10,
    });
  });

  it('returns team tier with null limits (Infinity → null)', async () => {
    mockAuth.mockResolvedValue(SESSION);
    mockOrgLean.mockResolvedValue({ name: 'BigCo', planTier: 'team', usage: { exportsThisMonth: 999 } });
    mockCollLean.mockResolvedValue([]);
    const result = await GET();
    const body = await result.json();
    expect(body.plan).toBe('team');
    expect(body.tokenMax).toBeNull();
    expect(body.exportsMax).toBeNull();
  });
});
