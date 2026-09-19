import { generateKeyPairSync } from 'node:crypto';
import { signEnvelope, verifyEnvelope } from '../../../public-export/signing';

test('m23r canonical valid signature passes; noncanonical trailing bits and invalid sizes are rejected', async () => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const provider = { privateKey: async () => privateKey, publicKey: async () => publicKey };
  const artifact = await signEnvelope({ records: [] }, 'test', provider);
  expect(await verifyEnvelope(artifact, provider)).toBe(true);
  const value = artifact.signature.value;
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const alternative = value.slice(0, -1) + alphabet[alphabet.indexOf(value.slice(-1)) + 1];
  expect(Buffer.from(alternative, 'base64url')).toEqual(Buffer.from(value, 'base64url'));
  for (const invalid of [alternative, Buffer.alloc(63).toString('base64url'), Buffer.alloc(65).toString('base64url'), value + '=']) {
    expect(await verifyEnvelope({ ...artifact, signature: { ...artifact.signature, value: invalid } }, provider)).toBe(false);
  }
});
