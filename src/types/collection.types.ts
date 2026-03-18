/**
 * Source metadata for tokens imported from GitHub or Figma.
 * All fields nullable — tokens created manually have no source.
 * The `type` field is a discriminator: null = no upstream source.
 */
export interface ISourceMetadata {
  // Existing GitHub fields
  repo: string | null;    // e.g. "org/design-tokens"
  branch: string | null;  // e.g. "main"
  path: string | null;    // e.g. "tokens/globals"
  // Discriminator + Figma fields
  type: 'github' | 'figma' | null;  // null = no upstream source
  figmaFileKey: string | null;       // Figma file key (extracted from file URL)
  figmaCollectionId: string | null;  // Figma variable collection ID
}

import type { CollectionGraphState } from './graph-state.types';
import type { ITheme } from './theme.types';

/**
 * Plain data shape for a token collection (use for API responses).
 */
export interface ITokenCollection {
  _id: string;            // MongoDB ObjectId as string
  name: string;           // User-defined collection name (free text)
  tokens: Record<string, unknown>;  // Raw token JSON — W3C Design Token spec object
  sourceMetadata: ISourceMetadata | null;  // GitHub provenance, nullable
  userId: string | null;  // Reserved for multi-user; null in v1
  createdAt: Date;
  updatedAt: Date;
  // Metadata fields
  description: string | null;
  tags: string[];
  // Per-collection integration config
  figmaToken: string | null;
  figmaFileId: string | null;
  githubRepo: string | null;
  githubBranch: string | null;
  // Graph canvas state (composable nodes, edges, legacy generators) keyed by group id
  graphState: CollectionGraphState | null;
  // Themes — named configurations that assign group states (disabled/enabled/source)
  themes: ITheme[];
}

/**
 * Shape for collection list items returned by GET /api/collections.
 * Derived fields (tokenCount, figmaConfigured, githubConfigured) are computed server-side.
 */
export interface CollectionCardData {
  _id: string;
  name: string;
  description: string | null;
  tags: string[];
  tokenCount: number;
  updatedAt: string;
  figmaConfigured: boolean;
  githubConfigured: boolean;
}

/**
 * Shape for creating a new collection (omit auto-generated fields).
 */
export type CreateTokenCollectionInput = Omit<ITokenCollection, '_id' | 'createdAt' | 'updatedAt'>;

/**
 * Shape for updating an existing collection.
 */
export type UpdateTokenCollectionInput = Partial<Pick<ITokenCollection, 'name' | 'tokens' | 'sourceMetadata' | 'description' | 'tags' | 'figmaToken' | 'figmaFileId' | 'githubRepo' | 'githubBranch' | 'graphState' | 'themes'>>;
