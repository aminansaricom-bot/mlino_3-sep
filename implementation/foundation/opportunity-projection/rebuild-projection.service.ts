import { prisma } from '../prisma-client';
import { ISOTimestamp, OwnershipType } from '../../shared-contracts/types';
import { computeBusinessProjection, computeInteractionStates, partitionChains } from './compute-projection';

/**
 * FP-02 — the ONLY module permitted to write `opportunity_current_state` /
 * `opportunity_interaction_state`. Reads exclusively from `event_log`
 * (read-only) and `core_entities` is never touched here (subject refs are
 * resolved on read, in foundation/opportunity-read/, not persisted here —
 * see PHASE_5B1.../FP02_EVENT_SOURCED_PROJECTION_RULES.md Rule 3).
 *
 * NEVER writes event_log — Producer ≠ Event Log Owner extends unchanged to
 * FP-02: this module is a reader of event_log and a writer of Projection
 * tables only.
 */
export interface RebuildResult {
  opportunitiesComputed: number;
  interactionStatesComputed: number;
}

/**
 * Full, deterministic rebuild of one organization's Projection from its
 * complete `event_log` history, as of `as_of_time`. Idempotent: calling
 * this twice with the same event history and the same as_of_time produces
 * byte-identical resulting rows (verified by test, not merely asserted).
 *
 * Strategy: delete-then-reinsert within one transaction, scoped to this
 * organization only — appropriate at V1 clinic scale (no incremental/
 * streaming rebuild is introduced; see FP02_FINAL_IMPLEMENTATION_CONTRACT_v2_CANDIDATE.md,
 * "Performance" — modular-monolith, no new infrastructure).
 */
export async function rebuildOrganizationProjection(
  organizationId: string,
  as_of_time: ISOTimestamp,
): Promise<RebuildResult> {
  const events = await prisma.eventLog.findMany({
    where: { organizationId },
  });

  const foundingEvents = events.filter((e) => e.eventType === 'OCCURRENCE');

  const currentStateRows: {
    opportunityCorrelationId: string;
    organizationId: string;
    domainTag: string;
    state: 'ACTIVE' | 'EXPIRED';
    materialityScore: number;
    materialityBasis: string;
    intendedAudience: string;
    evidenceRefs: object;
    expiresAt: Date | null;
    latestEventId: string;
    lastComputedAt: Date;
    ownershipType: OwnershipType;
  }[] = [];

  const interactionStateRows: {
    opportunityCorrelationId: string;
    actorId: string;
    interactionType: 'SEEN' | 'ACKNOWLEDGED' | 'DISMISSED';
    latestEventId: string;
    updatedAt: Date;
  }[] = [];

  const computedAt = new Date();

  for (const founding of foundingEvents) {
    const { businessChain, interactionChain } = partitionChains(founding, events);
    const business = computeBusinessProjection(businessChain, as_of_time);

    currentStateRows.push({
      opportunityCorrelationId: founding.id,
      organizationId: founding.organizationId,
      domainTag: founding.domainTag,
      state: business.state,
      materialityScore: business.materialityScore,
      materialityBasis: business.materialityBasis,
      intendedAudience: business.intendedAudience,
      evidenceRefs: business.evidenceRefs as unknown as object,
      expiresAt: business.expiresAt ? new Date(business.expiresAt) : null,
      latestEventId: business.latestEventId,
      lastComputedAt: computedAt,
      // CCR «نوع مالکیت»: Projection مقدار را از رویداد بنیان‌گذار *حمل* می‌کند،
      // نه اینکه مستقلاً دوباره تصمیم بگیرد یا به @default جدول تکیه کند — تا
      // مقدار واقعاً از مرز Admission تا Projection «جریان» داشته باشد.
      ownershipType: founding.ownershipType,
    });

    const interactionStates = computeInteractionStates(interactionChain);
    for (const [actorId, s] of interactionStates) {
      if (s.interaction_type === 'NONE') continue; // NONE is the absence-default, never a stored row
      interactionStateRows.push({
        opportunityCorrelationId: founding.id,
        actorId,
        interactionType: s.interaction_type,
        latestEventId: s.latestEventId,
        updatedAt: new Date(s.updated_at as string),
      });
    }
  }

  const foundingIds = foundingEvents.map((f) => f.id);

  await prisma.$transaction(async (tx) => {
    await tx.opportunityCurrentState.deleteMany({ where: { organizationId } });
    await tx.opportunityInteractionState.deleteMany({
      where: { opportunityCorrelationId: { in: foundingIds.length > 0 ? foundingIds : ['__none__'] } },
    });
    if (currentStateRows.length > 0) {
      await tx.opportunityCurrentState.createMany({ data: currentStateRows });
    }
    if (interactionStateRows.length > 0) {
      await tx.opportunityInteractionState.createMany({ data: interactionStateRows });
    }
  });

  return {
    opportunitiesComputed: currentStateRows.length,
    interactionStatesComputed: interactionStateRows.length,
  };
}
