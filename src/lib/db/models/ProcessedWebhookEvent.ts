import mongoose, { Schema, Model } from 'mongoose';

export interface IProcessedWebhookEvent {
  stripeEventId: string;
  processedAt: Date;
}

type ProcessedWebhookEventDoc = Omit<IProcessedWebhookEvent, '_id'>;

const processedWebhookEventSchema = new Schema<ProcessedWebhookEventDoc>(
  {
    stripeEventId: { type: String, required: true, unique: true },
    processedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Create unique index on stripeEventId for fast idempotency checks
processedWebhookEventSchema.index({ stripeEventId: 1 }, { unique: true });

// Guard against Next.js hot-reload model re-registration
const ProcessedWebhookEvent: Model<ProcessedWebhookEventDoc> =
  (mongoose.models.ProcessedWebhookEvent as Model<ProcessedWebhookEventDoc>) ||
  mongoose.model<ProcessedWebhookEventDoc>('ProcessedWebhookEvent', processedWebhookEventSchema);

export default ProcessedWebhookEvent;