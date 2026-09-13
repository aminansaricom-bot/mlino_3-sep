import { PrismaClient } from '@prisma/client';
import { AuthContext, requireMembershipPermission, requireNonEmpty, requirePlatformIdentity } from './auth-context';
import { authorizationDenied, conflict, validationFailed } from './errors';
import { GRANT_ADMIN_PERMISSION, isCorePermissionKey } from './permission-registry';
import { MembershipRepository, PermissionGrantRepository } from './repositories';

export class PermissionGrantService {
  constructor(private readonly db: PrismaClient) {}
  async issue(context: AuthContext, targetMembershipId: string, permissionKey: string, reason?: string) {
    requireNonEmpty(targetMembershipId, 'targetMembershipId'); requireNonEmpty(permissionKey, 'permissionKey'); if (!isCorePermissionKey(permissionKey)) throw validationFailed('permission key is not in the Core registry');
    return this.db.$transaction(async (tx) => {
      const actor = await requireMembershipPermission(tx, context, GRANT_ADMIN_PERMISSION); const target = await new MembershipRepository(tx).findById(context.organizationId, targetMembershipId); if (!target) throw validationFailed('membership not found in organization');
      if (targetMembershipId === actor.id) throw authorizationDenied('self-grant is forbidden');
      if (!(await new PermissionGrantRepository(tx).findActiveForMembership(context.organizationId, actor.id, permissionKey))) throw authorizationDenied('grantor does not hold the permission being granted');
      return new PermissionGrantRepository(tx).createMemberGrant(context.organizationId, targetMembershipId, permissionKey, actor.id, reason);
    });
  }
  async revoke(context: AuthContext, grantId: string, reason: string) {
    requireNonEmpty(grantId, 'grantId'); requireNonEmpty(reason, 'reason');
    return this.db.$transaction(async (tx) => {
      const grants = new PermissionGrantRepository(tx); const grant = await grants.findById(context.organizationId, grantId); if (!grant || grant.grantStatus !== 'ACTIVE') throw validationFailed('active grant not found in organization');
      if (grant.permissionKey === GRANT_ADMIN_PERMISSION && (await grants.countActiveForKey(context.organizationId, GRANT_ADMIN_PERMISSION)) <= 1) throw conflict('revoking the last grant administrator is forbidden');
      if (context.platformIdentityRef) return grants.revokeByPlatform(context.organizationId, grantId, requirePlatformIdentity(context), reason);
      const actor = await requireMembershipPermission(tx, context, 'permission_grant.revoke'); return grants.revokeByMembership(context.organizationId, grantId, actor.id, reason);
    });
  }
}
