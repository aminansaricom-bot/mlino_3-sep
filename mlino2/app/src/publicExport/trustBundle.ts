export interface PublicKeyEntry {
  readonly keyId: string;
  readonly rawPublicKey: Uint8Array;
}

// Only public keys supplied with the V2 build may enter this bundle. Artifacts cannot mutate it.
export class TrustBundle {
  private readonly keys: ReadonlyMap<string, Uint8Array>;
  private readonly revoked: ReadonlySet<string>;

  constructor(readonly version: string, entries: readonly PublicKeyEntry[], revokedIds: readonly string[] = []) {
    if (!version.trim()) throw new Error('TRUST_BUNDLE_VERSION_REQUIRED');
    const keys = new Map<string, Uint8Array>();
    for (const entry of entries) {
      if (!entry.keyId || keys.has(entry.keyId) || entry.rawPublicKey.length !== 32) throw new Error('TRUST_BUNDLE_INVALID_KEY');
      keys.set(entry.keyId, new Uint8Array(entry.rawPublicKey));
    }
    this.keys = keys;
    this.revoked = new Set(revokedIds);
  }

  publicKey(keyId: string): Uint8Array | null {
    const key = this.keys.get(keyId);
    return this.revoked.has(keyId) || !key ? null : new Uint8Array(key);
  }
}

// Build-supplied PUBLIC data only. Updating this config is the consumer-side revocation path;
// operational rollout must be confirmed before real keys are used.
export function trustBundleFromBuildJson(json: string): TrustBundle {
  const value: unknown = JSON.parse(json);
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('TRUST_BUNDLE_SHAPE');
  const source = value as Record<string, unknown>;
  if (Object.keys(source).some((key) => !['version', 'keys', 'revokedIds'].includes(key))) throw new Error('TRUST_BUNDLE_SHAPE');
  if (typeof source.version !== 'string' || !Array.isArray(source.keys) || !Array.isArray(source.revokedIds) ||
      !source.revokedIds.every((id) => typeof id === 'string')) throw new Error('TRUST_BUNDLE_SHAPE');
  const entries = source.keys.map((item: unknown): PublicKeyEntry => {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) throw new Error('TRUST_BUNDLE_KEY_SHAPE');
    const row = item as Record<string, unknown>;
    if (Object.keys(row).some((key) => !['keyId', 'rawPublicKeyBase64Url'].includes(key))) throw new Error('TRUST_BUNDLE_KEY_SHAPE');
    if (typeof row.keyId !== 'string' || typeof row.rawPublicKeyBase64Url !== 'string' ||
        !/^[A-Za-z0-9_-]+$/.test(row.rawPublicKeyBase64Url)) throw new Error('TRUST_BUNDLE_KEY_SHAPE');
    const base64 = row.rawPublicKeyBase64Url.replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')), (char) => char.charCodeAt(0));
    return { keyId: row.keyId, rawPublicKey: bytes };
  });
  return new TrustBundle(source.version, entries, source.revokedIds as string[]);
}
