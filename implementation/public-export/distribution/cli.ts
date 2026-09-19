import { promises as fs } from 'node:fs';
import { createPublicKey, KeyObject } from 'node:crypto';
import { distributeCurrent } from './distribute';
import { VerificationKeyProvider } from '../signing';
import { validateKeyId } from '../key-providers/keyId';

const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

export function publicProviderFromDescriptor(value: unknown): VerificationKeyProvider {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('DISTRIBUTION_DESCRIPTOR');
  const root = value as Record<string, unknown>;
  if (root.format !== 'mlino.public-export.keystore.v1' || !Array.isArray(root.keys)) throw new Error('DISTRIBUTION_DESCRIPTOR');
  const keys = new Map<string, KeyObject>();
  for (const item of root.keys) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('DISTRIBUTION_DESCRIPTOR');
    const entry = item as Record<string, unknown>;
    const id = entry.key_id;
    const encoded = entry.public_key_raw_base64url;
    if (typeof id !== 'string' || typeof encoded !== 'string' || !/^[A-Za-z0-9_-]+$/.test(encoded)) throw new Error('DISTRIBUTION_DESCRIPTOR');
    const raw = Buffer.from(encoded, 'base64url');
    if (raw.length !== 32 || raw.toString('base64url') !== encoded || keys.has(id)) throw new Error('DISTRIBUTION_DESCRIPTOR');
    try {
      validateKeyId(id, raw);
      keys.set(id, createPublicKey({ key: Buffer.concat([ED25519_SPKI_PREFIX, raw]), format: 'der', type: 'spki' }));
    } catch { throw new Error('DISTRIBUTION_DESCRIPTOR'); }
  }
  if (!keys.size) throw new Error('DISTRIBUTION_DESCRIPTOR');
  return { publicKey: async (keyId) => keys.get(keyId) ?? null };
}

export async function runDistributionCli(env: NodeJS.ProcessEnv = process.env, readFile = fs.readFile): Promise<void> {
  const sourceDir = env.MLINO_EXPORT_OUTPUT_DIR;
  const publicDir = env.MLINO_PUBLIC_EXPORT_DIR;
  const descriptorPath = env.MLINO_EXPORT_KEYSTORE_PATH;
  if (!sourceDir || !publicDir || !descriptorPath) throw new Error('DISTRIBUTION_CONFIG');
  let descriptor: unknown;
  try { descriptor = JSON.parse(await readFile(descriptorPath, 'utf8')); }
  catch { throw new Error('DISTRIBUTION_DESCRIPTOR'); }
  await distributeCurrent({ sourceDir, publicDir, keyProvider: publicProviderFromDescriptor(descriptor) });
}

if (require.main === module) {
  runDistributionCli().catch((error) => {
    process.stderr.write(`${error instanceof Error && /^[A-Z_]+$/.test(error.message) ? error.message : 'DISTRIBUTION_IO'}\n`);
    process.exitCode = 1;
  });
}
