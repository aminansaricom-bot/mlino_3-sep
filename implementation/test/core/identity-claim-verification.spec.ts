import { prisma } from '../../foundation/prisma-client';
import { AuthContext, CORE_AUTH_ISSUER } from '../../core/auth-context';
import { BootstrapService } from '../../core/bootstrap-service';
import { CoreDomainError } from '../../core/errors';
import { IdentityClaimService } from '../../core/identity-claim-service';
import { IdentityVerificationService } from '../../core/identity-verification-service';
import { MembershipService } from '../../core/membership-service';
import { PlatformIdentityVerifier } from '../../core/platform-identity-verifier';
import { assertDisposableDatabase } from './db-guard';

const TEST_PREFIX = 'g10b-';

class FakePlatformIdentityVerifier implements PlatformIdentityVerifier {
  async verify(credential: string) {
    if (credential !== 'platform-token') throw new Error('invalid platform credential');
    return { ref: 'platform:g10b' };
  }
}

function contextFor(membership: { id: string; identityProvider: string; externalSubject: string }, organizationId: string): AuthContext {
  return { issuer: CORE_AUTH_ISSUER, organizationId, identityProvider: membership.identityProvider, externalSubject: membership.externalSubject, membershipId: membership.id };
}

function expectDomainFailure(action: Promise<unknown>, code: CoreDomainError['code'], message?: string): Promise<void> {
  const expected = message ? { name: 'CoreDomainError', code, message } : { name: 'CoreDomainError', code };
  return expect(action).rejects.toMatchObject(expected);
}

describe('G10b identity claim and verification slice', () => {
  const verifier = new FakePlatformIdentityVerifier();
  const bootstrap = new BootstrapService(prisma, verifier);
  const claims = new IdentityClaimService(prisma, verifier);
  const verifications = new IdentityVerificationService(prisma, verifier);
  let sequence = 0;

  beforeAll(async () => {
    await assertDisposableDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function setup(tag: string) {
    sequence += 1;
    const organizationId = `${TEST_PREFIX}${tag}-${Date.now()}-${sequence}-${Math.random().toString(36).slice(2, 8)}`;
    const result = await bootstrap.execute('platform-token', { organizationId, displayName: organizationId, foundingIdentityProvider: 'test-idp', foundingExternalSubject: 'owner' });
    return { organizationId, owner: contextFor(result.foundingMembership, organizationId), membership: result.foundingMembership };
  }

  async function submitClaim(context: AuthContext, organizationId: string, identifier = `${organizationId}-identifier`) {
    return claims.submit(context, { organizationId, identifierType: 'registration', identifierValue: identifier });
  }

  async function verifyClaim(organizationId: string, context: AuthContext, claimId: string, decision: 'VERIFIED' | 'REJECTED' = 'VERIFIED') {
    const attempt = await verifications.start(context, { organizationId, claimId, methodKey: 'document' });
    await verifications.markUnderReview('platform-token', organizationId, attempt.id);
    return verifications.decide('platform-token', { organizationId, verificationId: attempt.id, decision, decisionReason: `decision-${decision}` });
  }

  async function prepareStatus(organizationId: string, context: AuthContext, claimId: string, status: 'PENDING' | 'VERIFIED' | 'SUSPENDED' | 'REJECTED' | 'EXPIRED') {
    if (status === 'PENDING') return;
    if (status === 'VERIFIED' || status === 'REJECTED') {
      await verifyClaim(organizationId, context, claimId, status);
      return;
    }
    if (status === 'EXPIRED') {
      await claims.transition('platform-token', organizationId, claimId, 'EXPIRED', 'expired for test');
      return;
    }
    await verifyClaim(organizationId, context, claimId, 'VERIFIED');
    await claims.transition('platform-token', organizationId, claimId, 'SUSPENDED', 'suspended for test');
  }

  it.each([
    ['PENDING', 'EXPIRED'],
    ['VERIFIED', 'SUSPENDED'],
    ['VERIFIED', 'EXPIRED'],
    ['SUSPENDED', 'REJECTED'],
    ['SUSPENDED', 'EXPIRED'],
  ] as const)('allows the claim transition %s -> %s', async (from, to) => {
    const setupResult = await setup(`allowed-${from}-${to}`);
    const claim = await submitClaim(setupResult.owner, setupResult.organizationId);
    await prepareStatus(setupResult.organizationId, setupResult.owner, claim.id, from);
    const updated = await claims.transition('platform-token', setupResult.organizationId, claim.id, to, 'allowed transition');
    expect(updated.claimStatus).toBe(to);
  });

  it.each([
    ['PENDING', 'SUSPENDED'],
    ['PENDING', 'REJECTED'],
    ['PENDING', 'VERIFIED'],
    ['VERIFIED', 'REJECTED'],
    ['SUSPENDED', 'SUSPENDED'],
    ['SUSPENDED', 'VERIFIED'],
    ['REJECTED', 'EXPIRED'],
    ['EXPIRED', 'SUSPENDED'],
  ] as const)('rejects the forbidden claim transition %s -> %s', async (from, to) => {
    const setupResult = await setup(`forbidden-${from}-${to}`);
    const claim = await submitClaim(setupResult.owner, setupResult.organizationId);
    await prepareStatus(setupResult.organizationId, setupResult.owner, claim.id, from);
    const transition = claims.transition as unknown as (credential: string, organizationId: string, claimId: string, nextStatus: string, reason: string) => Promise<unknown>;
    await expectDomainFailure(transition.call(claims, 'platform-token', setupResult.organizationId, claim.id, to, 'forbidden transition'), 'CONFLICT');
  });

  it('enforces S12-A through verification decisions and keeps terminal claims terminal', async () => {
    const suspended = await setup('s12-suspended');
    const suspendedClaim = await submitClaim(suspended.owner, suspended.organizationId);
    await verifyClaim(suspended.organizationId, suspended.owner, suspendedClaim.id);
    await claims.transition('platform-token', suspended.organizationId, suspendedClaim.id, 'SUSPENDED', 'temporary suspension');
    const resumedAttempt = await verifications.start(suspended.owner, { organizationId: suspended.organizationId, claimId: suspendedClaim.id, methodKey: 'renewed-document' });
    await verifications.markUnderReview('platform-token', suspended.organizationId, resumedAttempt.id);
    const resumed = await verifications.decide('platform-token', { organizationId: suspended.organizationId, verificationId: resumedAttempt.id, decision: 'VERIFIED', decisionReason: 'renewed verification' });
    expect(resumed.status).toBe('VERIFIED');

    const rejected = await setup('terminal-rejected');
    const rejectedClaim = await submitClaim(rejected.owner, rejected.organizationId, 'terminal-rejected-id');
    await verifyClaim(rejected.organizationId, rejected.owner, rejectedClaim.id, 'REJECTED');
    const rejectedReplacement = await submitClaim(rejected.owner, rejected.organizationId, 'terminal-rejected-id');
    expect(rejectedReplacement.id).not.toBe(rejectedClaim.id);

    const expired = await setup('terminal-expired');
    const expiredClaim = await submitClaim(expired.owner, expired.organizationId, 'terminal-expired-id');
    await claims.transition('platform-token', expired.organizationId, expiredClaim.id, 'EXPIRED', 'expired');
    const expiredReplacement = await submitClaim(expired.owner, expired.organizationId, 'terminal-expired-id');
    expect(expiredReplacement.id).not.toBe(expiredClaim.id);
  });

  it('rejects direct platform changes without a verified platform actor and blocks members from deciding', async () => {
    const setupResult = await setup('platform-fail-closed');
    const claim = await submitClaim(setupResult.owner, setupResult.organizationId);
    await expectDomainFailure(claims.transition(undefined, setupResult.organizationId, claim.id, 'EXPIRED', 'no actor'), 'AUTHORIZATION_DENIED');
    const attempt = await verifications.start(setupResult.owner, { organizationId: setupResult.organizationId, claimId: claim.id, methodKey: 'document' });
    await expectDomainFailure(verifications.decide(undefined, { organizationId: setupResult.organizationId, verificationId: attempt.id, decision: 'VERIFIED', decisionReason: 'member attempt' }), 'AUTHORIZATION_DENIED');
    await expectDomainFailure(verifications.markUnderReview('wrong-token', setupResult.organizationId, attempt.id), 'AUTHORIZATION_DENIED');
  });

  it('expires every open attempt on a claim status change and rejects the stale S12-A decision', async () => {
    const setupResult = await setup('stale-attempt');
    const claim = await submitClaim(setupResult.owner, setupResult.organizationId);
    const firstAttempt = await verifications.start(setupResult.owner, { organizationId: setupResult.organizationId, claimId: claim.id, methodKey: 'a1' });
    const staleAttempt = await verifications.start(setupResult.owner, { organizationId: setupResult.organizationId, claimId: claim.id, methodKey: 'a2' });
    await verifications.markUnderReview('platform-token', setupResult.organizationId, firstAttempt.id);
    await verifications.decide('platform-token', { organizationId: setupResult.organizationId, verificationId: firstAttempt.id, decision: 'VERIFIED', decisionReason: 'A1 verified' });
    await claims.transition('platform-token', setupResult.organizationId, claim.id, 'SUSPENDED', 'temporary suspension');
    const expired = await prisma.identityVerification.findUnique({ where: { id_organizationId: { id: staleAttempt.id, organizationId: setupResult.organizationId } } });
    expect(expired).toMatchObject({ status: 'EXPIRED', decisionReason: 'superseded: claim VERIFIED' });
    await expectDomainFailure(verifications.decide('platform-token', { organizationId: setupResult.organizationId, verificationId: staleAttempt.id, decision: 'VERIFIED', decisionReason: 'stale decision' }), 'CONFLICT');
    const fresh = await verifications.start(setupResult.owner, { organizationId: setupResult.organizationId, claimId: claim.id, methodKey: 'fresh-document' });
    await verifications.markUnderReview('platform-token', setupResult.organizationId, fresh.id);
    await expect(verifications.decide('platform-token', { organizationId: setupResult.organizationId, verificationId: fresh.id, decision: 'VERIFIED', decisionReason: 'fresh decision' })).resolves.toMatchObject({ status: 'VERIFIED' });
  });

  it('expires open attempts when a claim transitions to EXPIRED', async () => {
    const setupResult = await setup('expire-open');
    const claim = await submitClaim(setupResult.owner, setupResult.organizationId);
    const first = await verifications.start(setupResult.owner, { organizationId: setupResult.organizationId, claimId: claim.id, methodKey: 'pending-a' });
    const second = await verifications.start(setupResult.owner, { organizationId: setupResult.organizationId, claimId: claim.id, methodKey: 'pending-b' });
    await claims.transition('platform-token', setupResult.organizationId, claim.id, 'EXPIRED', 'expired claim');
    const attempts = await prisma.identityVerification.findMany({ where: { organizationId: setupResult.organizationId, claimId: claim.id, id: { in: [first.id, second.id] } } });
    expect(attempts).toHaveLength(2);
    expect(attempts.every((attempt) => attempt.status === 'EXPIRED' && attempt.decisionReason === 'superseded: claim EXPIRED')).toBe(true);
  });

  it('rejects invalid decisions, non-pending review transitions, and already-decided attempts', async () => {
    const setupResult = await setup('runtime-validation');
    const claim = await submitClaim(setupResult.owner, setupResult.organizationId);
    const attempt = await verifications.start(setupResult.owner, { organizationId: setupResult.organizationId, claimId: claim.id, methodKey: 'document' });
    await verifications.markUnderReview('platform-token', setupResult.organizationId, attempt.id);
    await expectDomainFailure(verifications.markUnderReview('platform-token', setupResult.organizationId, attempt.id), 'CONFLICT');
    await expectDomainFailure(verifications.decide('platform-token', { organizationId: setupResult.organizationId, verificationId: attempt.id, decision: 'UNKNOWN' as never, decisionReason: 'invalid' }), 'VALIDATION_FAILED');
    await verifications.decide('platform-token', { organizationId: setupResult.organizationId, verificationId: attempt.id, decision: 'REJECTED', decisionReason: 'final decision' });
    await expectDomainFailure(verifications.decide('platform-token', { organizationId: setupResult.organizationId, verificationId: attempt.id, decision: 'REJECTED', decisionReason: 'second decision' }), 'CONFLICT');
  });

  it('enforces W1 across organizations and allows read only for an active membership', async () => {
    const first = await setup('w1-first');
    const second = await setup('w1-second');
    const claim = await submitClaim(first.owner, first.organizationId);
    await expectDomainFailure(claims.submit(second.owner, { organizationId: first.organizationId, identifierType: 'registration', identifierValue: 'cross-org' }), 'TENANT_MISMATCH');
    await expectDomainFailure(verifications.start(second.owner, { organizationId: first.organizationId, claimId: claim.id, methodKey: 'cross-org' }), 'TENANT_MISMATCH');
    await expectDomainFailure(claims.read(second.owner, claim.id, first.organizationId), 'AUTHORIZATION_DENIED');
    expect((await claims.read(first.owner, claim.id))?.id).toBe(claim.id);
  });

  it('assigns distinct attempt numbers under concurrent starts', async () => {
    const setupResult = await setup('concurrent-start');
    const claim = await submitClaim(setupResult.owner, setupResult.organizationId);
    const attempts = await Promise.all([
      verifications.start(setupResult.owner, { organizationId: setupResult.organizationId, claimId: claim.id, methodKey: 'document-a' }),
      verifications.start(setupResult.owner, { organizationId: setupResult.organizationId, claimId: claim.id, methodKey: 'document-b' }),
    ]);
    expect(attempts.map((attempt) => attempt.attemptNumber).sort()).toEqual([1, 2]);
  });

  it('maps C1 across organizations and rolls the verification decision back with the claim update', async () => {
    const first = await setup('c1-first');
    const sharedIdentifier = `shared-identifier-${Date.now()}-${sequence}`;
    const firstClaim = await submitClaim(first.owner, first.organizationId, sharedIdentifier);
    await verifyClaim(first.organizationId, first.owner, firstClaim.id);
    const second = await setup('c1-second');
    const secondClaim = await submitClaim(second.owner, second.organizationId, sharedIdentifier);
    const secondAttempt = await verifications.start(second.owner, { organizationId: second.organizationId, claimId: secondClaim.id, methodKey: 'document' });
    await expectDomainFailure(verifications.decide('platform-token', { organizationId: second.organizationId, verificationId: secondAttempt.id, decision: 'VERIFIED', decisionReason: 'duplicate identifier' }), 'CONFLICT', 'identifier already claimed');
    expect((await prisma.identityVerification.findUnique({ where: { id_organizationId: { id: secondAttempt.id, organizationId: second.organizationId } } }))?.status).toBe('PENDING');
    expect((await prisma.businessIdentityClaim.findUnique({ where: { id_organizationId: { id: secondClaim.id, organizationId: second.organizationId } } }))?.claimStatus).toBe('PENDING');
  });

  it('maps decided verification immutability to CONFLICT', async () => {
    const setupResult = await setup('immutable-attempt');
    const claim = await submitClaim(setupResult.owner, setupResult.organizationId);
    const attempt = await verifyClaim(setupResult.organizationId, setupResult.owner, claim.id);
    let mapped: CoreDomainError | undefined;
    try {
      await prisma.identityVerification.update({ where: { id_organizationId: { id: attempt.id, organizationId: setupResult.organizationId } }, data: { decisionReason: 'tamper' } });
    } catch (error) {
      const { mapCoreDatabaseError } = await import('../../core/error-adapter');
      mapped = mapCoreDatabaseError(error);
    }
    expect(mapped).toMatchObject({ code: 'CONFLICT', message: 'identity verification is immutable' });
  });
});
