import { CapabilityAudience, OfferShape, Prisma } from '@prisma/client';
import { AuthContext, CORE_AUTH_ISSUER } from '../../core/auth-context';
import { BootstrapService } from '../../core/bootstrap-service';
import { BusinessProfileService } from '../../core/business-profile-service';
import { CapabilityService } from '../../core/capability-service';
import { OfferService } from '../../core/offer-service';
import { PlatformIdentityVerifier } from '../../core/platform-identity-verifier';
import { PublicationService } from '../../core/publication-service';
import { prisma } from '../../foundation/prisma-client';
import { assertDisposableDatabase } from './db-guard';

const TEST_PREFIX = `g14a2-${Date.now()}-`;

class FakePlatformIdentityVerifier implements PlatformIdentityVerifier {
  async verify(credential: string) {
    if (credential !== 'platform-token') throw new Error('invalid platform credential');
    return { ref: 'platform:g14a2' };
  }
}

const bootstrap = new BootstrapService(prisma, new FakePlatformIdentityVerifier());
const profiles = new BusinessProfileService(prisma);
const capabilities = new CapabilityService(prisma);
const offers = new OfferService(prisma);
const publications = new PublicationService(prisma);

function contextFor(membership: { id: string; identityProvider: string; externalSubject: string }, organizationId: string): AuthContext {
  return { issuer: CORE_AUTH_ISSUER, organizationId, identityProvider: membership.identityProvider, externalSubject: membership.externalSubject, membershipId: membership.id };
}

async function newOrganization(label: string) {
  const organizationId = `${TEST_PREFIX}${label}-${Math.random().toString(36).slice(2, 8)}`;
  const result = await bootstrap.execute('platform-token', { organizationId, displayName: organizationId, foundingIdentityProvider: 'g14a2-idp', foundingExternalSubject: `owner-${label}` });
  return { organizationId, context: contextFor(result.foundingMembership, organizationId), membership: result.foundingMembership };
}

async function newProfile(label: string, fields: Record<string, unknown> = {}) {
  const owner = await newOrganization(label);
  const profile = await profiles.create(owner.context, { organizationId: owner.organizationId, name: `${label} profile`, ...fields } as never);
  return { ...owner, profile };
}

function publishedContent(value: unknown): Record<string, unknown> {
  return value as Record<string, unknown>;
}

function contentOf(value: unknown): Record<string, unknown> {
  return publishedContent(publishedContent(value).content);
}

async function directPublicationData(fixture: Awaited<ReturnType<typeof newProfile>>, eventKind: 'PUBLISHED' | 'WITHDRAWN', value: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput) {
  return {
    organizationId: fixture.organizationId,
    businessProfileId: fixture.profile.id,
    businessProfileOrganizationId: fixture.organizationId,
    eventKind,
    contentRevision: fixture.profile.contentRevision,
    publishedContent: value,
    performedByMembershipId: fixture.membership.id,
    permissionKey: 'publication.manage',
    gateSnapshot: { policyVersion: 'core-publication-v1' },
    reason: `direct ${eventKind}`,
  } as const;
}

describe('G14a2 published content snapshot', () => {
  beforeAll(async () => assertDisposableDatabase());
  afterAll(async () => prisma.$disconnect());

  test('g14a2-c7-01 PUBLISHED accepts an object and rejects SQL NULL or a non-object', async () => {
    const accepted = await newProfile('c7-01-accepted');
    await expect(publications.publish(accepted.context, 'BUSINESS_PROFILE', accepted.profile.id, 'publish object')).resolves.toMatchObject({ outcome: 'PUBLISHED' });
    const sqlNull = await newProfile('c7-01-null');
    await expect(prisma.publication.create({ data: await directPublicationData(sqlNull, 'PUBLISHED', Prisma.DbNull) })).rejects.toThrow(/publication_published_content_event_kind_check/);
    await expect(prisma.publication.create({ data: await directPublicationData(sqlNull, 'PUBLISHED', { snapshot_version: 'core-publication-snapshot-v1', content: { name: 'valid' } }) })).resolves.toBeTruthy();
    const scalar = await newProfile('c7-01-scalar');
    await expect(prisma.publication.create({ data: await directPublicationData(scalar, 'PUBLISHED', 'not-an-object') })).rejects.toThrow(/publication_published_content_event_kind_check/);
    await expect(prisma.publication.create({ data: await directPublicationData(scalar, 'PUBLISHED', { snapshot_version: 'core-publication-snapshot-v1', content: { name: 'valid' } }) })).resolves.toBeTruthy();
  });

  test('g14a2-c7-02 WITHDRAWN accepts SQL NULL and rejects an object', async () => {
    const accepted = await newProfile('c7-02-accepted');
    await publications.publish(accepted.context, 'BUSINESS_PROFILE', accepted.profile.id, 'publish');
    const withdrawal = await publications.withdraw(accepted.context, 'BUSINESS_PROFILE', accepted.profile.id, 'withdraw');
    if (withdrawal.outcome !== 'WITHDRAWN') throw new Error('expected withdrawal');
    expect(withdrawal.publication.publishedContent).toBeNull();
    const rejected = await newProfile('c7-02-rejected');
    await publications.publish(rejected.context, 'BUSINESS_PROFILE', rejected.profile.id, 'publish');
    await expect(prisma.publication.create({ data: await directPublicationData(rejected, 'WITHDRAWN', { snapshot_version: 'core-publication-snapshot-v1', content: {} }) })).rejects.toThrow(/publication_published_content_event_kind_check/);
    await expect(prisma.publication.create({ data: await directPublicationData(rejected, 'WITHDRAWN', Prisma.DbNull) })).resolves.toBeTruthy();
  });

  test('g14a2-c7-03 snapshots for all targets equal the publish-time allowlists', async () => {
    const owner = await newOrganization('c7-03');
    const profile = await profiles.create(owner.context, { organizationId: owner.organizationId, name: 'Public profile', description: 'Profile description', latitude: 35.123456, longitude: 51.654321, addressText: 'Public address', contactInformation: { public_phone: '100', secret: 'hidden' }, links: { website: 'https://example.test', private: 'hidden' }, businessHours: { monday: '09:00-17:00' } });
    const capability = await capabilities.create(owner.context, { organizationId: owner.organizationId, capabilityKey: 'public-capability', name: 'Capability', shortDescription: 'Capability description', categoryKey: 'not-public', audience: CapabilityAudience.CUSTOMER_FACING });
    const offer = await offers.create(owner.context, { organizationId: owner.organizationId, offerKey: 'public-offer' });
    const version = await offers.createVersion(owner.context, { offerId: offer.id, name: 'Offer version', shortDescription: 'Offer description', offerShape: OfferShape.ITEM, terms: { minimum: 1 }, priceAmount: '25.50', priceCurrency: 'USD', onRequest: false, validFrom: new Date('2026-09-14T10:00:00.000Z'), validUntil: new Date('2026-10-14T10:00:00.000Z') });
    await offers.linkCapability(owner.context, { offerVersionId: version.id, capabilityId: capability.id });
    const profileResult = await publications.publish(owner.context, 'BUSINESS_PROFILE', profile.id, 'publish profile');
    const capabilityResult = await publications.publish(owner.context, 'CAPABILITY', capability.id, 'publish capability');
    const offerResult = await publications.publish(owner.context, 'OFFER_VERSION', version.id, 'publish offer');
    if (profileResult.outcome !== 'PUBLISHED' || capabilityResult.outcome !== 'PUBLISHED' || offerResult.outcome !== 'PUBLISHED') throw new Error('expected three publications');
    expect(contentOf(profileResult.publication.publishedContent)).toEqual({ name: 'Public profile', description: 'Profile description', latitude: 35.123456, longitude: 51.654321, address_text: 'Public address', contact_information: { public_phone: '100' }, links: { website: 'https://example.test' }, business_hours: { monday: '09:00-17:00' } });
    expect(contentOf(capabilityResult.publication.publishedContent)).toEqual({ capability_key: 'public-capability', name: 'Capability', short_description: 'Capability description', audience: 'CUSTOMER_FACING' });
    expect(contentOf(offerResult.publication.publishedContent)).toEqual({ offer_id: offer.id, version_number: 1, name: 'Offer version', short_description: 'Offer description', offer_shape: 'ITEM', terms: { minimum: 1 }, price_amount: '25.5', price_currency: 'USD', on_request: false, valid_from: '2026-09-14T10:00:00.000Z', valid_until: '2026-10-14T10:00:00.000Z', capability_link_ids: [capability.id] });
  });

  test('g14a2-c7-04 post-publish edits do not change stored profile or capability snapshots', async () => {
    const owner = await newOrganization('c7-04');
    const profile = await profiles.create(owner.context, { organizationId: owner.organizationId, name: 'Before profile' });
    const capability = await capabilities.create(owner.context, { organizationId: owner.organizationId, capabilityKey: 'before-key', name: 'Before capability', categoryKey: 'test' });
    const p = await publications.publish(owner.context, 'BUSINESS_PROFILE', profile.id, 'publish profile');
    const c = await publications.publish(owner.context, 'CAPABILITY', capability.id, 'publish capability');
    if (p.outcome !== 'PUBLISHED' || c.outcome !== 'PUBLISHED') throw new Error('expected publications');
    const profileSnapshot = p.publication.publishedContent;
    const capabilitySnapshot = c.publication.publishedContent;
    await profiles.updatePublicFields(owner.context, profile.id, { name: 'After profile' });
    await capabilities.updatePublicFields(owner.context, capability.id, { name: 'After capability' });
    expect((await prisma.publication.findUniqueOrThrow({ where: { id: p.publication.id } })).publishedContent).toEqual(profileSnapshot);
    expect((await prisma.publication.findUniqueOrThrow({ where: { id: c.publication.id } })).publishedContent).toEqual(capabilitySnapshot);
  });

  test('g14a2-c7-05 REPLACED writes a NULL withdrawal before the new version snapshot', async () => {
    const owner = await newOrganization('c7-05');
    const offer = await offers.create(owner.context, { organizationId: owner.organizationId, offerKey: 'replace-offer' });
    const first = await offers.createVersion(owner.context, { offerId: offer.id, name: 'First', offerShape: OfferShape.ITEM, onRequest: true, validFrom: new Date('2026-01-01T00:00:00.000Z') });
    const second = await offers.createVersion(owner.context, { offerId: offer.id, name: 'Second', offerShape: OfferShape.ITEM, onRequest: true, validFrom: new Date('2026-02-01T00:00:00.000Z') });
    await publications.publish(owner.context, 'OFFER_VERSION', first.id, 'publish first');
    const result = await publications.publish(owner.context, 'OFFER_VERSION', second.id, 'replace first');
    expect(result.outcome).toBe('REPLACED');
    if (result.outcome !== 'REPLACED') throw new Error('expected replacement');
    expect(result.withdrawnPublication.eventKind).toBe('WITHDRAWN');
    expect(result.withdrawnPublication.publishedContent).toBeNull();
    expect(result.publication.eventKind).toBe('PUBLISHED');
    expect(contentOf(result.publication.publishedContent).name).toBe('Second');
    expect(result.withdrawnPublication.occurredAt.getTime()).toBeLessThanOrEqual(result.publication.occurredAt.getTime());
  });

  test('g14a2-c7-06 ALREADY_PUBLISHED inserts no publication or snapshot', async () => {
    const fixture = await newProfile('c7-06');
    await publications.publish(fixture.context, 'BUSINESS_PROFILE', fixture.profile.id, 'first');
    const count = await prisma.publication.count({ where: { organizationId: fixture.organizationId } });
    await expect(publications.publish(fixture.context, 'BUSINESS_PROFILE', fixture.profile.id, 'again')).resolves.toMatchObject({ outcome: 'ALREADY_PUBLISHED' });
    expect(await prisma.publication.count({ where: { organizationId: fixture.organizationId } })).toBe(count);
  });

  test('g14a2-c7-07 publication immutability rejects published_content UPDATE', async () => {
    const fixture = await newProfile('c7-07');
    const result = await publications.publish(fixture.context, 'BUSINESS_PROFILE', fixture.profile.id, 'publish');
    if (result.outcome !== 'PUBLISHED') throw new Error('expected publication');
    await expect(prisma.publication.update({ where: { id: result.publication.id }, data: { publishedContent: { snapshot_version: 'core-publication-snapshot-v1', content: { name: 'tampered' } } } })).rejects.toThrow(/publications are append-only/);
  });

  test('g14a2-c7-08 allowlists exclude internal and whole-row fields', async () => {
    const fixture = await newProfile('c7-08', { contactInformation: { public_email: 'public@example.test', password: 'never' }, links: { public_social: ['https://example.test/public'], token: 'never' } });
    const result = await publications.publish(fixture.context, 'BUSINESS_PROFILE', fixture.profile.id, 'publish');
    if (result.outcome !== 'PUBLISHED') throw new Error('expected publication');
    const serialized = JSON.stringify(result.publication.publishedContent);
    for (const forbidden of ['password', 'token', 'membership', 'grant', 'actor', 'claim', 'evidence', 'publication_status', 'content_revision']) expect(serialized).not.toContain(forbidden);
  });

  test('g14a2-c7-09 empty-database migration is recorded and the CHECK is validated', async () => {
    const migration = await prisma.$queryRaw<Array<{ finished_at: Date | null; rolled_back_at: Date | null }>>`SELECT finished_at, rolled_back_at FROM _prisma_migrations WHERE migration_name = '20260914010000_add_publication_published_content'`;
    const constraint = await prisma.$queryRaw<Array<{ convalidated: boolean }>>`SELECT convalidated FROM pg_constraint WHERE conname = 'publication_published_content_event_kind_check'`;
    expect(migration).toHaveLength(1);
    expect(migration[0].finished_at).not.toBeNull();
    expect(migration[0].rolled_back_at).toBeNull();
    expect(constraint).toEqual([{ convalidated: true }]);
  });

  test('g14a2-c7-10 preflight SQL rejects a non-empty publications table before DDL continuation', async () => {
    const fixture = await newProfile('c7-10');
    await publications.publish(fixture.context, 'BUSINESS_PROFILE', fixture.profile.id, 'seed');
    await expect(prisma.$executeRawUnsafe(`DO $$ BEGIN IF EXISTS (SELECT 1 FROM publications LIMIT 1) THEN RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'published_content migration requires an empty publications table'; END IF; END; $$;`)).rejects.toBeTruthy();
    const column = await prisma.$queryRaw<Array<{ data_type: string }>>`SELECT data_type FROM information_schema.columns WHERE table_name = 'publications' AND column_name = 'published_content'`;
    expect(column).toEqual([{ data_type: 'jsonb' }]);
  });

  test('g14a2-c7-11 serialization is deterministic for decimals timestamps JSON and link ids', async () => {
    const owner = await newOrganization('c7-11');
    const first = await capabilities.create(owner.context, { organizationId: owner.organizationId, capabilityKey: 'z-link', name: 'Z', categoryKey: 'test' });
    const second = await capabilities.create(owner.context, { organizationId: owner.organizationId, capabilityKey: 'a-link', name: 'A', categoryKey: 'test' });
    const offer = await offers.create(owner.context, { organizationId: owner.organizationId, offerKey: 'serialization' });
    const version = await offers.createVersion(owner.context, { offerId: offer.id, name: 'Serialized', offerShape: OfferShape.BUNDLE, terms: { version: 1 }, priceAmount: '10.20', priceCurrency: 'EUR', validFrom: new Date('2026-03-01T01:02:03.456Z'), validUntil: null });
    await offers.linkCapability(owner.context, { offerVersionId: version.id, capabilityId: first.id });
    await offers.linkCapability(owner.context, { offerVersionId: version.id, capabilityId: second.id });
    const result = await publications.publish(owner.context, 'OFFER_VERSION', version.id, 'publish');
    if (result.outcome !== 'PUBLISHED') throw new Error('expected publication');
    const content = contentOf(result.publication.publishedContent);
    expect(content.price_amount).toBe('10.2');
    expect(content.valid_from).toBe('2026-03-01T01:02:03.456Z');
    expect(content.valid_until).toBeNull();
    expect(content.terms).toEqual({ version: 1 });
    expect(content.capability_link_ids).toEqual([first.id, second.id].sort());
  });

  test('g14a2-c7-12 JSON null is rejected for both PUBLISHED and WITHDRAWN', async () => {
    const pending = await newProfile('c7-12-published');
    await expect(prisma.publication.create({ data: await directPublicationData(pending, 'PUBLISHED', Prisma.JsonNull) })).rejects.toThrow(/publication_published_content_event_kind_check/);
    await expect(prisma.publication.create({ data: await directPublicationData(pending, 'PUBLISHED', { snapshot_version: 'core-publication-snapshot-v1', content: { name: 'valid' } }) })).resolves.toBeTruthy();
    const active = await newProfile('c7-12-withdrawn');
    await publications.publish(active.context, 'BUSINESS_PROFILE', active.profile.id, 'publish');
    await expect(prisma.publication.create({ data: await directPublicationData(active, 'WITHDRAWN', Prisma.JsonNull) })).rejects.toThrow(/publication_published_content_event_kind_check/);
    await expect(prisma.publication.create({ data: await directPublicationData(active, 'WITHDRAWN', Prisma.DbNull) })).resolves.toBeTruthy();
  });

  test('g14a2-c7-13 snapshot envelope has no redundant target id or revision keys', async () => {
    const fixture = await newProfile('c7-13');
    const result = await publications.publish(fixture.context, 'BUSINESS_PROFILE', fixture.profile.id, 'publish');
    if (result.outcome !== 'PUBLISHED') throw new Error('expected publication');
    expect(Object.keys(publishedContent(result.publication.publishedContent)).sort()).toEqual(['content', 'snapshot_version']);
  });

  test('g14a2-oq4-a-prime sanitizes contact and links but preserves business_hours and terms as-is', async () => {
    const owner = await newOrganization('oq4');
    const profile = await profiles.create(owner.context, { organizationId: owner.organizationId, name: 'OQ4', contactInformation: { public_phone: '100', public_email: 'public@example.test', private_phone: 'secret' }, links: { website: 'https://example.test', public_social: ['https://social.example.test'], private_admin: 'secret' }, businessHours: { custom: { monday: ['09:00', '17:00'] } } });
    const profileResult = await publications.publish(owner.context, 'BUSINESS_PROFILE', profile.id, 'publish');
    const offer = await offers.create(owner.context, { organizationId: owner.organizationId, offerKey: 'oq4-offer' });
    const version = await offers.createVersion(owner.context, { offerId: offer.id, name: 'OQ4 offer', offerShape: OfferShape.CAMPAIGN, terms: { custom: { minimum: 2 } }, onRequest: true, validFrom: new Date('2026-01-01T00:00:00.000Z') });
    const offerResult = await publications.publish(owner.context, 'OFFER_VERSION', version.id, 'publish');
    if (profileResult.outcome !== 'PUBLISHED' || offerResult.outcome !== 'PUBLISHED') throw new Error('expected publications');
    expect(contentOf(profileResult.publication.publishedContent)).toMatchObject({ contact_information: { public_phone: '100', public_email: 'public@example.test' }, links: { website: 'https://example.test', public_social: ['https://social.example.test'] }, business_hours: { custom: { monday: ['09:00', '17:00'] } } });
    expect(JSON.stringify(profileResult.publication.publishedContent)).not.toContain('private_');
    expect(contentOf(offerResult.publication.publishedContent).terms).toEqual({ custom: { minimum: 2 } });
  });
});
