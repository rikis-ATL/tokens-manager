import type { CollectionDoc } from '@/lib/db/repository';
import type { ICollectionSnapshot } from '@/types/collection-version.types';
import { valid as semverValid } from 'semver';

export function buildCollectionSnapshot(doc: CollectionDoc): ICollectionSnapshot {
  return {
    name: doc.name,
    namespace: doc.namespace ?? 'token',
    tokens: doc.tokens ?? {},
    graphState: doc.graphState ?? null,
    themes: doc.themes ?? [],
    colorFormat: doc.colorFormat ?? 'hex',
    description: doc.description ?? null,
    tags: doc.tags ?? [],
    accentColor: doc.accentColor ?? null,
    sourceMetadata: doc.sourceMetadata ?? null,
  };
}

export function assertValidSemver(version: string): void {
  const v = version.trim();
  if (!v) {
    throw new Error('Version is required');
  }
  if (!semverValid(v)) {
    throw new Error(`Invalid semver: ${version}`);
  }
}
