import { Schema, model, type InferSchemaType } from 'mongoose';

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin', 'user'], required: true, default: 'user' },
  active: { type: Boolean, required: true, default: true }
}, { timestamps: true, versionKey: false });
export type IUser = InferSchemaType<typeof userSchema>;
export const User = model('User', userSchema);
