import { runCoreTransaction } from './transaction';
import { Prisma, PrismaClient } from '@prisma/client';
import { AuthContext, requireMembershipPermission, requireNonEmpty, requireSameOrganization, validateAuthContext } from './auth-context';
import { mapCoreDatabaseError } from './error-adapter';
import { CoreDomainError, conflict, validationFailed } from './errors';
import { PlatformIdentityVerifier, requireVerifiedPlatformActor } from './platform-identity-verifier';
import { expireOpenVerificationAttempts, lockIdentityClaim, lockOrganization, memberOrganizationMissingError } from './repositories';

export type VerificationDecision = 'VERIFIED' | 'REJECTED';

export interface StartVerificationInput {
  organizationId: string;
  claimId: string;
  methodKey: string;
  evidenceLocator?: Prisma.InputJsonValue;
}

export interface DecideVerificationInput {
  organizationId: string;
  verificationId: string;
  decision: VerificationDecision;
  decisionReason: string;
}

export class IdentityVerificationService {
  constructor(private readonly db: PrismaClient, private readonly verifier?: PlatformIdentityVerifier) {}

  async start(context: AuthContext, input: StartVerificationInput) {
    validateAuthContext(context);
    requireSameOrganization(context, input.organizationId);
    requireNonEmpty(input.claimId, 'claimId');
    requireNonEmpty(input.methodKey, 'methodKey');
    const applicationNow = new Date(); // single-clock rule: application time is authoritative for lifecycle timestamps
    return runCoreTransaction(this.db, async (tx) => {
      await lockOrganization(tx, context.organizationId, memberOrganizationMissingError());
      await requireMembershipPermission(tx, context, 'identity_verification.start');
      await lockIdentityClaim(tx, context.organizationId, input.claimId);
      const claim = await tx.businessIdentityClaim.findUnique({ where: { id_organizationId: { id: input.claimId, organizationId: context.organizationId } } });
      if (!claim || !['PENDING', 'SUSPENDED'].includes(claim.claimStatus)) throw validationFailed('identity claim is not eligible for verification');
      const latest = await tx.identityVerification.aggregate({ where: { claimId: input.claimId, organizationId: context.organizationId }, _max: { attemptNumber: true } });
      const attemptNumber = (latest._max.attemptNumber ?? 0) + 1;
      return tx.identityVerification.create({
        data: {
          organizationId: context.organizationId,
          claimId: input.claimId,
          attemptNumber,
          methodKey: input.methodKey,
          evidenceLocator: input.evidenceLocator,
          status: 'PENDING',
          startedAt: applicationNow,
        },
      });
    }).catch((error: unknown) => {
      throw error instanceof CoreDomainError ? error : mapCoreDatabaseError(error);
    });
  }

  async markUnderReview(platformCredential: string | undefined, organizationId: string, verificationId: string) {
    await requireVerifiedPlatformActor(this.verifier, platformCredential);
    requireNonEmpty(organizationId, 'organizationId');
    requireNonEmpty(verificationId, 'verificationId');
    return runCoreTransaction(this.db, async (tx) => {
      await lockOrganization(tx, organizationId);
      const attempt = await tx.identityVerification.findUnique({ where: { id_organizationId: { id: verificationId, organizationId } } });
      if (!attempt) throw validationFailed('verification attempt not found in organization');
      await lockIdentityClaim(tx, organizationId, attempt.claimId);
      if (attempt.status !== 'PENDING') throw conflict('verification attempt is not pending');
      return tx.identityVerification.update({ where: { id_organizationId: { id: verificationId, organizationId } }, data: { status: 'UNDER_REVIEW' } });
    }).catch((error: unknown) => {
      throw error instanceof CoreDomainError ? error : mapCoreDatabaseError(error);
    });
  }

  async decide(platformCredential: string | undefined, input: DecideVerificationInput) {
    const actor = await requireVerifiedPlatformActor(this.verifier, platformCredential);
    requireNonEmpty(input.organizationId, 'organizationId');
    requireNonEmpty(input.verificationId, 'verificationId');
    requireNonEmpty(input.decisionReason, 'decisionReason');
    if (input.decision !== 'VERIFIED' && input.decision !== 'REJECTED') throw validationFailed('decision must be VERIFIED or REJECTED');
    return runCoreTransaction(this.db, async (tx) => {
      await lockOrganization(tx, input.organizationId);
      const attempt = await tx.identityVerification.findUnique({ where: { id_organizationId: { id: input.verificationId, organizationId: input.organizationId } } });
      if (!attempt) throw validationFailed('verification attempt not found in organization');
      await lockIdentityClaim(tx, input.organizationId, attempt.claimId);
      const claim = await tx.businessIdentityClaim.findUnique({ where: { id_organizationId: { id: attempt.claimId, organizationId: input.organizationId } } });
      if (!claim || !['PENDING', 'SUSPENDED'].includes(claim.claimStatus)) throw conflict('identity claim is not eligible for a verification decision');
      if (!['PENDING', 'UNDER_REVIEW'].includes(attempt.status)) throw conflict('verification attempt is not decidable');
      if (claim.claimStatus === 'SUSPENDED' && (!claim.statusChangedAt || attempt.startedAt <= claim.statusChangedAt)) throw conflict('reinstatement requires a new verification attempt');
      const decidedAt = new Date();
      const updatedAttempt = await tx.identityVerification.update({
        where: { id_organizationId: { id: input.verificationId, organizationId: input.organizationId } },
        data: { status: input.decision, reviewedByPlatformIdentityRef: actor.ref, decisionReason: input.decisionReason, decidedAt },
      });
      await tx.businessIdentityClaim.update({
        where: { id_organizationId: { id: attempt.claimId, organizationId: input.organizationId } },
        data: {
          claimStatus: input.decision,
          verifiedAt: input.decision === 'VERIFIED' ? decidedAt : claim.verifiedAt,
          statusChangedByPlatformIdentityRef: actor.ref,
          statusChangeReason: input.decisionReason,
          statusChangedAt: decidedAt,
        },
      });
      await expireOpenVerificationAttempts(tx, input.organizationId, attempt.claimId, input.decision, actor.ref, decidedAt);
      return updatedAttempt;
    }).catch((error: unknown) => {
      throw error instanceof CoreDomainError ? error : mapCoreDatabaseError(error);
    });
  }
}
