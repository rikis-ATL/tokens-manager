// Mocks MUST be declared before the import of the script module.
jest.mock('../../src/lib/mongodb', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));

const mockOrgCount = jest.fn();
const mockOrgCreate = jest.fn();
jest.mock('../../src/lib/db/models/Organization', () => ({
  __esModule: true,
  default: {
    countDocuments: (...a: unknown[]) => mockOrgCount(...a),
    create: (...a: unknown[]) => mockOrgCreate(...a),
  },
}));

const mockUserUpdateMany = jest.fn();
jest.mock('../../src/lib/db/models/User', () => ({
  __esModule: true,
  default: { updateMany: (...a: unknown[]) => mockUserUpdateMany(...a) },
}));

const mockCollUpdateMany = jest.fn();
jest.mock('../../src/lib/db/models/TokenCollection', () => ({
  __esModule: true,
  default: { updateMany: (...a: unknown[]) => mockCollUpdateMany(...a) },
}));

import { migrate } from '../migrate-to-org';

describe('scripts/migrate-to-org.ts (Phase 22 TENANT-03)', () => {
  const ORIGINAL_ENV = process.env.INITIAL_ORG_NAME;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    mockOrgCount.mockReset();
    mockOrgCreate.mockReset();
    mockUserUpdateMany.mockReset();
    mockCollUpdateMany.mockReset();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => { /* suppress */ });
  });

  afterEach(() => {
    process.env.INITIAL_ORG_NAME = ORIGINAL_ENV;
    logSpy.mockRestore();
  });

  it('skips when an Organization already exists (D-13 idempotency)', async () => {
    mockOrgCount.mockResolvedValue(1);

    const result = await migrate();
    expect(result).toBeNull();
    expect(mockOrgCreate).not.toHaveBeenCalled();
    expect(mockUserUpdateMany).not.toHaveBeenCalled();
    expect(mockCollUpdateMany).not.toHaveBeenCalled();
    const logged = logSpy.mock.calls.flat().join(' ');
    expect(logged.toLowerCase()).toContain('skip');
  });

  it('seeds Organization with INITIAL_ORG_NAME when env is set (D-12)', async () => {
    process.env.INITIAL_ORG_NAME = 'Acme Inc';
    mockOrgCount.mockResolvedValue(0);
    mockOrgCreate.mockResolvedValue({ _id: 'org1' });
    mockUserUpdateMany.mockResolvedValue({ modifiedCount: 0 });
    mockCollUpdateMany.mockResolvedValue({ modifiedCount: 0 });

    await migrate();
    expect(mockOrgCreate).toHaveBeenCalledWith({ name: 'Acme Inc' });
  });

  it('defaults Organization name to "Default Organization" when env unset', async () => {
    delete process.env.INITIAL_ORG_NAME;
    mockOrgCount.mockResolvedValue(0);
    mockOrgCreate.mockResolvedValue({ _id: 'org1' });
    mockUserUpdateMany.mockResolvedValue({ modifiedCount: 0 });
    mockCollUpdateMany.mockResolvedValue({ modifiedCount: 0 });

    await migrate();
    expect(mockOrgCreate).toHaveBeenCalledWith({ name: 'Default Organization' });
  });

  it('back-fills User docs missing organizationId (D-12)', async () => {
    mockOrgCount.mockResolvedValue(0);
    mockOrgCreate.mockResolvedValue({ _id: 'org1' });
    mockUserUpdateMany.mockResolvedValue({ modifiedCount: 3 });
    mockCollUpdateMany.mockResolvedValue({ modifiedCount: 0 });

    const result = await migrate();
    expect(mockUserUpdateMany).toHaveBeenCalledWith(
      { organizationId: { $exists: false } },
      { $set: { organizationId: 'org1' } }
    );
    expect(result?.usersUpdated).toBe(3);
  });

  it('back-fills TokenCollection docs missing organizationId (D-12)', async () => {
    mockOrgCount.mockResolvedValue(0);
    mockOrgCreate.mockResolvedValue({ _id: 'org1' });
    mockUserUpdateMany.mockResolvedValue({ modifiedCount: 0 });
    mockCollUpdateMany.mockResolvedValue({ modifiedCount: 5 });

    const result = await migrate();
    expect(mockCollUpdateMany).toHaveBeenCalledWith(
      { organizationId: { $exists: false } },
      { $set: { organizationId: 'org1' } }
    );
    expect(result?.collectionsUpdated).toBe(5);
  });

  it('prints the seeded Organization _id for DEMO_ORG_ID configuration', async () => {
    mockOrgCount.mockResolvedValue(0);
    mockOrgCreate.mockResolvedValue({ _id: 'org1' });
    mockUserUpdateMany.mockResolvedValue({ modifiedCount: 0 });
    mockCollUpdateMany.mockResolvedValue({ modifiedCount: 0 });

    await migrate();
    const logged = logSpy.mock.calls.flat().join(' ');
    expect(logged).toContain('DEMO_ORG_ID=org1');
  });

  it('returns the orgId + counts on success', async () => {
    mockOrgCount.mockResolvedValue(0);
    mockOrgCreate.mockResolvedValue({ _id: 'org42' });
    mockUserUpdateMany.mockResolvedValue({ modifiedCount: 2 });
    mockCollUpdateMany.mockResolvedValue({ modifiedCount: 7 });

    const result = await migrate();
    expect(result).toEqual({ orgId: 'org42', usersUpdated: 2, collectionsUpdated: 7 });
  });

  it('propagates errors from Organization.create so the top-level CLI wrapper can exit 1', async () => {
    mockOrgCount.mockResolvedValue(0);
    mockOrgCreate.mockRejectedValue(new Error('db exploded'));

    await expect(migrate()).rejects.toThrow('db exploded');
  });
});
