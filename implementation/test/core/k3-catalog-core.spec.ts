import { OfferShape } from '@prisma/client';
import { prisma } from '../../foundation/prisma-client';
import { AuthContext, CORE_AUTH_ISSUER } from '../../core/auth-context';
import { BootstrapService } from '../../core/bootstrap-service';
import { BusinessProfileService } from '../../core/business-profile-service';
import { CatalogItemService } from '../../core/catalog-item-service';
import { CoreDomainError } from '../../core/errors';
import { OfferService } from '../../core/offer-service';
import { PlatformIdentityVerifier } from '../../core/platform-identity-verifier';
import { PublicationService } from '../../core/publication-service';
import { CORE_PERMISSION_KEYS } from '../../core/permission-registry';
import { assertDisposableDatabase } from './db-guard';

const prefix = `k3-${Date.now()}-`;
class TestVerifier implements PlatformIdentityVerifier {
  async verify(credential: string) {
    if (credential !== 'k3-test') throw new Error('invalid test credential');
    return { ref: 'platform:k3-test' };
  }
}
const bootstrap = new BootstrapService(prisma, new TestVerifier());
const catalog = new CatalogItemService(prisma);
const profiles = new BusinessProfileService(prisma);
const offers = new OfferService(prisma);
const publications = new PublicationService(prisma);
const code = (action: Promise<unknown>, expected: CoreDomainError['code']) => expect(action).rejects.toMatchObject({ code: expected });

async function organization(label: string) {
  const organizationId = `${prefix}${label}-${Math.random().toString(36).slice(2, 8)}`;
  const result = await bootstrap.execute('k3-test', { organizationId, displayName: label, foundingIdentityProvider: 'k3-idp', foundingExternalSubject: `${label}-owner` });
  const member = result.foundingMembership;
  const context: AuthContext = { issuer: CORE_AUTH_ISSUER, organizationId, membershipId: member.id, identityProvider: member.identityProvider, externalSubject: member.externalSubject };
  return { organizationId, context, member };
}

async function item(label: string) {
  const owner = await organization(label);
  const record = await catalog.create(owner.context, { organizationId: owner.organizationId, itemKey: `${label}-item`, name: 'Catalog item', onRequest: true });
  return { ...owner, record };
}

function media(position: number, digit: string) {
  const sha256 = digit.repeat(64);
  return { position, sha256, objectPath: `media/sha256/${digit}${digit}/${sha256}.webp`, mediaType: 'WEBP' as const, byteSize: 100000, widthPx: 1200, heightPx: 900, altText: 'Test image', placeholderKind: 'mlino.blurhash.v1', placeholderValue: 'test-placeholder' };
}

describe('K3 catalog Core database contracts (disposable 5499 only)', () => {
  beforeAll(async () => assertDisposableDatabase());
  afterAll(async () => prisma.$disconnect());

  test('k3 founding bootstrap appends catalog_item.manage without changing existing key order', async () => {
    expect(CORE_PERMISSION_KEYS.at(-1)).toBe('catalog_item.manage');
    const owner = await organization('bootstrap');
    const grants = await prisma.permissionGrant.findMany({ where: { organizationId: owner.organizationId, membershipId: owner.member.id, grantStatus: 'ACTIVE' } });
    expect(grants.map((grant) => grant.permissionKey)).toContain('catalog_item.manage');
    expect(new Set(grants.map((grant) => grant.permissionKey)).size).toBe(CORE_PERMISSION_KEYS.length);
  });

  test('k3 tenant composite FK rejects cross-organization media, link and publication', async () => {
    const a = await item('tenant-a');
    const b = await item('tenant-b');
    await code(catalog.addMedia(b.context, a.record.id, media(0, 'a')), 'VALIDATION_FAILED');
    await expect(prisma.catalogItemMedia.create({ data: { organizationId: b.organizationId, catalogItemId: a.record.id, ...media(0, 'b') } })).rejects.toThrow();
    const offer = await offers.create(b.context, { organizationId: b.organizationId, offerKey: 'cross-offer' });
    const version = await offers.createVersion(b.context, { offerId: offer.id, name: 'V1', offerShape: OfferShape.ITEM, validFrom: new Date(), onRequest: true });
    await code(offers.linkCatalogItem(b.context, { offerVersionId: version.id, catalogItemId: a.record.id }), 'VALIDATION_FAILED');
    await expect(prisma.offerVersionCatalogItem.create({ data: { organizationId: b.organizationId, offerVersionId: version.id, catalogItemId: a.record.id } })).rejects.toThrow();
    await expect(prisma.publication.create({ data: { organizationId: b.organizationId, catalogItemId: a.record.id, catalogItemOrganizationId: b.organizationId, eventKind: 'PUBLISHED', contentRevision: 1, publishedContent: { snapshot_version: 'core-publication-snapshot-v1', content: {} }, performedByMembershipId: b.member.id, permissionKey: 'publication.manage', gateSnapshot: {}, reason: 'cross-tenant' } })).rejects.toThrow();
  });

  test('k3 permission gates deny catalog mutation and publication without active grants', async () => {
    const a = await item('permissions');
    await prisma.permissionGrant.updateMany({ where: { organizationId: a.organizationId, permissionKey: 'catalog_item.manage' }, data: { grantStatus: 'REVOKED', revokedAt: new Date(), revocationReason: 'test', revokedByMembershipId: a.member.id, revokedByOrganizationId: a.organizationId } });
    await code(catalog.updatePublicFields(a.context, a.record.id, { name: 'Denied' }), 'AUTHORIZATION_DENIED');
    await code(catalog.activate(a.context, a.record.id), 'AUTHORIZATION_DENIED');
    await code(catalog.addMedia(a.context, a.record.id, media(0, 'c')), 'AUTHORIZATION_DENIED');
    await prisma.permissionGrant.updateMany({ where: { organizationId: a.organizationId, permissionKey: 'publication.manage' }, data: { grantStatus: 'REVOKED', revokedAt: new Date(), revocationReason: 'test', revokedByMembershipId: a.member.id, revokedByOrganizationId: a.organizationId } });
    await code(publications.publish(a.context, 'CATALOG_ITEM', a.record.id, 'deny'), 'AUTHORIZATION_DENIED');
  });

  test('k3 lifecycle audit allows DRAFT ACTIVE RETIRED only and requires withdrawal', async () => {
    const a = await item('lifecycle');
    expect(a.record.lifecycleStatus).toBe('DRAFT');
    await code(catalog.retire(a.context, a.record.id, 'early'), 'CONFLICT');
    const active = await catalog.activate(a.context, a.record.id);
    expect(active.activatedByMembershipId).toBe(a.member.id);
    await code(catalog.activate(a.context, a.record.id), 'CONFLICT');
    await publications.publish(a.context, 'CATALOG_ITEM', a.record.id, 'publish');
    await code(catalog.retire(a.context, a.record.id, 'still public'), 'CONFLICT');
    await publications.withdraw(a.context, 'CATALOG_ITEM', a.record.id, 'withdraw');
    const retired = await catalog.retire(a.context, a.record.id, 'end of test');
    expect(retired.retiredByMembershipId).toBe(a.member.id);
    await code(catalog.activate(a.context, a.record.id), 'CONFLICT');
  });

  test('k3 price, availability, grouping and public revision checks fail closed', async () => {
    const a = await item('checks');
    await code(catalog.create(a.context, { organizationId: a.organizationId, itemKey: 'bad-price', name: 'Bad', onRequest: false }), 'VALIDATION_FAILED');
    await code(catalog.create(a.context, { organizationId: a.organizationId, itemKey: 'bad-range', name: 'Bad', onRequest: true, availableFrom: new Date('2026-02-01'), availableUntil: new Date('2026-01-01') }), 'VALIDATION_FAILED');
    await catalog.updatePublicFields(a.context, a.record.id, { availableFrom: new Date('2026-02-01') });
    await code(catalog.updatePublicFields(a.context, a.record.id, { availableUntil: new Date('2026-01-01') }), 'VALIDATION_FAILED');
    expect((await prisma.catalogItem.findUniqueOrThrow({ where: { id: a.record.id } })).availableUntil).toBeNull();
    await code(catalog.updatePublicFields(a.context, a.record.id, { groupingLabel: '<script>' }), 'VALIDATION_FAILED');
    const updated = await catalog.updatePublicFields(a.context, a.record.id, { name: 'Renamed' });
    expect(updated.contentRevision).toBe(3);
    await expect(prisma.catalogItem.update({ where: { id: a.record.id }, data: { contentRevision: 4 } })).rejects.toThrow();
  });

  test('k3 media caps, order, revisions and immutable metadata', async () => {
    const a = await item('media');
    const first = await catalog.addMedia(a.context, a.record.id, media(0, 'a'));
    const second = await catalog.addMedia(a.context, a.record.id, media(1, 'b'));
    expect((await prisma.catalogItem.findUniqueOrThrow({ where: { id: a.record.id } })).contentRevision).toBe(3);
    await catalog.reorderMedia(a.context, a.record.id, [second.id, first.id]);
    expect((await prisma.catalogItemMedia.findMany({ where: { catalogItemId: a.record.id }, orderBy: { position: 'asc' } })).map((row) => row.id)).toEqual([second.id, first.id]);
    await expect(prisma.catalogItemMedia.update({ where: { id: first.id }, data: { altText: 'forged' } })).rejects.toThrow();
    await code(catalog.addMedia(a.context, a.record.id, { ...media(2, 'c'), byteSize: 1500001 }), 'VALIDATION_FAILED');
    await code(catalog.addMedia(a.context, a.record.id, { ...media(2, 'c'), widthPx: 100 }), 'VALIDATION_FAILED');
    await code(catalog.addMedia(a.context, a.record.id, { ...media(2, 'c'), placeholderKind: 'other' }), 'VALIDATION_FAILED');
    await code(catalog.addMedia(a.context, a.record.id, media(8, 'c')), 'VALIDATION_FAILED');
    await expect(prisma.catalogItemMedia.create({ data: { organizationId: a.organizationId, catalogItemId: a.record.id, ...media(8, 'c') } })).rejects.toThrow();
    await catalog.removeMedia(a.context, a.record.id, first.id);
    expect(await prisma.catalogItemMedia.count({ where: { catalogItemId: a.record.id } })).toBe(1);
  });

  test('k3 concurrent media additions serialize under the catalog parent byte budget lock', async () => {
    const a = await item('race');
    for (let index = 0; index < 4; index += 1) await catalog.addMedia(a.context, a.record.id, { ...media(index, String(index)), byteSize: 1500000 });
    const attempts = await Promise.allSettled([catalog.addMedia(a.context, a.record.id, { ...media(4, 'a'), byteSize: 1500000 }), catalog.addMedia(a.context, a.record.id, { ...media(5, 'b'), byteSize: 1500000 })]);
    expect(attempts.filter((attempt) => attempt.status === 'fulfilled').length).toBe(1);
    expect(await prisma.catalogItemMedia.count({ where: { catalogItemId: a.record.id } })).toBe(5);
  });

  test('k3 concurrent reorder operations preserve unique positions and all media', async () => {
    const a = await item('reorder-race');
    const records = [];
    for (const [position, digit] of ['a', 'b', 'c'].entries()) records.push(await catalog.addMedia(a.context, a.record.id, media(position, digit)));
    const results = await Promise.allSettled([
      catalog.reorderMedia(a.context, a.record.id, [records[1].id, records[2].id, records[0].id]),
      catalog.reorderMedia(a.context, a.record.id, [records[2].id, records[0].id, records[1].id]),
    ]);
    expect(results.every((result) => result.status === 'fulfilled')).toBe(true);
    const rows = await prisma.catalogItemMedia.findMany({ where: { catalogItemId: a.record.id }, orderBy: { position: 'asc' } });
    expect(rows.map((row) => row.position)).toEqual([0, 1, 2]);
    expect(new Set(rows.map((row) => row.id))).toEqual(new Set(records.map((row) => row.id)));
  });

  test('k3 offer catalog link bumps revision and becomes immutable after first publish', async () => {
    const a = await item('link');
    const offer = await offers.create(a.context, { organizationId: a.organizationId, offerKey: 'linked-offer' });
    const version = await offers.createVersion(a.context, { offerId: offer.id, name: 'V1', offerShape: OfferShape.ITEM, validFrom: new Date(), onRequest: true });
    await offers.linkCatalogItem(a.context, { offerVersionId: version.id, catalogItemId: a.record.id });
    expect((await prisma.catalogItem.findUniqueOrThrow({ where: { id: a.record.id } })).contentRevision).toBe(2);
    await offers.unlinkCatalogItem(a.context, { offerVersionId: version.id, catalogItemId: a.record.id });
    await offers.linkCatalogItem(a.context, { offerVersionId: version.id, catalogItemId: a.record.id });
    await publications.publish(a.context, 'OFFER_VERSION', version.id, 'first publish');
    await code(offers.unlinkCatalogItem(a.context, { offerVersionId: version.id, catalogItemId: a.record.id }), 'CONFLICT');
  });

  test('k3 four-target XOR, catalog pair and direct projection guard reject forged writes', async () => {
    const a = await item('integrity');
    const fields = { organizationId: a.organizationId, performedByMembershipId: a.member.id, permissionKey: 'publication.manage', gateSnapshot: {}, reason: 'forgery', eventKind: 'PUBLISHED' as const, contentRevision: 1, publishedContent: { snapshot_version: 'core-publication-snapshot-v1', content: {} } };
    const profile = await profiles.create(a.context, { organizationId: a.organizationId, name: 'Profile' });
    await expect(prisma.publication.create({ data: { ...fields, catalogItemId: a.record.id, catalogItemOrganizationId: a.organizationId, businessProfileId: profile.id, businessProfileOrganizationId: a.organizationId } })).rejects.toThrow();
    await expect(prisma.publication.create({ data: { ...fields, catalogItemOrganizationId: a.organizationId } })).rejects.toThrow();
    await expect(prisma.catalogItem.update({ where: { id: a.record.id }, data: { publicationStatus: 'PUBLISHED', publishedContentRevision: 1 } })).rejects.toThrow();
  });

  test('k3 publish idempotent republish withdraw and exact snapshot allowlist', async () => {
    const a = await item('publish');
    await catalog.activate(a.context, a.record.id);
    await catalog.addMedia(a.context, a.record.id, media(0, 'd'));
    const first = await publications.publish(a.context, 'CATALOG_ITEM', a.record.id, 'first');
    expect(first.outcome).toBe('PUBLISHED');
    expect((await publications.publish(a.context, 'CATALOG_ITEM', a.record.id, 'repeat')).outcome).toBe('ALREADY_PUBLISHED');
    const published = await prisma.publication.findFirstOrThrow({ where: { catalogItemId: a.record.id, eventKind: 'PUBLISHED' } });
    const snapshot = published.publishedContent as { snapshot_version: string; content: Record<string, unknown> };
    expect(Object.keys(snapshot.content).sort()).toEqual(['available_from', 'available_until', 'display_order', 'grouping_label', 'item_key', 'media', 'name', 'offer_version_links', 'on_request', 'price_amount', 'price_currency', 'short_description']);
    expect((snapshot.content.media as Array<{ sha256: string }>)[0].sha256).toBe('d'.repeat(64));
    await catalog.updatePublicFields(a.context, a.record.id, { name: 'Second' });
    expect((await publications.publish(a.context, 'CATALOG_ITEM', a.record.id, 'republish')).outcome).toBe('PUBLISHED');
    expect((await publications.withdraw(a.context, 'CATALOG_ITEM', a.record.id, 'withdraw')).outcome).toBe('WITHDRAWN');
    await code(publications.withdraw(a.context, 'CATALOG_ITEM', a.record.id, 'again'), 'CONFLICT');
    expect(await prisma.publication.count({ where: { catalogItemId: a.record.id } })).toBe(3);
  });
});
