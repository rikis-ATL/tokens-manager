jest.mock('@/lib/mongodb', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));

const mockLean = jest.fn().mockResolvedValue([]);
const mockSort = jest.fn(() => ({ lean: mockLean }));
const mockFind = jest.fn(() => ({ sort: mockSort }));

jest.mock('@/lib/db/models/TokenCollection', () => ({
  __esModule: true,
  default: { find: (...a: unknown[]) => mockFind(...a) },
}));

import { MongoCollectionRepository } from '../mongo-repository';

describe('MongoCollectionRepository.list() — organizationId filter (Phase 22 TENANT-01)', () => {
  let repo: MongoCollectionRepository;

  beforeEach(() => {
    mockFind.mockClear();
    mockSort.mockClear();
    mockLean.mockClear();
    repo = new MongoCollectionRepository();
  });

  it('filters by organizationId when provided', async () => {
    await repo.list({ organizationId: 'org1' });
    expect(mockFind).toHaveBeenCalledWith({ organizationId: 'org1' });
  });

  it('passes empty filter when no options given (backward compat)', async () => {
    await repo.list();
    expect(mockFind).toHaveBeenCalledWith({});
  });

  it('treats empty-string organizationId as no filter (safety)', async () => {
    await repo.list({ organizationId: '' });
    expect(mockFind).toHaveBeenCalledWith({});
  });

  it('treats undefined organizationId as no filter', async () => {
    await repo.list({ organizationId: undefined });
    expect(mockFind).toHaveBeenCalledWith({});
  });

  it('preserves .sort({ updatedAt: -1 }).lean() tail', async () => {
    await repo.list({ organizationId: 'org1' });
    expect(mockSort).toHaveBeenCalledWith({ updatedAt: -1 });
    expect(mockLean).toHaveBeenCalled();
  });
});
