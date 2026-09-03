/**
 * F-03 read-only input port. Reads patient interaction history
 * (patient.interaction_recorded, V1_EVENT_CONTRACT_CATALOG.md group A).
 */
export interface PatientInteractionRecord {
  eventId: string;
  organizationId: string;
  patientEntityRef: string;
  lastInteractionAt: string; // ISO date of last recorded interaction
}

export interface FollowupRepository {
  getPatientsWithInteractionHistory(organizationId: string): Promise<PatientInteractionRecord[]>;
}

export class InMemoryFollowupRepository implements FollowupRepository {
  constructor(private readonly records: PatientInteractionRecord[] = []) {}

  async getPatientsWithInteractionHistory(organizationId: string): Promise<PatientInteractionRecord[]> {
    return this.records.filter((r) => r.organizationId === organizationId);
  }
}
