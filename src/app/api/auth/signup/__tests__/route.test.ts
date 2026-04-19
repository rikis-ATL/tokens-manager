// Mocks MUST be declared before the import of the route.
jest.mock('@/lib/mongodb', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));

const mockUserFindOne = jest.fn();
const mockUserCreate = jest.fn();
jest.mock('@/lib/db/models/User', () => ({
  __esModule: true,
  default: {
    findOne: (...a: unknown[]) => ({ lean: () => mockUserFindOne(...a) }),
    create: (...a: unknown[]) => mockUserCreate(...a),
  },
}));

const mockOrgCreate = jest.fn();
const mockOrgFindByIdAndDelete = jest.fn(() => ({ catch: () => undefined }));
jest.mock('@/lib/db/models/Organization', () => ({
  __esModule: true,
  default: {
    create: (...a: unknown[]) => mockOrgCreate(...a),
    findByIdAndDelete: (...a: unknown[]) => mockOrgFindByIdAndDelete(...a),
  },
}));

jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: { hash: jest.fn().mockResolvedValue('HASHED') },
}));

import { POST } from '../route';

function makeReq(body: Record<string, unknown>) {
  return new Request('http://localhost/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/signup (Phase 22 D-03, D-04)', () => {
  beforeEach(() => {
    mockUserFindOne.mockReset();
    mockUserCreate.mockReset();
    mockOrgCreate.mockReset();
    mockOrgFindByIdAndDelete.mockClear();
  });

  const valid = {
    orgName: 'Acme',
    displayName: 'Jane',
    email: 'jane@acme.com',
    password: 'password123',
  };

  it('creates Org and Admin User atomically on valid input', async () => {
    mockUserFindOne.mockResolvedValue(null);
    mockOrgCreate.mockResolvedValue({ _id: 'org1' });
    mockUserCreate.mockResolvedValue({ _id: 'u1' });

    const res = await POST(makeReq(valid));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({ ok: true, organizationId: 'org1' });

    expect(mockOrgCreate).toHaveBeenCalledWith({ name: 'Acme' });
    expect(mockUserCreate).toHaveBeenCalledWith(expect.objectContaining({
      displayName: 'Jane',
      email: 'jane@acme.com',
      passwordHash: 'HASHED',
      role: 'Admin',
      status: 'active',
      organizationId: 'org1',
    }));
  });

  it('returns 400 when orgName missing', async () => {
    const res = await POST(makeReq({ ...valid, orgName: '' }));
    expect(res.status).toBe(400);
    expect(mockOrgCreate).not.toHaveBeenCalled();
  });

  it('returns 400 when displayName missing', async () => {
    const res = await POST(makeReq({ ...valid, displayName: '' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when email is not email-shaped', async () => {
    const res = await POST(makeReq({ ...valid, email: 'not-an-email' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when password < 8 chars', async () => {
    const res = await POST(makeReq({ ...valid, password: 'short' }));
    expect(res.status).toBe(400);
  });

  it('returns 409 on duplicate email without creating an Organization', async () => {
    mockUserFindOne.mockResolvedValue({ _id: 'existing' });
    const res = await POST(makeReq(valid));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body).toEqual({ error: 'Email already in use' });
    expect(mockOrgCreate).not.toHaveBeenCalled();
  });

  it('rolls back the Organization when User.create throws (Pitfall 5)', async () => {
    mockUserFindOne.mockResolvedValue(null);
    mockOrgCreate.mockResolvedValue({ _id: 'org1' });
    mockUserCreate.mockRejectedValue(new Error('db exploded'));

    const res = await POST(makeReq(valid));
    expect(res.status).toBe(500);
    expect(mockOrgFindByIdAndDelete).toHaveBeenCalledWith('org1');
  });

  it('lowercases the email before storage', async () => {
    mockUserFindOne.mockResolvedValue(null);
    mockOrgCreate.mockResolvedValue({ _id: 'org1' });
    mockUserCreate.mockResolvedValue({ _id: 'u1' });

    await POST(makeReq({ ...valid, email: 'Jane@Acme.COM' }));
    expect(mockUserCreate).toHaveBeenCalledWith(expect.objectContaining({ email: 'jane@acme.com' }));
    expect(mockUserFindOne).toHaveBeenCalledWith({ email: 'jane@acme.com' });
  });

  it('hashes the password via bcrypt (never stores plain text)', async () => {
    mockUserFindOne.mockResolvedValue(null);
    mockOrgCreate.mockResolvedValue({ _id: 'org1' });
    mockUserCreate.mockResolvedValue({ _id: 'u1' });

    await POST(makeReq(valid));
    // passwordHash is always the mock value 'HASHED', never 'password123'
    expect(mockUserCreate).toHaveBeenCalledWith(expect.objectContaining({ passwordHash: 'HASHED' }));
    const createdArg = mockUserCreate.mock.calls[0][0] as { passwordHash: string };
    expect(createdArg.passwordHash).not.toBe(valid.password);
  });

  it('does not touch /api/auth/setup route (D-05 regression guard)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const setupModule = require('@/app/api/auth/setup/route');
    expect(typeof setupModule.POST).toBe('function');
    expect(typeof setupModule.GET).toBe('function');
  });
});
