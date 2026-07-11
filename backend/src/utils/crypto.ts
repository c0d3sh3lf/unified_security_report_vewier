import { createHash, randomBytes } from 'node:crypto';
export const hashSecret = (value: string) => createHash('sha256').update(value).digest('hex');
export const generateApiKey = () => {
  const secret = randomBytes(32).toString('base64url');
  const raw = `usrv_${secret}`;
  return { raw, prefix: raw.slice(0, 13), hash: hashSecret(raw) };
};
