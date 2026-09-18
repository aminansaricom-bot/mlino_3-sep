import { generateKeyPairSync } from 'node:crypto';
import { DescriptorEntry } from './descriptor';
import { deriveKeyId } from './keyId';
import { Protector } from './protector';
import { rawPublicKey } from './dpapiKeyProvider';

export async function generateProtectedKey(date: string, protector: Protector): Promise<DescriptorEntry> {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const raw = rawPublicKey(publicKey);
  const keyId = deriveKeyId(date, raw);
  const pkcs8 = privateKey.export({ type: 'pkcs8', format: 'der' });
  if (!Buffer.isBuffer(pkcs8)) throw new Error('KEY_PRIVATE_INVALID');
  try {
    const protectedBytes = await protector.protect(pkcs8);
    return {
      key_id: keyId,
      public_key_raw_base64url: raw.toString('base64url'),
      protected_private_pkcs8_base64: protectedBytes.toString('base64'),
      protection: 'dpapi-current-user',
    };
  } finally { pkcs8.fill(0); raw.fill(0); }
}
