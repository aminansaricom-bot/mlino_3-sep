import { PrismaClient } from '@prisma/client';
import { AuthContext, requireMembershipPermission, requireNonEmpty, requirePlatformIdentity, requireSameOrganization } from './auth-context';
import { validationFailed } from './errors';
import { MembershipRepository } from './repositories';

export interface CreateMembershipInput { organizationId: string; identityProvider: string; externalSubject: string; }

export class MembershipService {
  constructor(private readonly db: PrismaClient) {}
  async create(context: AuthContext, input: CreateMembershipInput) {
    requireSameOrganization(context, input.organizationId); requireNonEmpty(input.identityProvider, 'identityProvider'); requireNonEmpty(input.externalSubject, 'externalSubject');
    return this.db.$transaction(async (tx) => { await requireMembershipPermission(tx, context, 'membership.create'); return new MembershipRepository(tx).create(context.organizationId, { identityProvider: input.identityProvider, externalSubject: input.externalSubject }); });
  }
  async revoke(context: AuthContext, targetMembershipId: string, reason: string) {
    requireNonEmpty(targetMembershipId, 'targetMembershipId'); requireNonEmpty(reason, 'reason');
    return this.db.$transaction(async (tx) => {
      const memberships = new MembershipRepository(tx); const target = await memberships.findById(context.organizationId, targetMembershipId); if (!target) throw validationFailed('membership not found in organization');
      if (context.platformIdentityRef) return tx.membership.update({ where: { id_organizationId: { id: targetMembershipId, organizationId: context.organizationId } }, data: { membershipStatus: 'REVOKED', revokedAt: new Date(), revokedByPlatformIdentityRef: requirePlatformIdentity(context), revocationReason: reason } });
      const actor = await requireMembershipPermission(tx, context, 'membership.revoke');
      return tx.membership.update({ where: { id_organizationId: { id: targetMembershipId, organizationId: context.organizationId } }, data: { membershipStatus: 'REVOKED', revokedAt: new Date(), revokedByMembershipId: actor.id, revokedByOrganizationId: context.organizationId, revocationReason: reason } });
    });
  }
}
