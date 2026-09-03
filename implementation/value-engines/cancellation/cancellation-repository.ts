/**
 * F-02 read-only input port. Reads FACTUAL cancellation/no-show events only
 * (appointment.cancelled / appointment.noshow, V1_EVENT_CONTRACT_CATALOG.md
 * group A). No prediction of future likelihood — factual detection only.
 */
export interface CancellationRecord {
  eventId: string;
  organizationId: string;
  entityRef: string; // Core Entity ref for the affected patient/appointment
  appointmentId: string;
  kind: 'cancelled' | 'noshow';
  occurredAt: string;
  wasRebooked: boolean; // true = a replacement appointment was booked for the same slot
}

export interface CancellationRepository {
  getUnprocessedCancellations(organizationId: string): Promise<CancellationRecord[]>;
}

export class InMemoryCancellationRepository implements CancellationRepository {
  constructor(private readonly records: CancellationRecord[] = []) {}

  async getUnprocessedCancellations(organizationId: string): Promise<CancellationRecord[]> {
    return this.records.filter((r) => r.organizationId === organizationId);
  }
}
