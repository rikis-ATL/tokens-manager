import mongoose, { Schema, Model } from 'mongoose';
import type { Role } from '@/lib/auth/permissions';

export interface ICollectionPermission {
  userId:       string;   // User._id as string
  collectionId: string;   // TokenCollection._id as string
  role:         Role;     // override role for this specific collection
  createdAt?:   Date;
  updatedAt?:   Date;
}

type CollectionPermissionDoc = Omit<ICollectionPermission, '_id'>;

const collectionPermissionSchema = new Schema<CollectionPermissionDoc>(
  {
    userId:       { type: String, required: true },
    collectionId: { type: String, required: true },
    role:         { type: String, enum: ['Admin', 'Editor', 'Viewer'], required: true },
  },
  { timestamps: true }
);

// Compound unique index: one override per (user, collection) pair; also covers userId lookup
collectionPermissionSchema.index({ userId: 1, collectionId: 1 }, { unique: true });
// Secondary index: list all overrides for a collection (Admin view)
collectionPermissionSchema.index({ collectionId: 1 });

// Guard against Next.js hot-reload model re-registration
const CollectionPermission: Model<CollectionPermissionDoc> =
  (mongoose.models.CollectionPermission as Model<CollectionPermissionDoc>) ||
  mongoose.model<CollectionPermissionDoc>('CollectionPermission', collectionPermissionSchema);

export default CollectionPermission;
