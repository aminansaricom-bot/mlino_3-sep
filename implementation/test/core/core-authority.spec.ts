import { prisma } from '../../foundation/prisma-client';
import { AuthContext, CORE_AUTH_ISSUER } from '../../core/auth-context';
import { BootstrapService } from '../../core/bootstrap-service';
import { CoreDomainError } from '../../core/errors';
import { MembershipService } from '../../core/membership-service';
import { PermissionGrantService } from '../../core/permission-grant-service';

async function clearCoreRows(): Promise<void> {
  await prisma.publication.deleteMany();
  await prisma.offerVersionCapability.deleteMany();
  await prisma.evidence.deleteMany();
  await prisma.offerVersion.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.capability.deleteMany();
  await prisma.businessProfile.deleteMany();
  await prisma.permissionGrant.deleteMany();
  await prisma.identityVerification.deleteMany();
  await prisma.businessIdentityClaim.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.organization.deleteMany();
}

function contextFor(membership: { id: string; identityProvider: string; externalSubject: string }, organizationId: string, platformIdentityRef?: string): AuthContext {
  return { issuer: CORE_AUTH_ISSUER, organizationId, identityProvider: membership.identityProvider, externalSubject: membership.externalSubject, membershipId: membership.id, platformIdentityRef };
}

function expectDomainFailure(action: Promise<unknown>, code: CoreDomainError['code']): Promise<void> {
  return expect(action).rejects.toMatchObject({ name: 'CoreDomainError', code });
}

describe('G10a Core authority slice', () => {
  const bootstrap = new BootstrapService(prisma);
  const memberships = new MembershipService(prisma);
  const grants = new PermissionGrantService(prisma);

  beforeEach(async () => clearCoreRows());

  afterAll(async () => {
    await clearCoreRows();
    await prisma.$disconnect();
  });

  it('bootstraps organization, founding membership and every registry grant atomically', async () => {
    const result = await bootstrap.execute({ organizationId: 'g10a-positive', displayName: 'G10a', foundingIdentityProvider: 'test-idp', foundingExternalSubject: 'owner-1', platformIdentityRef: 'ac2:test' });
    expect(result.organization.id).toBe('g10a-positive');
    expect(await prisma.permissionGrant.count({ where: { organizationId: 'g10a-positive', basisKey: 'founding', grantStatus: 'ACTIVE' } })).toBe(16);
  });

  it('rejects a second bootstrap without creating another organization', async () => {
    await bootstrap.execute({ organizationId: 'g10a-once', displayName: 'Once', foundingIdentityProvider: 'test-idp', foundingExternalSubject: 'owner-1', platformIdentityRef: 'ac2:test' });
    await expectDomainFailure(bootstrap.execute({ organizationId: 'g10a-once', displayName: 'Again', foundingIdentityProvider: 'test-idp', foundingExternalSubject: 'owner-2', platformIdentityRef: 'ac2:test' }), 'CONFLICT');
    expect(await prisma.organization.count({ where: { id: 'g10a-once' } })).toBe(1);
  });

  it('requires W1 and S2 active membership in the selected organization', async () => {
    const a = await bootstrap.execute({ organizationId: 'g10a-a', displayName: 'A', foundingIdentityProvider: 'test-idp', foundingExternalSubject: 'owner-a', platformIdentityRef: 'ac2:test' });
    const b = await bootstrap.execute({ organizationId: 'g10a-b', displayName: 'B', foundingIdentityProvider: 'test-idp', foundingExternalSubject: 'owner-b', platformIdentityRef: 'ac2:test' });
    await expectDomainFailure(memberships.create(contextFor(b.foundingMembership, a.organization.id), { organizationId: a.organization.id, identityProvider: 'test-idp', externalSubject: 'wrong-org' }), 'AUTHORIZATION_DENIED');
    const aContext = contextFor(a.foundingMembership, a.organization.id, 'ac2:test');
    await memberships.revoke(aContext, a.foundingMembership.id, 'test revoke');
    await expectDomainFailure(memberships.create(contextFor(a.foundingMembership, a.organization.id), { organizationId: a.organization.id, identityProvider: 'test-idp', externalSubject: 'after-revoke' }), 'AUTHORIZATION_DENIED');
  });

  it('creates and revokes memberships through the authority boundary', async () => {
    const a = await bootstrap.execute({ organizationId: 'g10a-members', displayName: 'Members', foundingIdentityProvider: 'test-idp', foundingExternalSubject: 'owner', platformIdentityRef: 'ac2:test' });
    const owner = contextFor(a.foundingMembership, a.organization.id);
    const member = await memberships.create(owner, { organizationId: a.organization.id, identityProvider: 'test-idp', externalSubject: 'member' });
    await memberships.revoke(contextFor(a.foundingMembership, a.organization.id, 'ac2:test'), member.id, 'platform cleanup');
    expect((await prisma.membership.findUnique({ where: { id_organizationId: { id: member.id, organizationId: a.organization.id } } }))?.membershipStatus).toBe('REVOKED');
  });

  it('rejects self-grant, unheld-key grant and role-only authorization', async () => {
    const a = await bootstrap.execute({ organizationId: 'g10a-grants', displayName: 'Grants', foundingIdentityProvider: 'test-idp', foundingExternalSubject: 'owner', platformIdentityRef: 'ac2:test' });
    const owner = contextFor(a.foundingMembership, a.organization.id);
    const target = await memberships.create(owner, { organizationId: a.organization.id, identityProvider: 'test-idp', externalSubject: 'target' });
    await expectDomainFailure(grants.issue(owner, a.foundingMembership.id, 'offer.manage'), 'AUTHORIZATION_DENIED');
    const offerGrant = await prisma.permissionGrant.findFirst({ where: { organizationId: a.organization.id, membershipId: a.foundingMembership.id, permissionKey: 'offer.manage', grantStatus: 'ACTIVE' } });
    expect(offerGrant).not.toBeNull();
    await grants.revoke(contextFor(a.foundingMembership, a.organization.id, 'ac2:test'), offerGrant!.id, 'remove test key');
    await expectDomainFailure(grants.issue(owner, target.id, 'offer.manage'), 'AUTHORIZATION_DENIED');
    await expectDomainFailure(memberships.create({ issuer: CORE_AUTH_ISSUER, organizationId: a.organization.id, identityProvider: 'test-idp', externalSubject: 'role-only' }, { organizationId: a.organization.id, identityProvider: 'test-idp', externalSubject: 'new' }), 'AUTHORIZATION_DENIED');
  });

  it('requires the grantor to hold the key being granted and protects the last grant administrator', async () => {
    const a = await bootstrap.execute({ organizationId: 'g10a-last-admin', displayName: 'Admins', foundingIdentityProvider: 'test-idp', foundingExternalSubject: 'owner', platformIdentityRef: 'ac2:test' });
    const owner = contextFor(a.foundingMembership, a.organization.id);
    const target = await memberships.create(owner, { organizationId: a.organization.id, identityProvider: 'test-idp', externalSubject: 'target' });
    const targetAdmin = await grants.issue(owner, target.id, 'permission_grant.issue', 'second admin');
    await grants.revoke(owner, targetAdmin.id, 'remove second admin');
    const ownerAdmin = await prisma.permissionGrant.findFirst({ where: { organizationId: a.organization.id, membershipId: a.foundingMembership.id, permissionKey: 'permission_grant.issue', grantStatus: 'ACTIVE' } });
    await expectDomainFailure(grants.revoke(owner, ownerAdmin!.id, 'remove last admin'), 'CONFLICT');
  });
});
