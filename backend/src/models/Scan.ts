import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const findingSchema = new Schema({
  identifier: { type: String, required: true }, title: { type: String, required: true }, severity: { type: String, required: true },
  category: { type: String, default: 'security' }, target: { type: String, default: '' }, location: { type: String, default: '' },
  description: { type: String, default: '' }, reference: { type: String, default: '' }, metadata: { type: Schema.Types.Mixed, default: {} }
}, { _id: false });
const scanSchema = new Schema({
  ownerId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  pipeline: { type: String, required: true, trim: true, maxlength: 160, index: true },
  buildNumber: { type: String, trim: true, maxlength: 100, default: '' },
  branch: { type: String, trim: true, maxlength: 160, default: '' },
  commit: { type: String, trim: true, maxlength: 100, default: '' },
  buildUrl: { type: String, trim: true, maxlength: 2048, default: '' },
  tool: { type: String, enum: ['trivy', 'semgrep'], required: true, index: true },
  artifact: { type: String, trim: true, maxlength: 500, default: '' },
  findings: { type: [findingSchema], default: [] },
  summary: { critical: Number, high: Number, medium: Number, low: Number, info: Number, unknown: Number, total: Number },
  source: { type: String, enum: ['api', 'manual'], required: true },
  scannedAt: { type: Date, required: true, default: Date.now }
}, { timestamps: true, versionKey: false });
scanSchema.index({ ownerId: 1, pipeline: 1, scannedAt: -1 });
export type IScan = InferSchemaType<typeof scanSchema>;
export const Scan = model('Scan', scanSchema);
