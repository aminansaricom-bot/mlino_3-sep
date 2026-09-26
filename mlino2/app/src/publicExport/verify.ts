import { canonicalBytes } from './canonical';
import { TrustBundle } from './trustBundle';

export type SignatureDomain = 'business' | 'catalog';
const DOMAIN_SEPARATORS: Record<SignatureDomain, Uint8Array> = {
  business: new TextEncoder().encode('MLINO-PUBLIC-BUSINESS-V1\n'),
  catalog: new TextEncoder().encode('MLINO-PUBLIC-CATALOG-V1\n'),
};

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function decodeBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    const bytes = Uint8Array.from(decoded, (char) => char.charCodeAt(0));
    const recoded = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return recoded === value && bytes.length === 64 ? bytes : null;
  } catch { return null; }
}

export async function verifyArtifact(raw: Uint8Array, trust: TrustBundle, domain: SignatureDomain = 'business'): Promise<Record<string, unknown>> {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(raw);
  const envelope = object(JSON.parse(text));
  const version = domain === 'business' ? 'mlino.v2.public-business.v1' : 'mlino.v2.public-catalog.v1';
  if (!envelope || envelope.contract_version !== version) throw new Error('PUBLIC_EXPORT_VERSION');
  if (Object.keys(envelope).some((key) => !['contract_version', 'generated_at', 'snapshot_id', 'signature', 'records'].includes(key))) throw new Error('PUBLIC_EXPORT_ENVELOPE_SHAPE');
  // V1 writes canonical JSON. This also rejects duplicate-key spellings and non-canonical text.
  const canonical = canonicalBytes(envelope);
  if (canonical.length !== raw.length || canonical.some((byte, index) => byte !== raw[index])) throw new Error('PUBLIC_EXPORT_NOT_CANONICAL');
  const signature = object(envelope.signature);
  if (!signature || signature.algorithm !== 'Ed25519' || typeof signature.key_id !== 'string' || typeof signature.value !== 'string') throw new Error('PUBLIC_EXPORT_SIGNATURE_SHAPE');
  if (Object.keys(signature).some((key) => !['algorithm', 'key_id', 'value'].includes(key))) throw new Error('PUBLIC_EXPORT_SIGNATURE_SHAPE');
  const keyBytes = trust.publicKey(signature.key_id);
  if (!keyBytes) throw new Error('PUBLIC_EXPORT_UNKNOWN_OR_REVOKED_KEY');
  const value = decodeBase64Url(signature.value);
  if (!value) throw new Error('PUBLIC_EXPORT_SIGNATURE_VALUE');
  const { value: _ignored, ...metadata } = signature;
  const signed = canonicalBytes({ ...envelope, signature: metadata });
  const separator = DOMAIN_SEPARATORS[domain];
  const bytes = new Uint8Array(separator.length + signed.length);
  bytes.set(separator);
  bytes.set(signed, separator.length);
  if (!(await verifyEd25519(new Uint8Array(keyBytes), new Uint8Array(value), bytes))) throw new Error('PUBLIC_EXPORT_BAD_SIGNATURE');
  return envelope;
}

/**
 * Ed25519 in the browser's own WebCrypto when it has it; otherwise the same check in JavaScript (@noble/ed25519,
 * strict RFC 8032). Brave on Android and older Android WebViews have no WebCrypto Ed25519: the export was refused
 * there (ED25519_NOT_SUPPORTED) and the app showed no businesses at all. The check itself is the same either way.
 */
export async function verifyEd25519(publicKey: Uint8Array, signature: Uint8Array, message: Uint8Array): Promise<boolean> {
  let key: CryptoKey | null = null;
  try {
    key = await globalThis.crypto.subtle.importKey('raw', publicKey as BufferSource, { name: 'Ed25519' }, false, ['verify']);
  } catch { key = null; }
  if (key) return globalThis.crypto.subtle.verify('Ed25519', key, signature as BufferSource, message as BufferSource);
  const { verifyAsync } = await import('@noble/ed25519');
  try { return await verifyAsync(signature, message, publicKey, { zip215: false }); } catch { return false; }
}
