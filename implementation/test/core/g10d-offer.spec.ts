import { CapabilityAudience, OfferShape, PublicationStatus } from '@prisma/client';
import { prisma } from '../../foundation/prisma-client';
import { AuthContext, CORE_AUTH_ISSUER } from '../../core/auth-context';
import { BootstrapService } from '../../core/bootstrap-service';
import { CapabilityService } from '../../core/capability-service';
import { CoreDomainError } from '../../core/errors';
import { mapCoreDatabaseError } from '../../core/error-adapter';
import { OfferService } from '../../core/offer-service';
import { PermissionGrantService } from '../../core/permission-grant-service';
import { PlatformIdentityVerifier } from '../../core/platform-identity-verifier';
import { PublicationService } from '../../core/publication-service';
import { assertDisposableDatabase } from './db-guard';

const TEST_PREFIX = `g10d-${Date.now()}-`;

class FakePlatformIdentityVerifier implements PlatformIdentityVerifier {
  async verify(credential: string) {
    if (credential !== 'platform-token') throw new Error('invalid platform credential');
    return { ref: 'platform:g10d' };
  }
}

const verifier = new FakePlatformIdentityVerifier();
const bootstrap = new BootstrapService(prisma, verifier);
const offers = new OfferService(prisma);
const capabilities = new CapabilityService(prisma);
const publications = new PublicationService(prisma);
const grants = new PermissionGrantService(prisma, verifier);

function contextFor(membership: { id: string; identityProvider: string; externalSubject: string }, organizationId: string): AuthContext {
  return { issuer: CORE_AUTH_ISSUER, organizationId, identityProvider: membership.identityProvider, externalSubject: membership.externalSubject, membershipId: membership.id };
}

async function newOrganization(label: string) {
  const organizationId = `${TEST_PREFIX}${label}-${Math.random().toString(36).slice(2, 8)}`;
  const result = await bootstrap.execute('platform-token', { organizationId, displayName: organizationId, foundingIdentityProvider: 'g10d-idp', foundingExternalSubject: `owner-${label}` });
  return { organizationId, context: contextFor(result.foundingMembership, organizationId), membership: result.foundingMembership };
}

function expectCode(action: Promise<unknown>, code: CoreDomainError['code']) {
  return expect(action).rejects.toMatchObject({ name: 'CoreDomainError', code });
}

async function createOfferFixture(label: string) {
  const organization = await newOrganization(label);
  const offer = await offers.create(organization.context, { organizationId: organization.organizationId, offerKey: `${label}-offer` });
  return { ...organization, offer };
}

async function createVersionFixture(label: string) {
  const fixture = await createOfferFixture(label);
  const version = await offers.createVersion(fixture.context, { offerId: fixture.offer.id, name: 'Version one', offerShape: OfferShape.ITEM, validFrom: new Date('2026-01-01T00:00:00.000Z'), onRequest: true });
  return { ...fixture, version };
}

describe('G10d Core offer and OfferVersion slice', () => {
  beforeAll(async () => assertDisposableDatabase());
  afterAll(async () => prisma.$disconnect());

  test('offer key conflict, allowlists, and lifecycle or publication fields are not settable', async () => {
    const a = await createOfferFixture('allowlist');
    await expectCode(offers.create(a.context, { organizationId: a.organizationId, offerKey: 'allowlist-offer' }), 'CONFLICT');
    await expectCode(offers.create(a.context, { organizationId: a.organizationId, offerKey: 'new', lifecycleStatus: 'RETIRED' } as never), 'VALIDATION_FAILED');
    await expectCode(offers.createVersion(a.context, { offerId: a.offer.id, name: 'Version', offerShape: OfferShape.ITEM, validFrom: new Date(), publicationStatus: PublicationStatus.PUBLISHED } as never), 'VALIDATION_FAILED');
    const version = await offers.createVersion(a.context, { offerId: a.offer.id, name: 'Version', offerShape: OfferShape.ITEM, validFrom: new Date(), onRequest: true });
    const capability = await capabilities.create(a.context, { organizationId: a.organizationId, capabilityKey: 'allowlist-capability', name: 'Capability', categoryKey: 'test', audience: CapabilityAudience.CUSTOMER_FACING });
    await expectCode(offers.linkCapability(a.context, { offerVersionId: version.id, capabilityId: capability.id, forged: true } as never), 'VALIDATION_FAILED');
  });

  test('createVersion numbers versions 1, 2, 3 and concurrent creates get distinct numbers', async () => {
    const a = await createOfferFixture('numbering');
    const input = { offerId: a.offer.id, name: 'Version', offerShape: OfferShape.ITEM, validFrom: new Date('2026-01-01T00:00:00.000Z'), onRequest: true };
    const first = await offers.createVersion(a.context, input);
    const second = await offers.createVersion(a.context, input);
    const third = await offers.createVersion(a.context, input);
    expect([first.versionNumber, second.versionNumber, third.versionNumber]).toEqual([1, 2, 3]);
    const concurrent = await Promise.all([offers.createVersion(a.context, input), offers.createVersion(a.context, input)]);
    expect(new Set(concurrent.map((version) => version.versionNumber))).toEqual(new Set([4, 5]));
  });

  test('price and validity checks map to validation failures', async () => {
    const a = await createOfferFixture('checks');
    await expectCode(offers.createVersion(a.context, { offerId: a.offer.id, name: 'Bad price', offerShape: OfferShape.ITEM, priceAmount: -1, validFrom: new Date() }), 'VALIDATION_FAILED');
    await expectCode(offers.createVersion(a.context, { offerId: a.offer.id, name: 'Bad range', offerShape: OfferShape.ITEM, onRequest: true, validFrom: new Date('2026-02-01T00:00:00.000Z'), validUntil: new Date('2026-01-01T00:00:00.000Z') }), 'VALIDATION_FAILED');
  });

  test('OfferVersion content cannot be updated or deleted', async () => {
    const a = await createVersionFixture('immutable');
    try {
      await prisma.offerVersion.update({ where: { id_organizationId: { id: a.version.id, organizationId: a.organizationId } }, data: { name: 'changed' } });
      throw new Error('expected immutable update to fail');
    } catch (error) {
      expect(mapCoreDatabaseError(error).message).toBe('offer version is immutable');
    }
    try {
      await prisma.offerVersion.delete({ where: { id_organizationId: { id: a.version.id, organizationId: a.organizationId } } });
      throw new Error('expected immutable delete to fail');
    } catch (error) {
      expect(mapCoreDatabaseError(error).message).toBe('offer version is immutable');
    }
  });

  test('capability links work before publication and are blocked after publication or withdrawal', async () => {
    const a = await createVersionFixture('links');
    const capability = await capabilities.create(a.context, { organizationId: a.organizationId, capabilityKey: 'links-capability', name: 'Capability', categoryKey: 'test' });
    await offers.linkCapability(a.context, { offerVersionId: a.version.id, capabilityId: capability.id });
    await offers.unlinkCapability(a.context, { offerVersionId: a.version.id, capabilityId: capability.id });
    await offers.linkCapability(a.context, { offerVersionId: a.version.id, capabilityId: capability.id });
    await publications.publish(a.context, 'OFFER_VERSION', a.version.id, 'publish links version');
    await expectCode(offers.unlinkCapability(a.context, { offerVersionId: a.version.id, capabilityId: capability.id }), 'CONFLICT');
    await publications.withdraw(a.context, 'OFFER_VERSION', a.version.id, 'withdraw links version');
    await expectCode(offers.linkCapability(a.context, { offerVersionId: a.version.id, capabilityId: capability.id }), 'CONFLICT');
  });

  test('OfferVersion publication is idempotent, withdrawable and republishable', async () => {
    const a = await createVersionFixture('publish');
    const grant = await prisma.permissionGrant.findFirstOrThrow({ where: { organizationId: a.organizationId, membershipId: a.membership.id, permissionKey: 'publication.manage', grantStatus: 'ACTIVE' } });
    const first = await publications.publish(a.context, 'OFFER_VERSION', a.version.id, 'publish version');
    expect(first.outcome).toBe('PUBLISHED');
    if (first.outcome !== 'PUBLISHED') throw new Error('expected publication');
    expect(first.publication.contentRevision).toBeNull();
    expect(first.publication.offerVersionId).toBe(a.version.id);
    expect(first.publication.gateSnapshot).toMatchObject({ grantId: grant.id, policyVersion: 'core-publication-v1' });
    await expect(publications.publish(a.context, 'OFFER_VERSION', a.version.id, 'same version')).resolves.toMatchObject({ outcome: 'ALREADY_PUBLISHED' });
    expect(await prisma.publication.count({ where: { organizationId: a.organizationId, offerVersionId: a.version.id } })).toBe(1);
    const withdrawn = await publications.withdraw(a.context, 'OFFER_VERSION', a.version.id, 'withdraw version');
    expect(withdrawn.outcome).toBe('WITHDRAWN');
    if (withdrawn.outcome !== 'WITHDRAWN') throw new Error('expected withdrawal');
    expect(withdrawn.publication.gateSnapshot).toMatchObject({ grantId: grant.id, policyVersion: 'core-publication-v1' });
    await expectCode(publications.withdraw(a.context, 'OFFER_VERSION', a.version.id, 'withdraw again'), 'CONFLICT');
    expect((await publications.publish(a.context, 'OFFER_VERSION', a.version.id, 'publish again')).outcome).toBe('PUBLISHED');
  });

  test('publishing a second version replaces the first in withdrawal-then-publication order', async () => {
    const a = await createVersionFixture('replace');
    const grant = await prisma.permissionGrant.findFirstOrThrow({ where: { organizationId: a.organizationId, membershipId: a.membership.id, permissionKey: 'publication.manage', grantStatus: 'ACTIVE' } });
    const second = await offers.createVersion(a.context, { offerId: a.offer.id, name: 'Version two', offerShape: OfferShape.ITEM, onRequest: true, validFrom: new Date('2026-02-01T00:00:00.000Z') });
    await publications.publish(a.context, 'OFFER_VERSION', a.version.id, 'publish first version');
    const replacement = await publications.publish(a.context, 'OFFER_VERSION', second.id, 'replace first version');
    expect(replacement.outcome).toBe('REPLACED');
    if (replacement.outcome !== 'REPLACED') throw new Error('expected replacement');
    expect(replacement.withdrawnPublication.offerVersionId).toBe(a.version.id);
    expect(replacement.publication.offerVersionId).toBe(second.id);
    expect(replacement.withdrawnPublication.gateSnapshot).toMatchObject({ grantId: grant.id, policyVersion: 'core-publication-v1' });
    expect(replacement.publication.gateSnapshot).toMatchObject({ grantId: grant.id, policyVersion: 'core-publication-v1' });
    expect((await prisma.offerVersion.count({ where: { organizationId: a.organizationId, publicationStatus: 'PUBLISHED' } }))).toBe(1);
    expect((await prisma.offerVersion.findUniqueOrThrow({ where: { id_organizationId: { id: a.version.id, organizationId: a.organizationId } } })).publicationStatus).toBe('WITHDRAWN');
  });

  test('S14-A resets confirmation only after a real public change', async () => {
    const a = await newOrganization('s14');
    const capability = await capabilities.create(a.context, { organizationId: a.organizationId, capabilityKey: 's14-capability', name: 'Confirmed capability', categoryKey: 'test' });
    const confirmed = await capabilities.confirm(a.context, capability.id);
    const changed = await capabilities.updatePublicFields(a.context, capability.id, { name: 'Changed capability' });
    expect(confirmed.confirmationStatus).toBe('HUMAN_CONFIRMED');
    expect(changed.confirmationStatus).toBe('UNCONFIRMED');
    expect(changed.confirmedByMembershipId).toBeNull();
    expect(changed.confirmedByOrganizationId).toBeNull();
    expect(changed.confirmedAt).toBeNull();
    expect(changed.contentRevision).toBe(capability.contentRevision + 1);
    const confirmedAgain = await capabilities.confirm(a.context, capability.id);
    const identical = await capabilities.updatePublicFields(a.context, capability.id, { name: confirmedAgain.name });
    expect(identical.confirmationStatus).toBe('HUMAN_CONFIRMED');
    expect(identical.contentRevision).toBe(confirmedAgain.contentRevision);
  });

  test('W1 and missing offer or publication permissions are denied', async () => {
    const a = await createVersionFixture('permissions');
    const b = await newOrganization('permissions-other');
    await expectCode(offers.createVersion(b.context, { offerId: a.offer.id, name: 'Cross org', offerShape: OfferShape.ITEM, validFrom: new Date(), onRequest: true }), 'VALIDATION_FAILED');
    const offerGrant = await prisma.permissionGrant.findFirstOrThrow({ where: { organizationId: a.organizationId, membershipId: a.membership.id, permissionKey: 'offer.manage', grantStatus: 'ACTIVE' } });
    await grants.revoke(a.context, offerGrant.id, 'remove offer permission');
    await expectCode(offers.create(a.context, { organizationId: a.organizationId, offerKey: 'blocked-offer' }), 'AUTHORIZATION_DENIED');
    await expectCode(offers.createVersion(a.context, { offerId: a.offer.id, name: 'blocked', offerShape: OfferShape.ITEM, validFrom: new Date(), onRequest: true }), 'AUTHORIZATION_DENIED');
    const publicationGrant = await prisma.permissionGrant.findFirstOrThrow({ where: { organizationId: a.organizationId, membershipId: a.membership.id, permissionKey: 'publication.manage', grantStatus: 'ACTIVE' } });
    await grants.revoke(a.context, publicationGrant.id, 'remove publication permission');
    await expectCode(publications.publish(a.context, 'OFFER_VERSION', a.version.id, 'blocked'), 'AUTHORIZATION_DENIED');
  });

  test('concurrent publication of two versions leaves exactly one published without a raw error', async () => {
    const a = await createVersionFixture('publish-race');
    const second = await offers.createVersion(a.context, { offerId: a.offer.id, name: 'Version two', offerShape: OfferShape.ITEM, onRequest: true, validFrom: new Date('2026-02-01T00:00:00.000Z') });
    const third = await offers.createVersion(a.context, { offerId: a.offer.id, name: 'Version three', offerShape: OfferShape.ITEM, onRequest: true, validFrom: new Date('2026-03-01T00:00:00.000Z') });
    const results = await Promise.allSettled([
      publications.publish(a.context, 'OFFER_VERSION', second.id, 'race second'),
      publications.publish(a.context, 'OFFER_VERSION', third.id, 'race third'),
    ]);
    expect(results.every((result) => result.status === 'fulfilled')).toBe(true);
    expect(await prisma.offerVersion.count({ where: { organizationId: a.organizationId, publicationStatus: 'PUBLISHED' } })).toBe(1);
  });
});
