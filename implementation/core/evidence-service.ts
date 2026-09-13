import { EvidenceSourceKind, Prisma, PrismaClient } from '@prisma/client';
import { AuthContext, requireMembershipPermission, requireNonEmpty, validateAuthContext } from './auth-context';
import { mapCoreDatabaseError } from './error-adapter';
import { CoreDomainError, conflict, validationFailed } from './errors';
import { lockOrganization } from './repositories';

export interface RecordEvidenceInput {
  capabilityId?: string;
  offerVersionId?: string;
  sourceKind: EvidenceSourceKind;
  sourceRef?: string | null;
  methodKey?: string | null;
  capturedAt?: Date | null;
  observedAt?: Date | null;
  freshUntil?: Date | null;
  confidence?: number | null;
}

const SOURCE_KINDS = new Set<string>(['HUMAN', 'SYSTEM', 'AI_INFERRED', 'INTEGRATION']);

export class EvidenceService {
  constructor(private readonly db: PrismaClient) {}

  async record(context: AuthContext, input: RecordEvidenceInput) {
    validateAuthContext(context);
    this.assertAllowedKeys(input, ['capabilityId', 'offerVersionId', 'sourceKind', 'sourceRef', 'methodKey', 'capturedAt', 'observedAt', 'freshUntil', 'confidence']);
    const hasCapability = input.capabilityId !== undefined;
    const hasOfferVersion = input.offerVersionId !== undefined;
    if (hasCapability === hasOfferVersion) throw validationFailed('exactly one evidence owner is required');
    if (!SOURCE_KINDS.has(String(input.sourceKind))) throw validationFailed('invalid evidence source kind');
    if (input.confidence !== undefined && input.confidence !== null && (typeof input.confidence !== 'number' || input.confidence < 0 || input.confidence > 1)) throw validationFailed('evidence confidence must be between 0 and 1');
    if (hasCapability) requireNonEmpty(input.capabilityId!, 'capabilityId');
    if (hasOfferVersion) requireNonEmpty(input.offerVersionId!, 'offerVersionId');
    return this.db.$transaction(async (tx) => {
      await lockOrganization(tx, context.organizationId);
      await requireMembershipPermission(tx, context, 'evidence.manage');
      const capability = input.capabilityId === undefined ? null : await tx.capability.findUnique({ where: { id_organizationId: { id: input.capabilityId, organizationId: context.organizationId } }, select: { id: true } });
      const offerVersion = input.offerVersionId === undefined ? null : await tx.offerVersion.findUnique({ where: { id_organizationId: { id: input.offerVersionId, organizationId: context.organizationId } }, select: { id: true } });
      if ((hasCapability && !capability) || (hasOfferVersion && !offerVersion)) throw validationFailed('evidence owner not found in organization');
      return tx.evidence.create({
        data: {
          organizationId: context.organizationId,
          capabilityId: capability?.id,
          capabilityOrganizationId: capability ? context.organizationId : undefined,
          offerVersionId: offerVersion?.id,
          offerVersionOrganizationId: offerVersion ? context.organizationId : undefined,
          sourceKind: input.sourceKind,
          sourceRef: input.sourceRef,
          methodKey: input.methodKey,
          capturedAt: input.capturedAt,
          observedAt: input.observedAt,
          freshUntil: input.freshUntil,
          confidence: input.confidence,
        },
      });
    }).catch((error: unknown) => {
      throw error instanceof CoreDomainError ? error : mapCoreDatabaseError(error);
    });
  }

  async confirm(context: AuthContext, evidenceId: string) {
    return this.changeConfirmation(context, evidenceId);
  }

  async expire(context: AuthContext, evidenceId: string) {
    return this.changeStatus(context, evidenceId, 'EXPIRED');
  }

  async withdraw(context: AuthContext, evidenceId: string) {
    return this.changeStatus(context, evidenceId, 'WITHDRAWN');
  }

  private async changeConfirmation(context: AuthContext, evidenceId: string) {
    validateAuthContext(context);
    requireNonEmpty(evidenceId, 'evidenceId');
    return this.db.$transaction(async (tx) => {
      await lockOrganization(tx, context.organizationId);
      const actor = await requireMembershipPermission(tx, context, 'evidence.confirm');
      const evidence = await tx.evidence.findUnique({ where: { id_organizationId: { id: evidenceId, organizationId: context.organizationId } } });
      if (!evidence) throw validationFailed('evidence not found in organization');
      if (evidence.evidenceStatus !== 'ACTIVE') throw conflict('evidence is not active');
      if (evidence.confirmationStatus !== 'UNCONFIRMED') throw conflict('evidence already confirmed');
      return tx.evidence.update({ where: { id_organizationId: { id: evidenceId, organizationId: context.organizationId } }, data: { confirmationStatus: 'HUMAN_CONFIRMED', confirmedByMembershipId: actor.id, confirmedByOrganizationId: context.organizationId, confirmedAt: new Date() } });
    }).catch((error: unknown) => {
      throw error instanceof CoreDomainError ? error : mapCoreDatabaseError(error);
    });
  }

  private async changeStatus(context: AuthContext, evidenceId: string, status: 'EXPIRED' | 'WITHDRAWN') {
    validateAuthContext(context);
    requireNonEmpty(evidenceId, 'evidenceId');
    return this.db.$transaction(async (tx) => {
      await lockOrganization(tx, context.organizationId);
      await requireMembershipPermission(tx, context, 'evidence.manage');
      const evidence = await tx.evidence.findUnique({ where: { id_organizationId: { id: evidenceId, organizationId: context.organizationId } } });
      if (!evidence) throw validationFailed('evidence not found in organization');
      if (evidence.evidenceStatus !== 'ACTIVE') throw conflict('evidence status is terminal');
      return tx.evidence.update({ where: { id_organizationId: { id: evidenceId, organizationId: context.organizationId } }, data: { evidenceStatus: status } });
    }).catch((error: unknown) => {
      throw error instanceof CoreDomainError ? error : mapCoreDatabaseError(error);
    });
  }

  private assertAllowedKeys(input: object, allowed: readonly string[]): void {
    const unknownKeys = Object.keys(input).filter((key) => !allowed.includes(key));
    if (unknownKeys.length > 0) throw validationFailed(`unknown evidence field: ${unknownKeys[0]}`);
  }
}
