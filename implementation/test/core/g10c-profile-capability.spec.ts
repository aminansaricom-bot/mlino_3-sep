import { BusinessProfileLifecycle, CapabilityAudience, PublicationStatus } from '@prisma/client';
import { prisma } from '../../foundation/prisma-client';
import { AuthContext, CORE_AUTH_ISSUER } from '../../core/auth-context';
import { BootstrapService } from '../../core/bootstrap-service';
import { BusinessProfileService } from '../../core/business-profile-service';
import { CapabilityService } from '../../core/capability-service';
import { CoreDomainError } from '../../core/errors';
import { mapCoreDatabaseError } from '../../core/error-adapter';
import { PermissionGrantService } from '../../core/permission-grant-service';
import { PlatformIdentityVerifier } from '../../core/platform-identity-verifier';
import { PublicationService } from '../../core/publication-service';
import { assertDisposableDatabase } from './db-guard';

const TEST_PREFIX = `g10c-${Date.now()}-`;

class FakePlatformIdentityVerifier implements PlatformIdentityVerifier {
  async verify(credential: string) {
    if (credential !== 'platform-token') throw new Error('invalid platform credential');
    return { ref: 'platform:g10c' };
  }
}

const verifier = new FakePlatformIdentityVerifier();
const bootstrap = new BootstrapService(prisma, verifier);
const profiles = new BusinessProfileService(prisma);
const capabilities = new CapabilityService(prisma);
const publications = new PublicationService(prisma);
const grants = new PermissionGrantService(prisma, verifier);

function contextFor(membership: { id: string; identityProvider: string; externalSubject: string }, organizationId: string): AuthContext {
  return { issuer: CORE_AUTH_ISSUER, organizationId, identityProvider: membership.identityProvider, externalSubject: membership.externalSubject, membershipId: membership.id };
}

async function newOrganization(label: string) {
  const organizationId = `${TEST_PREFIX}${label}-${Math.random().toString(36).slice(2, 8)}`;
  const result = await bootstrap.execute('platform-token', { organizationId, displayName: organizationId, foundingIdentityProvider: 'g10c-idp', foundingExternalSubject: `owner-${label}` });
  return { organizationId, context: contextFor(result.foundingMembership, organizationId), membership: result.foundingMembership };
}

function expectCode(action: Promise<unknown>, code: CoreDomainError['code']) {
  return expect(action).rejects.toMatchObject({ name: 'CoreDomainError', code });
}

describe('G10c Core profile, capability and publication slice', () => {
  beforeAll(async () => assertDisposableDatabase());
  afterAll(async () => prisma.$disconnect());

  test('profile create starts unpublished and D6 bumps every public field without service projection writes', async () => {
    const a = await newOrganization('profile-fields');
    const profile = await profiles.create(a.context, { organizationId: a.organizationId, name: 'Clinic' });
    expect(profile.publicationStatus).toBe(PublicationStatus.UNPUBLISHED);
    expect(profile.contentRevision).toBe(1);

    const updates = [
      { name: 'Clinic 2' },
      { description: 'Description' },
      { latitude: 35.7 },
      { longitude: 51.4 },
      { addressText: 'Address' },
      { contactInformation: { phone: 'not-real-test-data' } },
      { links: { website: 'https://example.test' } },
      { businessHours: { monday: '09:00-17:00' } },
    ];
    let revision = 1;
    for (const update of updates) {
      const next = await profiles.updatePublicFields(a.context, profile.id, update);
      revision += 1;
      expect(next.contentRevision).toBe(revision);
      expect(next.publicationStatus).toBe(PublicationStatus.UNPUBLISHED);
    }

    const before = await prisma.businessProfile.findUniqueOrThrow({ where: { id_organizationId: { id: profile.id, organizationId: a.organizationId } } });
    const nonPublic = await prisma.businessProfile.update({ where: { id_organizationId: { id: profile.id, organizationId: a.organizationId } }, data: { lifecycleStatus: BusinessProfileLifecycle.ACTIVE } });
    expect(nonPublic.contentRevision).toBe(before.contentRevision);
    try {
      await prisma.businessProfile.update({ where: { id_organizationId: { id: profile.id, organizationId: a.organizationId } }, data: { contentRevision: before.contentRevision + 1 } });
      throw new Error('expected direct revision mutation to fail');
    } catch (error) {
      expect(mapCoreDatabaseError(error).code).toBe('VALIDATION_FAILED');
    }
  });

  test('direct initial projection write is rejected and mapped', async () => {
    const a = await newOrganization('initial-guard');
    const profile = await profiles.create(a.context, { organizationId: a.organizationId, name: 'Guarded profile' });
    try {
      await prisma.businessProfile.update({ where: { id_organizationId: { id: profile.id, organizationId: a.organizationId } }, data: { publicationStatus: PublicationStatus.PUBLISHED } });
      throw new Error('expected projection guard to fail');
    } catch (error) {
      expect(mapCoreDatabaseError(error).message).toBe('direct publication projection write rejected');
    }
  });

  test('capability key is organization-unique, public updates bump D6, and confirmation is one-way', async () => {
    const a = await newOrganization('capability');
    const capability = await capabilities.create(a.context, { organizationId: a.organizationId, capabilityKey: 'dental-cleaning', name: 'Cleaning', categoryKey: 'care', audience: CapabilityAudience.CUSTOMER_FACING });
    await expectCode(capabilities.create(a.context, { organizationId: a.organizationId, capabilityKey: 'dental-cleaning', name: 'Duplicate', categoryKey: 'care' }), 'CONFLICT');
    const updated = await capabilities.updatePublicFields(a.context, capability.id, { name: 'Cleaning updated' });
    expect(updated.contentRevision).toBe(2);
    const confirmed = await capabilities.confirm(a.context, capability.id);
    expect(confirmed.confirmationStatus).toBe('HUMAN_CONFIRMED');
    expect(confirmed.confirmedByMembershipId).toBe(a.membership.id);
    await expectCode(capabilities.confirm(a.context, capability.id), 'CONFLICT');
    const row = await prisma.capability.findUniqueOrThrow({ where: { id_organizationId: { id: capability.id, organizationId: a.organizationId } } });
    expect(row.contentRevision).toBe(2);
  });

  test('S13-A links only a verified same-organization claim and unlink clears both fields', async () => {
    const a = await newOrganization('claims');
    const p1 = await profiles.create(a.context, { organizationId: a.organizationId, name: 'Profile one' });
    const p2 = await profiles.create(a.context, { organizationId: a.organizationId, name: 'Profile two' });
    const claim = await prisma.businessIdentityClaim.create({ data: { organizationId: a.organizationId, identifierType: 'registration', identifierValue: `${TEST_PREFIX}claim`, submittedByMembershipId: a.membership.id } });
    await expectCode(profiles.linkIdentityClaim(a.context, p1.id, claim.id), 'VALIDATION_FAILED');
    await prisma.businessIdentityClaim.update({ where: { id_organizationId: { id: claim.id, organizationId: a.organizationId } }, data: { claimStatus: 'VERIFIED', verifiedAt: new Date(), statusChangedByPlatformIdentityRef: 'platform:g10c', statusChangeReason: 'test verification', statusChangedAt: new Date() } });
    const linked = await profiles.linkIdentityClaim(a.context, p1.id, claim.id);
    expect(linked.businessIdentityClaimId).toBe(claim.id);
    await expectCode(profiles.linkIdentityClaim(a.context, p2.id, claim.id), 'CONFLICT');
    const unlinked = await profiles.unlinkIdentityClaim(a.context, p1.id);
    expect(unlinked.businessIdentityClaimId).toBeNull();
    expect(unlinked.businessIdentityClaimOrganizationId).toBeNull();
  });

  test('publication uses current revisions, is idempotent, withdraws, and records the exact gate grant', async () => {
    const a = await newOrganization('publication');
    const profile = await profiles.create(a.context, { organizationId: a.organizationId, name: 'Publishable profile' });
    const first = await publications.publish(a.context, 'BUSINESS_PROFILE', profile.id, 'initial publish');
    expect((first as { eventKind: string }).eventKind).toBe('PUBLISHED');
    const afterFirst = await prisma.businessProfile.findUniqueOrThrow({ where: { id_organizationId: { id: profile.id, organizationId: a.organizationId } } });
    expect(afterFirst.publishedContentRevision).toBe(afterFirst.contentRevision);
    const grant = await prisma.permissionGrant.findFirstOrThrow({ where: { organizationId: a.organizationId, membershipId: a.membership.id, permissionKey: 'publication.manage', grantStatus: 'ACTIVE' } });
    expect(((first as unknown as { gateSnapshot: { grantId: string; policyVersion: string } }).gateSnapshot).grantId).toBe(grant.id);
    expect(((first as unknown as { gateSnapshot: { grantId: string; policyVersion: string } }).gateSnapshot).policyVersion).toBe('core-publication-v1');
    const countAfterFirst = await prisma.publication.count({ where: { organizationId: a.organizationId, businessProfileId: profile.id } });
    await expect(publications.publish(a.context, 'BUSINESS_PROFILE', profile.id, 'same revision')).resolves.toMatchObject({ outcome: 'ALREADY_PUBLISHED', revision: afterFirst.contentRevision });
    expect(await prisma.publication.count({ where: { organizationId: a.organizationId, businessProfileId: profile.id } })).toBe(countAfterFirst);
    await profiles.updatePublicFields(a.context, profile.id, { description: 'new revision' });
    await publications.publish(a.context, 'BUSINESS_PROFILE', profile.id, 'republish');
    expect(await prisma.publication.count({ where: { organizationId: a.organizationId, businessProfileId: profile.id } })).toBe(2);
    await publications.withdraw(a.context, 'BUSINESS_PROFILE', profile.id, 'withdraw');
    await expectCode(publications.withdraw(a.context, 'BUSINESS_PROFILE', profile.id, 'second withdraw'), 'CONFLICT');
    await publications.publish(a.context, 'BUSINESS_PROFILE', profile.id, 'publish again');
    expect(await prisma.publication.count({ where: { organizationId: a.organizationId, businessProfileId: profile.id } })).toBe(4);
  });

  test('publication rejects OfferVersion targets in this slice', async () => {
    const a = await newOrganization('offer-rejected');
    const offer = await prisma.offer.create({ data: { organizationId: a.organizationId, offerKey: `${TEST_PREFIX}offer` } });
    const version = await prisma.offerVersion.create({ data: { organizationId: a.organizationId, offerId: offer.id, versionNumber: 1, name: 'Offer', offerShape: 'ITEM', onRequest: true, validFrom: new Date() } });
    await expectCode(publications.publish(a.context, 'OFFER_VERSION', version.id, 'out of slice'), 'VALIDATION_FAILED');
  });

  test('W1 cross-organization and missing permission are denied', async () => {
    const a = await newOrganization('permissions-a');
    const b = await newOrganization('permissions-b');
    await expectCode(profiles.create(a.context, { organizationId: b.organizationId, name: 'cross org' }), 'TENANT_MISMATCH');
    const grant = await prisma.permissionGrant.findFirstOrThrow({ where: { organizationId: a.organizationId, membershipId: a.membership.id, permissionKey: 'capability.manage', grantStatus: 'ACTIVE' } });
    await grants.revoke(a.context, grant.id, 'g10c missing permission');
    await expectCode(capabilities.create(a.context, { organizationId: a.organizationId, capabilityKey: 'blocked', name: 'Blocked', categoryKey: 'test' }), 'AUTHORIZATION_DENIED');
  });

  test('concurrent public edit and publish preserve revision consistency', async () => {
    const a = await newOrganization('concurrent');
    const profile = await profiles.create(a.context, { organizationId: a.organizationId, name: 'Concurrent profile' });
    await Promise.all([
      profiles.updatePublicFields(a.context, profile.id, { description: 'concurrent edit' }),
      publications.publish(a.context, 'BUSINESS_PROFILE', profile.id, 'concurrent publish'),
    ]);
    const row = await prisma.businessProfile.findUniqueOrThrow({ where: { id_organizationId: { id: profile.id, organizationId: a.organizationId } } });
    const publication = await prisma.publication.findFirstOrThrow({ where: { organizationId: a.organizationId, businessProfileId: profile.id }, orderBy: { occurredAt: 'desc' } });
    expect(row.publishedContentRevision).toBeLessThanOrEqual(row.contentRevision);
    expect(publication.contentRevision).toBe(row.publishedContentRevision);
  });

  test('error adapter maps the two new named constraints', () => {
    expect(mapCoreDatabaseError({ code: 'P2002', meta: { target: ['business_profile_claim_unique'] } }).message).toBe('identity claim already linked to a profile');
    expect(mapCoreDatabaseError({ code: 'P2002', meta: { target: ['capability_organization_key_unique'] } }).message).toBe('capability key already exists');
  });
});
