import mongoose, { Schema, Model } from 'mongoose';

export type PlanTier = 'free' | 'pro' | 'team';

export interface IOrganizationUsage {
  exportsThisMonth: number;
  exportResetAt: Date;
}

export interface IOrganization {
  name: string;
  planTier?: PlanTier;
  usage?: IOrganizationUsage;
  createdAt?: Date;
  updatedAt?: Date;
}

type OrgDoc = Omit<IOrganization, '_id'>;

const orgSchema = new Schema<OrgDoc>(
  {
    name: { type: String, required: true, trim: true },
    planTier: {
      type: String,
      enum: ['free', 'pro', 'team'],
      default: 'free',
    },
    usage: {
      exportsThisMonth: { type: Number, default: 0 },
      exportResetAt: { type: Date, default: () => new Date(0) },
    },
  },
  { timestamps: true }
);

// Guard against Next.js hot-reload model re-registration (pattern from User.ts)
const Organization: Model<OrgDoc> =
  (mongoose.models.Organization as Model<OrgDoc>) ||
  mongoose.model<OrgDoc>('Organization', orgSchema);

export default Organization;
