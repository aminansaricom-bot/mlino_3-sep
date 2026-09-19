import { runCoreTransaction } from './transaction';
import { Prisma, PrismaClient } from '@prisma/client';
import { AuthContext, requireMembershipPermission, requireNonEmpty, requireSameOrganization, validateAuthContext } from './auth-context';
import { mapCoreDatabaseError } from './error-adapter';
import { CoreDomainError, conflict, validationFailed } from './errors';
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
    this.assertAllowedKeys(input, ['organizationId', 'name', 'description', 'latitude', 'longitude', 'addressText', 'contactInformation', 'links', 'businessHours']);
    return runCoreTransaction(this.db, async (tx) => {
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
    this.assertAllowedKeys(input, ['name', 'description', 'latitude', 'longitude', 'addressText', 'contactInformation', 'links', 'businessHours']);
    if (input.name !== undefined) requireNonEmpty(input.name, 'name');
    const data = this.publicData(input);
    if (Object.keys(data).length === 0) throw validationFailed('at least one public field is required');
    return runCoreTransaction(this.db, async (tx) => {
      await lockOrganization(tx, context.organizationId);
      await requireMembershipPermission(tx, context, 'business_profile.manage');
      const profile = await tx.businessProfile.findUnique({ where: { id_organizationId: { id: profileId, organizationId: context.organizationId } } });
      if (!profile) throw validationFailed('business profile not found in organization');
      return tx.businessProfile.update({ where: { id_organizationId: { id: profileId, organizationId: context.organizationId } }, data: data as Prisma.BusinessProfileUncheckedUpdateInput });
    }).catch((error: unknown) => {
      throw error instanceof CoreDomainError ? error : mapCoreDatabaseError(error);
    });
  }

  async activate(context: AuthContext, profileId: string) {
    validateAuthContext(context);
    requireNonEmpty(profileId, 'profileId');
    return runCoreTransaction(this.db, async (tx) => {
      await lockOrganization(tx, context.organizationId);
      await requireMembershipPermission(tx, context, 'business_profile.manage');
      const profile = await tx.businessProfile.findUnique({ where: { id_organizationId: { id: profileId, organizationId: context.organizationId } } });
      if (!profile) throw validationFailed('business profile not found in organization');
      if (profile.lifecycleStatus !== 'DRAFT') throw conflict('business profile is not draft');
      if (!profile.businessIdentityClaimId || profile.businessIdentityClaimOrganizationId !== context.organizationId) throw validationFailed('verified unexpired identity claim required');
      const claim = await tx.businessIdentityClaim.findUnique({ where: { id_organizationId: { id: profile.businessIdentityClaimId, organizationId: context.organizationId } } });
      if (!claim || claim.claimStatus !== 'VERIFIED' || (claim.validUntil !== null && claim.validUntil <= new Date())) throw validationFailed('verified unexpired identity claim required');
      return tx.businessProfile.update({
        where: { id_organizationId: { id: profileId, organizationId: context.organizationId } },
        data: { lifecycleStatus: 'ACTIVE' },
      });
    }).catch((error: unknown) => {
      throw error instanceof CoreDomainError ? error : mapCoreDatabaseError(error);
    });
  }

  async archive(context: AuthContext, profileId: string, reason: string) {
    validateAuthContext(context);
    requireNonEmpty(profileId, 'profileId');
    requireNonEmpty(reason, 'reason');
    return runCoreTransaction(this.db, async (tx) => {
      await lockOrganization(tx, context.organizationId);
      await requireMembershipPermission(tx, context, 'business_profile.manage');
      const profile = await tx.businessProfile.findUnique({ where: { id_organizationId: { id: profileId, organizationId: context.organizationId } } });
      if (!profile) throw validationFailed('business profile not found in organization');
      if (profile.lifecycleStatus === 'ARCHIVED') throw conflict('business profile is already archived');
      if (profile.lifecycleStatus !== 'DRAFT' && profile.lifecycleStatus !== 'ACTIVE') throw conflict('business profile cannot be archived');
      return tx.businessProfile.update({
        where: { id_organizationId: { id: profileId, organizationId: context.organizationId } },
        data: { lifecycleStatus: 'ARCHIVED' },
      });
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
    return runCoreTransaction(this.db, async (tx) => {
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
    return runCoreTransaction(this.db, async (tx) => {
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

  private assertAllowedKeys(input: object, allowed: readonly string[]): void {
    const unknownKeys = Object.keys(input).filter((key) => !allowed.includes(key));
    if (unknownKeys.length > 0) throw validationFailed(`unknown business profile field: ${unknownKeys[0]}`);
  }
}
