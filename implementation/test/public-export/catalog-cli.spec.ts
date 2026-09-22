import { generateKeyPairSync } from 'node:crypto';
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
function dbFixture(): PrismaClient {
  const occurredAt = new Date('2026-09-22T11:00:00.000Z');
  const published = (content: Record<string, unknown>) => ({ snapshot_version: 'core-publication-snapshot-v1', content });
  const profile = { id: 'pub-business', organizationId: 'org', businessProfileId: 'profile', capabilityId: null,
    offerVersionId: null, catalogItemId: null, eventKind: 'PUBLISHED', contentRevision: 1, occurredAt,
    publishedContent: published({ name: 'Business', description: null, latitude: null, longitude: null,
      address_text: null, contact_information: null, links: null, business_hours: null }) };
  const catalog = { ...profile, id: 'pub-catalog', businessProfileId: null, catalogItemId: 'item',
    publishedContent: published({ item_key: 'item', name: 'Catalog snapshot', short_description: null,
      price_amount: null, price_currency: null, on_request: true, grouping_label: null, display_order: 0,
      available_from: null, available_until: null, offer_version_links: [], media: [] }) };
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
