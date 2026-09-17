import { KeyObject, sign, verify } from 'node:crypto';
import { canonicalBytes } from './canonical';

export const DOMAIN_SEPARATOR = Buffer.from('MLINO-PUBLIC-BUSINESS-V1\n', 'utf8');

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

export function signedBytes(envelope: SignedEnvelope): Buffer {
  const { value: _value, ...metadata } = envelope.signature;
  return Buffer.concat([DOMAIN_SEPARATOR, canonicalBytes({ ...envelope, signature: metadata })]);
}

export async function signEnvelope<T extends Record<string, unknown>>(
  unsigned: T,
  keyId: string,
  provider: SigningKeyProvider,
): Promise<T & SignedEnvelope> {
  if (!keyId.trim()) throw new Error('PUBLIC_EXPORT_KEY_ID_REQUIRED');
  const envelope = { ...unsigned, signature: { algorithm: 'Ed25519' as const, key_id: keyId, value: '' } };
  const privateKey = await provider.privateKey(keyId);
  if (privateKey.asymmetricKeyType !== 'ed25519') throw new Error('PUBLIC_EXPORT_KEY_TYPE');
  envelope.signature.value = sign(null, signedBytes(envelope), privateKey).toString('base64url');
  return envelope;
}

export async function verifyEnvelope(envelope: SignedEnvelope, provider: VerificationKeyProvider): Promise<boolean> {
  if (envelope.signature?.algorithm !== 'Ed25519' || !envelope.signature.key_id ||
      !/^[A-Za-z0-9_-]+$/.test(envelope.signature.value)) return false;
  const key = await provider.publicKey(envelope.signature.key_id);
  if (!key || key.asymmetricKeyType !== 'ed25519') return false;
  try {
    return verify(null, signedBytes(envelope), key, Buffer.from(envelope.signature.value, 'base64url'));
  } catch {
    return false;
  }
}
