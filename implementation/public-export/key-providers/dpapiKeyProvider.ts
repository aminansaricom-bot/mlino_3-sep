import { createPrivateKey, createPublicKey, KeyObject } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { ExportKeyProvider } from '../cli';
import { DescriptorEntry, parseDescriptor } from './descriptor';
import { DpapiProtector, Protector } from './protector';

const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

export function rawPublicKey(key: KeyObject): Buffer {
  if (key.asymmetricKeyType !== 'ed25519') throw new Error('KEY_TYPE_INVALID');
  const der = key.export({ type: 'spki', format: 'der' });
  if (!Buffer.isBuffer(der) || der.length !== ED25519_SPKI_PREFIX.length + 32 || !der.subarray(0, ED25519_SPKI_PREFIX.length).equals(ED25519_SPKI_PREFIX)) throw new Error('KEY_PUBLIC_INVALID');
  return Buffer.from(der.subarray(ED25519_SPKI_PREFIX.length));
}

function publicObject(entry: DescriptorEntry): KeyObject {
  return createPublicKey({ key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(entry.public_key_raw_base64url, 'base64url')]), format: 'der', type: 'spki' });
}

async function checkedDescriptorPath(descriptorPath: string): Promise<string> {
  if (typeof descriptorPath !== 'string' || !descriptorPath.trim() || !path.isAbsolute(descriptorPath)) throw new Error('KEY_DESCRIPTOR_PATH_INVALID');
  const repositoryRoot = path.resolve(__dirname, __dirname.includes(`${path.sep}dist${path.sep}`) ? '../../../..' : '../../..');
  const root = await realpath(repositoryRoot);
  let target: string;
  try { target = await realpath(descriptorPath); } catch { throw new Error('KEY_DESCRIPTOR_PATH_INVALID'); }
  const relative = path.relative(root, target);
  if (!relative || (!relative.startsWith('..') && !path.isAbsolute(relative))) throw new Error('KEY_DESCRIPTOR_PATH_INVALID');
  return target;
}

export async function createDpapiKeyProvider(
  { descriptorPath }: { descriptorPath: string },
  deps: { protector?: Protector } = {},
): Promise<ExportKeyProvider> {
  const file = await checkedDescriptorPath(descriptorPath);
  let descriptor;
  try { descriptor = parseDescriptor(await readFile(file, 'utf8')); }
  catch { throw new Error('KEY_DESCRIPTOR_INVALID'); }
  const protector = deps.protector ?? new DpapiProtector();
  const entries = new Map(descriptor.keys.map((entry) => [entry.key_id, entry]));
  return {
    async privateKey(keyId: string): Promise<KeyObject> {
      if (keyId !== descriptor.active_key_id) throw new Error('KEY_NOT_ACTIVE');
      const entry = entries.get(keyId);
      if (!entry) throw new Error('KEY_NOT_ACTIVE');
      let plain: Buffer | undefined;
      try {
        plain = await protector.unprotect(Buffer.from(entry.protected_private_pkcs8_base64, 'base64'));
        const privateKey = createPrivateKey({ key: plain, format: 'der', type: 'pkcs8' });
        if (privateKey.asymmetricKeyType !== 'ed25519') throw new Error('KEY_TYPE_INVALID');
        if (!rawPublicKey(createPublicKey(privateKey)).equals(Buffer.from(entry.public_key_raw_base64url, 'base64url'))) throw new Error('KEY_PAIR_MISMATCH');
        return privateKey;
      } catch (error) {
        if (error instanceof Error && ['KEY_TYPE_INVALID', 'KEY_PAIR_MISMATCH'].includes(error.message)) throw error;
        throw new Error('KEY_PRIVATE_INVALID');
      } finally { plain?.fill(0); }
    },
    async publicKey(keyId: string): Promise<KeyObject | null> {
      const entry = entries.get(keyId);
      if (!entry) return null;
      try { return publicObject(entry); } catch { throw new Error('KEY_PUBLIC_INVALID'); }
    },
  };
}
