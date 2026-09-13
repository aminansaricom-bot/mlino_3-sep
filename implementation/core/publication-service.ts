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
      if (target === 'OFFER_VERSION') return this.changeOfferVersion(tx, context.organizationId, targetId, reason, eventKind, membership.id, grant.id);
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

  private async changeOfferVersion(tx: Prisma.TransactionClient, organizationId: string, versionId: string, reason: string, eventKind: 'PUBLISHED' | 'WITHDRAWN', membershipId: string, grantId: string) {
    const offerRows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT o.id FROM offers o JOIN offer_versions v ON v.offer_id = o.id AND v.organization_id = o.organization_id WHERE v.id = ${versionId} AND v.organization_id = ${organizationId} FOR UPDATE`);
    if (offerRows.length !== 1) throw validationFailed('offer version not found in organization');
    const versionRows = await tx.$queryRaw<Array<{ id: string; offer_id: string; publication_status: string; published_at: Date | null }>>(Prisma.sql`SELECT id, offer_id, publication_status, published_at FROM offer_versions WHERE id = ${versionId} AND organization_id = ${organizationId} FOR UPDATE`);
    if (versionRows.length !== 1) throw validationFailed('offer version not found in organization');
    const version = versionRows[0];
    if (eventKind === 'WITHDRAWN') {
      if (version.publication_status !== 'PUBLISHED') throw conflict('target is not published');
      const publication = await tx.publication.create({ data: this.publicationData('OFFER_VERSION', versionId, organizationId, 'WITHDRAWN', null, membershipId, grantId, reason) });
      return { outcome: 'WITHDRAWN' as const, publication };
    }
    if (version.publication_status === 'PUBLISHED') return { outcome: 'ALREADY_PUBLISHED' as const, revision: null };
    const oldRows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM offer_versions WHERE offer_id = ${version.offer_id} AND organization_id = ${organizationId} AND id <> ${versionId} AND publication_status = 'PUBLISHED' FOR UPDATE`);
    if (oldRows.length > 1) throw conflict('multiple published offer versions found');
    if (oldRows.length === 1) {
      const withdrawnPublication = await tx.publication.create({ data: this.publicationData('OFFER_VERSION', oldRows[0].id, organizationId, 'WITHDRAWN', null, membershipId, grantId, `replaced by ${versionId}`) });
      const publication = await tx.publication.create({ data: this.publicationData('OFFER_VERSION', versionId, organizationId, 'PUBLISHED', null, membershipId, grantId, reason) });
      return { outcome: 'REPLACED' as const, withdrawnPublication, publication };
    }
    const publication = await tx.publication.create({ data: this.publicationData('OFFER_VERSION', versionId, organizationId, 'PUBLISHED', null, membershipId, grantId, reason) });
    return { outcome: 'PUBLISHED' as const, publication };
  }

  private validateTarget(target: PublicationTarget): void {
    if (target !== 'BUSINESS_PROFILE' && target !== 'CAPABILITY' && target !== 'OFFER_VERSION') throw validationFailed('unsupported publication target');
  }

  private async lockTarget(tx: Prisma.TransactionClient, target: PublicationTarget, id: string, organizationId: string) {
    const table = targetTables[target];
    const rows = await tx.$queryRaw<Array<{ id: string; publication_status: string; content_revision: number; published_content_revision: number | null }>>(Prisma.sql`SELECT id, publication_status, content_revision, published_content_revision FROM ${Prisma.raw(table)} WHERE id = ${id} AND organization_id = ${organizationId} FOR UPDATE`);
    return rows[0];
  }

  private publicationData(target: PublicationTarget, id: string, organizationId: string, eventKind: 'PUBLISHED' | 'WITHDRAWN', contentRevision: number | null, membershipId: string, grantId: string, reason: string) {
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
