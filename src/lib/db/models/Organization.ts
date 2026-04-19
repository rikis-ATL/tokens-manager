import mongoose, { Schema, Model } from 'mongoose';

export interface IOrganization {
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

type OrgDoc = Omit<IOrganization, '_id'>;

const orgSchema = new Schema<OrgDoc>(
  {
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

// Guard against Next.js hot-reload model re-registration (pattern from User.ts)
const Organization: Model<OrgDoc> =
  (mongoose.models.Organization as Model<OrgDoc>) ||
  mongoose.model<OrgDoc>('Organization', orgSchema);

export default Organization;
