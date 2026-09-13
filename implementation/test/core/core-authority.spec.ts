import { prisma } from '../../foundation/prisma-client';
import { AuthContext, CORE_AUTH_ISSUER } from '../../core/auth-context';
import { BootstrapService } from '../../core/bootstrap-service';
import { CoreDomainError } from '../../core/errors';
import { mapCoreDatabaseError } from '../../core/error-adapter';
import { MembershipService } from '../../core/membership-service';
import { PermissionGrantService } from '../../core/permission-grant-service';
import { PlatformIdentityVerifier } from '../../core/platform-identity-verifier';
import { PermissionGrantRepository } from '../../core/repositories';
import { assertDisposableDatabase } from './db-guard';

const TEST_PREFIX = 'g10a3-';

class FakePlatformIdentityVerifier implements PlatformIdentityVerifier {
  async verify(credential: string) {
    if (credential !== 'platform-token') throw new Error('invalid platform credential');
    return { ref: 'platform:test' };
  }
}

async function clearCoreRows(): Promise<void> {
  await assertDisposableDatabase();
  await prisma.permissionGrant.deleteMany({ where: { organizationId: { startsWith: TEST_PREFIX } } });
  await prisma.membership.deleteMany({ where: { organizationId: { startsWith: TEST_PREFIX } } });
  await prisma.organization.deleteMany({ where: { id: { startsWith: TEST_PREFIX } } });
}

function contextFor(membership: { id: string; identityProvider: string; externalSubject: string }, organizationId: string): AuthContext {
  return { issuer: CORE_AUTH_ISSUER, organizationId, identityProvider: membership.identityProvider, externalSubject: membership.externalSubject, membershipId: membership.id };
}

function bootstrapInput(organizationId: string, subject = 'owner'): { organizationId: string; displayName: string; foundingIdentityProvider: string; foundingExternalSubject: string } {
  return { organizationId, displayName: organizationId, foundingIdentityProvider: 'test-idp', foundingExternalSubject: subject };
}

function expectDomainFailure(action: Promise<unknown>, code: CoreDomainError['code']): Promise<void> {
  return expect(action).rejects.toMatchObject({ name: 'CoreDomainError', code });
}

describe('G10a2 Core authority slice', () => {
  const verifier = new FakePlatformIdentityVerifier();
  const bootstrap = new BootstrapService(prisma, verifier);
  const memberships = new MembershipService(prisma, verifier);
  const grants = new PermissionGrantService(prisma, verifier);

  beforeAll(async () => {
    await assertDisposableDatabase();
  });

  beforeEach(async () => clearCoreRows());

  afterAll(async () => {
    await clearCoreRows();
    await prisma.$disconnect();
  });

  it('bootstraps atomically through a verified platform actor and records the actor reference', async () => {
    const result = await bootstrap.execute('platform-token', bootstrapInput(`${TEST_PREFIX}positive`));
    expect(result.organization.id).toBe(`${TEST_PREFIX}positive`);
    expect(await prisma.permissionGrant.count({ where: { organizationId: `${TEST_PREFIX}positive`, basisKey: 'founding', grantStatus: 'ACTIVE', reason: 'bootstrap:platform:test' } })).toBe(16);
  });

  it('rejects missing or invalid platform credentials and leaves no bootstrap rows after a validation failure', async () => {
    await expectDomainFailure(bootstrap.execute(undefined, bootstrapInput(`${TEST_PREFIX}missing`)), 'AUTHORIZATION_DENIED');
    await expectDomainFailure(bootstrap.execute('wrong-token', bootstrapInput(`${TEST_PREFIX}invalid`)), 'AUTHORIZATION_DENIED');
    await expectDomainFailure(bootstrap.execute('platform-token', { ...bootstrapInput(`${TEST_PREFIX}rollback`), foundingExternalSubject: 'x'.repeat(300) }), 'VALIDATION_FAILED');
    expect(await prisma.organization.count({ where: { id: `${TEST_PREFIX}rollback` } })).toBe(0);
  });

  it('rejects duplicate bootstrap with conflict and never exposes founding creation on the repository', async () => {
    await bootstrap.execute('platform-token', bootstrapInput(`${TEST_PREFIX}once`));
    await expectDomainFailure(bootstrap.execute('platform-token', bootstrapInput(`${TEST_PREFIX}once`, 'owner-2')), 'CONFLICT');
    expect(await prisma.organization.count({ where: { id: `${TEST_PREFIX}once` } })).toBe(1);
    expect('createFounding' in PermissionGrantRepository.prototype).toBe(false);
  });

  it('maps a real PostgreSQL trigger error through the Core error adapter', async () => {
    const a = await bootstrap.execute('platform-token', bootstrapInput(`${TEST_PREFIX}trigger`));
    let mapped: CoreDomainError | undefined;
    try {
      await prisma.businessProfile.create({ data: { organizationId: a.organization.id, name: 'Invalid published profile', publicationStatus: 'PUBLISHED' } });
    } catch (error) {
      mapped = mapCoreDatabaseError(error);
    }
    expect(mapped?.code).toBe('VALIDATION_FAILED');
    expect(mapped?.message).toBe('initial publication state is invalid');
  });

  it('requires organization membership and rejects role-only context and platform use through member context', async () => {
    const a = await bootstrap.execute('platform-token', bootstrapInput(`${TEST_PREFIX}a`, 'owner-a'));
    const b = await bootstrap.execute('platform-token', bootstrapInput(`${TEST_PREFIX}b`, 'owner-b'));
    await expectDomainFailure(memberships.create(contextFor(b.foundingMembership, a.organization.id), { organizationId: a.organization.id, identityProvider: 'test-idp', externalSubject: 'wrong-org' }), 'AUTHORIZATION_DENIED');
    await expectDomainFailure(memberships.create({ issuer: CORE_AUTH_ISSUER, organizationId: a.organization.id, identityProvider: 'test-idp', externalSubject: 'role-only' }, { organizationId: a.organization.id, identityProvider: 'test-idp', externalSubject: 'new' }), 'AUTHORIZATION_DENIED');
    await expectDomainFailure(memberships.revokeByPlatform(undefined, a.organization.id, a.foundingMembership.id, 'member cannot use platform path'), 'AUTHORIZATION_DENIED');
  });

  it('returns the same authorization code and message for unknown and unauthorized organizations', async () => {
    const known = await bootstrap.execute('platform-token', bootstrapInput(`${TEST_PREFIX}known`));
    const unknownContext = { issuer: CORE_AUTH_ISSUER, organizationId: `${TEST_PREFIX}unknown`, identityProvider: 'test-idp', externalSubject: 'outsider' };
    const unauthorizedContext = { issuer: CORE_AUTH_ISSUER, organizationId: known.organization.id, identityProvider: 'test-idp', externalSubject: 'outsider' };
    const unknownError = await grants.issue(unknownContext, 'missing-membership', 'membership.create').catch((error: CoreDomainError) => error);
    const unauthorizedError = await grants.issue(unauthorizedContext, 'missing-membership', 'membership.create').catch((error: CoreDomainError) => error);
    expect(unknownError).toMatchObject({ code: 'AUTHORIZATION_DENIED', message: 'active organization membership required' });
    expect(unauthorizedError).toMatchObject({ code: 'AUTHORIZATION_DENIED', message: 'active organization membership required' });
  });

  it('maps duplicate active membership and duplicate active grant to CONFLICT', async () => {
    const a = await bootstrap.execute('platform-token', bootstrapInput(`${TEST_PREFIX}duplicates`));
    const owner = contextFor(a.foundingMembership, a.organization.id);
    const target = await memberships.create(owner, { organizationId: a.organization.id, identityProvider: 'test-idp', externalSubject: 'duplicate' });
    await expectDomainFailure(memberships.create(owner, { organizationId: a.organization.id, identityProvider: 'test-idp', externalSubject: 'duplicate' }), 'CONFLICT');
    await grants.issue(owner, target.id, 'membership.create', 'first active grant');
    await expectDomainFailure(grants.issue(owner, target.id, 'membership.create', 'duplicate active grant'), 'CONFLICT');
  });

  it('creates and revokes memberships while protecting the last active administrator', async () => {
    const a = await bootstrap.execute('platform-token', bootstrapInput(`${TEST_PREFIX}members`));
    const owner = contextFor(a.foundingMembership, a.organization.id);
    const member = await memberships.create(owner, { organizationId: a.organization.id, identityProvider: 'test-idp', externalSubject: 'member' });
    await memberships.revoke(owner, member.id, 'member cleanup');
    expect((await prisma.membership.findUnique({ where: { id_organizationId: { id: member.id, organizationId: a.organization.id } } }))?.membershipStatus).toBe('REVOKED');
    await expectDomainFailure(memberships.revokeByPlatform('platform-token', a.organization.id, a.foundingMembership.id, 'last admin'), 'CONFLICT');
  });

  it('requires the grantor key, rejects inactive recipients, and separates action from founding grants', async () => {
    const a = await bootstrap.execute('platform-token', bootstrapInput(`${TEST_PREFIX}grants`));
    const owner = contextFor(a.foundingMembership, a.organization.id);
    const target = await memberships.create(owner, { organizationId: a.organization.id, identityProvider: 'test-idp', externalSubject: 'target' });
    await expectDomainFailure(grants.issue(owner, a.foundingMembership.id, 'offer.manage'), 'AUTHORIZATION_DENIED');
    const offerGrant = await prisma.permissionGrant.findFirst({ where: { organizationId: a.organization.id, membershipId: a.foundingMembership.id, permissionKey: 'offer.manage', grantStatus: 'ACTIVE' } });
    expect(offerGrant).not.toBeNull();
    await grants.revoke(owner, offerGrant!.id, 'remove test key');
    await expectDomainFailure(grants.issue(owner, target.id, 'offer.manage'), 'AUTHORIZATION_DENIED');
    const memberGrant = await grants.issue(owner, target.id, 'membership.create', 'member grant');
    expect(memberGrant.basisKey).toBe('member_grant');
    await memberships.revokeByPlatform('platform-token', a.organization.id, target.id, 'inactive target');
    await expectDomainFailure(grants.issue(owner, target.id, 'membership.create'), 'VALIDATION_FAILED');
  });

  it('rejects re-revoke and preserves the first revocation audit', async () => {
    const a = await bootstrap.execute('platform-token', bootstrapInput(`${TEST_PREFIX}rerevoke`));
    const owner = contextFor(a.foundingMembership, a.organization.id);
    const target = await memberships.create(owner, { organizationId: a.organization.id, identityProvider: 'test-idp', externalSubject: 'target' });
    await memberships.revokeByPlatform('platform-token', a.organization.id, target.id, 'first reason');
    await expectDomainFailure(memberships.revokeByPlatform('platform-token', a.organization.id, target.id, 'second reason'), 'CONFLICT');
    const row = await prisma.membership.findUnique({ where: { id_organizationId: { id: target.id, organizationId: a.organization.id } } });
    expect(row?.revocationReason).toBe('first reason');
    const grantTarget = await memberships.create(owner, { organizationId: a.organization.id, identityProvider: 'test-idp', externalSubject: 'grant-target' });
    const grant = await grants.issue(owner, grantTarget.id, 'offer.manage', 'revoke twice');
    await grants.revokeByPlatform('platform-token', a.organization.id, grant.id, 'first grant reason');
    await expectDomainFailure(grants.revokeByPlatform('platform-token', a.organization.id, grant.id, 'second grant reason'), 'CONFLICT');
  });

  it('serializes concurrent revocation of two different admin grants', async () => {
    const a = await bootstrap.execute('platform-token', bootstrapInput(`${TEST_PREFIX}concurrent-grants`));
    const owner = contextFor(a.foundingMembership, a.organization.id);
    const member = await memberships.create(owner, { organizationId: a.organization.id, identityProvider: 'test-idp', externalSubject: 'member-admin' });
    const memberGrant = await grants.issue(owner, member.id, 'permission_grant.issue', 'second admin');
    const founderGrant = await prisma.permissionGrant.findFirstOrThrow({ where: { organizationId: a.organization.id, membershipId: a.foundingMembership.id, permissionKey: 'permission_grant.issue', grantStatus: 'ACTIVE' } });
    const results = await Promise.allSettled([
      grants.revokeByPlatform('platform-token', a.organization.id, founderGrant.id, 'revoke founder admin'),
      grants.revokeByPlatform('platform-token', a.organization.id, memberGrant.id, 'revoke member admin'),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected').map((result) => result.status === 'rejected' ? result.reason.message : '')).toContain('revoking the last grant administrator is forbidden');
    expect(await new PermissionGrantRepository(prisma).countActiveForKey(a.organization.id, 'permission_grant.issue')).toBe(1);
  });

  it('serializes concurrent revocation of the two admin memberships', async () => {
    const a = await bootstrap.execute('platform-token', bootstrapInput(`${TEST_PREFIX}concurrent-memberships`));
    const owner = contextFor(a.foundingMembership, a.organization.id);
    const member = await memberships.create(owner, { organizationId: a.organization.id, identityProvider: 'test-idp', externalSubject: 'member-admin' });
    await grants.issue(owner, member.id, 'permission_grant.issue', 'second admin');
    const results = await Promise.allSettled([
      memberships.revokeByPlatform('platform-token', a.organization.id, a.foundingMembership.id, 'revoke founder membership'),
      memberships.revokeByPlatform('platform-token', a.organization.id, member.id, 'revoke member membership'),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected').map((result) => result.status === 'rejected' ? result.reason.message : '')).toContain('revoking the last grant administrator is forbidden');
    expect(await prisma.membership.count({ where: { organizationId: a.organization.id, membershipStatus: 'ACTIVE' } })).toBe(1);
  });
});
