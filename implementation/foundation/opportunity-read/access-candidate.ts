import { prisma } from '../prisma-client';
import { EvidenceRef, OpportunityCorrelationId } from '../../shared-contracts/types';
import { OpportunityAccessCandidate } from '../access-decision/ac2-decision-port';

/**
 * Builds the minimal, tenant-scoped AC-2 candidate context for a set of
 * `opportunity_current_state` rows — Step 2 of IC-14's seven-step order
 * (PHASE_5B2.../FP02_AC2_AND_EVIDENCE_DELIVERY_CONTRACT.md). Deliberately
 * does NOT include materiality_score/materiality_basis/intended_audience —
 * only what a Governance decision actually needs (org, correlation id,
 * subject refs, evidence refs). None of this is returned to the caller
 * before AC-2 clears the item.
 *
 * subject_core_entity_refs come from the founding Event's own CoreEntity
 * relation — opportunityCorrelationId IS the founding OCCURRENCE's own id
 * (ADR-00AC), so a single findMany on event_log resolves all of them.
 */
export async function buildAccessCandidates(
  rows: { opportunityCorrelationId: string; organizationId: string; evidenceRefs: unknown }[],
): Promise<Map<OpportunityCorrelationId, OpportunityAccessCandidate>> {
  const ids = rows.map((r) => r.opportunityCorrelationId);
  const foundingEvents =
    ids.length > 0
      ? await prisma.eventLog.findMany({
          where: { id: { in: ids } },
          include: { coreEntities: true },
        })
      : [];
  const foundingById = new Map(foundingEvents.map((e) => [e.id, e]));

  const result = new Map<OpportunityCorrelationId, OpportunityAccessCandidate>();
  for (const row of rows) {
    const founding = foundingById.get(row.opportunityCorrelationId);
    result.set(row.opportunityCorrelationId, {
      organization_id: row.organizationId,
      opportunity_correlation_id: row.opportunityCorrelationId,
      subject_core_entity_refs: founding ? founding.coreEntities.map((e) => e.id) : [],
      evidence_refs: (row.evidenceRefs as EvidenceRef[] | null) ?? [],
    });
  }
  return result;
}
