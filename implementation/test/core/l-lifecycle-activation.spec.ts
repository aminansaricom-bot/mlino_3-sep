import { generateKeyPairSync } from 'node:crypto';
import { CapabilityAudience, PrismaClient } from '@prisma/client';
import { prisma } from '../../foundation/prisma-client';
import { AuthContext, CORE_AUTH_ISSUER } from '../../core/auth-context';
import { BootstrapService } from '../../core/bootstrap-service';
import { BusinessProfileService } from '../../core/business-profile-service';
import { CapabilityService } from '../../core/capability-service';
import { CoreDomainError } from '../../core/errors';
import { IdentityClaimService } from '../../core/identity-claim-service';
import { IdentityVerificationService } from '../../core/identity-verification-service';
import { PermissionGrantService } from '../../core/permission-grant-service';
import { PlatformIdentityVerifier } from '../../core/platform-identity-verifier';
import { PublicationService } from '../../core/publication-service';
import { buildPublicExport } from '../../public-export/builder';
import { SigningKeyProvider } from '../../public-export/signing';
import { assertDisposableDatabase } from './db-guard';

const TEST_PREFIX = `lifecycle-${Date.now()}-`;
const { privateKey } = generateKeyPairSync('ed25519');
const signingKeyProvider: SigningKeyProvider = { async privateKey() { return privateKey; } };

class FakePlatformIdentityVerifier implements PlatformIdentityVerifier {
  async verify(credential: string) {
    if (credential !== 'platform-token') throw new Error('invalid test credential');
    return { ref: 'platform:lifecycle-test' };
  }
}

const verifier = new FakePlatformIdentityVerifier();
const bootstrap = new BootstrapService(prisma, verifier);
const claims = new IdentityClaimService(prisma, verifier);
const verifications = new IdentityVerificationService(prisma, verifier);
const profiles = new BusinessProfileService(prisma);
const capabilities = new CapabilityService(prisma);
const publications = new PublicationService(prisma);
const grants = new PermissionGrantService(prisma, verifier);

function contextFor(membership: { id: string; identityProvider: string; externalSubject: string }, organizationId: string): AuthContext {
  return { issuer: CORE_AUTH_ISSUER, organizationId, identityProvider: membership.identityProvider, externalSubject: membership.externalSubject, membershipId: membership.id };
}

async function organization(label: string) {
  const organizationId = `${TEST_PREFIX}${label}-${Math.random().toString(36).slice(2, 8)}`;
  const result = await bootstrap.execute('platform-token', { organizationId, displayName: organizationId, foundingIdentityProvider: 'lifecycle-idp', foundingExternalSubject: `owner-${label}` });
  return { organizationId, membership: result.foundingMembership, context: contextFor(result.foundingMembership, organizationId) };
}

async function verifiedClaim(db: PrismaClient, owner: Awaited<ReturnType<typeof organization>>, label: string) {
  const claim = await claims.submit(owner.context, { organizationId: owner.organizationId, identifierType: 'test', identifierValue: `${TEST_PREFIX}${label}` });
  const attempt = await verifications.start(owner.context, { organizationId: owner.organizationId, claimId: claim.id, methodKey: 'test-review' });
  await verifications.markUnderReview('platform-token', owner.organizationId, attempt.id);
  await verifications.decide('platform-token', { organizationId: owner.organizationId, verificationId: attempt.id, decision: 'VERIFIED', decisionReason: 'lifecycle test' });
  return db.businessIdentityClaim.findUniqueOrThrow({ where: { id_organizationId: { id: claim.id, organizationId: owner.organizationId } } });
}

async function linkedDraftProfile(owner: Awaited<ReturnType<typeof organization>>, label: string) {
  const claim = await verifiedClaim(prisma, owner, label);
  const profile = await profiles.create(owner.context, { organizationId: owner.organizationId, name: `Profile ${label}` });
  await profiles.linkIdentityClaim(owner.context, profile.id, claim.id);
  return { profile, claim };
}

function expectCode(action: Promise<unknown>, code: CoreDomainError['code']) {
  return expect(action).rejects.toMatchObject({ name: 'CoreDomainError', code });
}

describe('L Core lifecycle activation', () => {
  beforeAll(async () => assertDisposableDatabase());
  afterAll(async () => prisma.$disconnect());

  test('L1 profile activate succeeds from DRAFT with a linked VERIFIED unexpired claim', async () => {
    const owner = await organization('profile-activate');
    const { profile } = await linkedDraftProfile(owner, 'profile-activate');
    await expect(profiles.activate(owner.context, profile.id)).resolves.toMatchObject({ lifecycleStatus: 'ACTIVE' });
  });

  test('L1 profile activate rejects a missing identity claim', async () => {
    const owner = await organization('profile-no-claim');
    const profile = await profiles.create(owner.context, { organizationId: owner.organizationId, name: 'No claim' });
    await expectCode(profiles.activate(owner.context, profile.id), 'VALIDATION_FAILED');
  });

  test.each(['PENDING', 'SUSPENDED'] as const)('L1 profile activate rejects a %s identity claim', async (status) => {
    const owner = await organization(`profile-${status.toLowerCase()}`);
    const { profile, claim } = await linkedDraftProfile(owner, `profile-${status.toLowerCase()}`);
    // business_identity_claim_status_audit_check: a PENDING claim must carry no status-change or verification audit.
    const data = status === 'PENDING'
      ? { claimStatus: status, statusChangedByPlatformIdentityRef: null, statusChangeReason: null, statusChangedAt: null, verifiedAt: null }
      : { claimStatus: status };
    await prisma.businessIdentityClaim.update({ where: { id_organizationId: { id: claim.id, organizationId: owner.organizationId } }, data });
    await expectCode(profiles.activate(owner.context, profile.id), 'VALIDATION_FAILED');
  });

  test('L1 profile activate rejects an expired VERIFIED claim', async () => {
    const owner = await organization('profile-expired');
    const { profile, claim } = await linkedDraftProfile(owner, 'profile-expired');
    await prisma.businessIdentityClaim.update({ where: { id_organizationId: { id: claim.id, organizationId: owner.organizationId } }, data: { validUntil: new Date(Date.now() - 1000) } });
    await expectCode(profiles.activate(owner.context, profile.id), 'VALIDATION_FAILED');
  });

  test('L1 profile ACTIVE and ARCHIVED states cannot be activated again', async () => {
    const owner = await organization('profile-terminal');
    const { profile } = await linkedDraftProfile(owner, 'profile-terminal');
    await profiles.activate(owner.context, profile.id);
    await expectCode(profiles.activate(owner.context, profile.id), 'CONFLICT');
    await profiles.archive(owner.context, profile.id, 'terminal test');
    await expectCode(profiles.activate(owner.context, profile.id), 'CONFLICT');
  });

  test('L1 profile archive accepts DRAFT and ACTIVE, and ARCHIVED is terminal', async () => {
    const draftOwner = await organization('archive-draft');
    const draft = await profiles.create(draftOwner.context, { organizationId: draftOwner.organizationId, name: 'Draft' });
    await expect(profiles.archive(draftOwner.context, draft.id, 'archive draft')).resolves.toMatchObject({ lifecycleStatus: 'ARCHIVED' });
    await expectCode(profiles.archive(draftOwner.context, draft.id, 'archive twice'), 'CONFLICT');

    const activeOwner = await organization('archive-active');
    const { profile } = await linkedDraftProfile(activeOwner, 'archive-active');
    await profiles.activate(activeOwner.context, profile.id);
    await expect(profiles.archive(activeOwner.context, profile.id, 'archive active')).resolves.toMatchObject({ lifecycleStatus: 'ARCHIVED' });
  });

  test('L1 profile activation enforces permission and organization scope', async () => {
    const a = await organization('profile-scope-a');
    const b = await organization('profile-scope-b');
    const { profile } = await linkedDraftProfile(a, 'profile-scope');
    await expectCode(profiles.activate(b.context, profile.id), 'VALIDATION_FAILED');
    const grant = await prisma.permissionGrant.findFirstOrThrow({ where: { organizationId: a.organizationId, membershipId: a.membership.id, permissionKey: 'business_profile.manage', grantStatus: 'ACTIVE' } });
    await grants.revoke(a.context, grant.id, 'permission test');
    await expectCode(profiles.activate(a.context, profile.id), 'AUTHORIZATION_DENIED');
  });

  test('L2 capability activate allows PLANNED without confirmation and rejects repeat activation', async () => {
    const owner = await organization('capability-activate');
    const capability = await capabilities.create(owner.context, { organizationId: owner.organizationId, capabilityKey: 'planned', name: 'Planned', categoryKey: 'test', audience: CapabilityAudience.CUSTOMER_FACING });
    expect(capability.confirmationStatus).toBe('UNCONFIRMED');
    await expect(capabilities.activate(owner.context, capability.id)).resolves.toMatchObject({ capabilityStatus: 'ACTIVE', confirmationStatus: 'UNCONFIRMED' });
    await expectCode(capabilities.activate(owner.context, capability.id), 'CONFLICT');
  });

  test('L2 capability retire allows only ACTIVE and RETIRED is terminal', async () => {
    const owner = await organization('capability-retire');
    const planned = await capabilities.create(owner.context, { organizationId: owner.organizationId, capabilityKey: 'retire', name: 'Retire', categoryKey: 'test' });
    await expectCode(capabilities.retire(owner.context, planned.id, 'too early'), 'CONFLICT');
    await capabilities.activate(owner.context, planned.id);
    await expect(capabilities.retire(owner.context, planned.id, 'retire active')).resolves.toMatchObject({ capabilityStatus: 'RETIRED' });
    await expectCode(capabilities.retire(owner.context, planned.id, 'retire twice'), 'CONFLICT');
    await expectCode(capabilities.activate(owner.context, planned.id), 'CONFLICT');
  });

  test('L2 capability activation enforces permission and organization scope', async () => {
    const a = await organization('capability-scope-a');
    const b = await organization('capability-scope-b');
    const capability = await capabilities.create(a.context, { organizationId: a.organizationId, capabilityKey: 'scoped', name: 'Scoped', categoryKey: 'test' });
    await expectCode(capabilities.activate(b.context, capability.id), 'VALIDATION_FAILED');
    const grant = await prisma.permissionGrant.findFirstOrThrow({ where: { organizationId: a.organizationId, membershipId: a.membership.id, permissionKey: 'capability.manage', grantStatus: 'ACTIVE' } });
    await grants.revoke(a.context, grant.id, 'permission test');
    await expectCode(capabilities.activate(a.context, capability.id), 'AUTHORIZATION_DENIED');
  });

  test('L3 end to end lifecycle controls public export visibility', async () => {
    const owner = await organization('end-to-end');
    const { profile } = await linkedDraftProfile(owner, 'end-to-end');
    await profiles.activate(owner.context, profile.id);
    const capability = await capabilities.create(owner.context, { organizationId: owner.organizationId, capabilityKey: 'visible', name: 'Visible capability', categoryKey: 'test', audience: CapabilityAudience.CUSTOMER_FACING });
    await capabilities.confirm(owner.context, capability.id);
    await capabilities.activate(owner.context, capability.id);
    await publications.publish(owner.context, 'BUSINESS_PROFILE', profile.id, 'lifecycle e2e');
    await publications.publish(owner.context, 'CAPABILITY', capability.id, 'lifecycle e2e');

    const first = await buildPublicExport(prisma, { asOf: new Date(Date.now() + 1000), keyId: 'test-key', signingKeyProvider });
    const record = first.artifact.records.find((item) => item.business.organization_id === owner.organizationId);
    expect(record).toBeDefined();
    expect(record?.capabilities.map((item) => item.capability_id)).toContain(capability.id);

    await capabilities.retire(owner.context, capability.id, 'retire from export');
    const afterRetire = await buildPublicExport(prisma, { asOf: new Date(Date.now() + 2000), keyId: 'test-key', signingKeyProvider });
    expect(afterRetire.artifact.records.find((item) => item.business.organization_id === owner.organizationId)?.capabilities).toEqual([]);

    await profiles.archive(owner.context, profile.id, 'archive from export');
    const afterArchive = await buildPublicExport(prisma, { asOf: new Date(Date.now() + 3000), keyId: 'test-key', signingKeyProvider });
    expect(afterArchive.artifact.records.some((item) => item.business.organization_id === owner.organizationId)).toBe(false);
  });
});
