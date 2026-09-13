import { PrismaClient } from '@prisma/client';
import { AuthContext, requireActiveMembership, requireMembershipPermission, requireNonEmpty, requireSameOrganization, validateAuthContext } from './auth-context';
import { mapCoreDatabaseError } from './error-adapter';
import { CoreDomainError, conflict, validationFailed } from './errors';
import { PlatformIdentityVerifier, requireVerifiedPlatformActor } from './platform-identity-verifier';
import { expireOpenVerificationAttempts, lockOrganization, memberOrganizationMissingError } from './repositories';

export interface SubmitIdentityClaimInput {
  organizationId: string;
  identifierType: string;
  identifierValue: string;
}

export type PlatformClaimTransition = 'SUSPENDED' | 'REJECTED' | 'EXPIRED';

export class IdentityClaimService {
  constructor(private readonly db: PrismaClient, private readonly verifier?: PlatformIdentityVerifier) {}

  async submit(context: AuthContext, input: SubmitIdentityClaimInput) {
    validateAuthContext(context);
    requireSameOrganization(context, input.organizationId);
    requireNonEmpty(input.identifierType, 'identifierType');
    requireNonEmpty(input.identifierValue, 'identifierValue');
    return this.db.$transaction(async (tx) => {
      await lockOrganization(tx, context.organizationId, memberOrganizationMissingError());
      const actor = await requireMembershipPermission(tx, context, 'identity_claim.submit');
      return tx.businessIdentityClaim.create({
        data: {
          organizationId: context.organizationId,
          identifierType: input.identifierType,
          identifierValue: input.identifierValue,
          claimStatus: 'PENDING',
          submittedByMembershipId: actor.id,
        },
      });
    }).catch((error: unknown) => {
      throw error instanceof CoreDomainError ? error : mapCoreDatabaseError(error);
    });
  }

  async read(context: AuthContext, claimId: string, organizationId = context.organizationId) {
    validateAuthContext(context);
    requireNonEmpty(claimId, 'claimId');
    requireNonEmpty(organizationId, 'organizationId');
    return this.db.$transaction(async (tx) => {
      await requireActiveMembership(tx, { ...context, organizationId });
      return tx.businessIdentityClaim.findUnique({ where: { id_organizationId: { id: claimId, organizationId } } });
    }).catch((error: unknown) => {
      throw error instanceof CoreDomainError ? error : mapCoreDatabaseError(error);
    });
  }

  async transition(platformCredential: string | undefined, organizationId: string, claimId: string, nextStatus: PlatformClaimTransition, reason: string) {
    const actor = await requireVerifiedPlatformActor(this.verifier, platformCredential);
    requireNonEmpty(organizationId, 'organizationId');
    requireNonEmpty(claimId, 'claimId');
    requireNonEmpty(reason, 'reason');
    return this.db.$transaction(async (tx) => {
      await lockOrganization(tx, organizationId);
      const claim = await tx.businessIdentityClaim.findUnique({ where: { id_organizationId: { id: claimId, organizationId } } });
      if (!claim) throw validationFailed('identity claim not found in organization');
      if (!isAllowedPlatformTransition(claim.claimStatus, nextStatus)) throw conflict('identity claim transition is not allowed');
      const changedAt = new Date();
      await expireOpenVerificationAttempts(tx, organizationId, claimId, nextStatus, actor.ref, changedAt);
      return tx.businessIdentityClaim.update({
        where: { id_organizationId: { id: claimId, organizationId } },
        data: {
          claimStatus: nextStatus,
          statusChangedByPlatformIdentityRef: actor.ref,
          statusChangeReason: reason,
          statusChangedAt: changedAt,
        },
      });
    }).catch((error: unknown) => {
      throw error instanceof CoreDomainError ? error : mapCoreDatabaseError(error);
    });
  }
}

function isAllowedPlatformTransition(current: string, next: PlatformClaimTransition): boolean {
  if (next === 'SUSPENDED') return current === 'VERIFIED';
  if (next === 'REJECTED') return current === 'SUSPENDED';
  if (next === 'EXPIRED') return current === 'PENDING' || current === 'VERIFIED' || current === 'SUSPENDED';
  return false;
}
