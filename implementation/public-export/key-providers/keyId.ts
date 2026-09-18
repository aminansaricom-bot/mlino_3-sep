import { createHash } from 'node:crypto';

export function deriveKeyId(date: string, rawPublicKey: Buffer): string {
  const isoDate = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  if (!/^\d{8}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== isoDate) throw new Error('KEY_ID_DATE_INVALID');
  if (rawPublicKey.length !== 32) throw new Error('KEY_PUBLIC_LENGTH');
  return `pb-v1-${date}-${createHash('sha256').update(rawPublicKey).digest('hex').slice(0, 16)}`;
}

export function validateKeyId(keyId: string, rawPublicKey: Buffer): void {
  const match = /^pb-v1-(\d{8})-([a-f0-9]{16})$/.exec(keyId);
  if (!match || deriveKeyId(match[1], rawPublicKey) !== keyId) throw new Error('KEY_ID_MISMATCH');
}
