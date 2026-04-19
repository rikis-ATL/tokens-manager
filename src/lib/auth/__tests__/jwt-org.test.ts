import { authOptions } from '../nextauth.config';

// Mock the DB layer
jest.mock('@/lib/mongodb', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));

const mockFindOne = jest.fn();
jest.mock('@/lib/db/models/User', () => ({
  __esModule: true,
  default: { findOne: (...a: unknown[]) => mockFindOne(...a), findById: jest.fn() },
}));

jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: { compare: jest.fn().mockResolvedValue(true) },
}));

describe('NextAuth — organizationId claim (Phase 22)', () => {
  beforeEach(() => { mockFindOne.mockReset(); });

  // CredentialsProvider stores the user-supplied authorize in .options.authorize;
  // .authorize on the provider object is the default no-op () => null.
  const credentialsProvider = (authOptions.providers[0] as unknown as { options: { authorize: (c: unknown) => Promise<unknown> } }).options;
  const jwtCallback = authOptions.callbacks!.jwt!;
  const sessionCallback = authOptions.callbacks!.session!;

  it('authorize() returns organizationId from DB user', async () => {
    mockFindOne.mockResolvedValue({
      _id: { toString: () => 'u1' },
      email: 'x@x.com',
      displayName: 'X',
      role: 'Admin',
      passwordHash: 'hashed',
      status: 'active',
      organizationId: { toString: () => 'org1' },
    });
    const result = await credentialsProvider.authorize({ email: 'x@x.com', password: 'pw' }) as { organizationId: string };
    expect(result.organizationId).toBe('org1');
  });

  it('authorize() returns empty string when DB user has no organizationId (defence-in-depth)', async () => {
    mockFindOne.mockResolvedValue({
      _id: { toString: () => 'u1' },
      email: 'x@x.com',
      displayName: 'X',
      role: 'Admin',
      passwordHash: 'hashed',
      status: 'active',
      // organizationId absent
    });
    const result = await credentialsProvider.authorize({ email: 'x@x.com', password: 'pw' }) as { organizationId: string };
    expect(result.organizationId).toBe('');
  });

  it('jwt callback copies organizationId on initial sign-in', async () => {
    const token = await jwtCallback({
      token: { email: 'x@x.com' } as never,
      user: { id: 'u1', email: 'x@x.com', name: 'X', role: 'Admin', organizationId: 'org1' } as never,
      account: null,
      profile: undefined,
      trigger: 'signIn',
    } as never);
    expect((token as { organizationId?: string }).organizationId).toBe('org1');
  });

  it('session callback exposes organizationId on session.user', async () => {
    const session = await sessionCallback({
      session: { user: { id: '', role: '', email: '' }, expires: '' } as never,
      token: { id: 'u1', role: 'Admin', organizationId: 'org1' } as never,
      user: undefined as never,
      newSession: undefined as never,
      trigger: 'update',
    } as never);
    expect((session as { user: { organizationId: string } }).user.organizationId).toBe('org1');
  });

  it('session callback defaults organizationId to empty string when token has none (Pitfall 1)', async () => {
    const session = await sessionCallback({
      session: { user: { id: '', role: '', email: '' }, expires: '' } as never,
      token: { id: 'u1', role: 'Admin' } as never, // no organizationId — pre-Phase-22 token
      user: undefined as never,
      newSession: undefined as never,
      trigger: 'update',
    } as never);
    expect((session as { user: { organizationId: string } }).user.organizationId).toBe('');
  });
});
