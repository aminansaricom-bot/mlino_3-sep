import { IC13SubmissionInterface, EventCandidateDTO } from '../../shared-contracts/types';
import { CancellationRepository, CancellationRecord } from './cancellation-repository';
import { computeSituationKey } from '../../foundation/event-admission/situation-key';
import { SituationLookupInterface } from '../../foundation/opportunity-projection/situation-lookup.service';

/**
 * F-02 — Cancellation / No-show Intelligence. PROFILE 0 only.
 * Factual detection ONLY — no probabilistic model of future cancellation
 * likelihood is implemented here, per FEATURE_CONTRACTS/F-02 explicit
 * prohibition.
 */
const PRODUCER_ID = 'value-engine:cancellation';

export class CancellationDetectorService {
  constructor(
    private readonly repository: CancellationRepository,
    private readonly submission: IC13SubmissionInterface,
    /**
     * SituationLookupInterface — same injection pattern as F-01
     * (implementation-level, no cross-Feature coupling). Advisory only
     * (CR-04) — R5-Concurrency remains an open, unsolved CONTRACT GAP; this
     * wiring does not attempt to close it. Note this Feature's payload
     * carries no expires_at (F-02 situations don't naturally time out —
     * they persist until rebooked), so once an OCCURRENCE is projected
     * ACTIVE it stays ACTIVE indefinitely and every re-detection correctly
     * becomes an AMENDMENT, matching R5_STABLE_SITUATION_IDENTITY_SPEC.md
     * §F-02 ("همان appointmentId دوباره پردازش شود ... این AMENDMENT/
     * Retraction طبیعی است").
     */
    private readonly situationLookup: SituationLookupInterface,
  ) {}

  async runDetectionCycle(organizationId: string): Promise<CancellationRecord[]> {
    const records = await this.repository.getUnprocessedCancellations(organizationId);
    const produced: CancellationRecord[] = [];

    for (const record of records) {
      // A cancellation/no-show that was already rebooked is not a lost
      // opportunity — no signal worth surfacing.
      if (record.wasRebooked) continue;

      // R5: stable dimensions only — organization+appointmentId. `kind`/
      // `wasRebooked`/`occurredAt` excluded (see spec §F-02).
      const situationKey = computeSituationKey(PRODUCER_ID, [organizationId, record.appointmentId]);

      const lookup = await this.situationLookup.getSituationState(organizationId, 'opportunity.cancellation', situationKey);
      const targetActive = lookup.found && lookup.state === 'ACTIVE';

      const candidate: EventCandidateDTO = {
        producer_id: PRODUCER_ID,
        domain_tag: 'opportunity.cancellation',
        organization_id: organizationId,
        core_entity_refs: [record.entityRef],
        event_type: targetActive ? 'AMENDMENT' : 'OCCURRENCE',
        ...(targetActive ? { opportunity_correlation_id: lookup.opportunity_correlation_id } : {}),
        payload: {
          evidence_refs: [{ event_id: record.eventId, description: `${record.kind} for appointment ${record.appointmentId}` }],
          materiality_score: record.kind === 'noshow' ? 0.9 : 0.7, // deterministic, not learned
          materiality_basis: `${record.kind === 'noshow' ? 'No-show' : 'Cancellation'} on ${record.occurredAt}, slot not rebooked`,
          intended_audience: 'receptionist_coordinator',
        },
        producer_timestamp: new Date().toISOString(),
        confidence_level: 1.0,
        kernel_version: 'v1.3',
        // situation_key is OCCURRENCE-only (R5_STABLE_SITUATION_IDENTITY_SPEC.md).
        ...(targetActive ? {} : { situation_key: situationKey }),
      };

      const result = await this.submission.submitEventCandidate(candidate);
      if (result.admission_result === 'accepted') {
        produced.push(record);
      }
    }

    return produced;
  }
}
