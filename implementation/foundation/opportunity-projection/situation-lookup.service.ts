import { prisma } from '../prisma-client';
import { DomainTag, EventId, ISOTimestamp, OpportunityCorrelationId, OrganizationId, SituationKey } from '../../shared-contracts/types';

/**
 * SituationLookupInterface — implementation-level (NOT part of Shared
 * Contract v1.1), owned by FP-02. Final shape per CR-04
 * (PHASE_5B1_FP02_DESIGN_REMEDIATION/02_SITUATION_LOOKUP/
 * SITUATION_LOOKUP_AND_CONCURRENCY_CORRECTION.md), superseding the earlier
 * (flawed) PHASE_5B/03_SITUATION_LOOKUP/SITUATION_LOOKUP_CONTRACT.md.
 *
 * This is a Query, never a decision:
 *  - Reports on OpportunityCurrentState (Projection) as of `as_of`.
 *  - NEVER calls submitEventCandidate. NEVER decides OCCURRENCE-vs-AMENDMENT.
 *  - Deliberately omits materiality/audience/evidence (presentation data,
 *    not identity data — SITUATION_LOOKUP_CONTRACT.md).
 *  - ADVISORY ONLY (CR-04): Projection is Eventually Consistent (Kernel §8,
 *    IC-14 §13); "Lookup then Submit" is a non-atomic two-step operation.
 *    This is NOT a uniqueness guarantee, NOT a lock, NOT a promise that no
 *    other event lands between this call and a subsequent submission.
 *
 * R5-Concurrency/Uniqueness remains an OPEN, UNSOLVED CONTRACT GAP (CR-03).
 * This service does not, and must never, merge or deduplicate anything —
 * every independent OCCURRENCE keeps its own OpportunityCurrentState row
 * regardless of a shared situation_key (see rebuild-projection.service.ts /
 * compute-projection.ts, which enforce this at Projection-build time).
 */

export type SituationLookupResult =
  | { found: false }
  | {
      found: true;
      opportunity_correlation_id: OpportunityCorrelationId;
      latest_event_id: EventId;
      state: 'ACTIVE' | 'EXPIRED';
      /** When the underlying Projection row was last computed — the staleness marker CR-04/IC-14 §13 require, not "now" at read time. */
      as_of: ISOTimestamp;
    };

export interface SituationLookupInterface {
  getSituationState(
    organization_id: OrganizationId,
    domain_tag: DomainTag,
    situation_key: SituationKey,
  ): Promise<SituationLookupResult>;
}

/**
 * Real FP-02 implementation. `situation_key` is not stored on
 * OpportunityCurrentState (it is identity-only, per the Shared Contract
 * v1.1 doc-comment limitation — never a Projection column) — it lives on
 * the founding OCCURRENCE event_log row. So resolution is two steps: find
 * the founding OCCURRENCE event(s) carrying this situation_key (read-only,
 * event_log is never written here — Producer ≠ Event Log Owner extends
 * unchanged), then read the FP-02-owned Projection rows for those
 * `opportunity_correlation_id`s (= the founding events' own `id`s, per
 * ADR-00AC).
 *
 * MULTI-MATCH DISAMBIGUATION (new — explicitly flagged as unresolved by the
 * FP-02 Core Implementation authorization, 2026-08-15, as the reason
 * SituationLookupInterface was excluded from that phase: "در صورت چند
 * OCCURRENCE هم-situation_key، قرارداد خروجی تک-موردی هنوز ابهام دارد").
 * More than one independent OpportunityCurrentState row sharing the same
 * (organization_id, domain_tag, situation_key) is a LEGITIMATE outcome
 * under CR-03's no-merge rule (a Race, or a prior situation that expired
 * and later recurred as an unrelated new OCCURRENCE with the same
 * situation_key). Since this single-result Advisory interface cannot
 * report more than one row, this implementation deterministically returns
 * the row whose latest event is the MOST RECENT (by event_time, tie-broken
 * by event id, descending) among the matches. This is a disambiguation of
 * what to ADVISE through this interface only — it never merges, never
 * deletes, and never changes what Projection itself stores; every matching
 * row remains fully intact and independently queryable via
 * OpportunityReadService. It is not a solution to R5-Concurrency, which
 * stays an open CONTRACT GAP.
 */
export class SituationLookupService implements SituationLookupInterface {
  async getSituationState(
    organization_id: OrganizationId,
    domain_tag: DomainTag,
    situation_key: SituationKey,
  ): Promise<SituationLookupResult> {
    // Step 1 — resolve situation_key to founding OCCURRENCE event id(s). Read-only.
    const foundingEvents = await prisma.eventLog.findMany({
      where: {
        organizationId: organization_id,
        domainTag: domain_tag,
        situationKey: situation_key,
        eventType: 'OCCURRENCE',
      },
      select: { id: true },
    });

    if (foundingEvents.length === 0) return { found: false };

    // Step 2 — read the FP-02-owned Projection for those correlation ids.
    // A founding event with no Projection row yet (rebuild pending) correctly
    // reports found:false — this Query reflects Projection state, not raw event_log.
    const rows = await prisma.opportunityCurrentState.findMany({
      where: { opportunityCorrelationId: { in: foundingEvents.map((e) => e.id) } },
    });

    if (rows.length === 0) return { found: false };
    if (rows.length === 1) return toResult(rows[0]);

    // Multi-match: deterministically pick by most recent latest-event time.
    const latestEventIds = rows.map((r) => r.latestEventId);
    const latestEvents = await prisma.eventLog.findMany({
      where: { id: { in: latestEventIds } },
      select: { id: true, eventTime: true },
    });
    const eventTimeById = new Map(latestEvents.map((e) => [e.id, e.eventTime.getTime()]));

    const sorted = [...rows].sort((a, b) => {
      const ta = eventTimeById.get(a.latestEventId) ?? 0;
      const tb = eventTimeById.get(b.latestEventId) ?? 0;
      if (tb !== ta) return tb - ta; // descending — most recent latest-event first
      return a.latestEventId < b.latestEventId ? 1 : a.latestEventId > b.latestEventId ? -1 : 0;
    });

    return toResult(sorted[0]);
  }
}

function toResult(row: {
  opportunityCorrelationId: string;
  latestEventId: string;
  state: string;
  lastComputedAt: Date;
}): SituationLookupResult {
  return {
    found: true,
    opportunity_correlation_id: row.opportunityCorrelationId,
    latest_event_id: row.latestEventId,
    state: row.state as 'ACTIVE' | 'EXPIRED',
    as_of: row.lastComputedAt.toISOString(),
  };
}
