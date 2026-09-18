import { KeyStoreDescriptor, parseDescriptor } from './descriptor';

export function buildV2TrustBundle(descriptor: KeyStoreDescriptor, { version, revokedIds }: { version: number; revokedIds: string[] }) {
  const parsed = parseDescriptor(descriptor);
  if (!Number.isSafeInteger(version) || version < 1 || !Array.isArray(revokedIds) || revokedIds.some((id) => typeof id !== 'string')) throw new Error('TRUST_BUNDLE_INVALID');
  const ids = new Set(parsed.keys.map((entry) => entry.key_id));
  if (revokedIds.some((id) => !ids.has(id)) || new Set(revokedIds).size !== revokedIds.length) throw new Error('TRUST_BUNDLE_INVALID');
  return {
    version,
    keys: parsed.keys.map((entry) => ({ keyId: entry.key_id, rawPublicKeyBase64Url: entry.public_key_raw_base64url })),
    revokedIds: [...revokedIds],
  };
}
