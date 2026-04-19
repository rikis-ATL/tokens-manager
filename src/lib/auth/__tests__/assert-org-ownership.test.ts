import type { Session } from 'next-auth';
import { assertOrgOwnership } from '../assert-org-ownership';

jest.mock('@/lib/mongodb', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));

const mockSelect = jest.fn();
const mockLean = jest.fn();
const mockFindById = jest.fn(() => ({ select: mockSelect.mockReturnValue({ lean: mockLean }) }));

jest.mock('@/lib/db/models/TokenCollection', () => ({
  __esModule: true,
  default: { findById: (id: string) => mockFindById(id) },
}));

function makeSession(orgId: string | undefined): Session {
  return {
    user: {
      id: 'u1',
      role: 'Admin',
      email: 'x@x.com',
      organizationId: orgId ?? '',
    },
    expires: new Date(Date.now() + 3600_000).toISOString(),
  } as Session;
}

describe('assertOrgOwnership (Phase 22 D-06, D-07)', () => {
  beforeEach(() => {
    mockFindById.mockClear();
    mockSelect.mockClear();
    mockLean.mockReset();
  });

  it('returns null on match (happy path)', async () => {
    mockLean.mockResolvedValue({ organizationId: 'org1' });
    const result = await assertOrgOwnership(makeSession('org1'), 'coll1');
    expect(result).toBeNull();
  });

  it('returns 404 on cross-tenant mismatch', async () => {
    mockLean.mockResolvedValue({ organizationId: 'org2' });
    const result = await assertOrgOwnership(makeSession('org1'), 'coll1');
    expect(result).not.toBeNull();
    expect(result!.status).toBe(404);
    const body = await result!.json();
    expect(body).toEqual({ error: 'Not Found' });
  });

  it('returns 404 when collection does not exist', async () => {
    mockLean.mockResolvedValue(null);
    const result = await assertOrgOwnership(makeSession('org1'), 'coll1');
    expect(result).not.toBeNull();
    expect(result!.status).toBe(404);
  });

  it('returns 404 when session has no organizationId (Pitfall 1 — pre-migration JWT)', async () => {
    const result = await assertOrgOwnership(makeSession(''), 'coll1');
    expect(result).not.toBeNull();
    expect(result!.status).toBe(404);
    // DB must not even be queried when session claim is missing
    expect(mockFindById).not.toHaveBeenCalled();
  });

  it('returns 404 when collectionId is empty (Pitfall 6)', async () => {
    const result = await assertOrgOwnership(makeSession('org1'), '');
    expect(result).not.toBeNull();
    expect(result!.status).toBe(404);
    expect(mockFindById).not.toHaveBeenCalled();
  });

  it('handles ObjectId vs string comparison correctly (Pitfall 2)', async () => {
    // Simulate Mongoose returning an ObjectId-like object that stringifies to 'org1'
    const objectIdLike = { toString: () => 'org1' };
    mockLean.mockResolvedValue({ organizationId: objectIdLike });
    const result = await assertOrgOwnership(makeSession('org1'), 'coll1');
    expect(result).toBeNull();
  });

  it('selects only the organizationId field from the DB (performance — Pitfall from anti-patterns)', async () => {
    mockLean.mockResolvedValue({ organizationId: 'org1' });
    await assertOrgOwnership(makeSession('org1'), 'coll1');
    expect(mockSelect).toHaveBeenCalledWith('organizationId');
  });
});
