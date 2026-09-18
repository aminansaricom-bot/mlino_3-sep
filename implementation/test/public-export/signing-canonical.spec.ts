import { generateKeyPairSync, KeyObject } from 'node:crypto';
import { signEnvelope, verifyEnvelope, SigningKeyProvider, VerificationKeyProvider } from '../../public-export/signing';

// M2-3R-F1: V1 must accept exactly the signature spellings V2 accepts (canonical unpadded base64url, 64 bytes).
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const provider: SigningKeyProvider & VerificationKeyProvider = {
  privateKey: async (): Promise<KeyObject> => privateKey,
  publicKey: async (keyId: string): Promise<KeyObject | null> => keyId === 'test-v1' ? publicKey : null,
};
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

async function signed() {
  return signEnvelope({ contract_version: 'mlino.v2.public-business.v1', records: [] }, 'test-v1', provider);
}
function withValue(envelope: Awaited<ReturnType<typeof signed>>, value: string) {
  return { ...envelope, signature: { ...envelope.signature, value } };
}

test('canonical signature still verifies', async () => {
  const envelope = await signed();
  expect(envelope.signature.value).toHaveLength(86);
  expect(await verifyEnvelope(envelope, provider)).toBe(true);
});

test('a non-canonical spelling of the same signature bytes is rejected', async () => {
  const envelope = await signed();
  const value = envelope.signature.value;
  // 64 bytes use only the top 2 bits of the last sextet; flipping a low bit keeps the decoded bytes identical.
  const last = ALPHABET.indexOf(value[85]);
  const variant = value.slice(0, 85) + ALPHABET[last ^ 1];
  expect(Buffer.from(variant, 'base64url')).toEqual(Buffer.from(value, 'base64url'));
  expect(await verifyEnvelope(withValue(envelope, variant), provider)).toBe(false);
});

test('wrong lengths, padding and foreign characters are rejected', async () => {
  const envelope = await signed();
  const bytes = Buffer.from(envelope.signature.value, 'base64url');
  const cases = [
    bytes.subarray(0, 63).toString('base64url'),
    Buffer.concat([bytes, Buffer.from([0])]).toString('base64url'),
    `${envelope.signature.value}==`,
    `${envelope.signature.value.slice(0, 85)}+`,
    '',
  ];
  for (const value of cases) expect(await verifyEnvelope(withValue(envelope, value), provider)).toBe(false);
});
