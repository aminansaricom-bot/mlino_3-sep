import { createHash, createPublicKey, generateKeyPairSync, sign } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { PublicBusinessExportV1 } from '../../public-export/builder';
import { buildPublicCatalogExport, CATALOG_CONTRACT_VERSION } from '../../public-export/catalog-builder';
import { verifyCatalogArtifact } from '../../public-export/catalog-artifact';
import { canonicalBytes, snapshotId } from '../../public-export/canonical';
import { CatalogMedia, readVerifiedMedia, verifyMediaBytes } from '../../public-export/media';
import { signedBytes, signEnvelope, verifyEnvelope, DOMAIN_SEPARATOR, SignedEnvelope } from '../../public-export/signing';
import frozen from './fixtures/public-catalog.v1.fixture.json';

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const provider = { privateKey: async () => privateKey, publicKey: async () => publicKey };
const at = '2026-09-22T12:00:00.000Z';
const snapshot = (content: Record<string, unknown>) => ({ snapshot_version: 'core-publication-snapshot-v1', content });
function business(): PublicBusinessExportV1 {
  return { contract_version: 'mlino.v2.public-business.v1', generated_at: at, snapshot_id: 'sha256:business-test',
    signature: { algorithm: 'Ed25519', key_id: 'test', value: '' }, records: [{
      business: { organization_id: 'org', publication_id: 'business-publication' },
      offers: [{ offer_version_id: 'visible-offer' }],
    } as never] };
}
function input(name = 'Snapshot item', media: CatalogMedia[] = []) {
  return { item_key: 'key', name, short_description: null, price_amount: null, price_currency: null,
    on_request: true, grouping_label: null, display_order: 2, available_from: null, available_until: null,
    offer_version_links: ['hidden-offer', 'visible-offer'], media };
}
function fixture(content: Record<string, unknown> = input()) {
  const events = [{ id: 'publication', organizationId: 'org', catalogItemId: 'item', eventKind: 'PUBLISHED',
    publishedContent: snapshot(content), contentRevision: 3, occurredAt: new Date(at) }];
  const item = { id: 'item', organizationId: 'org', lifecycleStatus: 'ACTIVE', name: 'LIVE NAME MUST NOT LEAK' };
  const tx = { $executeRawUnsafe: jest.fn(async () => undefined), publication: { findMany: jest.fn(async () => events) },
    catalogItem: { findMany: jest.fn(async () => [item]) },
    organization: { findMany: jest.fn(async () => [{ id: 'org', lifecycleStatus: 'ACTIVE' }]) } };
  const db = { $transaction: async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx) } as unknown as PrismaClient;
  return { db, events, item, tx };
}
function png(): Buffer {
  const result = Buffer.alloc(45);
  Buffer.from('89504e470d0a1a0a', 'hex').copy(result);
  result.writeUInt32BE(13, 8); result.write('IHDR', 12, 'ascii');
  result.writeUInt32BE(320, 16); result.writeUInt32BE(320, 20);
  result.writeUInt32BE(0, 33); result.write('IEND', 37, 'ascii');
  return result;
}
async function mediaFixture(root: string): Promise<{ store: string; meta: CatalogMedia }> {
  const bytes = png();
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const rel = `media/sha256/${sha256.slice(0, 2)}/${sha256}.png`;
  const store = path.join(root, 'private');
  const full = path.join(store, ...rel.split('/'));
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, bytes);
  return { store, meta: { position: 0, path: rel, sha256, media_type: 'image/png', byte_size: bytes.length,
    width: 320, height: 320, alt_text: 'Test media', placeholder: null } };
}

test('k4-signing-keeps-business-domain-bytes-and-rejects-both-cross-domain-replays', async () => {
  const unsigned = { contract_version: 'test', records: [] };
  const oldBusiness = await signEnvelope(unsigned, 'test', provider);
  const { value: _value, ...metadata } = oldBusiness.signature;
  const expected = Buffer.concat([DOMAIN_SEPARATOR, canonicalBytes({ ...oldBusiness, signature: metadata })]);
  expect(signedBytes(oldBusiness)).toEqual(expected);
  expect(oldBusiness.signature.value).toBe(sign(null, expected, privateKey).toString('base64url'));
  const catalog = await signEnvelope(unsigned, 'test', provider, 'catalog');
  expect(await verifyEnvelope(oldBusiness, provider)).toBe(true);
  expect(await verifyEnvelope(catalog, provider, 'catalog')).toBe(true);
  expect(await verifyEnvelope(oldBusiness, provider, 'catalog')).toBe(false);
  expect(await verifyEnvelope(catalog, provider)).toBe(false);
});

test('k4-frozen-catalog-fixture-verifies-with-test-only-public-key', async () => {
  const raw = Buffer.from(frozen.public_key_raw_base64url, 'base64url');
  const key = createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), raw]), format: 'der', type: 'spki' });
  expect(await verifyEnvelope(frozen.artifact as SignedEnvelope, { publicKey: async () => key }, 'catalog')).toBe(true);
  expect(frozen.artifact.snapshot_id).toBe(frozen.expected_snapshot_id);
  expect(frozen.expected_snapshot_id).toBe(snapshotId(CATALOG_CONTRACT_VERSION, []));
});

test('k4-builder-uses-only-published-snapshot-hides-withdrawn-and-filters-offer-links', async () => {
  const f = fixture();
  const first = await buildPublicCatalogExport(f.db, { asOf: at, keyId: 'test', signingKeyProvider: provider, businessArtifact: business() });
  expect(first.artifact.records[0].items[0]).toMatchObject({ name: 'Snapshot item', offer_version_links: ['visible-offer'], source_revision: 3 });
  expect(first.bytes.toString()).not.toContain(f.item.name);
  expect(first.artifact.records[0].business_snapshot_id).toBe(business().snapshot_id);
  expect(await verifyCatalogArtifact(first.bytes, provider, business(), new Date(at))).toMatchObject({ snapshot_id: first.artifact.snapshot_id });
  expect(first.artifact.snapshot_id).toBe(snapshotId(CATALOG_CONTRACT_VERSION, first.artifact.records));
  f.events.push({ ...f.events[0], id: 'withdraw', eventKind: 'WITHDRAWN', occurredAt: new Date(Date.parse(at) + 1) });
  const withdrawn = await buildPublicCatalogExport(f.db, { asOf: new Date(Date.parse(at) + 2), keyId: 'test', signingKeyProvider: provider,
    businessArtifact: { ...business(), generated_at: new Date(Date.parse(at) + 2).toISOString() } });
  expect(withdrawn.artifact.records).toEqual([]);
});

test('k4-builder-accepts-exactly-1999999-and-rejects-2000001-canonical-bytes', async () => {
  const f = fixture();
  const basic = await buildPublicCatalogExport(f.db, { asOf: at, keyId: 'test', signingKeyProvider: provider, businessArtifact: business() });
  const baseLength = basic.bytes.length;
  const nameFor = (size: number) => 'X'.repeat(size - baseLength + 'Snapshot item'.length);
  f.events[0].publishedContent = snapshot(input(nameFor(1_999_999)));
  expect((await buildPublicCatalogExport(f.db, { asOf: at, keyId: 'test', signingKeyProvider: provider, businessArtifact: business() })).bytes.length).toBe(1_999_999);
  f.events[0].publishedContent = snapshot(input(nameFor(2_000_001)));
  await expect(buildPublicCatalogExport(f.db, { asOf: at, keyId: 'test', signingKeyProvider: provider, businessArtifact: business() })).rejects.toThrow('CATALOG_ARTIFACT_SIZE');
});

test('k4-builder-hides-an-entire-item-if-any-media-fails', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mlino-k4-builder-media-'));
  try {
    const { store, meta } = await mediaFixture(root);
    const f = fixture(input('Published item', [meta]));
    const issues: string[] = [];
    const options = { asOf: at, keyId: 'test', signingKeyProvider: provider, businessArtifact: business(),
      mediaStoreDir: store, onIssue: (issue: { code: string }) => issues.push(issue.code) };
    const good = await buildPublicCatalogExport(f.db, options);
    expect(good.artifact.records[0].items).toHaveLength(1);
    await fs.writeFile(path.join(store, ...meta.path.split('/')), 'poison');
    const bad = await buildPublicCatalogExport(f.db, options);
    expect(bad.artifact.records).toEqual([]);
    expect(issues).toContain('CATALOG_MEDIA_SIZE');
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('k4-builder-availability-is-inclusive-at-start-and-exclusive-at-end', async () => {
  const f = fixture({ ...input(), available_from: at, available_until: '2026-09-23T12:00:00.000Z' });
  const buildAt = async (time: string) => buildPublicCatalogExport(f.db, { asOf: time, keyId: 'test',
    signingKeyProvider: provider, businessArtifact: { ...business(), generated_at: time } });
  expect((await buildAt(at)).artifact.records).toHaveLength(1);
  expect((await buildAt('2026-09-23T12:00:00.000Z')).artifact.records).toEqual([]);
});

test('k4-media-rejects-hash-size-dimension-traversal-and-symlink', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mlino-k4-media-'));
  try {
    const { store, meta } = await mediaFixture(root);
    expect((await readVerifiedMedia(store, meta)).length).toBe(meta.byte_size);
    await expect(readVerifiedMedia(store, { ...meta, width: 321 })).rejects.toThrow('CATALOG_MEDIA_DIMENSIONS');
    await expect(readVerifiedMedia(store, { ...meta, byte_size: 1 })).rejects.toThrow('CATALOG_MEDIA_SIZE');
    await expect(readVerifiedMedia(store, { ...meta, path: '../escape.png' })).rejects.toThrow('CATALOG_MEDIA_PATH');
    const full = path.join(store, ...meta.path.split('/'));
    await fs.writeFile(full, Buffer.from('poison'));
    await expect(readVerifiedMedia(store, meta)).rejects.toThrow('CATALOG_MEDIA_SIZE');
    await fs.rm(full);
    await fs.mkdir(path.join(root, 'other'));
    await fs.rmdir(path.dirname(full));
    await fs.symlink(path.join(root, 'other'), path.dirname(full), 'junction');
    await expect(readVerifiedMedia(store, meta)).rejects.toThrow('CATALOG_MEDIA_PATH');
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('k4-media-headers-cover-static-JPEG-WebP-AVIF-and-reject-animation', () => {
  const cases: Array<{ type: CatalogMedia['media_type']; ext: string; bytes: Buffer }> = [];
  const jpeg = Buffer.from('ffd8ffc00011080140014003000000000000000000', 'hex');
  cases.push({ type: 'image/jpeg', ext: 'jpg', bytes: jpeg });
  const webp = Buffer.alloc(30);
  webp.write('RIFF', 0); webp.writeUInt32LE(22, 4); webp.write('WEBPVP8X', 8);
  webp.writeUInt32LE(10, 16); webp.writeUIntLE(319, 24, 3); webp.writeUIntLE(319, 27, 3);
  cases.push({ type: 'image/webp', ext: 'webp', bytes: webp });
  const avif = Buffer.alloc(64);
  avif.writeUInt32BE(16, 0); avif.write('ftypavif', 4);
  avif.writeUInt32BE(48, 16); avif.write('meta', 20);
  avif.writeUInt32BE(36, 28); avif.write('iprp', 32);
  avif.writeUInt32BE(28, 36); avif.write('ipco', 40);
  avif.writeUInt32BE(20, 44); avif.write('ispe', 48);
  avif.writeUInt32BE(320, 56); avif.writeUInt32BE(320, 60);
  cases.push({ type: 'image/avif', ext: 'avif', bytes: avif });
  for (const { type, ext, bytes } of cases) {
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const meta: CatalogMedia = { position: 0, path: `media/sha256/${sha256.slice(0, 2)}/${sha256}.${ext}`,
      sha256, media_type: type, byte_size: bytes.length, width: 320, height: 320, alt_text: 'Test', placeholder: null };
    expect(() => verifyMediaBytes(bytes, meta)).not.toThrow();
    const animated = Buffer.from(bytes);
    if (type === 'image/webp') animated[20] |= 0x02;
    if (type === 'image/avif') animated.write('avis', 8);
    if (type !== 'image/jpeg') {
      const animatedHash = createHash('sha256').update(animated).digest('hex');
      const animatedMeta = { ...meta, sha256: animatedHash, path: `media/sha256/${animatedHash.slice(0, 2)}/${animatedHash}.${ext}` };
      expect(() => verifyMediaBytes(animated, animatedMeta)).toThrow();
    }
  }
  const staticPng = png();
  const animatedPng = Buffer.concat([staticPng.subarray(0, 33), Buffer.from('000000006163544c00000000', 'hex'), staticPng.subarray(33)]);
  const hash = createHash('sha256').update(animatedPng).digest('hex');
  expect(() => verifyMediaBytes(animatedPng, { position: 0, path: `media/sha256/${hash.slice(0, 2)}/${hash}.png`,
    sha256: hash, media_type: 'image/png', byte_size: animatedPng.length, width: 320, height: 320,
    alt_text: 'Test', placeholder: null })).toThrow('CATALOG_MEDIA_ANIMATED');
});
