import mongoose, { Schema, Model } from 'mongoose';
import type { ITokenCollection } from '@/types/collection.types';

// Mongoose document type (ITokenCollection without _id string; mongoose adds its own)
type TokenCollectionDoc = Omit<ITokenCollection, '_id'>;

const sourceMetadataSchema = new Schema(
  {
    repo:               { type: String, default: null },
    branch:             { type: String, default: null },
    path:               { type: String, default: null },
    type:               { type: String, enum: ['github', 'figma', null], default: null },
    figmaFileKey:       { type: String, default: null },
    figmaCollectionId:  { type: String, default: null },
  },
  { _id: false }
);

// Configurable collection name via environment variable
// Default: 'tokencollections' (production data)
// Can override with MONGODB_COLLECTION_NAME for demo/test data
const collectionName = process.env.MONGODB_COLLECTION_NAME || 'tokencollections';

const tokenCollectionSchema = new Schema<TokenCollectionDoc>(
  {
    name:           { type: String, required: true, trim: true },
    namespace:      { type: String, default: 'token' },
    tokens:         { type: Schema.Types.Mixed, required: true },
    sourceMetadata: { type: sourceMetadataSchema, default: null },
    userId:         { type: String, default: null, index: true },
    description:    { type: String, default: null },
    tags:           { type: [String], default: [] },
    colorFormat:    { type: String, enum: ['hex', 'hsl', 'oklch'], default: 'hex' },
    figmaToken:     { type: String, default: null },
    figmaFileId:    { type: String, default: null },
    githubRepo:     { type: String, default: null },
    githubBranch:   { type: String, default: null },
    githubPath:     { type: String, default: null },
    graphState:     { type: Schema.Types.Mixed, default: null },
    themes:         { type: Schema.Types.Mixed, default: [] },
    isPlayground:   { type: Boolean, default: false },
  },
  {
    timestamps: true,  // auto createdAt / updatedAt
    collection: collectionName,  // Configurable collection name
  }
);

// Index for fast listing by name
tokenCollectionSchema.index({ name: 1 });

// Guard against Next.js hot-reload model re-registration
// Note: Model re-registration only works if collection name stays the same.
// If you change MONGODB_COLLECTION_NAME, restart the dev server.
const modelKey = `TokenCollection_${collectionName}`;
const TokenCollection: Model<TokenCollectionDoc> =
  (mongoose.models[modelKey] as Model<TokenCollectionDoc>) ||
  mongoose.model<TokenCollectionDoc>(modelKey, tokenCollectionSchema);

export default TokenCollection;
