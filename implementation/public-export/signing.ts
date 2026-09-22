import { KeyObject, sign, verify } from 'node:crypto';
import { canonicalBytes } from './canonical';

export const DOMAIN_SEPARATOR = Buffer.from('MLINO-PUBLIC-BUSINESS-V1\n', 'utf8');
export const CATALOG_DOMAIN_SEPARATOR = Buffer.from('MLINO-PUBLIC-CATALOG-V1\n', 'utf8');
export type SignatureDomain = 'business' | 'catalog';
function separator(domain: SignatureDomain): Buffer {
  if (domain === 'business') return DOMAIN_SEPARATOR;
  if (domain === 'catalog') return CATALOG_DOMAIN_SEPARATOR;
  throw new Error('PUBLIC_EXPORT_SIGNATURE_DOMAIN');
}

export interface SigningKeyProvider {
  privateKey(keyId: string): Promise<KeyObject>;
}

export interface VerificationKeyProvider {
  publicKey(keyId: string): Promise<KeyObject | null>;
}

export type SignedEnvelope = {
  signature: { algorithm: 'Ed25519'; key_id: string; value: string };
  [key: string]: unknown;
};

export function signedBytes(envelope: SignedEnvelope, domain: SignatureDomain = 'business'): Buffer {
  const { value: _value, ...metadata } = envelope.signature;
  return Buffer.concat([separator(domain), canonicalBytes({ ...envelope, signature: metadata })]);
}

export async function signEnvelope<T extends Record<string, unknown>>(
  unsigned: T,
  keyId: string,
  provider: SigningKeyProvider,
  domain: SignatureDomain = 'business',
): Promise<T & SignedEnvelope> {
  if (!keyId.trim()) throw new Error('PUBLIC_EXPORT_KEY_ID_REQUIRED');
  const envelope = { ...unsigned, signature: { algorithm: 'Ed25519' as const, key_id: keyId, value: '' } };
  const privateKey = await provider.privateKey(keyId);
  if (privateKey.asymmetricKeyType !== 'ed25519') throw new Error('PUBLIC_EXPORT_KEY_TYPE');
  envelope.signature.value = sign(null, signedBytes(envelope, domain), privateKey).toString('base64url');
  return envelope;
}

// Only the canonical spelling is accepted: unpadded base64url of exactly 64 bytes that re-encodes identically.
// Unused trailing bits would otherwise give several spellings of one signature, which V2 rejects (M2-3R-F1).
function canonicalSignatureBytes(value: unknown): Buffer | null {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{86}$/.test(value)) return null;
  const bytes = Buffer.from(value, 'base64url');
  return bytes.length === 64 && bytes.toString('base64url') === value ? bytes : null;
}

export async function verifyEnvelope(envelope: SignedEnvelope, provider: VerificationKeyProvider, domain: SignatureDomain = 'business'): Promise<boolean> {
  if (envelope.signature?.algorithm !== 'Ed25519' || !envelope.signature.key_id) return false;
  const signature = canonicalSignatureBytes(envelope.signature.value);
  if (!signature) return false;
  const key = await provider.publicKey(envelope.signature.key_id);
  if (!key || key.asymmetricKeyType !== 'ed25519') return false;
  try {
    return verify(null, signedBytes(envelope, domain), key, signature);
  } catch {
    return false;
  }
}
