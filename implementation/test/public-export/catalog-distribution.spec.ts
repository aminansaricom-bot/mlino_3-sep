import { createHash, generateKeyPairSync } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PublicBusinessExportV1 } from '../../public-export/builder';
import { CATALOG_CONTRACT_VERSION, PublicCatalogExportV1 } from '../../public-export/catalog-builder';
import { CATALOG_FILE } from '../../public-export/catalog-artifact';
import { canonicalBytes, snapshotId } from '../../public-export/canonical';
import { distributeCurrent } from '../../public-export/distribution/distribute';
import { catalogMediaGc } from '../../public-export/distribution/media-gc';
import { CatalogMedia } from '../../public-export/media';
import { signEnvelope } from '../../public-export/signing';

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const provider = { privateKey: async () => privateKey, publicKey: async () => publicKey };
const at = new Date('2026-09-22T12:00:00.000Z');
let root: string; let source: string; let publicDir: string;
beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'mlino-k4-distribute-'));
  source = path.join(root, 'source'); publicDir = path.join(root, 'public');
  await fs.mkdir(source); await fs.mkdir(publicDir);
});
afterEach(async () => { await fs.rm(root, { recursive: true, force: true }); });

function png(): Buffer {
  const bytes = Buffer.alloc(45);
  Buffer.from('89504e470d0a1a0a', 'hex').copy(bytes);
  bytes.writeUInt32BE(13, 8); bytes.write('IHDR', 12, 'ascii');
  bytes.writeUInt32BE(320, 16); bytes.writeUInt32BE(320, 20);
  bytes.write('IEND', 37, 'ascii');
  return bytes;
}
async function artifacts(withMedia = false) {
  const business = await signEnvelope({ contract_version: 'mlino.v2.public-business.v1', generated_at: at.toISOString(),
    snapshot_id: 'sha256:business', records: [{ business: { organization_id: 'org', publication_id: 'pub-business' }, offers: [] }] }, 'test', provider) as unknown as PublicBusinessExportV1;
  await fs.writeFile(path.join(source, 'public-business.v1.json'), canonicalBytes(business));
  let meta: CatalogMedia | null = null;
  if (withMedia) {
    const bytes = png(); const hash = createHash('sha256').update(bytes).digest('hex');
    const rel = `media/sha256/${hash.slice(0, 2)}/${hash}.png`;
    const full = path.join(source, ...rel.split('/'));
    await fs.mkdir(path.dirname(full), { recursive: true }); await fs.writeFile(full, bytes);
    meta = { position: 0, path: rel, sha256: hash, media_type: 'image/png', byte_size: bytes.length,
      width: 320, height: 320, alt_text: 'Test', placeholder: null };
  }
  const records = [{ organization_id: 'org', business_snapshot_id: business.snapshot_id,
    business_publication_id: 'pub-business', items: withMedia ? [{ catalog_item_id: 'item', item_key: 'item',
      name: 'Test item', short_description: null, price_amount: null, price_currency: null, on_request: true,
      grouping_label: null, display_order: 0, available_from: null, available_until: null, offer_version_links: [],
      media: [meta!], published_at: at.toISOString(), publication_id: 'pub-item', source_revision: 1 }] : [] }];
  const catalog = await signEnvelope({ contract_version: CATALOG_CONTRACT_VERSION, generated_at: at.toISOString(),
    snapshot_id: snapshotId(CATALOG_CONTRACT_VERSION, records), records }, 'test', provider, 'catalog') as PublicCatalogExportV1;
  await fs.writeFile(path.join(source, CATALOG_FILE), canonicalBytes(catalog));
  return { business, catalog, meta };
}

test('k4-distribution-stages-media-before-business-and-catalog-last', async () => {
  const { meta } = await artifacts(true);
  const renames: string[] = [];
  await distributeCurrent({ sourceDir: source, publicDir, keyProvider: provider, now: at }, {
    rename: async (from, to) => { renames.push(path.basename(to)); await fs.rename(from, to); },
  });
  expect(await fs.readFile(path.join(publicDir, ...meta!.path.split('/')))).toEqual(png());
  expect(renames).toEqual(['public-business.v1.json', CATALOG_FILE]);
  expect(await fs.readFile(path.join(publicDir, CATALOG_FILE))).toEqual(await fs.readFile(path.join(source, CATALOG_FILE)));
});

test('k4-media-failure-preserves-previous-catalog-and-poisoned-destination-is-not-overwritten', async () => {
  const { meta } = await artifacts(true);
  const old = await fs.readFile(path.join(source, CATALOG_FILE));
  await fs.writeFile(path.join(publicDir, CATALOG_FILE), old);
  await fs.rm(path.join(source, ...meta!.path.split('/')));
  await expect(distributeCurrent({ sourceDir: source, publicDir, keyProvider: provider, now: at })).rejects.toMatchObject({ code: 'DISTRIBUTION_MEDIA' });
  expect(await fs.readFile(path.join(publicDir, CATALOG_FILE))).toEqual(old);
  const full = path.join(source, ...meta!.path.split('/'));
  await fs.writeFile(full, png());
  const destination = path.join(publicDir, ...meta!.path.split('/'));
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, 'poison');
  await expect(distributeCurrent({ sourceDir: source, publicDir, keyProvider: provider, now: at })).rejects.toMatchObject({ code: 'DISTRIBUTION_MEDIA' });
  expect(await fs.readFile(destination, 'utf8')).toBe('poison');
  expect(await fs.readFile(path.join(publicDir, CATALOG_FILE))).toEqual(old);
});

test('k4-missing-source-catalog-distributes-business-only-and-keeps-existing-catalog', async () => {
  await artifacts();
  await fs.rm(path.join(source, CATALOG_FILE));
  const old = Buffer.from('old catalog'); await fs.writeFile(path.join(publicDir, CATALOG_FILE), old);
  await distributeCurrent({ sourceDir: source, publicDir, keyProvider: provider, now: at });
  expect(await fs.readFile(path.join(publicDir, CATALOG_FILE))).toEqual(old);
});

test('k4-catalog-rename-retries-transient-locks-and-publishes-last', async () => {
  await artifacts();
  let catalogAttempts = 0;
  await distributeCurrent({ sourceDir: source, publicDir, keyProvider: provider, now: at }, {
    rename: async (from, to) => {
      if (path.basename(to) === CATALOG_FILE && ++catalogAttempts < 3) {
        throw Object.assign(new Error('locked'), { code: 'EBUSY' });
      }
      await fs.rename(from, to);
    },
  });
  expect(catalogAttempts).toBe(3);
  expect(await fs.readFile(path.join(publicDir, CATALOG_FILE))).toEqual(await fs.readFile(path.join(source, CATALOG_FILE)));
});

test('k4-newer-existing-catalog-blocks-rollback-before-business-replacement', async () => {
  await artifacts();
  const newer = await signEnvelope({ contract_version: CATALOG_CONTRACT_VERSION,
    generated_at: new Date(at.getTime() + 1_000).toISOString(), snapshot_id: snapshotId(CATALOG_CONTRACT_VERSION, []), records: [] },
  'test', provider, 'catalog');
  await fs.writeFile(path.join(publicDir, CATALOG_FILE), canonicalBytes(newer));
  await expect(distributeCurrent({ sourceDir: source, publicDir, keyProvider: provider, now: at })).rejects.toMatchObject({ code: 'DISTRIBUTION_ROLLBACK' });
  await expect(fs.readFile(path.join(publicDir, 'public-business.v1.json'))).rejects.toMatchObject({ code: 'ENOENT' });
});

test('k4-gc-dry-run-and-apply-retain-referenced-media-and-stop-on-corrupt-artifact', async () => {
  const { meta } = await artifacts(true);
  await distributeCurrent({ sourceDir: source, publicDir, keyProvider: provider, now: at });
  const stale = `media/sha256/aa/${'a'.repeat(64)}.png`;
  const staleFull = path.join(publicDir, ...stale.split('/'));
  await fs.mkdir(path.dirname(staleFull), { recursive: true }); await fs.writeFile(staleFull, 'unreferenced');
  const old = new Date(at.getTime() - 8 * 24 * 60 * 60 * 1000);
  await fs.utimes(staleFull, old, old);
  expect(await catalogMediaGc(publicDir, provider, { now: at })).toEqual([stale]);
  expect(await fs.readFile(staleFull, 'utf8')).toBe('unreferenced');
  expect(await catalogMediaGc(publicDir, provider, { now: at, apply: true })).toEqual([stale]);
  await expect(fs.readFile(staleFull)).rejects.toMatchObject({ code: 'ENOENT' });
  expect(await fs.readFile(path.join(publicDir, ...meta!.path.split('/')))).toEqual(png());
  await fs.writeFile(path.join(publicDir, CATALOG_FILE), 'corrupt');
  await expect(catalogMediaGc(publicDir, provider, { now: at, apply: true })).rejects.toThrow('CATALOG_GC_ARTIFACT');
});

test('k4-gc-retains-media-referenced-by-previous-1-and-stops-if-it-is-corrupt', async () => {
  const { meta } = await artifacts(true);
  await distributeCurrent({ sourceDir: source, publicDir, keyProvider: provider, now: at });
  await fs.copyFile(path.join(publicDir, CATALOG_FILE), path.join(publicDir, 'public-catalog.v1.previous-1.json'));
  await fs.copyFile(path.join(publicDir, 'public-business.v1.json'), path.join(publicDir, 'public-business.v1.previous-1.json'));
  await artifacts(false);
  await distributeCurrent({ sourceDir: source, publicDir, keyProvider: provider, now: at });
  const retained = path.join(publicDir, ...meta!.path.split('/'));
  const old = new Date(at.getTime() - 8 * 24 * 60 * 60 * 1000);
  await fs.utimes(retained, old, old);
  expect(await catalogMediaGc(publicDir, provider, { now: at, apply: true })).toEqual([]);
  expect(await fs.readFile(retained)).toEqual(png());
  await fs.writeFile(path.join(publicDir, 'public-catalog.v1.previous-1.json'), 'corrupt');
  await expect(catalogMediaGc(publicDir, provider, { now: at, apply: true })).rejects.toThrow('CATALOG_GC_ARTIFACT');
  expect(await fs.readFile(retained)).toEqual(png());
});
