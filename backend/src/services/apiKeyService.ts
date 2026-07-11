import { AppError } from '../errors/AppError.js';
import { ApiKeyRepository } from '../repositories/ApiKeyRepository.js';
import { generateApiKey, hashSecret } from '../utils/crypto.js';

export class ApiKeyService {
  constructor(private readonly keys: ApiKeyRepository) {}
  async create(ownerId: string, label: string, expiresAt?: Date | null) {
    if (expiresAt && expiresAt <= new Date()) throw new AppError(400, 'Expiry must be in the future');
    const created = generateApiKey();
    const key = await this.keys.create({ ownerId, label, prefix: created.prefix, keyHash: created.hash, expiresAt: expiresAt ?? null });
    return { id: String(key._id), label: key.label, prefix: key.prefix, expiresAt: key.expiresAt, key: created.raw };
  }
  list(ownerId: string) { return this.keys.listByOwner(ownerId); }
  async revoke(id: string, ownerId?: string) { if (!await this.keys.revoke(id, ownerId)) throw new AppError(404, 'Active API key not found'); }
  async authenticate(rawKey: string) {
    const key = await this.keys.findActiveByHash(hashSecret(rawKey));
    if (!key) throw new AppError(401, 'API key is invalid, expired, or revoked');
    await this.keys.markUsed(String(key._id));
    return String(key.ownerId);
  }
}
