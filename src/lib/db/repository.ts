import type { ITokenCollection, UpdateTokenCollectionInput, ISourceMetadata } from '@/types/collection.types';

/**
 * Portable data shape returned by every repository implementation.
 * All fields use plain JS types — no Mongoose documents, no DB-specific wrappers.
 */
export type CollectionDoc = Omit<ITokenCollection, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};

export interface CreateCollectionInput {
  name: string;
  namespace?: string;
  tokens: Record<string, unknown>;
  sourceMetadata?: ISourceMetadata | null;
  userId?: string | null;
  description?: string | null;
  tags?: string[];
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
  /** List all collections, newest first. */
  list(): Promise<CollectionDoc[]>;

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
