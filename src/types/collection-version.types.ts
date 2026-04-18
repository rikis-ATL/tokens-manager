import type { CollectionGraphState } from './graph-state.types';
import type { ITheme } from './theme.types';
import type { ISourceMetadata } from './collection.types';

/**
 * Immutable snapshot of design data for a collection version (integrations excluded).
 */
export interface ICollectionSnapshot {
  name: string;
  namespace: string;
  tokens: Record<string, unknown>;
  graphState: CollectionGraphState | null;
  themes: ITheme[];
  colorFormat: 'hex' | 'hsl' | 'oklch';
  description: string | null;
  tags: string[];
  accentColor: string | null;
  /** Provenance only — not used on restore */
  sourceMetadata: ISourceMetadata | null;
}

export interface ICollectionVersionListItem {
  _id: string;
  collectionId: string;
  semver: string;
  note: string | null;
  createdAt: string;
  createdBy: string | null;
}

export interface ICollectionVersionDetail extends ICollectionVersionListItem {
  snapshot: ICollectionSnapshot;
}
