import { generateKeyPairSync } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseDescriptor, KeyStoreDescriptor } from '../../../public-export/key-providers/descriptor';
import { createDpapiKeyProvider } from '../../../public-export/key-providers/dpapiKeyProvider';
import { deriveKeyId, validateKeyId } from '../../../public-export/key-providers/keyId';
import { generateProtectedKey } from '../../../public-export/key-providers/keygen';
import { Protector } from '../../../public-export/key-providers/protector';
import { buildV2TrustBundle } from '../../../public-export/key-providers/trustBundle';
import { signEnvelope, verifyEnvelope } from '../../../public-export/signing';

const fake: Protector = {
  protect: async (bytes) => Buffer.from(bytes).reverse(),
  unprotect: async (bytes) => Buffer.from(bytes).reverse(),
};

async function fixture() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'mlino-key-test-'));
  const active = await generateProtectedKey('20260918', fake);
  const standby = await generateProtectedKey('20260919', fake);
  const descriptor: KeyStoreDescriptor = { format: 'mlino.public-export.keystore.v1', active_key_id: active.key_id, keys: [active, standby] };
  const descriptorPath = path.join(directory, 'descriptor.json');
  await writeFile(descriptorPath, JSON.stringify(descriptor));
  return { directory, descriptorPath, descriptor, active, standby };
}

describe('M2-2 key providers (TEST keys only)', () => {
  test('descriptor round trip and strict shape rejection codes', async () => {
    const f = await fixture();
    try {
      expect(parseDescriptor(JSON.stringify(f.descriptor))).toEqual(f.descriptor);
      expect(() => parseDescriptor({ ...f.descriptor, extra: true })).toThrow('KEY_DESCRIPTOR_SHAPE');
      expect(() => parseDescriptor('{')).toThrow('KEY_DESCRIPTOR_SHAPE');
      expect(() => parseDescriptor({ ...f.descriptor, format: 'other' })).toThrow('KEY_DESCRIPTOR_SHAPE');
      expect(() => parseDescriptor({ format: f.descriptor.format, keys: f.descriptor.keys })).toThrow('KEY_DESCRIPTOR_SHAPE');
      expect(() => parseDescriptor({ ...f.descriptor, active_key_id: 'missing' })).toThrow('KEY_DESCRIPTOR_ACTIVE_MISSING');
      expect(() => parseDescriptor({ ...f.descriptor, keys: [] })).toThrow('KEY_DESCRIPTOR_KEY_COUNT');
      expect(() => parseDescriptor({ ...f.descriptor, keys: [f.active, f.active] })).toThrow('KEY_DESCRIPTOR_DUPLICATE_ID');
      expect(() => parseDescriptor({ ...f.descriptor, keys: [f.active, f.standby, f.standby] })).toThrow('KEY_DESCRIPTOR_KEY_COUNT');
      expect(() => parseDescriptor({ ...f.descriptor, keys: [{ ...f.active, extra: 1 }] })).toThrow('KEY_DESCRIPTOR_SHAPE');
      expect(() => parseDescriptor({ ...f.descriptor, keys: [{ ...f.active, protection: 'none' }] })).toThrow('KEY_DESCRIPTOR_SHAPE');
      expect(() => parseDescriptor({ ...f.descriptor, keys: [{ ...f.active, protected_private_pkcs8_base64: 'x!' }] })).toThrow('KEY_DESCRIPTOR_PROTECTED_KEY');
      expect(() => parseDescriptor({ ...f.descriptor, keys: [{ ...f.active, public_key_raw_base64url: 'x!' }] })).toThrow('KEY_DESCRIPTOR_PUBLIC_KEY');
      expect(() => parseDescriptor({ ...f.descriptor, keys: [{ ...f.active, public_key_raw_base64url: 'AA' }] })).toThrow('KEY_DESCRIPTOR_PUBLIC_KEY');
    } finally { await rm(f.directory, { recursive: true, force: true }); }
  });

  test('key_id derivation is bound to its 32-byte public key', async () => {
    const f = await fixture();
    try {
      const raw = Buffer.from(f.active.public_key_raw_base64url, 'base64url');
      expect(deriveKeyId('20260918', raw)).toBe(f.active.key_id);
      expect(() => validateKeyId(f.standby.key_id, raw)).toThrow('KEY_ID_MISMATCH');
      expect(() => parseDescriptor({ ...f.descriptor, keys: [{ ...f.active, key_id: f.standby.key_id }] })).toThrow('KEY_ID_MISMATCH');
    } finally { await rm(f.directory, { recursive: true, force: true }); }
  });

  test('privateKey only active; publicKey active and standby; unknown returns null', async () => {
    const f = await fixture();
    try {
      const provider = await createDpapiKeyProvider({ descriptorPath: f.descriptorPath }, { protector: fake });
      expect((await provider.privateKey(f.active.key_id)).asymmetricKeyType).toBe('ed25519');
      await expect(provider.privateKey(f.standby.key_id)).rejects.toThrow('KEY_NOT_ACTIVE');
      expect((await provider.publicKey(f.active.key_id))?.asymmetricKeyType).toBe('ed25519');
      expect((await provider.publicKey(f.standby.key_id))?.asymmetricKeyType).toBe('ed25519');
      expect(await provider.publicKey('unknown')).toBeNull();
    } finally { await rm(f.directory, { recursive: true, force: true }); }
  });

  test('signEnvelope via adapter verifies; public/private mismatch and non-Ed25519 reject', async () => {
    const f = await fixture();
    try {
      const provider = await createDpapiKeyProvider({ descriptorPath: f.descriptorPath }, { protector: fake });
      const signed = await signEnvelope({ contract_version: 'test' }, f.active.key_id, provider);
      expect(await verifyEnvelope(signed, provider)).toBe(true);
      const other = generateKeyPairSync('ed25519');
      const otherPkcs8 = other.privateKey.export({ type: 'pkcs8', format: 'der' }) as Buffer;
      const mismatch = { ...f.active, protected_private_pkcs8_base64: (await fake.protect(otherPkcs8)).toString('base64') };
      await writeFile(f.descriptorPath, JSON.stringify({ ...f.descriptor, keys: [mismatch, f.standby] }));
      const mismatchProvider = await createDpapiKeyProvider({ descriptorPath: f.descriptorPath }, { protector: fake });
      await expect(mismatchProvider.privateKey(f.active.key_id)).rejects.toThrow('KEY_PAIR_MISMATCH');
      otherPkcs8.fill(0);
      const nonEd = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
      const ecPkcs8 = nonEd.privateKey.export({ type: 'pkcs8', format: 'der' }) as Buffer;
      const wrongType = { ...f.active, protected_private_pkcs8_base64: (await fake.protect(ecPkcs8)).toString('base64') };
      await writeFile(f.descriptorPath, JSON.stringify({ ...f.descriptor, keys: [wrongType, f.standby] }));
      const ecProvider = await createDpapiKeyProvider({ descriptorPath: f.descriptorPath }, { protector: fake });
      await expect(ecProvider.privateKey(f.active.key_id)).rejects.toThrow('KEY_TYPE_INVALID');
      ecPkcs8.fill(0);
    } finally { await rm(f.directory, { recursive: true, force: true }); }
  });

  test('trust bundle is public-only and matches V2 raw-key shape', async () => {
    const f = await fixture();
    try {
      const bundle = buildV2TrustBundle(f.descriptor, { version: 1, revokedIds: [f.standby.key_id] });
      expect(bundle.keys).toHaveLength(2);
      for (const key of bundle.keys) {
        expect(key.keyId).toMatch(/^pb-v1-/);
        expect(Buffer.from(key.rawPublicKeyBase64Url, 'base64url')).toHaveLength(32);
      }
      const serialized = JSON.stringify(bundle).toLowerCase();
      expect(serialized).not.toContain('pkcs8');
      expect(serialized).not.toContain('protected');
      expect(serialized).not.toContain(f.active.protected_private_pkcs8_base64.toLowerCase());
      expect(serialized).not.toContain('private');
    } finally { await rm(f.directory, { recursive: true, force: true }); }
  });

  test('relative and in-repository descriptor paths reject', async () => {
    await expect(createDpapiKeyProvider({ descriptorPath: 'relative.json' }, { protector: fake })).rejects.toThrow('KEY_DESCRIPTOR_PATH_INVALID');
    await expect(createDpapiKeyProvider({ descriptorPath: path.resolve(__dirname, 'key-providers.spec.ts') }, { protector: fake })).rejects.toThrow('KEY_DESCRIPTOR_PATH_INVALID');
  });

});
