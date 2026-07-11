import { ApiKey } from '../models/ApiKey.js';

export class ApiKeyRepository {
  create(data: { ownerId: string; label: string; prefix: string; keyHash: string; expiresAt: Date | null }) { return ApiKey.create(data); }
  listByOwner(ownerId: string) { return ApiKey.find({ ownerId }).sort({ createdAt: -1 }); }
  findActiveByHash(keyHash: string) { return ApiKey.findOne({ keyHash, revokedAt: null, $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] }); }
  revoke(id: string, ownerId?: string) { return ApiKey.findOneAndUpdate({ _id: id, ...(ownerId ? { ownerId } : {}), revokedAt: null }, { revokedAt: new Date() }, { new: true }); }
  markUsed(id: string) { return ApiKey.findByIdAndUpdate(id, { lastUsedAt: new Date() }); }
}
