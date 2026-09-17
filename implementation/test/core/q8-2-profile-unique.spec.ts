import { PublicationStatus } from '@prisma/client';
import { prisma } from '../../foundation/prisma-client';
import { AuthContext, CORE_AUTH_ISSUER } from '../../core/auth-context';
import { BootstrapService } from '../../core/bootstrap-service';
import { BusinessProfileService } from '../../core/business-profile-service';
import { CapabilityService } from '../../core/capability-service';
import { CoreDomainError } from '../../core/errors';
import { mapCoreDatabaseError } from '../../core/error-adapter';
import { MembershipService } from '../../core/membership-service';
import { PermissionGrantService } from '../../core/permission-grant-service';
import { PlatformIdentityVerifier } from '../../core/platform-identity-verifier';
import { PublicationService } from '../../core/publication-service';
import { assertDisposableDatabase } from './db-guard';

const TEST_PREFIX = `q8-2-${Date.now()}-`;

class FakePlatformIdentityVerifier implements PlatformIdentityVerifier {
  async verify(credential: string) {
    if (credential !== 'platform-token') throw new Error('invalid platform credential');
    return { ref: 'platform:q8-2' };
  }
}

const verifier = new FakePlatformIdentityVerifier();
const bootstrap = new BootstrapService(prisma, verifier);
const profiles = new BusinessProfileService(prisma);
const publications = new PublicationService(prisma);
const capabilities = new CapabilityService(prisma);
const memberships = new MembershipService(prisma, verifier);
const grants = new PermissionGrantService(prisma, verifier);

function contextFor(membership: { id: string; identityProvider: string; externalSubject: string }, organizationId: string): AuthContext {
  return { issuer: CORE_AUTH_ISSUER, organizationId, identityProvider: membership.identityProvider, externalSubject: membership.externalSubject, membershipId: membership.id };
}

async function newOrganization(label: string) {
  const organizationId = `${TEST_PREFIX}${label}`;
  const result = await bootstrap.execute('platform-token', { organizationId, displayName: organizationId, foundingIdentityProvider: 'q8-idp', foundingExternalSubject: `owner-${label}` });
  return { organizationId, context: contextFor(result.foundingMembership, organizationId), membership: result.foundingMembership };
}

function expectCode(action: Promise<unknown>, code: CoreDomainError['code']) {
  return expect(action).rejects.toMatchObject({ name: 'CoreDomainError', code });
}

describe('Q8-2 published BusinessProfile uniqueness', () => {
  beforeAll(async () => assertDisposableDatabase());
  afterAll(async () => prisma.$disconnect());

  test('partial unique index exists, is valid, and carries the published predicate', async () => {
    const indexes = await prisma.$queryRaw<Array<{ indexname: string; indexdef: string }>>`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'business_profiles'
        AND indexname = 'business_profile_one_published_per_organization_unique'
    `;
    const validity = await prisma.$queryRaw<Array<{ indisvalid: boolean }>>`
      SELECT x.indisvalid
      FROM pg_class i
      JOIN pg_index x ON x.indexrelid = i.oid
      JOIN pg_namespace n ON n.oid = i.relnamespace
      WHERE n.nspname = 'public' AND i.relname = 'business_profile_one_published_per_organization_unique'
    `;
    expect(indexes).toHaveLength(1);
    expect(indexes[0].indexdef).toContain("WHERE (publication_status = 'PUBLISHED'");
    expect(validity).toEqual([{ indisvalid: true }]);
  });

  test('publishing a second profile maps the real unique error to CONFLICT and leaves no Publication row', async () => {
    const a = await newOrganization('second');
    const first = await profiles.create(a.context, { organizationId: a.organizationId, name: 'First' });
    const second = await profiles.create(a.context, { organizationId: a.organizationId, name: 'Second' });
    await expect(publications.publish(a.context, 'BUSINESS_PROFILE', first.id, 'publish first')).resolves.toMatchObject({ outcome: 'PUBLISHED' });

    let raw: unknown;
    let rawDatabaseError: unknown;
    try {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('SET LOCAL session_replication_role = replica');
        await tx.$executeRaw`UPDATE business_profiles SET publication_status = 'PUBLISHED' WHERE id = ${second.id}`;
      });
      throw new Error('expected direct unique index conflict');
    } catch (error) {
      rawDatabaseError = error;
    }
    expect(rawDatabaseError).toMatchObject({ code: 'P2010', meta: { code: '23505' } });
    expect(mapCoreDatabaseError(rawDatabaseError)).toMatchObject({ code: 'CONFLICT', message: 'another business profile is already published for this organization' });
    try {
      await publications.publish(a.context, 'BUSINESS_PROFILE', second.id, 'publish second');
      throw new Error('expected unique index conflict');
    } catch (error) {
      raw = error;
      expect(error).toMatchObject({ name: 'CoreDomainError', code: 'CONFLICT', message: 'another business profile is already published for this organization' });
    }
    expect(raw).toMatchObject({ code: 'CONFLICT' });
    expect(await prisma.publication.count({ where: { organizationId: a.organizationId, businessProfileId: second.id } })).toBe(0);
    expect(await prisma.businessProfile.findUniqueOrThrow({ where: { id_organizationId: { id: second.id, organizationId: a.organizationId } } })).toMatchObject({ publicationStatus: PublicationStatus.UNPUBLISHED });
  });

  test('concurrent publishes of different profiles yield one success and one mapped CONFLICT', async () => {
    const a = await newOrganization('race');
    const first = await profiles.create(a.context, { organizationId: a.organizationId, name: 'Race one' });
    const second = await profiles.create(a.context, { organizationId: a.organizationId, name: 'Race two' });
    const results = await Promise.allSettled([
      publications.publish(a.context, 'BUSINESS_PROFILE', first.id, 'race first'),
      publications.publish(a.context, 'BUSINESS_PROFILE', second.id, 'race second'),
    ]);
    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({ name: 'CoreDomainError', code: 'CONFLICT' });
  });

  test('withdrawing the first profile frees the organization for the second profile', async () => {
    const a = await newOrganization('withdraw');
    const first = await profiles.create(a.context, { organizationId: a.organizationId, name: 'First' });
    const second = await profiles.create(a.context, { organizationId: a.organizationId, name: 'Second' });
    await publications.publish(a.context, 'BUSINESS_PROFILE', first.id, 'publish first');
    await expectCode(publications.publish(a.context, 'BUSINESS_PROFILE', second.id, 'blocked second'), 'CONFLICT');
    await publications.withdraw(a.context, 'BUSINESS_PROFILE', first.id, 'withdraw first');
    await expect(publications.publish(a.context, 'BUSINESS_PROFILE', second.id, 'publish second')).resolves.toMatchObject({ outcome: 'PUBLISHED' });
  });

  test('other unique conflicts retain their existing messages', async () => {
    const a = await newOrganization('other-conflicts');
    await capabilities.create(a.context, { organizationId: a.organizationId, capabilityKey: 'same-key', name: 'First', categoryKey: 'test' });
    await expectCode(capabilities.create(a.context, { organizationId: a.organizationId, capabilityKey: 'same-key', name: 'Second', categoryKey: 'test' }), 'CONFLICT');
    const member = await memberships.create(a.context, { organizationId: a.organizationId, identityProvider: 'q8-idp', externalSubject: 'member' });
    await grants.issue(a.context, member.id, 'membership.create', 'first grant');
    await expectCode(grants.issue(a.context, member.id, 'membership.create', 'duplicate grant'), 'CONFLICT');
  });

  test('public export still produces one record for one published profile', async () => {
    const a = await newOrganization('export');
    const profile = await profiles.create(a.context, { organizationId: a.organizationId, name: 'Export profile' });
    await publications.publish(a.context, 'BUSINESS_PROFILE', profile.id, 'publish export profile');
    expect(await prisma.businessProfile.count({ where: { organizationId: a.organizationId, publicationStatus: PublicationStatus.PUBLISHED } })).toBe(1);
  });
});
