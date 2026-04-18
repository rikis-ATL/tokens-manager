import mongoose, { Schema, Model, Types } from 'mongoose';

const versionsCollectionName =
  process.env.MONGODB_VERSIONS_COLLECTION_NAME || 'collectionversions';

export interface CollectionVersionDoc {
  collectionId: Types.ObjectId;
  semver: string;
  note: string | null;
  snapshot: Record<string, unknown>;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const collectionVersionSchema = new Schema<CollectionVersionDoc>(
  {
    collectionId: { type: Schema.Types.ObjectId, required: true, index: true },
    semver: { type: String, required: true, trim: true },
    note: { type: String, default: null },
    snapshot: { type: Schema.Types.Mixed, required: true },
    createdBy: { type: String, default: null },
  },
  { timestamps: true, collection: versionsCollectionName }
);

collectionVersionSchema.index({ collectionId: 1, semver: 1 }, { unique: true });

const modelKey = `CollectionVersion_${versionsCollectionName}`;
const CollectionVersion: Model<CollectionVersionDoc> =
  (mongoose.models[modelKey] as Model<CollectionVersionDoc>) ||
  mongoose.model<CollectionVersionDoc>(modelKey, collectionVersionSchema);

export default CollectionVersion;
