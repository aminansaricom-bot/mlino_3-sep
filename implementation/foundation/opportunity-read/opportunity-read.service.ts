import { prisma } from '../prisma-client';
import {
  ActorContext,
  DomainTag,
  EvidenceRef,
  IC14ReadInterface,
  OpportunityActorStateDTO,
  OpportunityCorrelationId,
  OpportunityFeedQuery,
  OpportunityFeedResponse,
  OpportunityProjectionDTO,
} from '../../shared-contracts/types';
import { AC2DecisionPort, evaluateAC2FailClosed } from '../access-decision/ac2-decision-port';
import { buildAccessCandidates } from './access-candidate';

/**
 * FP-02 — real implementation of IC14ReadInterface, replacing
 * MockIC14ReadInterface for production wiring. Implements the exact
 * amended seven-step order from
 * PHASE_5B2_FINAL_SECURITY_CLOSURE/FP02_AC2_AND_EVIDENCE_DELIVERY_CONTRACT.md:
 *
 *   1. resolveActorContext (FP-03) — happens OUTSIDE this class; the caller
 *      must already hold a validated ActorContext before calling here.
 *   2. minimal tenant-scoped read of candidates (org-filtered).
 *   3. AC2DecisionPort.evaluate (via evaluateAC2FailClosed — fail-closed).
 *   4. drop denied Opportunities.
 *   5. intended_audience filter.
 *   6. actor-specific state.
 *   7. group/sort (+ optional limit).
 *
 * Never writes anything. Never decides AC-2 itself — only consumes the
 * Port's decision. Never reaches into Connector/Evidence-source tables —
 * evidence_refs are carried through opaque (see EvidenceRef's contract-level
 * limitation); only the AC2Decision's authorized_evidence_refs gate what is
 * returned.
 */
export class OpportunityReadService implements IC14ReadInterface {
  constructor(private readonly ac2Port: AC2DecisionPort) {}

  async getOpportunityFeed(query: OpportunityFeedQuery): Promise<OpportunityFeedResponse> {
    const { actor } = query;

    // Step 2 — minimal, tenant-scoped, ACTIVE-only by default (IC-14 §12: EXPIRED is retrievable by-id, not in the default Feed).
    const rows = await prisma.opportunityCurrentState.findMany({
      where: {
        organizationId: actor.organization_id,
        state: 'ACTIVE',
        ...(query.domain_tag_filter ? { domainTag: query.domain_tag_filter } : {}),
      },
    });

    if (rows.length === 0) {
      return { opportunities_by_family: {} };
    }

    // Step 3 — AC-2 (fail-closed; nothing from `rows` beyond org/id/evidence has left this function yet).
    const candidates = await buildAccessCandidates(rows);
    const decisions = await evaluateAC2FailClosed(this.ac2Port, actor, Array.from(candidates.values()));

    // Step 4 — drop denied.
    const allowed = rows.filter((r) => decisions.get(r.opportunityCorrelationId)?.access === 'allow');

    // Step 5 — intended_audience.
    const relevant = allowed.filter(
      (r) => r.intendedAudience === 'both' || r.intendedAudience === actor.role,
    );

    if (relevant.length === 0) {
      return { opportunities_by_family: {} };
    }

    // Step 6 — actor-specific state.
    const actorStates = await fetchActorStates(
      relevant.map((r) => r.opportunityCorrelationId),
      actor.actor_id,
    );

    const eventTimes = await fetchLatestEventTimes(relevant.map((r) => r.latestEventId));

    const dtos: OpportunityProjectionDTO[] = relevant.map((r) =>
      toDTO(
        r,
        decisions.get(r.opportunityCorrelationId)!,
        actorStates.get(r.opportunityCorrelationId),
        eventTimes.get(r.latestEventId) ?? r.lastComputedAt,
      ),
    );

    // Step 7 — group by domain_tag, sort descending by materiality_score within group, optional limit.
    const grouped: Partial<Record<DomainTag, OpportunityProjectionDTO[]>> = {};
    for (const dto of dtos) {
      if (!grouped[dto.domain_tag]) grouped[dto.domain_tag] = [];
      grouped[dto.domain_tag]!.push(dto);
    }
    for (const tag of Object.keys(grouped) as DomainTag[]) {
      grouped[tag]!.sort((a, b) => b.materiality_score - a.materiality_score);
      if (query.limit && query.limit > 0) {
        grouped[tag] = grouped[tag]!.slice(0, query.limit);
      }
    }

    return { opportunities_by_family: grouped };
  }

  async getOpportunityById(
    id: OpportunityCorrelationId,
    actor: ActorContext,
  ): Promise<OpportunityProjectionDTO | null> {
    // Step 2 — minimal read. by-id MAY return EXPIRED (IC-14 §12), so no state filter here.
    const row = await prisma.opportunityCurrentState.findUnique({ where: { opportunityCorrelationId: id } });

    // Same null for "does not exist" and "belongs to another organization" —
    // never distinguish the two (existence-oracle avoidance, IC-14 privacy boundary).
    if (!row || row.organizationId !== actor.organization_id) return null;

    // Step 3 — AC-2 (fail-closed).
    const candidates = await buildAccessCandidates([row]);
    const decisions = await evaluateAC2FailClosed(this.ac2Port, actor, Array.from(candidates.values()));
    const decision = decisions.get(row.opportunityCorrelationId);
    if (!decision || decision.access !== 'allow') return null;

    // Step 5 — intended_audience (after AC-2, never before).
    if (row.intendedAudience !== 'both' && row.intendedAudience !== actor.role) return null;

    // Step 6 — actor-specific state.
    const actorStates = await fetchActorStates([id], actor.actor_id);
    const eventTimes = await fetchLatestEventTimes([row.latestEventId]);

    return toDTO(row, decision, actorStates.get(id), eventTimes.get(row.latestEventId) ?? row.lastComputedAt);
  }
}

async function fetchLatestEventTimes(eventIds: string[]): Promise<Map<string, Date>> {
  if (eventIds.length === 0) return new Map();
  const rows = await prisma.eventLog.findMany({
    where: { id: { in: eventIds } },
    select: { id: true, eventTime: true },
  });
  return new Map(rows.map((r) => [r.id, r.eventTime]));
}

async function fetchActorStates(
  opportunityCorrelationIds: string[],
  actorId: string,
): Promise<Map<string, OpportunityActorStateDTO>> {
  if (opportunityCorrelationIds.length === 0) return new Map();
  const rows = await prisma.opportunityInteractionState.findMany({
    where: { opportunityCorrelationId: { in: opportunityCorrelationIds }, actorId },
  });
  const byId = new Map<string, OpportunityActorStateDTO>();
  for (const r of rows) {
    byId.set(r.opportunityCorrelationId, {
      interaction_type: r.interactionType,
      updated_at: r.updatedAt.toISOString(),
    });
  }
  return byId;
}

function toDTO(
  row: {
    opportunityCorrelationId: string;
    domainTag: string;
    organizationId: string;
    state: string;
    materialityScore: number;
    materialityBasis: string;
    intendedAudience: string;
    evidenceRefs: unknown;
    expiresAt: Date | null;
    latestEventId: string;
    lastComputedAt: Date;
  },
  decision: { authorized_evidence_refs: EvidenceRef[] },
  actorState: OpportunityActorStateDTO | undefined,
  eventTime: Date,
): OpportunityProjectionDTO {
  return {
    opportunity_correlation_id: row.opportunityCorrelationId,
    domain_tag: row.domainTag as DomainTag,
    organization_id: row.organizationId,
    state: row.state as 'ACTIVE' | 'EXPIRED',
    materiality_score: row.materialityScore,
    materiality_basis: row.materialityBasis,
    intended_audience: row.intendedAudience as OpportunityProjectionDTO['intended_audience'],
    // S2 policy: ONLY the AC-2-authorized subset is ever exposed — never the raw row.evidenceRefs.
    evidence_refs: decision.authorized_evidence_refs,
    event_time: eventTime.toISOString(),
    expires_at: row.expiresAt ? row.expiresAt.toISOString() : null,
    last_computed_at: row.lastComputedAt.toISOString(),
    my_interaction_state: actorState ?? { interaction_type: 'NONE', updated_at: null },
  };
}
