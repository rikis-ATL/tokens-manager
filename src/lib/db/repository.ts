import type { ITokenCollection, UpdateTokenCollectionInput, ISourceMetadata } from '@/types/collection.types';

/**
 * Portable data shape returned by every repository implementation.
 * All fields use plain JS types — no Mongoose documents, no DB-specific wrappers.
 */
export type CollectionDoc = Omit<ITokenCollection, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
  /** Server-only — present when loaded from Mongo for publish */
  npmTokenEncrypted?: string | null;
  npmTokenIv?: string | null;
};

export interface CreateCollectionInput {
  name: string;
  namespace?: string;
  tokens: Record<string, unknown>;
  sourceMetadata?: ISourceMetadata | null;
  userId?: string | null;
  description?: string | null;
  tags?: string[];
  colorFormat?: 'hex' | 'hsl' | 'oklch';
  figmaToken?: string | null;
  figmaFileId?: string | null;
  githubRepo?: string | null;
  githubBranch?: string | null;
  githubPath?: string | null;
  isPlayground?: boolean;
}

/**
 * Database-agnostic interface for collection persistence.
 * Each supported database provider implements this interface.
 */
export interface ICollectionRepository {
  /**
   * List collection summaries. When `organizationId` is provided AND non-empty,
   * results are filtered to that organization (TENANT-01). Empty string or omitted
   * = no filter (preserves legacy behaviour for callers not yet migrated).
   */
  list(options?: { organizationId?: string }): Promise<CollectionDoc[]>;

  /** Find a single collection by its ID. */
  findById(id: string): Promise<CollectionDoc | null>;

  /** Find a single collection by exact name match. */
  findByName(name: string): Promise<CollectionDoc | null>;

  /** Create a new collection and return the persisted document. */
  create(data: CreateCollectionInput): Promise<CollectionDoc>;

  /** Partial-update a collection. Returns null if not found. */
  update(id: string, data: UpdateTokenCollectionInput): Promise<CollectionDoc | null>;

  /** Delete a collection by ID. Returns true if it existed. */
  delete(id: string): Promise<boolean>;

  /** Merge partial source-metadata fields (used by Figma export). */
  updateSourceMetadata(id: string, fields: Partial<ISourceMetadata>): Promise<void>;
}
