import { Prisma, PrismaClient } from '@prisma/client';
import { CoreDomainError, authorizationDenied, validationFailed } from './errors';

export type CoreDb = PrismaClient | Prisma.TransactionClient;

export async function lockOrganization(db: Prisma.TransactionClient, organizationId: string, missingError: CoreDomainError = validationFailed('organization not found')): Promise<void> {
  const rows = await db.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM organizations WHERE id = ${organizationId} FOR UPDATE`);
  if (rows.length !== 1) throw missingError;
}

export const memberOrganizationMissingError = () => authorizationDenied('active organization membership required');

export class OrganizationRepository {
  constructor(private readonly db: CoreDb) {}

  findById(organizationId: string) {
    return this.db.organization.findUnique({ where: { id: organizationId } });
  }

  create(organizationId: string, displayName: string) {
    return this.db.organization.create({ data: { id: organizationId, displayName } });
  }
}

export class MembershipRepository {
  constructor(private readonly db: CoreDb) {}

  findById(organizationId: string, id: string) {
    return this.db.membership.findUnique({ where: { id_organizationId: { id, organizationId } } });
  }

  findActiveBySubject(organizationId: string, identityProvider: string, externalSubject: string) {
    return this.db.membership.findFirst({ where: { organizationId, identityProvider, externalSubject, membershipStatus: 'ACTIVE' } });
  }

  create(organizationId: string, data: { identityProvider: string; externalSubject: string }) {
    return this.db.membership.create({ data: { organizationId, ...data } });
  }
}

export class PermissionGrantRepository {
  constructor(private readonly db: CoreDb) {}

  findById(organizationId: string, id: string) {
    return this.db.permissionGrant.findUnique({ where: { id_organizationId: { id, organizationId } } });
  }

  findActiveForMembership(organizationId: string, membershipId: string, permissionKey: string) {
    return this.db.permissionGrant.findFirst({ where: { organizationId, membershipId, permissionKey, grantStatus: 'ACTIVE' } });
  }

  countActiveForKey(organizationId: string, permissionKey: string) {
    return this.db.permissionGrant.count({ where: { organizationId, permissionKey, grantStatus: 'ACTIVE', membership: { membershipStatus: 'ACTIVE' } } });
  }

  createMemberGrant(organizationId: string, membershipId: string, permissionKey: string, grantedByMembershipId: string, reason?: string) {
    return this.db.permissionGrant.create({ data: { organizationId, membershipId, permissionKey, grantStatus: 'ACTIVE', basisKey: 'member_grant', grantedByMembershipId, grantedByOrganizationId: organizationId, reason } });
  }

  revokeByMembership(organizationId: string, id: string, membershipId: string, reason: string) {
    return this.db.permissionGrant.update({ where: { id_organizationId: { id, organizationId } }, data: { grantStatus: 'REVOKED', revokedAt: new Date(), revokedByMembershipId: membershipId, revokedByOrganizationId: organizationId, revocationReason: reason } });
  }

  revokeByPlatform(organizationId: string, id: string, platformIdentityRef: string, reason: string) {
    return this.db.permissionGrant.update({ where: { id_organizationId: { id, organizationId } }, data: { grantStatus: 'REVOKED', revokedAt: new Date(), revokedByPlatformIdentityRef: platformIdentityRef, revocationReason: reason } });
  }
}
