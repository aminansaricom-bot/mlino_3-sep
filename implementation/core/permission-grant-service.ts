import { PrismaClient } from '@prisma/client';
import { AuthContext, requireMembershipPermission, requireNonEmpty } from './auth-context';
import { CoreDomainError, authorizationDenied, conflict, validationFailed } from './errors';
import { mapCoreDatabaseError } from './error-adapter';
import { GRANT_ADMIN_PERMISSION, isCorePermissionKey } from './permission-registry';
import { lockOrganization, MembershipRepository, PermissionGrantRepository } from './repositories';
import { PlatformIdentityVerifier, requireVerifiedPlatformActor } from './platform-identity-verifier';

export class PermissionGrantService {
  constructor(private readonly db: PrismaClient, private readonly verifier?: PlatformIdentityVerifier) {}
  async issue(context: AuthContext, targetMembershipId: string, permissionKey: string, reason?: string) {
    requireNonEmpty(targetMembershipId, 'targetMembershipId');
    requireNonEmpty(permissionKey, 'permissionKey');
    if (!isCorePermissionKey(permissionKey)) throw validationFailed('permission key is not in the Core registry');
    return this.db.$transaction(async (tx) => {
      await lockOrganization(tx, context.organizationId);
      const actor = await requireMembershipPermission(tx, context, GRANT_ADMIN_PERMISSION);
      const target = await new MembershipRepository(tx).findById(context.organizationId, targetMembershipId);
      if (!target || target.membershipStatus !== 'ACTIVE') throw validationFailed('active membership required');
      if (targetMembershipId === actor.id) throw authorizationDenied('self-grant is forbidden');
      if (!(await new PermissionGrantRepository(tx).findActiveForMembership(context.organizationId, actor.id, permissionKey))) throw authorizationDenied('grantor does not hold the permission being granted');
      return new PermissionGrantRepository(tx).createMemberGrant(context.organizationId, targetMembershipId, permissionKey, actor.id, reason);
    }).catch((error: unknown) => {
      throw error instanceof CoreDomainError ? error : mapCoreDatabaseError(error);
    });
  }
  async revoke(context: AuthContext, grantId: string, reason: string) {
    requireNonEmpty(grantId, 'grantId');
    requireNonEmpty(reason, 'reason');
    return this.revokeMember(context, grantId, reason);
  }

  private async revokeMember(context: AuthContext, grantId: string, reason: string) {
    return this.db.$transaction(async (tx) => {
      await lockOrganization(tx, context.organizationId);
      const grants = new PermissionGrantRepository(tx);
      const grant = await grants.findById(context.organizationId, grantId);
      if (!grant || grant.grantStatus !== 'ACTIVE') throw conflict('grant is already revoked or missing');
      if (grant.permissionKey === GRANT_ADMIN_PERMISSION && (await grants.countActiveForKey(context.organizationId, GRANT_ADMIN_PERMISSION)) <= 1) throw conflict('revoking the last grant administrator is forbidden');
      const actor = await requireMembershipPermission(tx, context, 'permission_grant.revoke');
      return grants.revokeByMembership(context.organizationId, grantId, actor.id, reason);
    }).catch((error: unknown) => {
      throw error instanceof CoreDomainError ? error : mapCoreDatabaseError(error);
    });
  }

  async revokeByPlatform(platformCredential: string | undefined, organizationId: string, grantId: string, reason: string) {
    const actor = await requireVerifiedPlatformActor(this.verifier, platformCredential);
    requireNonEmpty(grantId, 'grantId');
    requireNonEmpty(reason, 'reason');
    return this.db.$transaction(async (tx) => {
      await lockOrganization(tx, organizationId);
      const grants = new PermissionGrantRepository(tx);
      const grant = await grants.findById(organizationId, grantId);
      if (!grant || grant.grantStatus !== 'ACTIVE') throw conflict('grant is already revoked or missing');
      if (grant.permissionKey === GRANT_ADMIN_PERMISSION && (await grants.countActiveForKey(organizationId, GRANT_ADMIN_PERMISSION)) <= 1) throw conflict('revoking the last grant administrator is forbidden');
      return grants.revokeByPlatform(organizationId, grantId, actor.ref, reason);
    }).catch((error: unknown) => {
      throw error instanceof CoreDomainError ? error : mapCoreDatabaseError(error);
    });
  }
}
