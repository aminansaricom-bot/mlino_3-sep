import { IC13SubmissionInterface, EventCandidateDTO, IntendedAudience } from '../../shared-contracts/types';
import { CapacityRepository, WorkingHoursSlot } from './capacity-repository';
import { computeSituationKey } from '../../foundation/event-admission/situation-key';
import { SituationLookupInterface } from '../../foundation/opportunity-projection/situation-lookup.service';

/**
 * F-01 — Capacity Intelligence. PROFILE 0 (deterministic/local) only — no AI,
 * per FEATURE_CONTRACTS/F-01 §23. Detects meaningful unused appointment
 * capacity by comparing today's booked minutes against the historical
 * average for the same resource/date-of-week.
 *
 * Suppression threshold is intentionally NOT an architecture fact
 * (PROACTIVE_AWARENESS_AND_MATERIALITY.md — left OPEN pending real product
 * validation). A conservative default is used here and is a local,
 * overridable implementation decision, not a frozen contract.
 */
const PRODUCER_ID = 'value-engine:capacity';
const DEFAULT_MATERIALITY_SUPPRESSION_THRESHOLD = 0.3;

export interface CapacityCandidate {
  slot: WorkingHoursSlot;
  emptyRatio: number;
  materialityScore: number;
}

export function computeEmptyRatio(slot: WorkingHoursSlot, bookedMinutes: number): number {
  if (slot.historicalAverageBookedMinutes <= 0) return 0;
  const expectedEmpty = Math.max(slot.totalMinutes - slot.historicalAverageBookedMinutes, 0);
  const actualEmpty = Math.max(slot.totalMinutes - bookedMinutes, 0);
  if (expectedEmpty === 0) return 0;
  // How much MORE empty than historically expected, normalized to [0,1].
  const excessEmpty = actualEmpty - expectedEmpty;
  return Math.max(0, Math.min(1, excessEmpty / slot.totalMinutes));
}

export class CapacityDetectorService {
  constructor(
    private readonly repository: CapacityRepository,
    private readonly submission: IC13SubmissionInterface,
    /**
     * SituationLookupInterface — injected exactly like the existing
     * IC13SubmissionInterface/IC14ReadInterface pattern (no direct Import of
     * FP-02's concrete class, no cross-Feature coupling). Used ONLY to
     * decide OCCURRENCE-vs-AMENDMENT for a re-detected situation_key; F-01
     * still owns the decision itself (SITUATION_LOOKUP_CONTRACT.md — "Lookup
     * != decision"). Advisory only (CR-04): this is not an atomicity or
     * uniqueness guarantee — two concurrent detection cycles can still both
     * see found:false and both submit independent OCCURRENCEs for the same
     * situation_key. That remains the open, unsolved R5-Concurrency
     * CONTRACT GAP; this wiring does not attempt to close it.
     */
    private readonly situationLookup: SituationLookupInterface,
    private readonly suppressionThreshold: number = DEFAULT_MATERIALITY_SUPPRESSION_THRESHOLD,
  ) {}

  /** Runs one full detection cycle for an organization. Returns candidates submitted. */
  async runDetectionCycle(organizationId: string): Promise<CapacityCandidate[]> {
    const slots = await this.repository.getWorkingHoursForOpenDates(organizationId);
    const produced: CapacityCandidate[] = [];

    for (const slot of slots) {
      const bookedMinutes = await this.repository.getBookedMinutesForDate(
        organizationId,
        slot.date,
        slot.entityRef,
      );
      const emptyRatio = computeEmptyRatio(slot, bookedMinutes);

      if (emptyRatio < this.suppressionThreshold) {
        continue; // below materiality threshold — silence is valid, not an error
      }

      const materialityScore = emptyRatio;
      const intendedAudience: IntendedAudience = 'owner_manager';

      // R5: stable dimensions only — organization+resource+date. Volatile
      // (totalMinutes/historicalAverageBookedMinutes/materiality) excluded.
      // See CONTRACT_RESOLUTION/R5_STABLE_SITUATION_IDENTITY_SPEC.md §F-01.
      const situationKey = computeSituationKey(PRODUCER_ID, [organizationId, slot.entityRef, slot.date]);

      // R5_STABLE_SITUATION_IDENTITY_SPEC.md §F-01: "Occurrence: اولین باری که
      // یک situation_key دیده می‌شود؛ Amendment: دیدن مجدد situation_key موجود
      // با تحلیل تغییریافته." An ACTIVE existing Opportunity for this exact
      // situation → re-assessment, submitted as an AMENDMENT targeting it. No
      // match, or a match that has already EXPIRED, → a new, independent
      // OCCURRENCE (an expired situation recurring is a legitimate new
      // situation, never merged into the old one — CR-03).
      const lookup = await this.situationLookup.getSituationState(organizationId, 'opportunity.capacity', situationKey);
      const targetActive = lookup.found && lookup.state === 'ACTIVE';

      const candidate: EventCandidateDTO = {
        producer_id: PRODUCER_ID,
        domain_tag: 'opportunity.capacity',
        organization_id: organizationId,
        core_entity_refs: [slot.entityRef],
        event_type: targetActive ? 'AMENDMENT' : 'OCCURRENCE',
        ...(targetActive ? { opportunity_correlation_id: lookup.opportunity_correlation_id } : {}),
        payload: {
          evidence_refs: [{ event_id: slot.eventId, description: `working hours slot ${slot.date}` }],
          materiality_score: materialityScore,
          materiality_basis: `${Math.round(emptyRatio * 100)}% more unused capacity than the historical average for ${slot.date}`,
          intended_audience: intendedAudience,
          expires_at: new Date(`${slot.date}T23:59:59.000Z`).toISOString(),
        },
        producer_timestamp: new Date().toISOString(),
        confidence_level: 1.0,
        kernel_version: 'v1.3',
        // R5_STABLE_SITUATION_IDENTITY_SPEC.md: situation_key is meaningful only
        // on OCCURRENCE candidates — never set it on an AMENDMENT.
        ...(targetActive ? {} : { situation_key: situationKey }),
      };

      const result = await this.submission.submitEventCandidate(candidate);
      if (result.admission_result === 'accepted') {
        produced.push({ slot, emptyRatio, materialityScore });
      }
    }

    return produced;
  }
}
