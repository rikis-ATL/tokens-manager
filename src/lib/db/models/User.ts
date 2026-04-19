import mongoose, { Schema, Model } from 'mongoose';
import type { Role } from '@/lib/auth/permissions';

export type { Role } from '@/lib/auth/permissions';

export type UserStatus = 'active' | 'invited' | 'disabled';

export interface IUser {
  displayName: string;
  email:       string;
  passwordHash:string;
  role:        Role;
  status:      UserStatus;
  encryptedApiKey?: string;  // Phase 26 addition — AES-256-GCM encrypted API key
  apiKeyIv?: string;         // Phase 26 addition — IV for encrypted API key
  // Phase 22 D-02 — required ObjectId ref to Organization. scripts/migrate-to-org.ts (Plan 04)
  // back-fills all existing User docs BEFORE this code is deployed. Deploy order is enforced
  // at the ops level, not by schema-level loosening (Pitfall 3).
  organizationId: string;
  createdAt?:  Date;
  updatedAt?:  Date;
}

type UserDoc = Omit<IUser, '_id'>;

const userSchema = new Schema<UserDoc>(
  {
    displayName:  { type: String, required: true, trim: true },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role:         { type: String, enum: ['Admin', 'Editor', 'Viewer', 'Demo'], required: true },
    status:       { type: String, enum: ['active', 'invited', 'disabled'], required: true, default: 'invited' },
    encryptedApiKey: { type: String, default: undefined },
    apiKeyIv:        { type: String, default: undefined },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,   // Phase 22 D-02 — migration script back-fills existing docs BEFORE deploy.
      index: false,     // Compound index below covers this — plain index would be redundant.
    },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });
// Phase 22 D-14 — compound index prevents COLLSCAN on org-scoped user list queries.
userSchema.index({ organizationId: 1, _id: 1 });

// Guard against Next.js hot-reload model re-registration
const User: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc>) ||
  mongoose.model<UserDoc>('User', userSchema);

export default User;
