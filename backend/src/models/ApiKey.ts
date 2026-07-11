import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const apiKeySchema = new Schema({
  ownerId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  label: { type: String, required: true, trim: true, maxlength: 80 },
  prefix: { type: String, required: true, index: true },
  keyHash: { type: String, required: true, select: false },
  expiresAt: { type: Date, default: null, index: true },
  lastUsedAt: { type: Date, default: null },
  revokedAt: { type: Date, default: null }
}, { timestamps: true, versionKey: false });
apiKeySchema.index({ ownerId: 1, label: 1 }, { unique: true });
export type IApiKey = InferSchemaType<typeof apiKeySchema>;
export const ApiKey = model('ApiKey', apiKeySchema);
