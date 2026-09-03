import type { EventLog } from '@prisma/client';
import {
  EvidenceRef,
  ISOTimestamp,
  InteractionRecordPayload,
  OpportunityActorStateDTO,
  OpportunityDetectionPayload,
} from '../../shared-contracts/types';

/**
 * FP-02 Core Projection — pure computation, zero I/O, zero use of Date.now()
 * or any hidden clock. Every rule below is taken verbatim from
 * PHASE_5B1_FP02_DESIGN_REMEDIATION/05_PROJECTION/FP02_EVENT_SOURCED_PROJECTION_RULES.md
 * (CR-07) — this file does not reinterpret those rules, it implements them.
 *
 * CRITICAL INVARIANT (CR-03, do not weaken): grouping is done EXCLUSIVELY by
 * the caller passing in the exact set of rows for one
 * `opportunity_correlation_id` (its own founding OCCURRENCE's `id`, per
 * ADR-00AC) — this module never groups by `situationKey`. Two independent
 * OCCURRENCE rows that happen to share a situationKey are two independent
 * callers of these functions, producing two independent results. There is
 * no merge path anywhere in this file.
 */

export interface BusinessProjectionResult {
  state: 'ACTIVE' | 'EXPIRED';
  materialityScore: number;
  materialityBasis: string;
  intendedAudience: string;
  evidenceRefs: EvidenceRef[];
  expiresAt: ISOTimestamp | null;
  latestEventId: string;
}

/**
 * Rule 1: only rows belonging to the business chain of ONE founding
 * OCCURRENCE (the founding row itself + same-family AMENDMENT/RETRACTION
 * rows whose amendsEventId === founding.id) may be passed here.
 * Rule 4: as_of_time is mandatory and is the ONLY notion of "now" used.
 * Rule 5: a RETRACTION anywhere in the chain forces EXPIRED and becomes
 * latestEventId (even if its own eventTime is not the chronologically last —
 * an explicit retraction is definitionally terminal for V1's two-value
 * state enum, see the rule's own honest caveat about ACTIVE/EXPIRED not
 * distinguishing "expired by time" from "explicitly retracted").
 */
export function computeBusinessProjection(
  businessChain: EventLog[],
  as_of_time: ISOTimestamp,
): BusinessProjectionResult {
  if (businessChain.length === 0) {
    throw new Error('computeBusinessProjection: businessChain must contain at least the founding event');
  }

  const sorted = [...businessChain].sort(compareEventOrder);
  const founding = sorted[0];
  if (founding.eventType !== 'OCCURRENCE') {
    throw new Error('computeBusinessProjection: first event in businessChain (by event order) must be the founding OCCURRENCE');
  }

  const retraction = sorted.find((e) => e.eventType === 'RETRACTION');
  // Latest CONTENT-bearing event: the most recent OCCURRENCE/AMENDMENT
  // (RETRACTION's own payload, if present, is not treated as a content
  // update — it only forces state; content reflects the last real Amendment).
  const latestContentEvent = [...sorted].reverse().find((e) => e.eventType !== 'RETRACTION') ?? founding;
  const latestEvent = retraction ?? sorted[sorted.length - 1];

  const payload = latestContentEvent.payload as unknown as OpportunityDetectionPayload;
  const expiresAt = payload.expires_at ?? null;

  const expiredByTime = expiresAt !== null && new Date(as_of_time).getTime() > new Date(expiresAt).getTime();
  const state: 'ACTIVE' | 'EXPIRED' = retraction || expiredByTime ? 'EXPIRED' : 'ACTIVE';

  return {
    state,
    materialityScore: payload.materiality_score,
    materialityBasis: payload.materiality_basis,
    intendedAudience: payload.intended_audience,
    evidenceRefs: payload.evidence_refs ?? [],
    expiresAt,
    latestEventId: (retraction ?? latestContentEvent).id,
  };
}

/**
 * Rule 2: the interaction chain (domain_tag: 'opportunity.interaction')
 * is fully separate from the business chain — never touches
 * materiality/audience/evidence/business latestEventId. One state per
 * actor_id, the actor's own latest interaction event wins.
 */
export function computeInteractionStates(
  interactionChain: EventLog[],
): Map<string, OpportunityActorStateDTO & { latestEventId: string }> {
  const byActor = new Map<string, EventLog>();
  for (const event of [...interactionChain].sort(compareEventOrder)) {
    const payload = event.payload as unknown as InteractionRecordPayload;
    if (!payload || typeof payload.actor_id !== 'string') continue;
    const current = byActor.get(payload.actor_id);
    if (!current || compareEventOrder(current, event) < 0) {
      byActor.set(payload.actor_id, event);
    }
  }

  const result = new Map<string, OpportunityActorStateDTO & { latestEventId: string }>();
  for (const [actorId, event] of byActor) {
    const payload = event.payload as unknown as InteractionRecordPayload;
    result.set(actorId, {
      interaction_type: payload.interaction_type,
      updated_at: event.eventTime.toISOString(),
      latestEventId: event.id,
    });
  }
  return result;
}

/** Deterministic order: eventTime ascending, tie-broken by id (lexical) — never insertion order, never a hidden clock. */
export function compareEventOrder(a: EventLog, b: EventLog): number {
  const t = a.eventTime.getTime() - b.eventTime.getTime();
  if (t !== 0) return t;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Rule 1 partition helper: splits ALL events sharing one founding
 * correlation id into the two disjoint chains. `allEventsForCorrelation`
 * MUST include the founding row itself plus every row whose
 * amendsEventId === founding.id (business AND interaction alike) — the
 * caller (rebuild-projection.service.ts) is responsible for that grouping;
 * this function only partitions by domain_tag, never by situationKey.
 */
export function partitionChains(
  founding: EventLog,
  allEventsForCorrelation: EventLog[],
): { businessChain: EventLog[]; interactionChain: EventLog[] } {
  const businessChain: EventLog[] = [founding];
  const interactionChain: EventLog[] = [];
  for (const e of allEventsForCorrelation) {
    if (e.id === founding.id) continue;
    if (e.amendsEventId !== founding.id) continue;
    if (e.domainTag === 'opportunity.interaction') {
      interactionChain.push(e);
    } else if (e.domainTag === founding.domainTag) {
      businessChain.push(e);
    }
    // Rows matching neither (a different, non-interaction family) are not
    // possible under FP-01's own admission rule (R3: family match enforced
    // at write time) — silently ignored here as defense in depth, not relied upon.
  }
  return { businessChain, interactionChain };
}
