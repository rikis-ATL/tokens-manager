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

const tokenCollectionSchema = new Schema<TokenCollectionDoc>(
  {
    name:           { type: String, required: true, trim: true },
    tokens:         { type: Schema.Types.Mixed, required: true },
    sourceMetadata: { type: sourceMetadataSchema, default: null },
    userId:         { type: String, default: null, index: true },
    description:    { type: String, default: null },
    tags:           { type: [String], default: [] },
    figmaToken:     { type: String, default: null },
    figmaFileId:    { type: String, default: null },
    githubRepo:     { type: String, default: null },
    githubBranch:   { type: String, default: null },
  },
  {
    timestamps: true,  // auto createdAt / updatedAt
  }
);

// Index for fast listing by name
tokenCollectionSchema.index({ name: 1 });

// Guard against Next.js hot-reload model re-registration
const TokenCollection: Model<TokenCollectionDoc> =
  (mongoose.models.TokenCollection as Model<TokenCollectionDoc>) ||
  mongoose.model<TokenCollectionDoc>('TokenCollection', tokenCollectionSchema);

export default TokenCollection;
