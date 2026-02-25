/**
 * Source metadata for tokens imported from GitHub.
 * All fields nullable — tokens created manually have no source.
 */
export interface ISourceMetadata {
  repo: string | null;    // e.g. "org/design-tokens"
  branch: string | null;  // e.g. "main"
  path: string | null;    // e.g. "tokens/globals"
}

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
}

/**
 * Shape for creating a new collection (omit auto-generated fields).
 */
export type CreateTokenCollectionInput = Omit<ITokenCollection, '_id' | 'createdAt' | 'updatedAt'>;

/**
 * Shape for updating an existing collection.
 */
export type UpdateTokenCollectionInput = Partial<Pick<ITokenCollection, 'name' | 'tokens' | 'sourceMetadata'>>;
