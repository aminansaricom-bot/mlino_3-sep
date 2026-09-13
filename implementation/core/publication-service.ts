import { Prisma, PrismaClient } from '@prisma/client';
import { AuthContext, requireActiveMembership, requireMembershipPermission, requireNonEmpty, validateAuthContext } from './auth-context';
import { mapCoreDatabaseError } from './error-adapter';
import { CoreDomainError, conflict, validationFailed } from './errors';
import { lockOrganization } from './repositories';

export type PublicationTarget = 'BUSINESS_PROFILE' | 'CAPABILITY' | 'OFFER_VERSION';

const targetTables: Record<PublicationTarget, string> = {
  BUSINESS_PROFILE: 'business_profiles',
  CAPABILITY: 'capabilities',
  OFFER_VERSION: 'offer_versions',
};

export class PublicationService {
  constructor(private readonly db: PrismaClient) {}

  async publish(context: AuthContext, target: PublicationTarget, targetId: string, reason: string) {
    this.validateTarget(target);
    return this.change(context, target, targetId, reason, 'PUBLISHED');
  }

  async withdraw(context: AuthContext, target: PublicationTarget, targetId: string, reason: string) {
    this.validateTarget(target);
    return this.change(context, target, targetId, reason, 'WITHDRAWN');
  }

  private async change(context: AuthContext, target: PublicationTarget, targetId: string, reason: string, eventKind: 'PUBLISHED' | 'WITHDRAWN') {
    validateAuthContext(context);
    requireNonEmpty(targetId, 'targetId');
    requireNonEmpty(reason, 'reason');
    return this.db.$transaction(async (tx) => {
      await lockOrganization(tx, context.organizationId);
      const membership = await requireActiveMembership(tx, context);
      const grant = await tx.permissionGrant.findFirst({ where: { organizationId: context.organizationId, membershipId: membership.id, permissionKey: 'publication.manage', grantStatus: 'ACTIVE' }, select: { id: true } });
      if (!grant) throw new CoreDomainError('AUTHORIZATION_DENIED', 'required permission grant missing');
      if (target === 'OFFER_VERSION') throw validationFailed('OfferVersion publication is outside this slice');
      const row = await this.lockTarget(tx, target, targetId, context.organizationId);
      if (!row) throw validationFailed('publication target not found in organization');

      const status = row.publication_status as string;
      const revision = row.content_revision as number;
      const publishedRevision = row.published_content_revision as number | null;
      if (eventKind === 'PUBLISHED') {
        if (status === 'PUBLISHED' && publishedRevision === revision) return { outcome: 'ALREADY_PUBLISHED' as const, revision };
        if (!['UNPUBLISHED', 'WITHDRAWN', 'PUBLISHED'].includes(status) || (status === 'PUBLISHED' && revision <= (publishedRevision ?? 0))) throw conflict('invalid publication transition');
      } else {
        if (status !== 'PUBLISHED') throw conflict('target is not published');
      }

      const data = this.publicationData(target, targetId, context.organizationId, eventKind, eventKind === 'PUBLISHED' ? revision : publishedRevision!, membership.id, grant.id, reason);
      const publication = await tx.publication.create({ data });
      return eventKind === 'PUBLISHED' ? { outcome: 'PUBLISHED' as const, publication } : { outcome: 'WITHDRAWN' as const, publication };
    }).catch((error: unknown) => {
      throw error instanceof CoreDomainError ? error : mapCoreDatabaseError(error);
    });
  }

  private validateTarget(target: PublicationTarget): void {
    if (target !== 'BUSINESS_PROFILE' && target !== 'CAPABILITY' && target !== 'OFFER_VERSION') throw validationFailed('unsupported publication target');
  }

  private async lockTarget(tx: Prisma.TransactionClient, target: PublicationTarget, id: string, organizationId: string) {
    const table = targetTables[target];
    const rows = await tx.$queryRaw<Array<{ id: string; publication_status: string; content_revision: number; published_content_revision: number | null }>>(Prisma.sql`SELECT id, publication_status, content_revision, published_content_revision FROM ${Prisma.raw(table)} WHERE id = ${id} AND organization_id = ${organizationId} FOR UPDATE`);
    return rows[0];
  }

  private publicationData(target: PublicationTarget, id: string, organizationId: string, eventKind: 'PUBLISHED' | 'WITHDRAWN', contentRevision: number, membershipId: string, grantId: string, reason: string) {
    const targetFields = target === 'BUSINESS_PROFILE'
      ? { businessProfileId: id, businessProfileOrganizationId: organizationId }
      : target === 'CAPABILITY'
        ? { capabilityId: id, capabilityOrganizationId: organizationId }
        : { offerVersionId: id, offerVersionOrganizationId: organizationId };
    return {
      organizationId,
      ...targetFields,
      eventKind,
      contentRevision,
      performedByMembershipId: membershipId,
      permissionKey: 'publication.manage',
      gateSnapshot: { grantId, policyVersion: 'core-publication-v1' },
      reason,
    };
  }
}
