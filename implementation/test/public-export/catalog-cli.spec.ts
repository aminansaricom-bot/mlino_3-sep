import { createHash, generateKeyPairSync } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { buildPublicExport } from '../../public-export/builder';
import { runPublicExportCli } from '../../public-export/cli';
import { canonicalBytes } from '../../public-export/canonical';
import { verifyEnvelope } from '../../public-export/signing';

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const provider = { privateKey: async () => privateKey, publicKey: async () => publicKey };
const asOf = '2026-09-22T12:00:00.000Z';
function dbFixture(options: { name?: string; media?: unknown[] } = {}): PrismaClient {
  const occurredAt = new Date('2026-09-22T11:00:00.000Z');
  const published = (content: Record<string, unknown>) => ({ snapshot_version: 'core-publication-snapshot-v1', content });
  const profile = { id: 'pub-business', organizationId: 'org', businessProfileId: 'profile', capabilityId: null,
    offerVersionId: null, catalogItemId: null, eventKind: 'PUBLISHED', contentRevision: 1, occurredAt,
    publishedContent: published({ name: 'Business', description: null, latitude: null, longitude: null,
      address_text: null, contact_information: null, links: null, business_hours: null }) };
  const catalog = { ...profile, id: 'pub-catalog', businessProfileId: null, catalogItemId: 'item',
    publishedContent: published({ item_key: 'item', name: options.name ?? 'Catalog snapshot', short_description: null,
      price_amount: null, price_currency: null, on_request: true, grouping_label: null, display_order: 0,
      available_from: null, available_until: null, offer_version_links: [], media: options.media ?? [] }) };
  const tx = { $executeRawUnsafe: async () => undefined,
    publication: { findMany: async ({ where }: { where: { catalogItemId?: unknown } }) => where.catalogItemId ? [catalog] : [profile] },
    organization: { findMany: async () => [{ id: 'org', lifecycleStatus: 'ACTIVE' }] },
    businessProfile: { findMany: async () => [{ id: 'profile', organizationId: 'org', lifecycleStatus: 'ACTIVE', businessIdentityClaimId: 'claim' }] },
    businessIdentityClaim: { findMany: async () => [{ id: 'claim', organizationId: 'org', claimStatus: 'VERIFIED', validUntil: null }] },
    capability: { findMany: async () => [] }, offerVersion: { findMany: async () => [] },
    catalogItem: { findMany: async () => [{ id: 'item', organizationId: 'org', lifecycleStatus: 'ACTIVE' }] } };
  return { $transaction: async (fn: (transaction: typeof tx) => Promise<unknown>) => fn(tx) } as unknown as PrismaClient;
}

test('k4-cli-builds-business-then-catalog-in-one-run-and-keeps-business-bytes', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mlino-k4-cli-'));
  const output = path.join(root, 'output'); const store = path.join(root, 'private');
  await fs.mkdir(store);
  try {
    const db = dbFixture();
    const expectedBusiness = await buildPublicExport(db, { asOf, keyId: 'test', signingKeyProvider: provider });
    const env = { MLINO_EXPORT_OUTPUT_DIR: output, MLINO_MEDIA_STORE_DIR: store,
      MLINO_EXPORT_KEY_ID: 'test', MLINO_EXPORT_AS_OF: asOf };
    await runPublicExportCli({ db, keyProvider: provider, env, log: () => undefined });
    const businessRaw = await fs.readFile(path.join(output, 'public-business.v1.json'));
    const catalogRaw = await fs.readFile(path.join(output, 'public-catalog.v1.json'));
    expect(businessRaw).toEqual(expectedBusiness.bytes);
    const parsed = JSON.parse(catalogRaw.toString('utf8'));
    expect(parsed.records[0]).toMatchObject({ business_snapshot_id: expectedBusiness.artifact.snapshot_id,
      business_publication_id: 'pub-business', items: [{ name: 'Catalog snapshot' }] });
    expect(await verifyEnvelope(parsed, provider, 'catalog')).toBe(true);
    expect(canonicalBytes(parsed)).toEqual(catalogRaw);
    await runPublicExportCli({ db, keyProvider: provider, env, log: () => undefined });
    expect(await fs.readFile(path.join(output, 'public-catalog.v1.previous-1.json'))).toEqual(catalogRaw);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test.each(['missing-store', 'poisoned-media', 'oversized-catalog'])(
  'k4b-cli-%s-skips-catalog-without-changing-prior-catalog-or-business-success', async (failure) => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mlino-k4b-cli-'));
    const output = path.join(root, 'output');
    const store = path.join(root, 'private');
    await fs.mkdir(output);
    await fs.mkdir(store);
    const priorCatalog = Buffer.from('prior catalog bytes');
    await fs.writeFile(path.join(output, 'public-catalog.v1.json'), priorCatalog);
    const png = Buffer.alloc(45);
    Buffer.from('89504e470d0a1a0a', 'hex').copy(png);
    png.writeUInt32BE(13, 8);
    png.write('IHDR', 12, 'ascii');
    png.writeUInt32BE(800, 16);
    png.writeUInt32BE(600, 20);
    const sha256 = createHash('sha256').update(png).digest('hex');
    const relative = `media/sha256/${sha256.slice(0, 2)}/${sha256}.png`;
    const meta = { position: 0, path: relative, sha256, media_type: 'image/png', byte_size: png.length,
      width: 800, height: 600, alt_text: 'Test image', placeholder: null };
    try {
      const db = dbFixture(failure === 'oversized-catalog' ? { name: 'X'.repeat(2_000_010) } :
        failure === 'poisoned-media' ? { media: [meta] } : {});
      if (failure === 'poisoned-media') {
        const source = path.join(store, ...relative.split('/'));
        const target = path.join(output, ...relative.split('/'));
        await fs.mkdir(path.dirname(source), { recursive: true });
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(source, png);
        await fs.writeFile(target, 'poisoned');
      }
      const expected = await buildPublicExport(db, { asOf, keyId: 'test', signingKeyProvider: provider });
      const logs: string[] = [];
      await runPublicExportCli({ db, keyProvider: provider,
        env: { MLINO_EXPORT_OUTPUT_DIR: output, MLINO_MEDIA_STORE_DIR: failure === 'missing-store' ? path.join(root, 'absent') : store,
          MLINO_EXPORT_KEY_ID: 'test', MLINO_EXPORT_AS_OF: asOf }, log: (line) => logs.push(line) });
      expect(await fs.readFile(path.join(output, 'public-business.v1.json'))).toEqual(expected.bytes);
      expect(await fs.readFile(path.join(output, 'public-catalog.v1.json'))).toEqual(priorCatalog);
      expect(logs.map((line) => JSON.parse(line))).toContainEqual({ code: 'CATALOG_EXPORT_SKIPPED',
        reason: failure === 'missing-store' ? 'CATALOG_MEDIA_STORE' :
          failure === 'poisoned-media' ? 'CATALOG_MEDIA_POISONED' : 'CATALOG_ARTIFACT_SIZE' });
      expect(logs.some((line) => line.includes('PUBLIC_EXPORT_PUBLISHED'))).toBe(true);
    } finally { await fs.rm(root, { recursive: true, force: true }); }
  },
);
