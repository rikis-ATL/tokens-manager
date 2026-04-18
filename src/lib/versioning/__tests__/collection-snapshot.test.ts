import { assertValidSemver, buildCollectionSnapshot } from '../collection-snapshot';
import type { CollectionDoc } from '@/lib/db/repository';

describe('assertValidSemver', () => {
  it('accepts valid semver', () => {
    expect(() => assertValidSemver('1.0.0')).not.toThrow();
    expect(() => assertValidSemver('  2.3.4-rc.1  ')).not.toThrow();
  });

  it('rejects invalid semver', () => {
    expect(() => assertValidSemver('')).toThrow();
    expect(() => assertValidSemver('not-a-version')).toThrow();
  });
});

describe('buildCollectionSnapshot', () => {
  it('copies design fields from collection doc', () => {
    const doc = {
      _id: 'x',
      name: 'Test',
      namespace: 'token',
      tokens: { token: { color: { primary: { value: '#000' } } } },
      graphState: null,
      themes: [],
      colorFormat: 'hex' as const,
      description: null,
      tags: [],
      accentColor: null,
      sourceMetadata: null,
      userId: null,
      figmaToken: null,
      figmaFileId: null,
      githubRepo: null,
      githubBranch: null,
      githubPath: null,
      npmPackageName: null,
      npmRegistryUrl: null,
      npmTokenConfigured: false,
      isPlayground: false,
      createdAt: '',
      updatedAt: '',
    } satisfies CollectionDoc;

    const snap = buildCollectionSnapshot(doc);
    expect(snap.name).toBe('Test');
    expect(snap.namespace).toBe('token');
    expect(snap.themes).toEqual([]);
  });
});
