import { Prisma, PrismaClient } from '@prisma/client';
import { AuthContext, requireMembershipPermission, requireNonEmpty, requireSameOrganization, validateAuthContext } from './auth-context';
import { mapCoreDatabaseError } from './error-adapter';
import { CoreDomainError, validationFailed } from './errors';
import { lockOrganization } from './repositories';

export interface BusinessProfilePublicFields {
  name?: string;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  addressText?: string | null;
  contactInformation?: unknown;
  links?: unknown;
  businessHours?: unknown;
}

export interface CreateBusinessProfileInput extends BusinessProfilePublicFields {
  organizationId: string;
  name: string;
}

export class BusinessProfileService {
  constructor(private readonly db: PrismaClient) {}

  async create(context: AuthContext, input: CreateBusinessProfileInput) {
    validateAuthContext(context);
    requireSameOrganization(context, input.organizationId);
    requireNonEmpty(input.name, 'name');
    return this.db.$transaction(async (tx) => {
      await lockOrganization(tx, context.organizationId);
      await requireMembershipPermission(tx, context, 'business_profile.manage');
      return tx.businessProfile.create({ data: { organizationId: context.organizationId, ...this.publicData(input) } as Prisma.BusinessProfileUncheckedCreateInput });
    }).catch((error: unknown) => {
      throw error instanceof CoreDomainError ? error : mapCoreDatabaseError(error);
    });
  }

  async updatePublicFields(context: AuthContext, profileId: string, input: BusinessProfilePublicFields) {
    validateAuthContext(context);
    requireNonEmpty(profileId, 'profileId');
    const data = this.publicData(input);
    if (Object.keys(data).length === 0) throw validationFailed('at least one public field is required');
    return this.db.$transaction(async (tx) => {
      await lockOrganization(tx, context.organizationId);
      await requireMembershipPermission(tx, context, 'business_profile.manage');
      const profile = await tx.businessProfile.findUnique({ where: { id_organizationId: { id: profileId, organizationId: context.organizationId } } });
      if (!profile) throw validationFailed('business profile not found in organization');
      return tx.businessProfile.update({ where: { id_organizationId: { id: profileId, organizationId: context.organizationId } }, data: data as Prisma.BusinessProfileUncheckedUpdateInput });
    }).catch((error: unknown) => {
      throw error instanceof CoreDomainError ? error : mapCoreDatabaseError(error);
    });
  }

  async linkIdentityClaim(context: AuthContext, profileId: string, claimId: string) {
    return this.setIdentityClaim(context, profileId, claimId);
  }

  async unlinkIdentityClaim(context: AuthContext, profileId: string) {
    validateAuthContext(context);
    requireNonEmpty(profileId, 'profileId');
    return this.db.$transaction(async (tx) => {
      await lockOrganization(tx, context.organizationId);
      await requireMembershipPermission(tx, context, 'business_profile.manage');
      const profile = await tx.businessProfile.findUnique({ where: { id_organizationId: { id: profileId, organizationId: context.organizationId } } });
      if (!profile) throw validationFailed('business profile not found in organization');
      return tx.businessProfile.update({
        where: { id_organizationId: { id: profileId, organizationId: context.organizationId } },
        data: { businessIdentityClaimId: null, businessIdentityClaimOrganizationId: null } as Prisma.BusinessProfileUncheckedUpdateInput,
      });
    }).catch((error: unknown) => {
      throw error instanceof CoreDomainError ? error : mapCoreDatabaseError(error);
    });
  }

  private async setIdentityClaim(context: AuthContext, profileId: string, claimId: string) {
    validateAuthContext(context);
    requireNonEmpty(profileId, 'profileId');
    requireNonEmpty(claimId, 'claimId');
    return this.db.$transaction(async (tx) => {
      await lockOrganization(tx, context.organizationId);
      await requireMembershipPermission(tx, context, 'business_profile.manage');
      const profile = await tx.businessProfile.findUnique({ where: { id_organizationId: { id: profileId, organizationId: context.organizationId } } });
      if (!profile) throw validationFailed('business profile not found in organization');
      const claim = await tx.businessIdentityClaim.findUnique({ where: { id_organizationId: { id: claimId, organizationId: context.organizationId } } });
      if (!claim || claim.claimStatus !== 'VERIFIED') throw validationFailed('verified identity claim required');
      return tx.businessProfile.update({
        where: { id_organizationId: { id: profileId, organizationId: context.organizationId } },
        data: { businessIdentityClaimId: claim.id, businessIdentityClaimOrganizationId: claim.organizationId } as Prisma.BusinessProfileUncheckedUpdateInput,
      });
    }).catch((error: unknown) => {
      throw error instanceof CoreDomainError ? error : mapCoreDatabaseError(error);
    });
  }

  private publicData(input: BusinessProfilePublicFields): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.latitude !== undefined) data.latitude = input.latitude;
    if (input.longitude !== undefined) data.longitude = input.longitude;
    if (input.addressText !== undefined) data.addressText = input.addressText;
    if (input.contactInformation !== undefined) data.contactInformation = input.contactInformation;
    if (input.links !== undefined) data.links = input.links;
    if (input.businessHours !== undefined) data.businessHours = input.businessHours;
    return data;
  }
}
