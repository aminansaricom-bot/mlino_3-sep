import { prisma } from '../../foundation/prisma-client';
import { AuthContext, CORE_AUTH_ISSUER } from '../../core/auth-context';
import { BootstrapService } from '../../core/bootstrap-service';
import { CatalogItemService } from '../../core/catalog-item-service';
import { PlatformIdentityVerifier } from '../../core/platform-identity-verifier';
import { PublicationService } from '../../core/publication-service';
import { buildPublicCatalogExport } from '../../public-export/catalog-builder';
import { PublicBusinessExportV1 } from '../../public-export/builder';
import { assertDisposableDatabase } from '../core/db-guard';
import { generateKeyPairSync } from 'node:crypto';

class Verifier implements PlatformIdentityVerifier {
  async verify() { return { ref: 'platform:k4-test' }; }
}
const { privateKey } = generateKeyPairSync('ed25519');
const bootstrap = new BootstrapService(prisma, new Verifier());
const catalog = new CatalogItemService(prisma);
const publications = new PublicationService(prisma);

describe('K4 catalog builder with disposable PostgreSQL 5499', () => {
  beforeAll(async () => assertDisposableDatabase());
  afterAll(async () => prisma.$disconnect());

  test('published snapshot stays stable when live item changes and withdraw hides it', async () => {
    const organizationId = `k4-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const result = await bootstrap.execute('test', { organizationId, displayName: 'K4 test',
      foundingIdentityProvider: 'k4', foundingExternalSubject: organizationId });
    const member = result.foundingMembership;
    const context: AuthContext = { issuer: CORE_AUTH_ISSUER, organizationId, membershipId: member.id,
      identityProvider: member.identityProvider, externalSubject: member.externalSubject };
    const item = await catalog.create(context, { organizationId, itemKey: 'first', name: 'Published name', onRequest: true });
    await catalog.activate(context, item.id);
    await publications.publish(context, 'CATALOG_ITEM', item.id, 'k4 test');
    await catalog.updatePublicFields(context, item.id, { name: 'Live edit stays hidden' });
    const asOf = new Date();
    const business = { contract_version: 'mlino.v2.public-business.v1', generated_at: asOf.toISOString(),
      snapshot_id: 'sha256:k4-test-business', signature: { algorithm: 'Ed25519', key_id: 'test', value: '' },
      records: [{ business: { organization_id: organizationId, publication_id: 'test-business-publication' }, offers: [] }] } as unknown as PublicBusinessExportV1;
    const build = async (now: Date, base: PublicBusinessExportV1) => buildPublicCatalogExport(prisma, { asOf: now, keyId: 'test',
      signingKeyProvider: { privateKey: async () => privateKey }, businessArtifact: base });
    const first = await build(asOf, business);
    expect(first.artifact.records[0].items[0].name).toBe('Published name');
    expect(first.bytes.toString()).not.toContain('Live edit stays hidden');
    await publications.withdraw(context, 'CATALOG_ITEM', item.id, 'k4 test');
    const later = new Date();
    const withdrawn = await build(later, { ...business, generated_at: later.toISOString() });
    expect(withdrawn.artifact.records).toEqual([]);
  });
});
