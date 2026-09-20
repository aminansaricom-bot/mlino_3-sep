import { generateKeyPairSync } from 'node:crypto';
import { prisma } from '../../../foundation/prisma-client';
import { buildPublicExport } from '../../../public-export/builder';
import { SigningKeyProvider } from '../../../public-export/signing';
import { parseTestOffers, seedTestOffers } from '../../../tools/test-seed/offers';
import { parseVanakBusinesses } from '../../../tools/test-seed/parse';
import { seedVanakBusinesses } from '../../../tools/test-seed/seed';
import { withdrawVanakBusinesses } from '../../../tools/test-seed/withdraw';
import { assertDisposableDatabase } from '../../core/db-guard';

const { privateKey } = generateKeyPairSync('ed25519');
const signingKeyProvider: SigningKeyProvider = { async privateKey() { return privateKey; } };
const env = () => ({ ...process.env, MLINO_TEST_SEED_CONFIRM: 'LOCAL_TEST_DATA_ONLY' });

function business(test_id: string, services = ['خدمت ساختگی']) {
  return {
    test_id, name: `کسب‌وکار آزمایشی ${test_id}`, category_fa: 'آزمایشی', description: 'رکورد ساختگی',
    latitude: 35.7574, longitude: 51.4096, address_text: 'نشانی ساختگی', public_phone: null,
    website: null, instagram: null, hours: null, services, source_url: `https://balad.ir/p/${test_id}`,
    checked_at: '2026-09-20T00:00:00Z',
  };
}

function offer(test_id: string, suffix: string, overrides: Record<string, unknown> = {}) {
  return {
    test_id, offer_key: `test-ui-vanak-${suffix}`, name: `پیشنهاد آزمایشی ${suffix}`,
    short_description: `شرح آزمایشی ${suffix}`, offer_shape: 'ITEM', valid_from: '2026-01-01T00:00:00Z',
    valid_until: '2099-01-01T00:00:00Z', ...overrides,
  };
}

describe('U3 sample offers through official Core services', () => {
  beforeAll(async () => assertDisposableDatabase());
  afterAll(async () => prisma.$disconnect());

  test('seeds four marked offers, exports only three active offers, is idempotent and withdraws without decreasing rows', async () => {
    const testEnv = env();
    const organizationIds = ['test-vanak-81', 'test-vanak-82', 'test-vanak-83'];
    await seedVanakBusinesses(prisma, parseVanakBusinesses([
      business('vanak-81'), business('vanak-82', ['خدمت یک', 'خدمت دو']), business('vanak-83'),
    ]), testEnv);
    const rows = parseTestOffers([
      offer('vanak-81', 'request', { on_request: true }),
      offer('vanak-81', 'priced', { price_amount: 125000, price_currency: 'IRR' }),
      offer('vanak-82', 'linked', { capability_index: 1, on_request: true }),
      offer('vanak-83', 'expired', { on_request: true, valid_until: '2026-02-01T00:00:00Z' }),
    ]);
    await expect(seedTestOffers(prisma, rows, testEnv)).resolves.toEqual({ created: 4, skipped: 0 });

    // asOf must follow the publications this test just created; a hardcoded date makes the test clock-dependent.
    const exported = await buildPublicExport(prisma, { asOf: new Date(Date.now() + 1_000), keyId: 'test-key', signingKeyProvider });
    const records = exported.artifact.records.filter((item) => organizationIds.includes(item.business.organization_id));
    const visible = records.flatMap((item) => item.offers);
    expect(visible).toHaveLength(3);
    expect(visible.some((item) => item.name.includes('expired'))).toBe(false);
    expect(visible.find((item) => item.name.includes('request'))).toMatchObject({ on_request: true, price_amount: null, price_currency: null });
    expect(visible.find((item) => item.name.includes('priced'))).toMatchObject({ price_amount: '125000', price_currency: 'IRR' });
    expect(visible.find((item) => item.name.includes('linked'))?.capability_links).toHaveLength(1);

    const beforeSecond = { offers: await prisma.offer.count({ where: { organizationId: { in: organizationIds } } }), versions: await prisma.offerVersion.count({ where: { organizationId: { in: organizationIds } } }), publications: await prisma.publication.count({ where: { organizationId: { in: organizationIds } } }) };
    await expect(seedTestOffers(prisma, rows, testEnv)).resolves.toEqual({ created: 0, skipped: 4 });
    expect({ offers: await prisma.offer.count({ where: { organizationId: { in: organizationIds } } }), versions: await prisma.offerVersion.count({ where: { organizationId: { in: organizationIds } } }), publications: await prisma.publication.count({ where: { organizationId: { in: organizationIds } } }) }).toEqual(beforeSecond);

    const beforeWithdraw = { organizations: await prisma.organization.count({ where: { id: { in: organizationIds } } }), profiles: await prisma.businessProfile.count({ where: { organizationId: { in: organizationIds } } }), capabilities: await prisma.capability.count({ where: { organizationId: { in: organizationIds } } }), claims: await prisma.businessIdentityClaim.count({ where: { organizationId: { in: organizationIds } } }), offers: await prisma.offer.count({ where: { organizationId: { in: organizationIds } } }), versions: await prisma.offerVersion.count({ where: { organizationId: { in: organizationIds } } }) };
    await withdrawVanakBusinesses(prisma, testEnv, false, organizationIds);
    const after = await buildPublicExport(prisma, { asOf: new Date(Date.now() + 1_000), keyId: 'test-key', signingKeyProvider });
    expect(after.artifact.records.filter((item) => organizationIds.includes(item.business.organization_id))).toEqual([]);
    expect({ organizations: await prisma.organization.count({ where: { id: { in: organizationIds } } }), profiles: await prisma.businessProfile.count({ where: { organizationId: { in: organizationIds } } }), capabilities: await prisma.capability.count({ where: { organizationId: { in: organizationIds } } }), claims: await prisma.businessIdentityClaim.count({ where: { organizationId: { in: organizationIds } } }), offers: await prisma.offer.count({ where: { organizationId: { in: organizationIds } } }), versions: await prisma.offerVersion.count({ where: { organizationId: { in: organizationIds } } }) }).toEqual(beforeWithdraw);
  });
});
