import { OfferShape, Prisma, PrismaClient } from '@prisma/client';
import { AuthContext, requireMembershipPermission, requireNonEmpty, requireSameOrganization, validateAuthContext } from './auth-context';
import { mapCoreDatabaseError } from './error-adapter';
import { CoreDomainError, conflict, validationFailed } from './errors';
import { lockOrganization } from './repositories';

export interface CreateOfferInput {
  organizationId: string;
  offerKey: string;
}

export interface CreateOfferVersionInput {
  offerId: string;
  name: string;
  shortDescription?: string | null;
  offerShape: OfferShape;
  terms?: unknown;
  priceAmount?: number | string | null;
  priceCurrency?: string | null;
  onRequest?: boolean;
  validFrom: Date;
  validUntil?: Date | null;
}

export interface OfferCapabilityLinkInput {
  offerVersionId: string;
  capabilityId: string;
}

export class OfferService {
  constructor(private readonly db: PrismaClient) {}

  async create(context: AuthContext, input: CreateOfferInput) {
    validateAuthContext(context);
    requireSameOrganization(context, input.organizationId);
    requireNonEmpty(input.offerKey, 'offerKey');
    this.assertAllowedKeys(input, ['organizationId', 'offerKey']);
    return this.db.$transaction(async (tx) => {
      await lockOrganization(tx, context.organizationId);
      await requireMembershipPermission(tx, context, 'offer.manage');
      return tx.offer.create({ data: { organizationId: context.organizationId, offerKey: input.offerKey } });
    }).catch((error: unknown) => {
      throw error instanceof CoreDomainError ? error : mapCoreDatabaseError(error);
    });
  }

  async createVersion(context: AuthContext, input: CreateOfferVersionInput) {
    validateAuthContext(context);
    requireNonEmpty(input.offerId, 'offerId');
    requireNonEmpty(input.name, 'name');
    this.assertAllowedKeys(input, ['offerId', 'name', 'shortDescription', 'offerShape', 'terms', 'priceAmount', 'priceCurrency', 'onRequest', 'validFrom', 'validUntil']);
    return this.db.$transaction(async (tx) => {
      await lockOrganization(tx, context.organizationId);
      await requireMembershipPermission(tx, context, 'offer.manage');
      const offerRows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM offers WHERE id = ${input.offerId} AND organization_id = ${context.organizationId} AND lifecycle_status = 'ACTIVE' FOR UPDATE`);
      if (offerRows.length !== 1) throw validationFailed('offer not found in organization');
      const latest = await tx.offerVersion.findFirst({ where: { offerId: input.offerId, organizationId: context.organizationId }, orderBy: { versionNumber: 'desc' }, select: { versionNumber: true } });
      return tx.offerVersion.create({
        data: {
          organizationId: context.organizationId,
          offerId: input.offerId,
          versionNumber: (latest?.versionNumber ?? 0) + 1,
          name: input.name,
          shortDescription: input.shortDescription,
          offerShape: input.offerShape,
          terms: input.terms as Prisma.InputJsonValue | undefined,
          priceAmount: input.priceAmount,
          priceCurrency: input.priceCurrency,
          onRequest: input.onRequest ?? false,
          validFrom: input.validFrom,
          validUntil: input.validUntil,
        },
      });
    }).catch((error: unknown) => {
      throw error instanceof CoreDomainError ? error : mapCoreDatabaseError(error);
    });
  }

  async linkCapability(context: AuthContext, input: OfferCapabilityLinkInput) {
    return this.changeCapabilityLink(context, input, 'link');
  }

  async unlinkCapability(context: AuthContext, input: OfferCapabilityLinkInput) {
    return this.changeCapabilityLink(context, input, 'unlink');
  }

  private async changeCapabilityLink(context: AuthContext, input: OfferCapabilityLinkInput, operation: 'link' | 'unlink') {
    validateAuthContext(context);
    this.assertAllowedKeys(input, ['offerVersionId', 'capabilityId']);
    requireNonEmpty(input.offerVersionId, 'offerVersionId');
    requireNonEmpty(input.capabilityId, 'capabilityId');
    return this.db.$transaction(async (tx) => {
      await lockOrganization(tx, context.organizationId);
      await requireMembershipPermission(tx, context, 'offer.manage');
      const versionRows = await tx.$queryRaw<Array<{ id: string; publication_status: string }>>(Prisma.sql`SELECT id, publication_status FROM offer_versions WHERE id = ${input.offerVersionId} AND organization_id = ${context.organizationId} FOR UPDATE`);
      if (versionRows.length !== 1) throw validationFailed('offer version not found in organization');
      if (versionRows[0].publication_status !== 'UNPUBLISHED') throw conflict('offer version capability links are immutable after publication');
      const capability = await tx.capability.findUnique({ where: { id_organizationId: { id: input.capabilityId, organizationId: context.organizationId } }, select: { id: true } });
      if (!capability) throw validationFailed('capability not found in organization');
      if (operation === 'link') {
        return tx.offerVersionCapability.create({ data: { organizationId: context.organizationId, offerVersionId: input.offerVersionId, capabilityId: input.capabilityId } });
      }
      return tx.offerVersionCapability.delete({ where: { offerVersionId_capabilityId: { offerVersionId: input.offerVersionId, capabilityId: input.capabilityId } } });
    }).catch((error: unknown) => {
      throw error instanceof CoreDomainError ? error : mapCoreDatabaseError(error);
    });
  }

  private assertAllowedKeys(input: object, allowed: readonly string[]): void {
    const unknownKeys = Object.keys(input).filter((key) => !allowed.includes(key));
    if (unknownKeys.length > 0) throw validationFailed(`unknown offer field: ${unknownKeys[0]}`);
  }
}
