import { generateKeyPairSync } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { prisma } from '../../../foundation/prisma-client';
import { runPublicExportCli } from '../../../public-export/cli';
import { ExportKeyProvider } from '../../../public-export/cli';
import { parseVanakBusinesses } from '../../../tools/test-seed/parse';
import { seedVanakBusinesses } from '../../../tools/test-seed/seed';
import { parseTestCatalog, seedTestCatalog, withdrawTestCatalog } from '../../../tools/test-seed/catalog';
import { assertDisposableDatabase } from '../../core/db-guard';

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const provider: ExportKeyProvider = { async privateKey() { return privateKey; }, async publicKey() { return publicKey; } };
const safeEnv = () => ({ ...process.env, MLINO_TEST_SEED_CONFIRM: 'LOCAL_TEST_DATA_ONLY' });

describe('K6a catalog seed on disposable PostgreSQL', () => {
  beforeAll(async () => assertDisposableDatabase());
  afterAll(async () => prisma.$disconnect());

  test('grant, create/publish, idempotent rerun, K4 export, withdraw/retire without row deletion', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'mlino-k6a-db-'));
    const store = path.join(root, 'store'); const output = path.join(root, 'output');
    await mkdir(store); await mkdir(output);
    try {
      const business = parseVanakBusinesses([{ test_id: 'vanak-77', name: 'کسب‌وکار (آزمایشی)', category_fa: 'آزمایشی',
        description: 'ساختگی', address_text: 'ساختگی', source_url: 'https://balad.ir/p/k6a', checked_at: '2026-09-22T00:00:00Z',
        latitude: 35.7575, longitude: 51.4098, public_phone: null, website: null, instagram: null,
        hours: null, services: [] }]);
      await seedVanakBusinesses(prisma, business, safeEnv());
      const rows = parseTestCatalog([{ test_id: 'vanak-77', item_key: 'test-ui-vanak-k6a', name: 'قلم (آزمایشی)',
        short_description: 'شرح آزمایشی', price_amount: null, price_currency: null, on_request: true,
        grouping_label: 'آزمایشی', display_order: 0, images: [{ alt_text: 'تصویر آزمایشی' }] }]);
      expect(await seedTestCatalog(prisma, rows, store, safeEnv())).toEqual({ created: 1, skipped: 0, images: 1 });
      expect(await seedTestCatalog(prisma, rows, store, safeEnv())).toEqual({ created: 0, skipped: 1, images: 0 });
      const count = await prisma.catalogItem.count({ where: { organizationId: 'test-vanak-77' } });
      await runPublicExportCli({ db: prisma, keyProvider: provider, env: { MLINO_EXPORT_OUTPUT_DIR: output,
        MLINO_MEDIA_STORE_DIR: store, MLINO_EXPORT_KEY_ID: 'k6a-test', MLINO_EXPORT_AS_OF: new Date().toISOString() }, log: () => undefined });
      const artifact = JSON.parse((await readFile(path.join(output, 'public-catalog.v1.json'))).toString('utf8'));
      expect(artifact.records.find((record: { organization_id: string }) => record.organization_id === 'test-vanak-77')
        ?.items[0]).toMatchObject({ item_key: 'test-ui-vanak-k6a', media: [{ media_type: 'image/png' }] });
      expect(await withdrawTestCatalog(prisma, safeEnv())).toMatchObject({ withdrawn: expect.any(Number), retired: expect.any(Number) });
      expect(await prisma.catalogItem.count({ where: { organizationId: 'test-vanak-77' } })).toBe(count);
      expect(await prisma.catalogItem.findUnique({ where: { organizationId_itemKey: {
        organizationId: 'test-vanak-77', itemKey: 'test-ui-vanak-k6a' } } })).toMatchObject({ lifecycleStatus: 'RETIRED', publicationStatus: 'WITHDRAWN' });
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
