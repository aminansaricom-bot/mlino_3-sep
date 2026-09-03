// NOTE (architecture invariant, enforced by test): this file must NEVER
// import any real messaging/calling module (e.g. a future notify.js/
// telegram.js integration). This Feature produces AWARENESS ONLY — see
// FEATURE_CONTRACTS/F-03 §6 and V1_HUMAN_ACTION_BOUNDARY_v2.md.

import { IC13SubmissionInterface, EventCandidateDTO } from '../../shared-contracts/types';
import { FollowupRepository, PatientInteractionRecord } from './followup-repository';
import { computeSituationKey } from '../../foundation/event-admission/situation-key';

const PRODUCER_ID = 'value-engine:followup';
const DEFAULT_FOLLOWUP_THRESHOLD_DAYS = 180;

function daysSince(isoDate: string, now: Date): number {
  const diffMs = now.getTime() - new Date(isoDate).getTime();
  return diffMs / (1000 * 60 * 60 * 24);
}

export class FollowupDetectorService {
  constructor(
    private readonly repository: FollowupRepository,
    private readonly submission: IC13SubmissionInterface,
    private readonly thresholdDays: number = DEFAULT_FOLLOWUP_THRESHOLD_DAYS,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async runDetectionCycle(organizationId: string): Promise<PatientInteractionRecord[]> {
    const patients = await this.repository.getPatientsWithInteractionHistory(organizationId);
    const produced: PatientInteractionRecord[] = [];
    const nowTs = this.now();

    for (const patient of patients) {
      const gap = daysSince(patient.lastInteractionAt, nowTs);
      if (gap < this.thresholdDays) continue;

      // Payload intentionally carries ONLY an awareness signal — no message
      // text, no phone number, no contact action of any kind (architecture
      // invariant, tested explicitly).
      const candidate: EventCandidateDTO = {
        producer_id: PRODUCER_ID,
        domain_tag: 'opportunity.followup',
        organization_id: organizationId,
        core_entity_refs: [patient.patientEntityRef],
        event_type: 'OCCURRENCE',
        payload: {
          evidence_refs: [{ event_id: patient.eventId }],
          materiality_score: Math.min(1, gap / (this.thresholdDays * 2)),
          materiality_basis: `${Math.round(gap)} days since last recorded interaction (threshold: ${this.thresholdDays})`,
          intended_audience: 'receptionist_coordinator',
        },
        producer_timestamp: nowTs.toISOString(),
        confidence_level: 1.0,
        kernel_version: 'v1.3',
        // R5: stable dimensions — organization+patient+lastInteractionAt
        // (the anchor of the CURRENT non-interaction period; stable until
        // the patient's next real interaction starts a new period). See
        // spec §F-03 for why lastInteractionAt is stable, not volatile.
        situation_key: computeSituationKey(PRODUCER_ID, [
          organizationId,
          patient.patientEntityRef,
          patient.lastInteractionAt,
        ]),
      };

      const result = await this.submission.submitEventCandidate(candidate);
      if (result.admission_result === 'accepted') {
        produced.push(patient);
      }
    }

    return produced;
  }
}
