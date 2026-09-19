import { generateKeyPairSync } from 'node:crypto';
import { prisma } from '../../../foundation/prisma-client';
import { buildPublicExport } from '../../../public-export/builder';
import { SigningKeyProvider } from '../../../public-export/signing';
import { TEST_DATA_MARKER } from '../../../tools/test-seed/map';
import { parseVanakBusinesses } from '../../../tools/test-seed/parse';
import { seedVanakBusinesses } from '../../../tools/test-seed/seed';
import { withdrawVanakBusinesses } from '../../../tools/test-seed/withdraw';
import { assertDisposableDatabase } from '../../core/db-guard';

const { privateKey } = generateKeyPairSync('ed25519');
const signingKeyProvider: SigningKeyProvider = { async privateKey() { return privateKey; } };
const safeEnv = () => ({ ...process.env, MLINO_TEST_SEED_CONFIRM: 'LOCAL_TEST_DATA_ONLY' });

function synthetic(test_id: string, overrides: Record<string, unknown> = {}) {
  return {
    test_id,
    name: `Synthetic ${test_id}`,
    category_fa: 'آزمایشی',
    description: 'Synthetic local test record',
    latitude: 35.7574,
    longitude: 51.4096,
    address_text: 'Synthetic address',
    public_phone: null,
    website: null,
    instagram: null,
    hours: null,
    services: ['Synthetic service'],
    source_url: `https://balad.ir/p/${test_id}`,
    checked_at: '2026-09-19T00:00:00Z',
    ...overrides,
  };
}

describe('S1B test-seed integration', () => {
  beforeAll(async () => assertDisposableDatabase());
  afterAll(async () => prisma.$disconnect());

  test('seeds three ACTIVE published businesses, exports them, remains idempotent, withdraws and archives without deleting rows', async () => {
    const rows = parseVanakBusinesses([
      synthetic('vanak-91', { latitude: null, longitude: null }),
      synthetic('vanak-92', { hours: { شنبه: [['09:00', '17:00']], دوشنبه: [['10:00', '14:00']], جمعه: [] } }),
      synthetic('vanak-93', { services: ['Synthetic service one', 'Synthetic service two'] }),
    ]);
    const env = safeEnv();
    await expect(seedVanakBusinesses(prisma, rows, env)).resolves.toEqual({ created: 3, skipped: 0 });

    const organizations = await prisma.organization.findMany({
      where: { id: { in: ['test-vanak-91', 'test-vanak-92', 'test-vanak-93'] } },
      include: { businessProfiles: true, capabilities: true, identityClaims: true },
      orderBy: { id: 'asc' },
    });
    expect(organizations).toHaveLength(3);
    expect(organizations.flatMap((item) => item.businessProfiles).every((item) => item.lifecycleStatus === 'ACTIVE' && item.publicationStatus === 'PUBLISHED')).toBe(true);
    expect(organizations.flatMap((item) => item.capabilities).every((item) => item.capabilityStatus === 'ACTIVE' && item.confirmationStatus === 'HUMAN_CONFIRMED' && item.publicationStatus === 'PUBLISHED')).toBe(true);

    const exported = await buildPublicExport(prisma, { asOf: new Date(Date.now() + 1000), keyId: 'test-key', signingKeyProvider });
    const records = exported.artifact.records.filter((item) => item.business.organization_id.startsWith('test-vanak-'));
    expect(records).toHaveLength(3);
    expect(records.every((item) => item.business.description?.endsWith(TEST_DATA_MARKER))).toBe(true);
    expect(records.find((item) => item.business.organization_id === 'test-vanak-91')?.business.location).toMatchObject({ latitude: null, longitude: null });
    expect(records.find((item) => item.business.organization_id === 'test-vanak-92')?.business.business_hours).toMatchObject({ timezone: 'Asia/Tehran', weekly: [{ day: 1 }, { day: 6 }] });
    expect(records.find((item) => item.business.organization_id === 'test-vanak-93')?.capabilities).toHaveLength(2);

    const beforeSecondSeed = {
      organizations: await prisma.organization.count(), profiles: await prisma.businessProfile.count(),
      capabilities: await prisma.capability.count(), claims: await prisma.businessIdentityClaim.count(), publications: await prisma.publication.count(),
    };
    await expect(seedVanakBusinesses(prisma, rows, env)).resolves.toEqual({ created: 0, skipped: 3 });
    await expect(Promise.all([
      prisma.organization.count(), prisma.businessProfile.count(), prisma.capability.count(),
      prisma.businessIdentityClaim.count(), prisma.publication.count(),
    ])).resolves.toEqual(Object.values(beforeSecondSeed));

    const beforeWithdraw = {
      organizations: await prisma.organization.count(), profiles: await prisma.businessProfile.count(),
      capabilities: await prisma.capability.count(), claims: await prisma.businessIdentityClaim.count(),
    };
    await withdrawVanakBusinesses(prisma, env);
    const afterWithdraw = await buildPublicExport(prisma, { asOf: new Date(Date.now() + 2000), keyId: 'test-key', signingKeyProvider });
    expect(afterWithdraw.artifact.records.filter((item) => item.business.organization_id.startsWith('test-vanak-'))).toEqual([]);

    const archived = await withdrawVanakBusinesses(prisma, env, true);
    expect(archived.archived).toBe(3);
    expect(await prisma.businessProfile.count({ where: { organizationId: { startsWith: 'test-vanak-' }, lifecycleStatus: 'ARCHIVED' } })).toBe(3);
    expect(await Promise.all([
      prisma.organization.count(), prisma.businessProfile.count(), prisma.capability.count(), prisma.businessIdentityClaim.count(),
    ])).toEqual(Object.values(beforeWithdraw));
  });
});
