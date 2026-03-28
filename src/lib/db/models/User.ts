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
  createdAt?:  Date;
  updatedAt?:  Date;
}

type UserDoc = Omit<IUser, '_id'>;

const userSchema = new Schema<UserDoc>(
  {
    displayName:  { type: String, required: true, trim: true },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role:         { type: String, enum: ['Admin', 'Editor', 'Viewer'], required: true },
    status:       { type: String, enum: ['active', 'invited', 'disabled'], required: true, default: 'invited' },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });

// Guard against Next.js hot-reload model re-registration
const User: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc>) ||
  mongoose.model<UserDoc>('User', userSchema);

export default User;
