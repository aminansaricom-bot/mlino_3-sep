import { runCoreTransaction } from './transaction';
import { PrismaClient } from '@prisma/client';
import { AuthContext, requireMembershipPermission, requireNonEmpty, requireSameOrganization, validateAuthContext } from './auth-context';
import { CoreDomainError, conflict, validationFailed } from './errors';
import { mapCoreDatabaseError } from './error-adapter';
import { PlatformIdentityVerifier, requireVerifiedPlatformActor } from './platform-identity-verifier';
import { lockOrganization, memberOrganizationMissingError, MembershipRepository, PermissionGrantRepository } from './repositories';

export interface CreateMembershipInput {
  organizationId: string;
  identityProvider: string;
  externalSubject: string;
}

export class MembershipService {
  constructor(private readonly db: PrismaClient, private readonly verifier?: PlatformIdentityVerifier) {}
  async create(context: AuthContext, input: CreateMembershipInput) {
    requireSameOrganization(context, input.organizationId);
    requireNonEmpty(input.identityProvider, 'identityProvider');
    requireNonEmpty(input.externalSubject, 'externalSubject');
    return runCoreTransaction(this.db, async (tx) => {
      await lockOrganization(tx, context.organizationId, memberOrganizationMissingError());
      await requireMembershipPermission(tx, context, 'membership.create');
      return new MembershipRepository(tx).create(context.organizationId, { identityProvider: input.identityProvider, externalSubject: input.externalSubject });
    }).catch((error: unknown) => {
      throw error instanceof CoreDomainError ? error : mapCoreDatabaseError(error);
    });
  }
  async revoke(context: AuthContext, targetMembershipId: string, reason: string) {
    validateAuthContext(context);
    requireNonEmpty(targetMembershipId, 'targetMembershipId');
    requireNonEmpty(reason, 'reason');
    return this.revokeMember(context, targetMembershipId, reason);
  }

  private async revokeMember(context: AuthContext, targetMembershipId: string, reason: string) {
    return runCoreTransaction(this.db, async (tx) => {
      await lockOrganization(tx, context.organizationId, memberOrganizationMissingError());
      const actor = await requireMembershipPermission(tx, context, 'membership.revoke');
      const memberships = new MembershipRepository(tx);
      const target = await memberships.findById(context.organizationId, targetMembershipId);
      if (!target) throw validationFailed('membership not found in organization');
      if (target.membershipStatus !== 'ACTIVE') throw conflict('membership is already revoked');
      const admins = await new PermissionGrantRepository(tx).countActiveForKey(context.organizationId, 'permission_grant.issue');
      const targetAdmin = await new PermissionGrantRepository(tx).findActiveForMembership(context.organizationId, targetMembershipId, 'permission_grant.issue');
      if (targetAdmin && admins <= 1) throw conflict('revoking the last grant administrator is forbidden');
      return tx.membership.update({ where: { id_organizationId: { id: targetMembershipId, organizationId: context.organizationId } }, data: { membershipStatus: 'REVOKED', revokedAt: new Date(), revokedByMembershipId: actor.id, revokedByOrganizationId: context.organizationId, revocationReason: reason } });
    }).catch((error: unknown) => {
      throw error instanceof CoreDomainError ? error : mapCoreDatabaseError(error);
    });
  }

  async revokeByPlatform(platformCredential: string | undefined, organizationId: string, targetMembershipId: string, reason: string) {
    const actor = await requireVerifiedPlatformActor(this.verifier, platformCredential);
    requireNonEmpty(targetMembershipId, 'targetMembershipId');
    requireNonEmpty(reason, 'reason');
    return runCoreTransaction(this.db, async (tx) => {
      await lockOrganization(tx, organizationId);
      const target = await new MembershipRepository(tx).findById(organizationId, targetMembershipId);
      if (!target) throw validationFailed('membership not found in organization');
      if (target.membershipStatus !== 'ACTIVE') throw conflict('membership is already revoked');
      const grants = new PermissionGrantRepository(tx);
      const admins = await grants.countActiveForKey(organizationId, 'permission_grant.issue');
      const targetAdmin = await grants.findActiveForMembership(organizationId, targetMembershipId, 'permission_grant.issue');
      if (targetAdmin && admins <= 1) throw conflict('revoking the last grant administrator is forbidden');
      return tx.membership.update({ where: { id_organizationId: { id: targetMembershipId, organizationId } }, data: { membershipStatus: 'REVOKED', revokedAt: new Date(), revokedByPlatformIdentityRef: actor.ref, revocationReason: reason } });
    }).catch((error: unknown) => {
      throw error instanceof CoreDomainError ? error : mapCoreDatabaseError(error);
    });
  }
}
