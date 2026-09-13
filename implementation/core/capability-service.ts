import { CapabilityAudience, PrismaClient } from '@prisma/client';
import { AuthContext, requireMembershipPermission, requireNonEmpty, requireSameOrganization, validateAuthContext } from './auth-context';
import { mapCoreDatabaseError } from './error-adapter';
import { CoreDomainError, conflict, validationFailed } from './errors';
import { lockOrganization } from './repositories';

export interface CreateCapabilityInput {
  organizationId: string;
  capabilityKey: string;
  name: string;
  shortDescription?: string | null;
  categoryKey: string;
  audience?: CapabilityAudience;
}

export interface CapabilityPublicFields {
  name?: string;
  shortDescription?: string | null;
  categoryKey?: string;
  audience?: CapabilityAudience;
}

export class CapabilityService {
  constructor(private readonly db: PrismaClient) {}

  async create(context: AuthContext, input: CreateCapabilityInput) {
    validateAuthContext(context);
    requireSameOrganization(context, input.organizationId);
    requireNonEmpty(input.capabilityKey, 'capabilityKey');
    requireNonEmpty(input.name, 'name');
    requireNonEmpty(input.categoryKey, 'categoryKey');
    this.assertAllowedKeys(input, ['organizationId', 'capabilityKey', 'name', 'shortDescription', 'categoryKey', 'audience']);
    return this.db.$transaction(async (tx) => {
      await lockOrganization(tx, context.organizationId);
      await requireMembershipPermission(tx, context, 'capability.manage');
      return tx.capability.create({
        data: {
          organizationId: context.organizationId,
          capabilityKey: input.capabilityKey,
          name: input.name,
          shortDescription: input.shortDescription,
          categoryKey: input.categoryKey,
          ...(input.audience ? { audience: input.audience } : {}),
        },
      });
    }).catch((error: unknown) => {
      throw error instanceof CoreDomainError ? error : mapCoreDatabaseError(error);
    });
  }

  async updatePublicFields(context: AuthContext, capabilityId: string, input: CapabilityPublicFields) {
    validateAuthContext(context);
    requireNonEmpty(capabilityId, 'capabilityId');
    this.assertAllowedKeys(input, ['name', 'shortDescription', 'categoryKey', 'audience']);
    if (Object.keys(input).length === 0) throw validationFailed('at least one public field is required');
    return this.db.$transaction(async (tx) => {
      await lockOrganization(tx, context.organizationId);
      await requireMembershipPermission(tx, context, 'capability.manage');
      const capability = await tx.capability.findUnique({ where: { id_organizationId: { id: capabilityId, organizationId: context.organizationId } } });
      if (!capability) throw validationFailed('capability not found in organization');
      const changed = (Object.keys(input) as Array<keyof CapabilityPublicFields>).some((key) => input[key] !== undefined && !samePublicValue(input[key], capability[key]));
      return tx.capability.update({
        where: { id_organizationId: { id: capabilityId, organizationId: context.organizationId } },
        data: changed && capability.confirmationStatus === 'HUMAN_CONFIRMED'
          ? { ...input, confirmationStatus: 'UNCONFIRMED', confirmedByMembershipId: null, confirmedByOrganizationId: null, confirmedAt: null }
          : input,
      });
    }).catch((error: unknown) => {
      throw error instanceof CoreDomainError ? error : mapCoreDatabaseError(error);
    });
  }

  async confirm(context: AuthContext, capabilityId: string) {
    validateAuthContext(context);
    requireNonEmpty(capabilityId, 'capabilityId');
    return this.db.$transaction(async (tx) => {
      await lockOrganization(tx, context.organizationId);
      const actor = await requireMembershipPermission(tx, context, 'capability.confirm');
      const capability = await tx.capability.findUnique({ where: { id_organizationId: { id: capabilityId, organizationId: context.organizationId } } });
      if (!capability) throw validationFailed('capability not found in organization');
      if (capability.confirmationStatus !== 'UNCONFIRMED') throw conflict('capability already confirmed');
      return tx.capability.update({
        where: { id_organizationId: { id: capabilityId, organizationId: context.organizationId } },
        data: { confirmationStatus: 'HUMAN_CONFIRMED', confirmedByMembershipId: actor.id, confirmedByOrganizationId: context.organizationId, confirmedAt: new Date() },
      });
    }).catch((error: unknown) => {
      throw error instanceof CoreDomainError ? error : mapCoreDatabaseError(error);
    });
  }

  private assertAllowedKeys(input: object, allowed: readonly string[]): void {
    const unknownKeys = Object.keys(input).filter((key) => !allowed.includes(key));
    if (unknownKeys.length > 0) throw validationFailed(`unknown capability field: ${unknownKeys[0]}`);
  }
}

function samePublicValue(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (left === null || right === null || left === undefined || right === undefined) return false;
  return JSON.stringify(left) === JSON.stringify(right);
}
