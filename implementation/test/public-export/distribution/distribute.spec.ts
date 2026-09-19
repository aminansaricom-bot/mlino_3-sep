import { generateKeyPairSync } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { canonicalBytes } from '../../../public-export/canonical';
import { signEnvelope } from '../../../public-export/signing';
import { distributeCurrent, DistributionError } from '../../../public-export/distribution/distribute';
import { publicProviderFromDescriptor, runDistributionCli } from '../../../public-export/distribution/cli';
import { deriveKeyId } from '../../../public-export/key-providers/keyId';

jest.mock('../../../public-export/key-providers/protector', () => ({
  DpapiProtector: class { constructor() { throw new Error('DPAPI_CALLED'); } },
}));

const FILE = 'public-business.v1.json';
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const rawPublic = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32);
const keyId = deriveKeyId('20260918', rawPublic);
const provider = { publicKey: async (id: string) => id === keyId ? publicKey : null };
let root: string; let sourceDir: string; let publicDir: string;
const at = new Date('2026-09-18T12:00:00.000Z');

async function artifact(when = at, overrides: Record<string, unknown> = {}): Promise<Buffer> {
  const unsigned = {
    contract_version: 'mlino.v2.public-business.v1', generated_at: when.toISOString(),
    snapshot_id: 'snapshot-secret-id', records: [{ business: { organization_id: 'org-secret-id' } }], ...overrides,
  };
  return canonicalBytes(await signEnvelope(unsigned, keyId, { privateKey: async () => privateKey }));
}
async function put(raw: Buffer) { await fs.writeFile(path.join(sourceDir, FILE), raw); }
async function publicBytes() { return fs.readFile(path.join(publicDir, FILE)); }
async function reject(code: string) {
  await expect(distributeCurrent({ sourceDir, publicDir, keyProvider: provider, now: at })).rejects.toMatchObject({ code });
}

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'mlino-distribution-test-'));
  sourceDir = path.join(root, 'producer'); publicDir = path.join(root, 'public');
  await fs.mkdir(sourceDir); await fs.mkdir(publicDir);
});
afterEach(async () => { await fs.rm(root, { recursive: true, force: true }); });

test('dist-current-only-copies-canonical-bytes', async () => {
  const raw = await artifact(); await put(raw);
  for (const name of ['previous-1.json', 'previous-2.json', '.lock', '.public-business.tmp']) await fs.writeFile(path.join(sourceDir, name), 'decoy');
  await distributeCurrent({ sourceDir, publicDir, keyProvider: provider, now: at });
  expect(await publicBytes()).toEqual(raw);
  expect(await fs.readdir(publicDir)).toEqual([FILE]);
});

test('dist-rejects-tampered-signature-preserves-public', async () => {
  const old = await artifact(); await fs.writeFile(path.join(publicDir, FILE), old);
  const bad = JSON.parse((await artifact()).toString('utf8'));
  bad.records[0].business.organization_id = 'changed'; await put(canonicalBytes(bad));
  await reject('DISTRIBUTION_SIGNATURE'); expect(await publicBytes()).toEqual(old);
});

test('dist-rejects-noncanonical-preserves-public', async () => {
  const old = await artifact(); await fs.writeFile(path.join(publicDir, FILE), old);
  await put(Buffer.concat([old, Buffer.from('\n')]));
  await reject('DISTRIBUTION_CANONICAL'); expect(await publicBytes()).toEqual(old);
});

test('dist-rejects-wrong-contract-preserves-public', async () => {
  const old = await artifact(); await fs.writeFile(path.join(publicDir, FILE), old);
  await put(await artifact(at, { contract_version: 'draft-1' }));
  await reject('DISTRIBUTION_CONTRACT'); expect(await publicBytes()).toEqual(old);
});

test('dist-rejects-unknown-key-preserves-public', async () => {
  const old = await artifact(); await fs.writeFile(path.join(publicDir, FILE), old);
  const bad = JSON.parse(old.toString('utf8')); bad.signature.key_id = 'other'; await put(canonicalBytes(bad));
  await reject('DISTRIBUTION_SIGNATURE'); expect(await publicBytes()).toEqual(old);
});

test('dist-rejects-expired-and-future-preserves-public', async () => {
  const old = await artifact(); await fs.writeFile(path.join(publicDir, FILE), old);
  await put(await artifact(new Date(at.getTime() - 300_001))); await reject('DISTRIBUTION_EXPIRED');
  await put(await artifact(new Date(at.getTime() + 30_001))); await reject('DISTRIBUTION_FUTURE');
  expect(await publicBytes()).toEqual(old);
});

test('dist-rejects-rollback-preserves-public', async () => {
  const newer = await artifact(new Date(at.getTime() + 1000));
  await fs.writeFile(path.join(publicDir, FILE), newer); await put(await artifact());
  await reject('DISTRIBUTION_ROLLBACK'); expect(await publicBytes()).toEqual(newer);
});

test('dist-rename-failure-removes-temp-preserves-public', async () => {
  const old = await artifact(); await fs.writeFile(path.join(publicDir, FILE), old);
  await put(await artifact(new Date(at.getTime() + 1000)));
  await expect(distributeCurrent({ sourceDir, publicDir, keyProvider: provider, now: at }, {
    rename: async () => { throw new Error('injected'); },
  })).rejects.toMatchObject({ code: 'DISTRIBUTION_IO' });
  expect(await publicBytes()).toEqual(old);
  expect(await fs.readdir(publicDir)).toEqual([FILE]);
});

test('dist-rejects-relative-nested-identical-and-repository-directories', async () => {
  await put(await artifact());
  for (const [from, to] of [['relative', publicDir], [sourceDir, sourceDir], [root, publicDir], [sourceDir, path.resolve(__dirname, '../../../..')]]) {
    await expect(distributeCurrent({ sourceDir: from, publicDir: to, keyProvider: provider, now: at })).rejects.toMatchObject({ code: 'DISTRIBUTION_PATH' });
  }
});

test('dist-logs-fixed-code-and-boolean-only', async () => {
  await put(await artifact()); const entries: unknown[] = [];
  await distributeCurrent({ sourceDir, publicDir, keyProvider: provider, now: at }, { log: (entry) => entries.push(entry) });
  expect(entries).toEqual([{ code: 'DISTRIBUTION_OK', ok: true }]);
  const rendered = JSON.stringify(entries);
  for (const secret of ['snapshot-secret-id', 'org-secret-id', keyId, sourceDir, publicDir]) expect(rendered).not.toContain(secret);
});

test('dist-cli-public-provider-does-not-read-protected-material', async () => {
  const descriptor = { format: 'mlino.public-export.keystore.v1', keys: [{ key_id: keyId, public_key_raw_base64url: rawPublic.toString('base64url') }] };
  Object.defineProperty(descriptor.keys[0], 'protected_private_pkcs8_base64', { get: () => { throw new Error('DPAPI called'); } });
  const fromPublic = publicProviderFromDescriptor(descriptor);
  await put(await artifact());
  await distributeCurrent({ sourceDir, publicDir, keyProvider: fromPublic, now: at });
  expect(await fs.readdir(publicDir)).toEqual([FILE]);
});

test('dist-cli-uses-public-only-descriptor-without-protector', async () => {
  await put(await artifact(new Date()));
  const descriptor = JSON.stringify({ format: 'mlino.public-export.keystore.v1', keys: [
    { key_id: keyId, public_key_raw_base64url: rawPublic.toString('base64url') },
  ] });
  await runDistributionCli({ MLINO_EXPORT_OUTPUT_DIR: sourceDir, MLINO_PUBLIC_EXPORT_DIR: publicDir,
    MLINO_EXPORT_KEYSTORE_PATH: path.join(root, 'test-descriptor.json') }, async () => descriptor as never);
  expect(await fs.readdir(publicDir)).toEqual([FILE]);
});

test('dist-errors-never-contain-paths-or-identifiers', async () => {
  await put(Buffer.from('bad')); let caught: unknown;
  try { await distributeCurrent({ sourceDir, publicDir, keyProvider: provider, now: at }); } catch (error) { caught = error; }
  expect(caught).toBeInstanceOf(DistributionError);
  const message = String(caught);
  for (const secret of [sourceDir, publicDir, keyId, 'org-secret-id']) expect(message).not.toContain(secret);
});
